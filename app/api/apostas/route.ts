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
import { verificarLimiteDescargaPorNumero, extrairPremiosDaPosicao } from '@/lib/descarga'

export async function GET() {
  const session = cookies().get('lotbicho_session')?.value
  const user = parseSessionToken(session)

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  try {
    const apostas = await prisma.aposta.findMany({
      where: { usuarioId: user.id },
      orderBy: { id: 'desc' },
    })

    // Buscar cartelas de bingo do usuário
    const cartelasBingo = await prisma.cartelaBingo.findMany({
      where: { usuarioId: user.id },
      include: {
        sala: {
          select: {
            id: true,
            nome: true,
            emAndamento: true,
            numerosSorteados: true,
            resultadoFinal: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Converter cartelas de bingo para formato de aposta
    const apostasBingo = cartelasBingo.map((cartela) => ({
      id: cartela.id + 1000000, // Offset para não conflitar com IDs de apostas normais
      tipo: 'bingo' as const,
      concurso: `Bingo: ${cartela.sala.nome}`,
      loteria: null,
      estado: null,
      horario: null,
      dataConcurso: cartela.createdAt,
      modalidade: 'Cartela de Bingo',
      aposta: `Cartela #${cartela.id}`,
      valor: cartela.valorPago,
      retornoPrevisto: cartela.premioRecebido,
      status: cartela.status === 'ganhou' ? ('ganhou' as const) : cartela.status === 'perdida' ? ('perdeu' as const) : ('pendente' as const),
      detalhes: {
        tipo: 'bingo',
        cartelaId: cartela.id,
        salaId: cartela.sala.id,
        salaNome: cartela.sala.nome,
        numeros: cartela.numeros,
        numerosSorteados: cartela.sala.numerosSorteados,
        emAndamento: cartela.sala.emAndamento,
        resultadoFinal: cartela.sala.resultadoFinal,
      },
    }))

    // Combinar apostas normais com cartelas de bingo
    const todasApostas = [...apostas, ...apostasBingo].sort((a, b) => {
      // Usar dataConcurso se disponível, senão usar createdAt da aposta ou dataConcurso da cartela
      const dateA = a.dataConcurso 
        ? new Date(a.dataConcurso).getTime() 
        : (a as any).createdAt 
        ? new Date((a as any).createdAt).getTime() 
        : 0
      const dateB = b.dataConcurso 
        ? new Date(b.dataConcurso).getTime() 
        : (b as any).createdAt 
        ? new Date((b as any).createdAt).getTime() 
        : 0
      return dateB - dateA
    })

    return NextResponse.json({
      user: { id: user.id, email: user.email, nome: user.nome },
      apostas: todasApostas,
      total: todasApostas.length,
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

    // VERIFICAR LIMITES DE DESCARGA POR NÚMERO ANTES DE PROCESSAR A APOSTA
    // Apenas para apostas com números específicos (modalidades numéricas)
    if (detalhes && typeof detalhes === 'object' && 'betData' in detalhes) {
      const betData = (detalhes as any).betData

      // Verificar se é modalidade numérica com números específicos
      if (betData.numberBets && betData.numberBets.length > 0 && modalidade) {
        // Extrair prêmio da posição
        const positionToUse = betData.customPosition && betData.customPositionValue 
          ? betData.customPositionValue.trim() 
          : betData.position

        // Converter posição para prêmios (ex: "1-5" = prêmios 1, 2, 3, 4, 5)
        const premios = extrairPremiosDaPosicao(positionToUse)

        // Verificar cada número apostado
        for (const numeroApostado of betData.numberBets) {
          const numeroLimpo = numeroApostado.replace(/\D/g, '') // Limpar formatação
          
          // Verificar cada prêmio
          for (const premio of premios) {
            const verificacao = await verificarLimiteDescargaPorNumero(
              modalidade,
              premio,
              numeroLimpo,
              loteria || null,
              horario || null,
              valorNum
            )

            if (verificacao.bloqueado) {
              return NextResponse.json(
                { error: verificacao.mensagem },
                { status: 400 }
              )
            }
          }
        }
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

      // IMPORTANTE: Para rollover, o usuário precisa gastar dinheiro REAL pelo menos uma vez
      // Se o usuário tem bônus bloqueado e rollover pendente, deve usar saldo primeiro
      const temRolloverPendente = usuario.rolloverNecessario > 0 && usuario.rolloverAtual < usuario.rolloverNecessario
      const temBonusBloqueado = usuario.bonusBloqueado > 0
      
      // Se tem rollover pendente, força uso de saldo primeiro (dinheiro real)
      let debitarBonus = 0
      let debitarSaldo = Math.min(saldoDisponivel, valorNum)
      const restante = valorNum - debitarSaldo
      
      // Só permite usar bônus se não tem rollover pendente OU se já gastou dinheiro real nesta aposta
      if (restante > 0) {
        if (temRolloverPendente && debitarSaldo === 0) {
          // Se tem rollover pendente e não tem saldo suficiente, não pode usar apenas bônus
          throw new Error('Você precisa gastar dinheiro real pelo menos uma vez antes de usar o bônus. Faça um depósito ou aguarde liberar o bônus.')
        }
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
        // IMPORTANTE: Prêmios de apostas instantâneas vão para saldoSacavel (podem ser sacados)
        // Debitar do saldoSacavel também quando usa saldo real
        const saldoSacavelAtual = usuario.saldoSacavel || 0
        const saldoSacavelFinal = saldoSacavelAtual - debitarSaldo + premioTotal

        // Calcular novo rolloverAtual: incrementa apenas o valor apostado com dinheiro REAL
        const novoRolloverAtual = usuario.rolloverAtual + debitarSaldo
        
        // Verificar se rollover foi cumprido e liberar bônus bloqueado
        let bonusLiberado = 0
        let novoBonusBloqueado = usuario.bonusBloqueado
        let novoBonus = bonusFinal
        
        if (novoRolloverAtual >= usuario.rolloverNecessario && usuario.rolloverNecessario > 0) {
          // Rollover cumprido! Liberar bônus bloqueado
          bonusLiberado = usuario.bonusBloqueado
          novoBonusBloqueado = 0
          novoBonus = bonusFinal + bonusLiberado
          
          console.log(`✅ Rollover cumprido para usuário ${user.id}. Bônus liberado: R$ ${bonusLiberado.toFixed(2)}`)
        }
        
        await tx.usuario.update({
          where: { id: user.id },
          data: {
            saldo: saldoFinal,
            saldoSacavel: saldoSacavelFinal,
            bonus: novoBonus,
            bonusBloqueado: novoBonusBloqueado,
            rolloverAtual: novoRolloverAtual,
            // Se rollover foi cumprido, zerar rolloverNecessario também
            ...(novoRolloverAtual >= usuario.rolloverNecessario && usuario.rolloverNecessario > 0 ? {
              rolloverNecessario: 0,
            } : {}),
          },
        })
      } else {
        // Aposta normal (não instantânea)
        // Calcular novo rolloverAtual: incrementa apenas o valor apostado com dinheiro REAL
        const novoRolloverAtual = usuario.rolloverAtual + debitarSaldo
        
        // Verificar se rollover foi cumprido e liberar bônus bloqueado
        let bonusLiberado = 0
        let novoBonusBloqueado = usuario.bonusBloqueado
        let novoBonus = usuario.bonus - debitarBonus
        
        if (novoRolloverAtual >= usuario.rolloverNecessario && usuario.rolloverNecessario > 0) {
          // Rollover cumprido! Liberar bônus bloqueado
          bonusLiberado = usuario.bonusBloqueado
          novoBonusBloqueado = 0
          novoBonus = novoBonus + bonusLiberado
          
          console.log(`✅ Rollover cumprido para usuário ${user.id}. Bônus liberado: R$ ${bonusLiberado.toFixed(2)}`)
        }
        
        // Para apostas normais, debitar do saldoSacavel também quando usa saldo real
        const saldoSacavelAtual = usuario.saldoSacavel || 0
        const saldoSacavelFinal = saldoSacavelAtual - debitarSaldo
        
        await tx.usuario.update({
          where: { id: user.id },
          data: {
            saldo: usuario.saldo - debitarSaldo,
            saldoSacavel: saldoSacavelFinal,
            bonus: novoBonus,
            bonusBloqueado: novoBonusBloqueado,
            rolloverAtual: novoRolloverAtual,
            // Se rollover foi cumprido, zerar rolloverNecessario também
            ...(novoRolloverAtual >= usuario.rolloverNecessario && usuario.rolloverNecessario > 0 ? {
              rolloverNecessario: 0,
            } : {}),
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
