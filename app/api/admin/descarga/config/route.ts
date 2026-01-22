import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/admin/descarga/config
 * Busca configuração de envio de relatórios
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
  } catch (error) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  try {
    const config = await prisma.configuracaoDescarga.findFirst({
      where: { ativo: true },
    })

    if (!config) {
      return NextResponse.json({ config: null })
    }

    return NextResponse.json({ config })
  } catch (error) {
    console.error('Erro ao buscar configuração:', error)
    return NextResponse.json(
      { error: 'Erro ao carregar configuração' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/descarga/config
 * Cria ou atualiza configuração de envio de relatórios
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
  } catch (error) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { whatsappNumero, minutosAntesFechamento, ativo } = body

    if (!whatsappNumero) {
      return NextResponse.json(
        { error: 'Número WhatsApp é obrigatório' },
        { status: 400 }
      )
    }

    // Formatar número (remover caracteres não numéricos)
    const numeroFormatado = whatsappNumero.replace(/\D/g, '')

    // Verificar se já existe configuração ativa
    const configExistente = await prisma.configuracaoDescarga.findFirst({
      where: { ativo: true },
    })

    let config
    if (configExistente) {
      // Atualizar existente
      config = await prisma.configuracaoDescarga.update({
        where: { id: configExistente.id },
        data: {
          whatsappNumero: numeroFormatado,
          minutosAntesFechamento: minutosAntesFechamento
            ? Number(minutosAntesFechamento)
            : 10,
          ativo: ativo !== undefined ? Boolean(ativo) : true,
        },
      })
    } else {
      // Criar nova
      config = await prisma.configuracaoDescarga.create({
        data: {
          whatsappNumero: numeroFormatado,
          minutosAntesFechamento: minutosAntesFechamento
            ? Number(minutosAntesFechamento)
            : 10,
          ativo: ativo !== undefined ? Boolean(ativo) : true,
        },
      })
    }

    return NextResponse.json({
      success: true,
      config,
      message: 'Configuração salva com sucesso',
    })
  } catch (error: any) {
    console.error('Erro ao salvar configuração:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao salvar configuração' },
      { status: 500 }
    )
  }
}
