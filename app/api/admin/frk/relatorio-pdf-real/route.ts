import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAPI } from '@/lib/admin-auth'
import { gerarPDFRelatorioFRK } from '@/lib/frk-relatorio-pdf'
import { getFrkConfigForClient } from '@/lib/frk-store'
import { FrkApiClient } from '@/lib/frk-api-client'
import { prisma } from '@/lib/prisma'
import { ANIMALS } from '@/data/animals'

export const dynamic = 'force-dynamic'

interface ApostaFRK {
  modalidade: string
  tipo?: string
  numero: string
  premio: number
  valor: number
}

const MODALIDADES_GRUPO = ['GRUPO', 'DUPLA_GRUPO', 'TERNO_GRUPO', 'QUADRA_GRUPO', 'QUINA_GRUPO']

/**
 * Extrai o número apostado do betData (suporta modalidades numéricas e de grupo)
 */
function extrairNumeroAposta(
  betData: Record<string, unknown>,
  modalidade: string
): string {
  // Modalidades de grupo: usar animalBets (IDs de animais → grupos)
  if (MODALIDADES_GRUPO.includes(modalidade)) {
    const animalBets = betData.animalBets as number[][] | undefined
    if (Array.isArray(animalBets) && animalBets.length > 0) {
      const primeiroPalpite = animalBets[0]
      if (Array.isArray(primeiroPalpite) && primeiroPalpite.length > 0) {
        const grupos = primeiroPalpite.map((animalId) => {
          const animal = ANIMALS.find((a) => a.id === animalId)
          return animal ? animal.group : animalId
        })
        return grupos.map((g) => String(g).padStart(2, '0')).join('')
      }
    }
  }

  // Modalidades numéricas: numbers, numberBets ou number
  return (
    (Array.isArray(betData.numbers)
      ? String(betData.numbers[0] ?? '')
      : Array.isArray(betData.numberBets)
        ? String(betData.numberBets[0] ?? '')
        : String(betData.number ?? '')) || ''
  )
}

/**
 * Converte apostas do banco de dados para o formato FRK
 * Expande apostas que cobrem múltiplos prêmios (ex: 1º-5º) em uma linha por prêmio
 */
function converterApostasParaFormatoFRK(apostas: Array<{
  modalidade: string | null
  valor: number
  detalhes: unknown
}>): ApostaFRK[] {
  const resultado: ApostaFRK[] = []

  for (const aposta of apostas) {
    const detalhes = aposta.detalhes as Record<string, unknown> | null
    const betData = detalhes?.betData as Record<string, unknown> | undefined
    if (!betData) continue

    const positionToUse =
      (betData.customPosition && betData.customPositionValue
        ? String(betData.customPositionValue).trim()
        : betData.position) as string | undefined

    if (!positionToUse) continue

    const modalidade = aposta.modalidade || 'GRUPO'
    const numero = extrairNumeroAposta(betData, modalidade)
    const valorTotal = aposta.valor || 0
    const divisionType = (betData.divisionType as string) || 'all'

    // Parsear posição (ex: "1-5", "1", "1st")
    const cleanedPos = positionToUse.replace(/º/g, '').replace(/\s/g, '')
    let premios: number[] = []

    if (cleanedPos === '1st' || cleanedPos === '1') {
      premios = [1]
    } else if (cleanedPos.includes('-')) {
      const [from, to] = cleanedPos.split('-').map(Number)
      if (!isNaN(from) && !isNaN(to) && from >= 1 && to <= 7) {
        for (let p = from; p <= to; p++) premios.push(p)
      }
    } else {
      const singlePos = parseInt(cleanedPos, 10)
      if (!isNaN(singlePos) && singlePos >= 1 && singlePos <= 7) {
        premios = [singlePos]
      }
    }

    // "Para todo o palpite" (all): valor é o total, dividir entre as posições
    // "Para cada palpite" (each): valor é por posição, usar integral em cada
    const valorPorPremio =
      divisionType === 'all' && premios.length > 1
        ? valorTotal / premios.length
        : valorTotal

    for (const premio of premios) {
      resultado.push({
        modalidade,
        tipo: '',
        numero: numero ? numero.padStart(4, '0') : '0000',
        premio,
        valor: Math.round(valorPorPremio * 100) / 100,
      })
    }
  }

  return resultado
}

/**
 * GET /api/admin/frk/relatorio-pdf-real?data=YYYY-MM-DD&extracao=130&incluirLiquidadas=true
 * Gera PDF com relatório REAL de apostas do banco
 * incluirLiquidadas=true: inclui apostas fechadas e liquidadas (além das pendentes)
 */
export async function GET(request: NextRequest) {
  const adminCheck = await requireAdminAPI(request)
  if (adminCheck instanceof NextResponse) {
    return adminCheck
  }

  try {
    const { searchParams } = new URL(request.url)
    const dataParam = searchParams.get('data') || new Date().toISOString().split('T')[0]
    const extracaoParam = searchParams.get('extracao')
    const incluirLiquidadas = searchParams.get('incluirLiquidadas') === 'true'

    const dataJogo = dataParam
    const dataConcurso = new Date(dataJogo + 'T00:00:00')
    const inicioDia = new Date(dataConcurso)
    inicioDia.setHours(0, 0, 0, 0)
    const fimDia = new Date(dataConcurso)
    fimDia.setHours(23, 59, 59, 999)

    const statusFiltro = incluirLiquidadas
      ? { in: ['pendente', 'liquidado', 'perdida'] }
      : 'pendente'

    const apostasDb = await prisma.aposta.findMany({
      where: {
        status: statusFiltro,
        dataConcurso: {
          gte: inicioDia,
          lte: fimDia,
        },
      },
      select: {
        modalidade: true,
        valor: true,
        detalhes: true,
      },
    })

    const apostas = converterApostasParaFormatoFRK(apostasDb)

    if (apostas.length === 0) {
      return NextResponse.json(
        {
          error: incluirLiquidadas
            ? 'Nenhuma aposta encontrada para esta data (pendentes ou liquidadas)'
            : 'Nenhuma aposta pendente encontrada para esta data',
        },
        { status: 404 }
      )
    }

    // Obter número da extração
    let extracao = extracaoParam ? parseInt(extracaoParam, 10) : 0
    if (!extracao) {
      try {
        const configData = await getFrkConfigForClient()
        if (configData) {
          const client = new FrkApiClient(configData)
          const extracoes = await client.buscarExtracoes(dataJogo)
          if (extracoes?.length) {
            extracao = extracoes[0].tnyExtracao ?? 0
          }
        }
      } catch {
        // Usar 0 se não conseguir buscar da API
      }
    }

    const dataHora = new Date().toISOString().slice(0, 16).replace('T', ' ')

    // Buscar configuração FRK para incluir no relatório
    let config = null
    try {
      const configData = await getFrkConfigForClient()
      if (configData) {
        config = {
          baseUrl: configData.baseUrl,
          codigoIntegrador: configData.CodigoIntegrador || '',
          clienteId: configData.Cliente_ID || 0,
          bancaId: configData.Banca_ID || 0,
          chrSerial: configData.chrSerial || undefined,
          chrCodigoPonto: configData.chrCodigoPonto || undefined,
          chrCodigoOperador: configData.chrCodigoOperador || undefined,
        }
      }
    } catch {
      // Ignorar
    }

    const pdfBuffer = await gerarPDFRelatorioFRK({
      dataJogo,
      dataHora,
      extracao: extracao || 0,
      apostas,
      config: config || undefined,
    })

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="relatorio_descarga_frk_REAL_${dataJogo}_${extracao || 'N'}.pdf"`,
      },
    })
  } catch (error: unknown) {
    console.error('Erro ao gerar PDF relatório FRK (real):', error)
    return NextResponse.json(
      {
        error: 'Erro ao gerar PDF',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    )
  }
}
