import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { parseSessionToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { 
  gateboxCreatePix, 
  type GateboxCreatePixPayload,
  gateboxClearTokenCache 
} from '@/lib/gatebox-client'

export const dynamic = 'force-dynamic'

/**
 * Cria um pagamento PIX via Gatebox e retorna o QR code
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
    const { valor, document } = body

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

    // Buscar configurações do Gatebox (banco de dados ou env vars)
    const { getGateboxConfig } = await import('@/lib/gatebox-client')
    const gateboxConfig = await getGateboxConfig()
    
    if (!gateboxConfig) {
      console.error('Configuração do Gatebox não encontrada')
      return NextResponse.json(
        { error: 'Configuração do gateway não encontrada. Configure o Gatebox no painel administrativo.' },
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
          // Remove o 0 inicial se houver
          phoneFormatted = '55' + phoneFormatted.substring(1)
        } else if (phoneFormatted.length === 10 || phoneFormatted.length === 11) {
          phoneFormatted = '55' + phoneFormatted
        }
        phoneFormatted = '+' + phoneFormatted
      }
    }

    // Construir URL do webhook
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                   (req.headers.get('host') ? `https://${req.headers.get('host')}` : 'http://localhost:3001')
    const callbackUrl = `${baseUrl}/api/webhooks/gatebox`

    // External ID único (usado para conciliação)
    const externalId = `deposito_${user.id}_${Date.now()}`

    // Payload conforme documentação Gatebox
    const pixPayload: GateboxCreatePixPayload = {
      externalId,
      amount: parseFloat(valor.toFixed(2)),
      document: cpfLimpo,
      name: user.nome.trim(),
      email: user.email.trim().toLowerCase(),
      phone: phoneFormatted || undefined,
      identification: `Depósito - ${user.nome}`,
      expire: 3600, // 1 hora
      description: `Depósito na plataforma - R$ ${valor.toFixed(2)}`,
    }

    console.log('=== DEBUG GATEBOX PIX ===')
    console.log('Base URL:', gateboxConfig.baseUrl)
    console.log('Username:', gateboxConfig.username ? `${gateboxConfig.username.substring(0, 10)}...` : 'MISSING')
    console.log('External ID:', externalId)
    console.log('========================')

    // Criar pagamento PIX via Gatebox
    const pixResponse = await gateboxCreatePix(
      gateboxConfig,
      pixPayload
    )

    console.log('Resposta Gatebox:', { 
      transactionId: pixResponse.transactionId, 
      endToEnd: pixResponse.endToEnd,
      qrCode: pixResponse.qrCode ? 'Presente' : 'Ausente',
      qrCodeText: pixResponse.qrCodeText ? 'Presente' : 'Ausente',
    })

    if (!pixResponse.transactionId && !pixResponse.endToEnd) {
      console.error('Resposta inválida da Gatebox:', pixResponse)
      return NextResponse.json({ error: 'Resposta inválida da API' }, { status: 500 })
    }

    // Criar registro da transação pendente
    // Usar transactionId do Gatebox para o webhook encontrar (Gatebox envia esse ID no callback)
    const refExterna = pixResponse.transactionId || pixResponse.endToEnd || externalId
    await prisma.transacao.create({
      data: {
        usuarioId: user.id,
        tipo: 'deposito',
        status: 'pendente',
        valor,
        referenciaExterna: refExterna,
        descricao: `Depósito PIX via Gatebox - Aguardando pagamento`,
      },
    })

    // Calcular data de expiração (1 hora)
    const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString()

    return NextResponse.json({
      qrCode: pixResponse.qrCode, // QR Code em base64 ou texto
      qrCodeText: pixResponse.qrCodeText || pixResponse.qrCode, // Texto do QR Code para copiar
      transactionId: pixResponse.transactionId || pixResponse.endToEnd,
      valor,
      status: 'pending',
      expiresAt,
    })
  } catch (error: any) {
    console.error('Erro ao criar pagamento PIX:', error)
    
    // Limpar cache de token em caso de erro de autenticação
    if (error.message?.includes('authentication') || error.message?.includes('401')) {
      gateboxClearTokenCache()
    }
    
    const errorMessage = error.message || ''
    
    // Erro 401 - Não autenticado
    if (errorMessage.includes('401') || errorMessage.includes('authentication') || errorMessage.includes('autenticação')) {
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
