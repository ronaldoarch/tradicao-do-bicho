import PDFDocument from 'pdfkit'
import { buscarEstatisticasDescarga } from './descarga-helpers'
import { prisma } from './prisma'
import { getHorarioRealApuracao } from '@/data/horarios-reais-apuracao'

export interface RelatorioDescargaData {
  data: Date
  loteria?: string
  horario?: string
  estatisticas: Array<{
    modalidade: string
    premio: number
    totalApostado: number
    limite: number | null
    excedente: number
    ultrapassou: boolean
  }>
  alertas: Array<{
    modalidade: string
    premio: number
    limite: number
    totalApostado: number
    excedente: number
  }>
}

/**
 * Gera PDF do relatório de descarga
 */
export async function gerarPDFRelatorioDescarga(
  data: Date,
  loteria?: string,
  horario?: string
): Promise<Buffer> {
  // Buscar estatísticas
  const estatisticas = await buscarEstatisticasDescarga(undefined, undefined, data)
  
  // Criar cópias da data para não modificar a original
  const dataInicio = new Date(data)
  dataInicio.setHours(0, 0, 0, 0)
  const dataFim = new Date(data)
  dataFim.setHours(23, 59, 59, 999)

  // Buscar alertas não resolvidos
  const alertas = await prisma.alertaDescarga.findMany({
    where: {
      resolvido: false,
      dataConcurso: {
        gte: dataInicio,
        lte: dataFim,
      },
    },
  })

  // Filtrar por loteria/horário se especificado
  let estatisticasFiltradas = estatisticas
  let alertasFiltrados = alertas

  if (loteria || horario) {
    // Buscar apostas da loteria/horário específico
    const apostas = await prisma.aposta.findMany({
      where: {
        dataConcurso: {
          gte: dataInicio,
          lte: dataFim,
        },
        ...(loteria && { loteria }),
        ...(horario && { horario }),
      },
      select: {
        modalidade: true,
        detalhes: true,
      },
    })

    const modalidadesRelevantes = new Set(
      apostas.map((a) => a.modalidade).filter(Boolean) as string[]
    )

    estatisticasFiltradas = estatisticas.filter((e) =>
      modalidadesRelevantes.has(e.modalidade)
    )
    alertasFiltrados = alertas.filter((a) =>
      modalidadesRelevantes.has(a.modalidade)
    )
  }

  // Criar PDF
  const doc = new PDFDocument({ margin: 50 })
  const buffers: Buffer[] = []

  doc.on('data', buffers.push.bind(buffers))
  doc.on('end', () => {})

  // Cabeçalho
  doc.fontSize(20).text('Relatório de Descarga', { align: 'center' })
  doc.moveDown()
  doc.fontSize(12)
  doc.text(`Data: ${data.toLocaleDateString('pt-BR')}`)
  if (loteria) doc.text(`Loteria: ${loteria}`)
  if (horario) doc.text(`Horário: ${horario}`)
  doc.moveDown()

  // Estatísticas
  doc.fontSize(16).text('Estatísticas de Descarga', { underline: true })
  doc.moveDown(0.5)
  doc.fontSize(10)

  if (estatisticasFiltradas.length === 0) {
    doc.text('Nenhuma estatística disponível.')
  } else {
    estatisticasFiltradas.forEach((stat) => {
      const status = stat.ultrapassou ? '⚠️ LIMITE ULTRAPASSADO' : '✅ OK'
      doc.text(
        `${stat.modalidade} - ${stat.premio}º Prêmio: R$ ${stat.totalApostado.toFixed(2)} / R$ ${stat.limite?.toFixed(2) || 'N/A'} ${status}`,
        { indent: 20 }
      )
      if (stat.excedente > 0) {
        doc.text(`  Excedente: R$ ${stat.excedente.toFixed(2)}`, {
          indent: 40,
          color: 'red',
        })
      }
    })
  }

  doc.moveDown()

  // Alertas
  if (alertasFiltrados.length > 0) {
    doc.fontSize(16).text('Alertas de Descarga', { underline: true })
    doc.moveDown(0.5)
    doc.fontSize(10)

    alertasFiltrados.forEach((alerta) => {
      doc.text(
        `⚠️ ${alerta.modalidade} - ${alerta.premio}º Prêmio`,
        { indent: 20, color: 'red' }
      )
      doc.text(`  Total Apostado: R$ ${alerta.totalApostado.toFixed(2)}`, {
        indent: 40,
      })
      doc.text(`  Limite: R$ ${alerta.limite.toFixed(2)}`, { indent: 40 })
      doc.text(`  Excedente: R$ ${alerta.excedente.toFixed(2)}`, {
        indent: 40,
        color: 'red',
      })
      doc.moveDown(0.3)
    })
  }

  // Rodapé
  doc.moveDown()
  doc.fontSize(8).text(
    `Gerado em: ${new Date().toLocaleString('pt-BR')}`,
    { align: 'center' }
  )

  doc.end()

  // Aguardar finalização do PDF
  return new Promise((resolve, reject) => {
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(buffers)
      resolve(pdfBuffer)
    })
    doc.on('error', reject)
  })
}

/**
 * Verifica se está X minutos antes do fechamento de uma extração
 */
export function estaProximoDoFechamento(
  loteria: string,
  horario: string,
  minutosAntes: number = 10
): boolean {
  const horarioReal = getHorarioRealApuracao(loteria, horario)
  if (!horarioReal) return false

  const agora = new Date()
  const [horaFechamento, minutoFechamento] = horarioReal.closeTimeReal
    .split(':')
    .map(Number)

  const dataFechamento = new Date()
  dataFechamento.setHours(horaFechamento, minutoFechamento, 0, 0)

  // Se já passou o horário hoje, considerar amanhã
  if (dataFechamento < agora) {
    dataFechamento.setDate(dataFechamento.getDate() + 1)
  }

  const diferencaMinutos =
    (dataFechamento.getTime() - agora.getTime()) / (1000 * 60)

  return diferencaMinutos <= minutosAntes && diferencaMinutos >= 0
}
