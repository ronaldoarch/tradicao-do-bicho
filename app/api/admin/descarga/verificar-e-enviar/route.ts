import { NextRequest, NextResponse } from 'next/server'
import { gerarPDFRelatorioDescarga, estaProximoDoFechamento } from '@/lib/descarga-pdf'
import { enviarPDFWhatsApp } from '@/lib/whatsapp-sender'
import { prisma } from '@/lib/prisma'
import { buscarAlertasDescarga } from '@/lib/descarga-helpers'
import { extracoes } from '@/data/extracoes'
import { getHorarioRealApuracao } from '@/data/horarios-reais-apuracao'

/**
 * POST /api/admin/descarga/verificar-e-enviar
 * Verifica automaticamente se deve enviar relatório e envia se necessário
 * Este endpoint deve ser chamado por um cron job periodicamente (ex: a cada minuto)
 */
export async function POST(request: NextRequest) {
  // Verificar token de autenticação do cron (opcional, mas recomendado)
  const authHeader = request.headers.get('authorization')
  const cronToken = process.env.CRON_SECRET_TOKEN
  if (cronToken && authHeader !== `Bearer ${cronToken}`) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    // Buscar configuração
    const config = await prisma.configuracaoDescarga.findFirst({
      where: { ativo: true },
    })

    if (!config) {
      return NextResponse.json({
        message: 'Configuração de descarga não encontrada ou inativa',
        enviado: false,
      })
    }

    // Buscar alertas não resolvidos
    const alertas = await buscarAlertasDescarga(false)
    if (alertas.length === 0) {
      return NextResponse.json({
        message: 'Nenhum alerta de descarga encontrado',
        enviado: false,
      })
    }

    const agora = new Date()
    const resultados: Array<{
      loteria: string
      horario: string
      enviado: boolean
      motivo?: string
    }> = []

    // Verificar cada extração ativa
    for (const extracao of extracoes.filter((e) => e.active)) {
      const horarioReal = getHorarioRealApuracao(extracao.name, extracao.time)
      if (!horarioReal) continue

      // Verificar se está próximo do fechamento (10 minutos antes)
      const estaProximo = estaProximoDoFechamento(
        extracao.name,
        extracao.time,
        config.minutosAntesFechamento
      )

      if (!estaProximo) continue

      // Verificar se já foi enviado recentemente para esta extração (evitar duplicatas)
      const ultimoEnvio = config.ultimoEnvio
      if (ultimoEnvio) {
        const minutosDesdeUltimoEnvio =
          (agora.getTime() - ultimoEnvio.getTime()) / (1000 * 60)
        // Se foi enviado há menos de 5 minutos, não enviar novamente
        if (minutosDesdeUltimoEnvio < 5) {
          resultados.push({
            loteria: extracao.name,
            horario: extracao.time,
            enviado: false,
            motivo: 'Enviado recentemente',
          })
          continue
        }
      }

      // Verificar se há alertas para esta extração específica
      // Buscar apostas desta extração para verificar se há alertas relevantes
      const dataHoje = new Date(agora)
      dataHoje.setHours(0, 0, 0, 0)
      const dataHojeFim = new Date(agora)
      dataHojeFim.setHours(23, 59, 59, 999)

      const apostasExtracao = await prisma.aposta.findMany({
        where: {
          loteria: extracao.name,
          horario: extracao.time,
          dataConcurso: {
            gte: dataHoje,
            lte: dataHojeFim,
          },
        },
        select: { modalidade: true },
      })

      const modalidadesExtracao = new Set(
        apostasExtracao
          .map((a) => a.modalidade)
          .filter(Boolean) as string[]
      )

      const alertasRelevantes = alertas.filter((a) =>
        modalidadesExtracao.has(a.modalidade)
      )

      if (alertasRelevantes.length === 0) {
        resultados.push({
          loteria: extracao.name,
          horario: extracao.time,
          enviado: false,
          motivo: 'Nenhum alerta relevante para esta extração',
        })
        continue
      }

      // Gerar e enviar PDF
      try {
        const pdfBuffer = await gerarPDFRelatorioDescarga(
          agora,
          extracao.name,
          extracao.time
        )

        const mensagem =
          `📊 Relatório de Descarga - ${extracao.name} ${extracao.time}\n\n` +
          `Data: ${agora.toLocaleDateString('pt-BR')}\n` +
          `Horário de Fechamento: ${horarioReal.closeTimeReal}\n` +
          `\n⚠️ ${alertasRelevantes.length} alerta(s) de limite atingido\n` +
          `⏰ Enviado ${config.minutosAntesFechamento} minutos antes do fechamento`

        const resultado = await enviarPDFWhatsApp(
          config.whatsappNumero,
          pdfBuffer,
          mensagem
        )

        if (resultado.success) {
          // Atualizar último envio
          await prisma.configuracaoDescarga.update({
            where: { id: config.id },
            data: { ultimoEnvio: agora },
          })

          resultados.push({
            loteria: extracao.name,
            horario: extracao.time,
            enviado: true,
          })
        } else {
          resultados.push({
            loteria: extracao.name,
            horario: extracao.time,
            enviado: false,
            motivo: resultado.error || 'Erro ao enviar',
          })
        }
      } catch (error: any) {
        console.error(
          `Erro ao enviar relatório para ${extracao.name} ${extracao.time}:`,
          error
        )
        resultados.push({
          loteria: extracao.name,
          horario: extracao.time,
          enviado: false,
          motivo: error.message || 'Erro desconhecido',
        })
      }
    }

    const totalEnviados = resultados.filter((r) => r.enviado).length

    return NextResponse.json({
      success: totalEnviados > 0,
      totalEnviados,
      totalVerificados: resultados.length,
      resultados,
    })
  } catch (error: any) {
    console.error('Erro ao verificar e enviar relatórios:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao processar' },
      { status: 500 }
    )
  }
}
