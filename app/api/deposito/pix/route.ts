import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { parseSessionToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { suitpayCreatePix, buscarCodigoIBGEPorCEP, type SuitPayCreatePixPayload } from '@/lib/suitpay-client'
import { gateboxCreatePix, type GateboxCreatePixPayload } from '@/lib/gatebox-client'
import { getActiveGateway, getGatewayConfig } from '@/lib/gateways-store'
import { getConfiguracoes } from '@/lib/configuracoes-store'

export const dynamic = 'force-dynamic'

/**
 * Cria um pagamento PIX usando o gateway ativo configurado no banco de dados
 */
export async function POST(req: NextRequest) {
  try {
    const session = cookies().get('lotbicho_session')?.value
    const payload = parseSessionToken(session)

    if (!payload) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const user = await prisma.usuario.findUnique({
      where: { id: payload.id },
      select: { id: true, nome: true, email: true, telefone: true, cpf: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    const body = await req.json()
    const { valor, document, cep, endereco } = body

    if (!valor || valor <= 0) {
      return NextResponse.json({ error: 'Valor inválido' }, { status: 400 })
    }

    const config = await getConfiguracoes()
    const minDeposito = config.limiteDepositoMinimo ?? 25
    if (valor < minDeposito) {
      return NextResponse.json(
        { error: `Valor mínimo para depósito é R$ ${minDeposito.toFixed(2).replace('.', ',')}.` },
        { status: 400 }
      )
    }

    // CPF é obrigatório
    const documentClean = document || user.cpf
    if (!documentClean) {
      return NextResponse.json({ error: 'CPF é obrigatório para realizar depósito' }, { status: 400 })
    }

    const cpfLimpo = documentClean.replace(/\D/g, '')
    if (cpfLimpo.length !== 11) {
      return NextResponse.json(
        { error: 'CPF inválido. Digite um CPF válido com 11 dígitos.' },
        { status: 400 }
      )
    }

    // Buscar gateway ativo do banco de dados
    const activeGateway = await getActiveGateway()
    
    if (!activeGateway) {
      console.error('Nenhum gateway ativo encontrado')
      return NextResponse.json(
        { error: 'Nenhum gateway ativo configurado. Configure um gateway no painel administrativo.' },
        { status: 500 }
      )
    }

    // Obter configuração do gateway
    const gatewayConfig = await getGatewayConfig(activeGateway)
    
    if (!gatewayConfig) {
      console.error('Configuração do gateway inválida:', activeGateway.name)
      return NextResponse.json(
        { error: 'Configuração do gateway inválida. Verifique as credenciais no painel administrativo.' },
        { status: 500 }
      )
    }

    const useGatebox = gatewayConfig.type === 'gatebox'

    // Construir URL do webhook
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                   (req.headers.get('host') ? `https://${req.headers.get('host')}` : 'http://localhost:3001')

    // Usar Gatebox se configurado
    if (useGatebox) {
      // Verificar se username e password estão presentes
      if (!gatewayConfig.username || !gatewayConfig.password) {
        console.error('Configuração Gatebox incompleta:', { 
          username: !!gatewayConfig.username, 
          password: !!gatewayConfig.password 
        })
        return NextResponse.json(
          { error: 'Configuração do gateway Gatebox incompleta. Verifique username e senha no painel administrativo.' },
          { status: 500 }
        )
      }

      // Validar telefone - deve ter pelo menos 10 dígitos
      const phoneClean = (user.telefone || '').replace(/\D/g, '')
      let phoneFormatted = phoneClean
      if (phoneFormatted.length >= 10) {
        // Formatar para +55XXXXXXXXXXX se não começar com +
        if (!phoneFormatted.startsWith('+')) {
          if (phoneFormatted.length === 11 && phoneFormatted.startsWith('0')) {
            phoneFormatted = '55' + phoneFormatted.substring(1)
          } else if (phoneFormatted.length === 10 || phoneFormatted.length === 11) {
            phoneFormatted = '55' + phoneFormatted
          }
          phoneFormatted = '+' + phoneFormatted
        }
      }

      const callbackUrl = `${baseUrl}/api/webhooks/gatebox`
      const externalId = `deposito_${user.id}_${Date.now()}`

      const pixPayload: GateboxCreatePixPayload = {
        externalId,
        amount: parseFloat(valor.toFixed(2)),
        document: cpfLimpo,
        name: user.nome.trim(),
        email: user.email.trim().toLowerCase(),
        phone: phoneFormatted || undefined,
        identification: `Depósito - ${user.nome}`,
        expire: 3600,
        description: `Depósito na plataforma - R$ ${valor.toFixed(2)}`,
      }

      console.log('=== DEBUG GATEBOX PIX ===')
      console.log('Base URL:', gatewayConfig.baseUrl)
      console.log('Username:', gatewayConfig.username ? `${gatewayConfig.username.substring(0, 10)}...` : 'MISSING')
      console.log('External ID:', externalId)
      console.log('========================')

      try {
        const pixResponse = await gateboxCreatePix(
          {
            username: gatewayConfig.username,
            password: gatewayConfig.password,
            baseUrl: gatewayConfig.baseUrl,
          },
          pixPayload
        )

        console.log('Resposta Gatebox:', { 
          transactionId: pixResponse.transactionId, 
          endToEnd: pixResponse.endToEnd,
          qrCode: pixResponse.qrCode ? 'Presente' : 'Ausente',
          qrCodeText: pixResponse.qrCodeText ? 'Presente' : 'Ausente',
        })

        // Validar se temos pelo menos o QR Code Text (obrigatório) e transactionId
        if (!pixResponse.qrCodeText) {
          console.error('Resposta inválida da Gatebox: QR Code Text não encontrado', pixResponse)
          return NextResponse.json({ error: 'Resposta inválida da API: QR Code não gerado' }, { status: 500 })
        }
        
        if (!pixResponse.transactionId) {
          console.error('Resposta inválida da Gatebox: Transaction ID não encontrado', pixResponse)
          return NextResponse.json({ error: 'Resposta inválida da API: ID da transação não encontrado' }, { status: 500 })
        }

        // Criar registro da transação pendente
        // Usar externalId: o webhook Gatebox envia invoice.externalId e transaction.externalId no callback
        const refExterna = externalId
        await prisma.transacao.create({
          data: {
            usuarioId: user.id,
            tipo: 'deposito',
            status: 'pendente',
            valor,
            gatewayId: activeGateway.id,
            referenciaExterna: refExterna,
            descricao: `Depósito PIX via ${activeGateway.name} - Aguardando pagamento`,
          },
        })

        const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString()

        return NextResponse.json({
          qrCode: pixResponse.qrCode,
          qrCodeText: pixResponse.qrCodeText || pixResponse.qrCode,
          transactionId: pixResponse.transactionId || pixResponse.endToEnd,
          valor,
          status: 'pending',
          expiresAt,
        })
      } catch (gateboxError: any) {
        console.error('Erro ao criar PIX via Gatebox:', gateboxError)
        throw gateboxError
      }
    }

    // Usar SuitPay
    const clientId = gatewayConfig.clientId!
    const clientSecret = gatewayConfig.clientSecret!

    // Validar telefone - deve ter pelo menos 10 dígitos
    const phoneClean = (user.telefone || '').replace(/\D/g, '')
    if (phoneClean.length < 10) {
      return NextResponse.json(
        { error: 'Telefone inválido. Por favor, atualize seu telefone no perfil.' },
        { status: 400 }
      )
    }

    // Buscar código IBGE por CEP (se fornecido) ou usar padrão
    let codIbge = '5208707' // Goiânia como padrão
    let enderecoCompleto = {
      codIbge: '5208707',
      street: endereco?.street || 'Rua não informada',
      number: endereco?.number || 'S/N',
      complement: endereco?.complement || '',
      zipCode: cep ? cep.replace(/\D/g, '') : '74000000',
      neighborhood: endereco?.neighborhood || 'Centro',
      city: endereco?.city || 'Goiânia',
      state: endereco?.state || 'GO',
    }

    if (cep) {
      const cepLimpo = cep.replace(/\D/g, '')
      if (cepLimpo.length === 8) {
        const ibgeEncontrado = await buscarCodigoIBGEPorCEP(cepLimpo)
        if (ibgeEncontrado) {
          codIbge = ibgeEncontrado
          enderecoCompleto.codIbge = ibgeEncontrado
        }
      }
    }

    const callbackUrl = `${baseUrl}/api/webhooks/suitpay`
    const requestNumber = `deposito_${user.id}_${Date.now()}`
    const hoje = new Date()
    const dueDate = hoje.toISOString().split('T')[0]

    const pixPayload: SuitPayCreatePixPayload = {
      requestNumber,
      dueDate,
      amount: parseFloat(valor.toFixed(2)),
      usernameCheckout: process.env.SUITPAY_USERNAME_CHECKOUT || 'checkout',
      client: {
        name: user.nome.trim(),
        document: cpfLimpo,
        phoneNumber: phoneClean,
        email: user.email.trim().toLowerCase(),
        address: enderecoCompleto,
      },
      products: [
        {
          description: 'Depósito na plataforma',
          quantity: 1,
          value: parseFloat(valor.toFixed(2)),
        },
      ],
      callbackUrl,
    }

    console.log('=== DEBUG SUITPAY PIX ===')
    console.log('Base URL:', gatewayConfig.baseUrl)
    console.log('Client ID:', clientId ? `${clientId.substring(0, 10)}...` : 'MISSING')
    console.log('Request Number:', requestNumber)
    console.log('========================')

    const baseUrlSuitPay = gatewayConfig.baseUrl
    const pixResponse = await suitpayCreatePix(
      {
        clientId,
        clientSecret,
        baseUrl: baseUrlSuitPay,
      },
      pixPayload
    )

    console.log('Resposta SuitPay:', { 
      idTransaction: pixResponse.idTransaction, 
      response: pixResponse.response,
      qrCode: pixResponse.qrCode ? 'Presente' : 'Ausente',
      qrCodeImage: pixResponse.qrCodeImage ? 'Presente' : 'Ausente',
    })

    if (!pixResponse.idTransaction) {
      console.error('Resposta inválida da SuitPay:', pixResponse)
      return NextResponse.json({ error: 'Resposta inválida da API' }, { status: 500 })
    }

    // Criar registro da transação pendente
    await prisma.transacao.create({
      data: {
        usuarioId: user.id,
        tipo: 'deposito',
        status: 'pendente',
        valor,
        gatewayId: activeGateway.id,
        referenciaExterna: pixResponse.idTransaction,
        descricao: `Depósito PIX via ${activeGateway.name} - Aguardando pagamento`,
      },
    })

    return NextResponse.json({
      qrCode: pixResponse.qrCodeImage,
      qrCodeText: pixResponse.qrCode,
      transactionId: pixResponse.idTransaction,
      valor,
      status: 'pending',
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    })
  } catch (error: any) {
    console.error('Erro ao criar pagamento PIX:', error)
    
    const errorMessage = error.message || ''
    
    // Erro 401 - Não autenticado
    if (errorMessage.includes('401') || errorMessage.includes('autenticação')) {
      return NextResponse.json(
        { error: 'Erro de autenticação. Verifique se as credenciais estão configuradas corretamente.' },
        { status: 401 }
      )
    }
    
    // Erro 400 - Validação
    if (errorMessage.includes('400')) {
      return NextResponse.json(
        { error: 'Erro na validação dos dados. Verifique os campos informados.' },
        { status: 400 }
      )
    }
    
    // Erro genérico
    return NextResponse.json(
      { error: errorMessage || 'Erro ao criar pagamento PIX. Tente novamente ou entre em contato com o suporte.' },
      { status: 500 }
    )
  }
}
