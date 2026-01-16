/**
 * Geração de PDF para relatório de descarga
 */

import PDFDocument from 'pdfkit'
import { buscarEstatisticasDescarga } from './descarga-helpers'
import { prisma } from './prisma'

export interface RelatorioDescargaOptions {
  modalidade?: string
  premio?: number
  dataConcurso?: Date
  incluirLimites?: boolean
  incluirAlertas?: boolean
  incluirEstatisticas?: boolean
}

/**
 * Gera um PDF com relatório de descarga
 */
export async function gerarPDFDescarga(
  options: RelatorioDescargaOptions = {}
): Promise<Buffer> {
  const {
    modalidade,
    premio,
    dataConcurso,
    incluirLimites = true,
    incluirAlertas = true,
    incluirEstatisticas = true,
  } = options

  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
      })

      const chunks: Buffer[] = []

      doc.on('data', (chunk) => chunks.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)

      // Cabeçalho
      doc
        .fontSize(20)
        .font('Helvetica-Bold')
        .text('RELATÓRIO DE DESCARGA / CONTROLE DE BANCA', { align: 'center' })

      doc.moveDown()
      doc
        .fontSize(12)
        .font('Helvetica')
        .text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, { align: 'center' })

      if (dataConcurso) {
        doc.text(`Data do Concurso: ${dataConcurso.toLocaleDateString('pt-BR')}`, {
          align: 'center',
        })
      }

      doc.moveDown(2)

      // Limites Configurados
      if (incluirLimites) {
        doc.fontSize(16).font('Helvetica-Bold').text('LIMITES CONFIGURADOS')
        doc.moveDown(0.5)
        doc.fontSize(10).font('Helvetica')

        const limites = await prisma.limiteDescarga.findMany({
          where: {
            ativo: true,
            ...(modalidade && { modalidade }),
            ...(premio && { premio }),
          },
          orderBy: [
            { modalidade: 'asc' },
            { premio: 'asc' },
          ],
        })

        if (limites.length === 0) {
          doc.text('Nenhum limite configurado.', { indent: 20 })
        } else {
          doc.font('Helvetica-Bold')
          doc.text('Modalidade', 50, doc.y, { continued: true, width: 150 })
          doc.text('Prêmio', { continued: true, width: 80 })
          doc.text('Limite (R$)', { continued: true, width: 120 })
          doc.text('Status', { width: 80 })
          doc.moveDown(0.3)

          doc.font('Helvetica')
          limites.forEach((limite) => {
            const y = doc.y
            if (y > 750) {
              doc.addPage()
            }

            doc.text(limite.modalidade, 50, doc.y, { continued: true, width: 150 })
            doc.text(`${limite.premio}º`, { continued: true, width: 80 })
            doc.text(formatarMoeda(limite.limite), { continued: true, width: 120 })
            doc.text(limite.ativo ? 'Ativo' : 'Inativo', { width: 80 })
            doc.moveDown(0.3)
          })
        }

        doc.moveDown()
      }

      // Alertas
      if (incluirAlertas) {
        doc.fontSize(16).font('Helvetica-Bold').text('ALERTAS DE DESCARGA')
        doc.moveDown(0.5)
        doc.fontSize(10).font('Helvetica')

        const alertas = await prisma.alertaDescarga.findMany({
          where: {
            resolvido: false,
            ...(modalidade && { modalidade }),
            ...(premio && { premio }),
            ...(dataConcurso && {
              dataConcurso: {
                gte: new Date(dataConcurso.setHours(0, 0, 0, 0)),
                lte: new Date(dataConcurso.setHours(23, 59, 59, 999)),
              },
            }),
          },
          orderBy: [
            { excedente: 'desc' },
            { createdAt: 'desc' },
          ],
        })

        if (alertas.length === 0) {
          doc.text('Nenhum alerta pendente.', { indent: 20 })
        } else {
          doc.font('Helvetica-Bold')
          doc.text('Modalidade', 50, doc.y, { continued: true, width: 120 })
          doc.text('Prêmio', { continued: true, width: 60 })
          doc.text('Total (R$)', { continued: true, width: 100 })
          doc.text('Excedente (R$)', { width: 120 })
          doc.moveDown(0.3)

          doc.font('Helvetica')
          alertas.forEach((alerta) => {
            const y = doc.y
            if (y > 750) {
              doc.addPage()
            }

            doc.text(alerta.modalidade, 50, doc.y, { continued: true, width: 120 })
            doc.text(`${alerta.premio}º`, { continued: true, width: 60 })
            doc.text(formatarMoeda(alerta.totalApostado), { continued: true, width: 100 })
            doc.font('Helvetica-Bold')
            doc.fillColor('red')
            doc.text(formatarMoeda(alerta.excedente), { width: 120 })
            doc.font('Helvetica')
            doc.fillColor('black')
            doc.moveDown(0.3)
          })
        }

        doc.moveDown()
      }

      // Estatísticas
      if (incluirEstatisticas) {
        doc.fontSize(16).font('Helvetica-Bold').text('ESTATÍSTICAS DE DESCARGA')
        doc.moveDown(0.5)
        doc.fontSize(10).font('Helvetica')

        const estatisticas = await buscarEstatisticasDescarga(modalidade, premio, dataConcurso)

        if (estatisticas.length === 0) {
          doc.text('Nenhuma estatística disponível.', { indent: 20 })
        } else {
          doc.font('Helvetica-Bold')
          doc.text('Modalidade', 50, doc.y, { continued: true, width: 120 })
          doc.text('Prêmio', { continued: true, width: 60 })
          doc.text('Total (R$)', { continued: true, width: 100 })
          doc.text('Limite (R$)', { continued: true, width: 100 })
          doc.text('Status', { width: 100 })
          doc.moveDown(0.3)

          doc.font('Helvetica')
          estatisticas.forEach((stat) => {
            const y = doc.y
            if (y > 750) {
              doc.addPage()
            }

            doc.text(stat.modalidade, 50, doc.y, { continued: true, width: 120 })
            doc.text(`${stat.premio}º`, { continued: true, width: 60 })
            doc.text(formatarMoeda(stat.totalApostado), { continued: true, width: 100 })
            doc.text(stat.limite ? formatarMoeda(stat.limite) : '-', {
              continued: true,
              width: 100,
            })
            if (stat.ultrapassou) {
              doc.font('Helvetica-Bold')
              doc.fillColor('red')
              doc.text(`Ultrapassado (+${formatarMoeda(stat.excedente)})`, { width: 100 })
            } else {
              doc.fillColor('green')
              doc.text('Dentro do limite', { width: 100 })
            }
            doc.font('Helvetica').fillColor('black')
            doc.moveDown(0.3)
          })
        }

        doc.moveDown()
      }

      // Rodapé
      const totalPages = doc.bufferedPageRange().count
      for (let i = 0; i < totalPages; i++) {
        doc.switchToPage(i)
        doc
          .fontSize(8)
          .font('Helvetica')
          .text(
            `Página ${i + 1} de ${totalPages} - Tradição do Bicho - Sistema de Descarga`,
            50,
            doc.page.height - 30,
            { align: 'center' }
          )
      }

      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}

function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor)
}
