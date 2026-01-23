import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { gerarPDFRelatorioDescarga } from '@/lib/descarga-pdf'
import { enviarPDFWhatsApp } from '@/lib/whatsapp-sender'
import { prisma } from '@/lib/prisma'
import { buscarAlertasDescarga } from '@/lib/descarga-helpers'

/**
 * POST /api/admin/descarga/enviar-relatorio
 * Envia relatório de descarga manualmente
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
  } catch (error) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { loteria, horario, numeroWhatsApp } = body

    // Buscar configuração ou usar número fornecido
    let numero = numeroWhatsApp
    if (!numero) {
      const config = await prisma.configuracaoDescarga.findFirst({
        where: { ativo: true },
      })
      if (!config) {
        return NextResponse.json(
          { error: 'Nenhuma configuração de WhatsApp encontrada' },
          { status: 400 }
        )
      }
      numero = config.whatsappNumero
    }

    // Verificar se há alertas (limites atingidos)
    const alertas = await buscarAlertasDescarga(false)
    // Permitir envio mesmo sem alertas para teste
    const mensagemAlerta = alertas.length > 0 
      ? `\n⚠️ ${alertas.length} alerta(s) de limite atingido`
      : '\n✅ Nenhum alerta de descarga no momento'

    // Gerar PDF
    const data = new Date()
    const pdfBuffer = await gerarPDFRelatorioDescarga(data, loteria, horario)

    // Enviar via WhatsApp
    const mensagem = `📊 Relatório de Descarga - TESTE\n\n` +
      `Data: ${data.toLocaleDateString('pt-BR')}\n` +
      `Hora: ${data.toLocaleTimeString('pt-BR')}\n` +
      (loteria ? `Loteria: ${loteria}\n` : '') +
      (horario ? `Horário: ${horario}\n` : '') +
      mensagemAlerta

    const resultado = await enviarPDFWhatsApp(numero, pdfBuffer, mensagem)

    if (resultado.success) {
      // Atualizar último envio
      await prisma.configuracaoDescarga.updateMany({
        where: { ativo: true },
        data: { ultimoEnvio: new Date() },
      })

      return NextResponse.json({
        success: true,
        enviado: true,
        message: 'Relatório enviado com sucesso',
        messageId: resultado.messageId,
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          enviado: false,
          error: resultado.error || 'Erro ao enviar relatório',
          motivo: resultado.error || 'Erro ao enviar relatório',
        },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Erro ao enviar relatório:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao enviar relatório' },
      { status: 500 }
    )
  }
}
