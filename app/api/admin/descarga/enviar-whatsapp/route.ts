import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { parseSessionToken } from '@/lib/auth'
import { gerarPDFDescarga } from '@/lib/pdf-descarga'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/admin/descarga/enviar-whatsapp
 * Gera PDF e retorna link do WhatsApp para envio
 */
export async function POST(request: NextRequest) {
  const session = cookies().get('lotbicho_session')?.value
  const user = parseSessionToken(session)

  if (!user || !user.isAdmin) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const {
      numeroWhatsApp,
      modalidade,
      premio,
      dataConcurso,
      incluirLimites = true,
      incluirAlertas = true,
      incluirEstatisticas = true,
    } = body

    if (!numeroWhatsApp) {
      return NextResponse.json({ error: 'Número do WhatsApp é obrigatório' }, { status: 400 })
    }

    // Gerar PDF
    const pdfBuffer = await gerarPDFDescarga({
      modalidade,
      premio,
      dataConcurso: dataConcurso ? new Date(dataConcurso) : undefined,
      incluirLimites,
      incluirAlertas,
      incluirEstatisticas,
    })

    // Converter PDF para base64
    const pdfBase64 = pdfBuffer.toString('base64')
    const pdfDataUrl = `data:application/pdf;base64,${pdfBase64}`

    // Buscar configurações para usar número padrão se não fornecido
    const config = await prisma.configuracao.findFirst()
    const numeroParaEnviar = numeroWhatsApp || config?.whatsappSuporte || ''

    // Criar link do WhatsApp Web com mensagem e arquivo
    // Nota: WhatsApp Web não suporta envio direto de arquivos via URL
    // Vamos criar um link que abre o WhatsApp com mensagem pré-formatada
    const mensagem = encodeURIComponent(
      `📊 *Relatório de Descarga / Controle de Banca*\n\n` +
      `Gerado em: ${new Date().toLocaleString('pt-BR')}\n` +
      `\nO PDF do relatório está sendo gerado e será enviado em seguida.`
    )

    const whatsappLink = `https://wa.me/${numeroParaEnviar}?text=${mensagem}`

    // Retornar link e dados do PDF para download/envio manual
    return NextResponse.json({
      success: true,
      whatsappLink,
      pdfBase64,
      filename: `descarga_${new Date().toISOString().split('T')[0]}.pdf`,
      message:
        'PDF gerado com sucesso! Use o link do WhatsApp para abrir a conversa. Você precisará anexar o PDF manualmente.',
    })
  } catch (error) {
    console.error('Erro ao preparar envio via WhatsApp:', error)
    return NextResponse.json({ error: 'Erro ao preparar envio' }, { status: 500 })
  }
}
