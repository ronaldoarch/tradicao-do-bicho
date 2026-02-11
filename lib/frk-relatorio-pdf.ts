/**
 * Geração de PDF para relatório de descarga FRK
 */

import PDFDocument from 'pdfkit'
import { mapearTipoJogoFRK, mapearPremioFRK } from './frk-api-client'

export interface FrkRelatorioData {
  dataJogo: string // "YYYY-MM-DD"
  dataHora: string // "YYYY-MM-DD HH:mm"
  extracao: number
  apostas: Array<{
    modalidade: string
    tipo?: string
    numero: string
    premio: number
    valor: number
  }>
  config?: {
    baseUrl: string
    codigoIntegrador: string
    clienteId: number
    bancaId: number
    chrSerial?: string
    chrCodigoPonto?: string
    chrCodigoOperador?: string
  }
}

/**
 * Gera PDF com relatório de descarga FRK
 */
export function gerarPDFRelatorioFRK(data: FrkRelatorioData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        autoFirstPage: true,
      })

      const chunks: Buffer[] = []

      doc.on('data', (chunk) => chunks.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)

      // Cabeçalho
      doc.fontSize(20)
      doc.font('Helvetica-Bold')
      doc.text('RELATÓRIO DE DESCARGA FRK', { align: 'center' })

      doc.moveDown()
      doc.fontSize(12)
      doc.font('Helvetica')
      doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, { align: 'center' })

      doc.moveDown(2)

      // Dados da Descarga
      doc.fontSize(16)
      doc.font('Helvetica-Bold')
      doc.text('DADOS DA DESCARGA')
      doc.moveDown(0.5)
      doc.fontSize(11)
      doc.font('Helvetica')

      const dataFormatada = data.dataJogo.includes('/')
        ? data.dataJogo
        : new Date(data.dataJogo + 'T00:00:00').toLocaleDateString('pt-BR')

      doc.text(`Data do Jogo: ${dataFormatada}`, { indent: 20 })
      doc.text(`Data/Hora: ${data.dataHora}`, { indent: 20 })
      doc.text(`Extração: ${data.extracao}`, { indent: 20 })

      doc.moveDown()

      // Configuração FRK (se fornecida)
      if (data.config) {
        doc.fontSize(16)
        doc.font('Helvetica-Bold')
        doc.text('CONFIGURAÇÃO FRK')
        doc.moveDown(0.5)
        doc.fontSize(11)
        doc.font('Helvetica')
        doc.text(`Base URL: ${data.config.baseUrl}`, { indent: 20 })
        doc.text(`Código Integrador: ${data.config.codigoIntegrador.substring(0, 10)}...`, { indent: 20 })
        doc.text(`Cliente ID: ${data.config.clienteId}`, { indent: 20 })
        doc.text(`Banca ID: ${data.config.bancaId}`, { indent: 20 })
        if (data.config.chrSerial) doc.text(`Serial: ${data.config.chrSerial}`, { indent: 20 })
        if (data.config.chrCodigoPonto) doc.text(`Código do Ponto: ${data.config.chrCodigoPonto}`, { indent: 20 })
        if (data.config.chrCodigoOperador) doc.text(`Código do Operador: ${data.config.chrCodigoOperador}`, { indent: 20 })
        doc.moveDown()
      }

      // Resumo
      const quantidadeApostas = data.apostas.length
      const valorTotal = data.apostas.reduce((sum, ap) => sum + (ap.valor || 0), 0)

      doc.fontSize(16)
      doc.font('Helvetica-Bold')
      doc.text('RESUMO')
      doc.moveDown(0.5)
      doc.fontSize(11)
      doc.font('Helvetica')
      doc.text(`Quantidade de Apostas: ${quantidadeApostas}`, { indent: 20 })
      doc.text(`Valor Total: R$ ${valorTotal.toFixed(2).replace('.', ',')}`, { indent: 20 })

      doc.moveDown()

      // Tabela de Apostas
      doc.fontSize(16)
      doc.font('Helvetica-Bold')
      doc.text('APOSTAS ENVIADAS')
      doc.moveDown(0.5)

      // Cabeçalho da tabela
      doc.fontSize(10)
      doc.font('Helvetica-Bold')
      const tableTop = doc.y
      doc.text('Tipo', 50, tableTop, { width: 80 })
      doc.text('Número', 130, tableTop, { width: 100 })
      doc.text('Prêmio', 230, tableTop, { width: 60 })
      doc.text('Valor (R$)', 290, tableTop, { width: 100 })
      doc.text('Tipo FRK', 390, tableTop, { width: 60 })

      doc.moveDown(0.3)
      doc.font('Helvetica')
      doc.fontSize(9)

      // Linhas da tabela
      data.apostas.forEach((aposta, index) => {
        const y = doc.y
        if (y > 750) {
          doc.addPage()
          // Redesenhar cabeçalho
          doc.fontSize(10)
          doc.font('Helvetica-Bold')
          const newTableTop = doc.y
          doc.text('Tipo', 50, newTableTop, { width: 80 })
          doc.text('Número', 130, newTableTop, { width: 100 })
          doc.text('Prêmio', 230, newTableTop, { width: 60 })
          doc.text('Valor (R$)', 290, newTableTop, { width: 100 })
          doc.text('Tipo FRK', 390, newTableTop, { width: 60 })
          doc.moveDown(0.3)
          doc.font('Helvetica')
          doc.fontSize(9)
        }

        const tipoJogoFRK = mapearTipoJogoFRK(aposta.modalidade || 'GRUPO', aposta.tipo || '')
        const premioFRK = mapearPremioFRK(aposta.premio || 1)

        doc.text(aposta.modalidade || 'GRUPO', 50, doc.y, { width: 80 })
        doc.text(aposta.numero || '', 130, doc.y, { width: 100 })
        doc.text(`${aposta.premio}º (${premioFRK})`, 230, doc.y, { width: 60 })
        doc.text(aposta.valor.toFixed(2).replace('.', ','), 290, doc.y, { width: 100 })
        doc.text(tipoJogoFRK.toString(), 390, doc.y, { width: 60 })

        doc.moveDown(0.3)

        // Linha separadora
        if (index < data.apostas.length - 1) {
          doc.moveTo(50, doc.y)
          doc.lineTo(550, doc.y)
          doc.strokeColor('#cccccc')
          doc.lineWidth(0.5)
          doc.stroke()
          doc.moveDown(0.2)
        }
      })

      doc.moveDown()

      // Formato JSON (para referência técnica)
      doc.fontSize(14)
      doc.font('Helvetica-Bold')
      doc.text('DADOS ENVIADOS PARA API FRK')
      doc.moveDown(0.5)
      doc.fontSize(9)
      doc.font('Helvetica')

      const jsonData = {
        sdtDataJogo: data.dataJogo,
        sdtDataHora: data.dataHora,
        tnyExtracao: data.extracao,
        sntQuantidadeApostas: quantidadeApostas,
        numValorApostas: valorTotal,
        arrApostas: data.apostas.map((ap) => ({
          sntTipoJogo: mapearTipoJogoFRK(ap.modalidade || 'GRUPO', ap.tipo || ''),
          vchNumero: ap.numero || '',
          vchPremio: mapearPremioFRK(ap.premio || 1),
          numValor: ap.valor || 0,
          numValorTotal: ap.valor || 0,
        })),
      }

      const jsonString = JSON.stringify(jsonData, null, 2)
      const lines = jsonString.split('\n')
      
      lines.forEach((line) => {
        const y = doc.y
        if (y > 750) {
          doc.addPage()
        }
        doc.text(line, { indent: 20 })
      })

      // Rodapé
      const totalPages = doc.bufferedPageRange().count
      for (let i = 0; i < totalPages; i++) {
        doc.switchToPage(i)
        doc.fontSize(8)
        doc.font('Helvetica')
        doc.text(
          `Página ${i + 1} de ${totalPages} - Relatório de Descarga FRK`,
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
