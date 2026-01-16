import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { parseSessionToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  gerarResultadoInstantaneo,
  conferirPalpite,
  calcularValorPorPalpite,
  type ModalityType,
} from '@/lib/bet-rules-engine'
import { ANIMALS } from '@/data/animals'
import { validarExtracaoParaAposta } from '@/lib/extracao-helpers'
import { parsePosition } from '@/lib/position-parser'
import { verificarLimiteDescarga } from '@/lib/descarga-helpers'

export async function GET() {
  const session = cookies().get('lotbicho_session')?.value
  const user = parseSessionToken(session)

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  try {
    const apostas = await prisma.aposta.findMany({
      where: { usuarioId: user.id },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      user: { id: user.id, email: user.email, nome: user.nome },
      apostas,
      total: apostas.length,
    })
  } catch (error) {
    console.error('Erro ao buscar apostas', error)
    return NextResponse.json({ error: 'Erro ao carregar apostas' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = cookies().get('lotbicho_session')?.value
  const user = parseSessionToken(session)

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const {
      concurso,
      loteria,
      estado,
      horario,
      dataConcurso,
      modalidade,
      aposta,
      valor,
      retornoPrevisto,
      status,
      detalhes,
      useBonus,
    } = body || {}

    if (!valor || Number.isNaN(Number(valor))) {
      return NextResponse.json({ error: 'Valor inválido' }, { status: 400 })
    }

    const valorNum = Number(valor)
    const useBonusFlag = Boolean(useBonus)
    const isInstant = detalhes && typeof detalhes === 'object' && 'betData' in detalhes && (detalhes as any).betData?.instant === true

    // Validação de extração (apenas para apostas normais)
    if (!isInstant && loteria) {
      const extracaoId = /^\d+$/.test(loteria) ? parseInt(loteria, 10) : null
      const nomeLoteria = extracaoId ? null : loteria
      const dataConcursoDate = dataConcurso ? new Date(dataConcurso) : null

      const validacao = validarExtracaoParaAposta(
        extracaoId,
        nomeLoteria,
        horario || null,
        dataConcursoDate
      )

      if (!validacao.isValid) {
        return NextResponse.json(
          { error: validacao.errorMessage || 'Extração inválida' },
          { status: 400 }
        )
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const usuario = await tx.usuario.findUnique({ where: { id: user.id } })
      if (!usuario) throw new Error('Usuário não encontrado')

      const bonusDisponivel = useBonusFlag && usuario.bonus > 0 ? usuario.bonus : 0
      const saldoDisponivel = usuario.saldo
      const totalDisponivel = saldoDisponivel + bonusDisponivel

      if (valorNum > totalDisponivel) {
        throw new Error('Saldo insuficiente')
      }

      // Debita primeiro do saldo, depois do bônus (se permitido)
      let debitarBonus = 0
      let debitarSaldo = Math.min(saldoDisponivel, valorNum)
      const restante = valorNum - debitarSaldo
      if (restante > 0) {
        if (bonusDisponivel <= 0) throw new Error('Saldo insuficiente (bônus indisponível)')
        debitarBonus = restante
      }

      let premioTotal = 0
      let resultadoInstantaneo = null

      // Processar aposta instantânea
      if (isInstant && detalhes && typeof detalhes === 'object' && 'betData' in detalhes) {
        const betData = (detalhes as any).betData as {
          modality: string | null
          modalityName?: string | null
          animalBets: number[][]
          position: string | null
          customPosition?: boolean
          customPositionValue?: string
          amount: number
          divisionType: 'all' | 'each'
        }

        // Mapear nome da modalidade para tipo
        const modalityMap: Record<string, ModalityType> = {
          'Grupo': 'GRUPO',
          'Dupla de Grupo': 'DUPLA_GRUPO',
          'Terno de Grupo': 'TERNO_GRUPO',
          'Quadra de Grupo': 'QUADRA_GRUPO',
          'Dezena': 'DEZENA',
          'Centena': 'CENTENA',
          'Milhar': 'MILHAR',
          'Dezena Invertida': 'DEZENA_INVERTIDA',
          'Centena Invertida': 'CENTENA_INVERTIDA',
          'Milhar Invertida': 'MILHAR_INVERTIDA',
          'Milhar/Centena': 'MILHAR_CENTENA',
          'Passe vai': 'PASSE',
          'Passe vai e vem': 'PASSE_VAI_E_VEM',
        }

        const modalityType = modalityMap[betData.modalityName || ''] || 'GRUPO'

        // Parsear posição usando função auxiliar
        const positionToUse = betData.customPosition && betData.customPositionValue 
          ? betData.customPositionValue.trim() 
          : betData.position
        
        const { pos_from, pos_to } = parsePosition(positionToUse)

        // Gerar resultado instantâneo
        resultadoInstantaneo = gerarResultadoInstantaneo(Math.max(pos_to, 7))

        // Calcular valor por palpite
        const qtdPalpites = betData.animalBets.length
        const valorPorPalpite = calcularValorPorPalpite(
          betData.amount,
          qtdPalpites,
          betData.divisionType
        )

        // Conferir cada palpite
        for (const animalBet of betData.animalBets) {
          const grupos = animalBet.map((animalId) => {
            // Encontrar o grupo do animal
            const animal = ANIMALS.find((a) => a.id === animalId)
            if (!animal) {
              throw new Error(`Animal não encontrado: ${animalId}`)
            }
            return animal.group
          })

          // Para modalidades de número, precisamos do número, não dos grupos
          let palpiteData: { grupos?: number[]; numero?: string } = {}
          
          if (modalityType.includes('GRUPO') || modalityType === 'PASSE' || modalityType === 'PASSE_VAI_E_VEM') {
            palpiteData = { grupos }
          } else {
            // Para modalidades de número, precisamos converter grupos em números
            // Por enquanto, vamos usar o primeiro grupo como exemplo
            // TODO: Implementar entrada de números para modalidades numéricas
            throw new Error('Modalidades numéricas ainda não suportadas para instantânea')
          }

          const conferencia = conferirPalpite(
            resultadoInstantaneo,
            modalityType,
            palpiteData,
            pos_from,
            pos_to,
            valorPorPalpite,
            betData.divisionType
          )

          premioTotal += conferencia.totalPrize
        }

        // Atualizar saldo: debita aposta e credita prêmio
        const saldoFinal = usuario.saldo - debitarSaldo + premioTotal
        const bonusFinal = usuario.bonus - debitarBonus

        await tx.usuario.update({
          where: { id: user.id },
          data: {
            saldo: saldoFinal,
            bonus: bonusFinal,
            rolloverAtual: usuario.rolloverAtual + valorNum,
          },
        })
      } else {
        // Aposta normal (não instantânea)
        await tx.usuario.update({
          where: { id: user.id },
          data: {
            saldo: usuario.saldo - debitarSaldo,
            bonus: usuario.bonus - debitarBonus,
            rolloverAtual: usuario.rolloverAtual + valorNum,
          },
        })
      }

      const created = await tx.aposta.create({
        data: {
          usuarioId: user.id,
          concurso: concurso || null,
          loteria: loteria || null,
          estado: estado || null,
          horario: horario || null,
          dataConcurso: dataConcurso ? new Date(dataConcurso) : null,
          modalidade: modalidade || null,
          aposta: aposta || null,
          valor: valorNum,
          retornoPrevisto: premioTotal > 0 ? premioTotal : (retornoPrevisto ? Number(retornoPrevisto) : 0),
          status: (() => {
            if (isInstant) {
              // Aposta instantânea: liquidado se ganhou, perdida se não ganhou
              return premioTotal > 0 ? 'liquidado' : 'perdida'
            } else {
              // Aposta normal: pendente até ser liquidada pelo cron
              return status || 'pendente'
            }
          })(),
          detalhes: {
            ...(detalhes && typeof detalhes === 'object' ? detalhes : {}),
            resultadoInstantaneo: resultadoInstantaneo,
            premioTotal,
          },
        },
      })

      return { ...created, resultadoInstantaneo, premioTotal }
    })

    // Verificar limites de descarga APÓS criar a aposta
    // (não bloqueia, apenas gera alertas se necessário)
    if (modalidade && detalhes && typeof detalhes === 'object' && 'betData' in detalhes) {
      const betData = (detalhes as any).betData
      const position = betData.position || betData.customPositionValue
      
      if (position) {
        const { pos_from, pos_to } = parsePosition(position)
        const premios = Array.from({ length: pos_to - pos_from + 1 }, (_, i) => pos_from + i)
        const dataConcursoDate = dataConcurso ? new Date(dataConcurso) : null
        
        // Verificar limites (não bloqueia, apenas cria alertas se necessário)
        try {
          await verificarLimiteDescarga(
            modalidade,
            premios,
            valorNum,
            dataConcursoDate
          )
        } catch (error) {
          // Se houver erro na verificação, não bloqueia a aposta
          console.error('Erro ao verificar limite de descarga:', error)
        }
      }
    }

    return NextResponse.json({ aposta: result }, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar aposta', error)
    const message = (error as Error).message || 'Erro ao criar aposta'
    const statusCode = message.includes('Saldo insuficiente') ? 400 : 500
    return NextResponse.json({ error: message }, { status: statusCode })
  }
}
