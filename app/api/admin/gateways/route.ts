import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAPI } from '@/lib/admin-auth'
import { listGateways, createGateway, updateGateway, deleteGateway } from '@/lib/gateways-store'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const adminCheck = await requireAdminAPI(request)
  if (adminCheck instanceof NextResponse) {
    return adminCheck
  }

  try {
    const gateways = await listGateways()
    // Não retornar senhas reais
    const gatewaysSafe = gateways.map(gw => ({
      ...gw,
      password: gw.password ? '***' : null,
      passwordSet: !!gw.password,
      // Para SuitPay, não mostrar apiKey completo
      apiKey: gw.apiKey
        ? gw.type === 'suitpay'
          ? gw.apiKey.split('|')[0] + '|***'
          : '***'
        : null,
    }))
    const appBase = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '')
    const whSecret = process.env.SELECTBANKING_WEBHOOK_SECRET || process.env.WEBHOOK_SECRET || ''
    const selectbankingWebhookUrl = appBase
      ? `${appBase}/api/webhooks/selectbanking${whSecret ? `?secret=${encodeURIComponent(whSecret)}` : ''}`
      : ''

    return NextResponse.json({
      gateways: gatewaysSafe,
      total: gatewaysSafe.length,
      selectbankingWebhookUrl,
      selectbankingWebhookSecretConfigured: Boolean(whSecret),
    })
  } catch (error) {
    console.error('Erro ao listar gateways:', error)
    return NextResponse.json({ gateways: [], total: 0, error: 'Erro ao listar gateways' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const adminCheck = await requireAdminAPI(request)
  if (adminCheck instanceof NextResponse) {
    return adminCheck
  }

  try {
    const body = await request.json()
    const gw = await createGateway(body)
    // Não retornar senha real
    const gwSafe = {
      ...gw,
      password: gw.password ? '***' : null,
      passwordSet: !!gw.password,
      apiKey: gw.apiKey
        ? gw.type === 'suitpay'
          ? gw.apiKey.split('|')[0] + '|***'
          : '***'
        : null,
    }
    return NextResponse.json({ gateway: gwSafe, message: 'Gateway criado com sucesso' })
  } catch (error) {
    console.error('Erro ao criar gateway:', error)
    return NextResponse.json({ error: 'Erro ao criar gateway' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const adminCheck = await requireAdminAPI(request)
  if (adminCheck instanceof NextResponse) {
    return adminCheck
  }

  try {
    const body = await request.json()
    if (!body.id) {
      return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 })
    }
    const gw = await updateGateway(Number(body.id), body)
    // Não retornar senha real
    const gwSafe = {
      ...gw,
      password: gw.password ? '***' : null,
      passwordSet: !!gw.password,
      apiKey: gw.apiKey
        ? gw.type === 'suitpay'
          ? gw.apiKey.split('|')[0] + '|***'
          : '***'
        : null,
    }
    return NextResponse.json({ gateway: gwSafe, message: 'Gateway atualizado com sucesso' })
  } catch (error) {
    console.error('Erro ao atualizar gateway:', error)
    return NextResponse.json({ error: 'Erro ao atualizar gateway' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const adminCheck = await requireAdminAPI(request)
  if (adminCheck instanceof NextResponse) {
    return adminCheck
  }

  try {
    const { searchParams } = new URL(request.url)
    const id = Number(searchParams.get('id') || '0')
    if (!id) return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 })
    await deleteGateway(id)
    return NextResponse.json({ message: 'Gateway deletado com sucesso' })
  } catch (error) {
    console.error('Erro ao deletar gateway:', error)
    return NextResponse.json({ error: 'Erro ao deletar gateway' }, { status: 500 })
  }
}
