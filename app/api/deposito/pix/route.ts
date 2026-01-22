import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { parseSessionToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { suitpayCreatePix, buscarCodigoIBGEPorCEP, type SuitPayCreatePixPayload } from '@/lib/suitpay-client'

export const dynamic = 'force-dynamic'

/**
 * Cria um pagamento PIX via SuitPay e retorna o QR code
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

    // Client ID e Client Secret são obrigatórios
    const clientId = process.env.SUITPAY_CLIENT_ID
    const clientSecret = process.env.SUITPAY_CLIENT_SECRET
    
    if (!clientId || !clientSecret) {
      console.error('SUITPAY_CLIENT_ID ou SUITPAY_CLIENT_SECRET não configurados')
      return NextResponse.json(
        { error: 'Configuração do gateway não encontrada. Entre em contato com o suporte.' },
        { status: 500 }
      )
    }

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

    // Construir URL do webhook
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                   (req.headers.get('host') ? `https://${req.headers.get('host')}` : 'http://localhost:3001')
    const callbackUrl = `${baseUrl}/api/webhooks/suitpay`

    // Request number único
    const requestNumber = `deposito_${user.id}_${Date.now()}`

    // Data de vencimento (hoje para PIX)
    const hoje = new Date()
    const dueDate = hoje.toISOString().split('T')[0] // AAAA-MM-DD

    // Payload conforme documentação SuitPay
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
    console.log('Base URL:', process.env.SUITPAY_BASE_URL || 'https://sandbox.ws.suitpay.app')
    console.log('Client ID:', clientId ? `${clientId.substring(0, 10)}...` : 'MISSING')
    console.log('Request Number:', requestNumber)
    console.log('========================')

    // Criar pagamento PIX via SuitPay
    const baseUrlSuitPay = process.env.SUITPAY_BASE_URL || 'https://sandbox.ws.suitpay.app'
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
        referenciaExterna: pixResponse.idTransaction,
        descricao: `Depósito PIX via SuitPay - Aguardando pagamento`,
      },
    })

    return NextResponse.json({
      qrCode: pixResponse.qrCodeImage, // Imagem base64 do QR code (se disponível)
      qrCodeText: pixResponse.qrCode, // Texto do QR code para copiar e colar
      transactionId: pixResponse.idTransaction,
      valor,
      status: 'pending',
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutos
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
