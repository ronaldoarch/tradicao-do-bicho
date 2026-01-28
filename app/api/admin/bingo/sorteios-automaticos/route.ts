import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { sortearNumero, verificarCartelasSala, finalizarSalaBingo } from '@/lib/bingo-helpers'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/bingo/sorteios-automaticos
 * Executa sorteios automáticos para todas as salas configuradas
 * Este endpoint deve ser chamado periodicamente (ex: a cada 10 segundos)
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação admin (opcional - pode ser chamado por cron)
    // await requireAdmin()
  } catch (error) {
    // Se não for admin, ainda pode executar (para cron jobs)
    console.log('Aviso: Executando sorteios automáticos sem autenticação admin')
  }

  try {
    const agora = new Date()
    
    // Buscar salas em andamento com sorteio automático ativo
    const salas = await prisma.salaBingo.findMany({
      where: {
        emAndamento: true,
        sorteioAutomatico: true,
        OR: [
          { proximoSorteio: null },
          { proximoSorteio: { lte: agora } },
        ],
      },
      include: {
        _count: {
          select: {
            cartelas: true,
          },
        },
      },
    })

    if (salas.length === 0) {
      return NextResponse.json({
        message: 'Nenhuma sala precisa de sorteio no momento',
        salasProcessadas: 0,
      })
    }

    const resultados = []

    for (const sala of salas) {
      try {
        // Verificar se já tem todos os números sorteados (bingo completo)
        const numerosSorteados = (sala.numerosSorteados as number[]) || []
        if (numerosSorteados.length >= 75) {
          // Todos os números foram sorteados - finalizar sala automaticamente
          await prisma.salaBingo.update({
            where: { id: sala.id },
            data: {
              sorteioAutomatico: false, // Desativa sorteio automático
            },
          })

          // Finalizar sala automaticamente
          const resultadoFinalizacao = await finalizarSalaBingo(sala.id)
          
          if (resultadoFinalizacao.sucesso) {
            console.log(`[BINGO AUTO] Sala ${sala.nome}: Finalizada automaticamente após todos os números serem sorteados`)
            resultados.push({
              salaId: sala.id,
              salaNome: sala.nome,
              status: 'finalizada',
              message: 'Sala finalizada automaticamente - todos os números foram sorteados',
              ganhadores: resultadoFinalizacao.ganhadores,
              resultados: resultadoFinalizacao.resultados,
            })
          } else {
            console.error(`[BINGO AUTO] Erro ao finalizar sala ${sala.nome}:`, resultadoFinalizacao.erro)
            resultados.push({
              salaId: sala.id,
              salaNome: sala.nome,
              status: 'erro_finalizacao',
              message: `Erro ao finalizar sala: ${resultadoFinalizacao.erro}`,
            })
          }
          continue
        }

        // Sortear novo número
        const novoNumero = sortearNumero(numerosSorteados)
        const todosNumeros = [...numerosSorteados, novoNumero]

        // Calcular próximo sorteio
        const proximoSorteio = new Date(agora.getTime() + sala.intervaloSorteio * 1000)

        // Atualizar sala com novo número e próximo sorteio
        await prisma.salaBingo.update({
          where: { id: sala.id },
          data: {
            numerosSorteados: todosNumeros as Prisma.InputJsonValue,
            proximoSorteio,
          },
        })

        // Verificar ganhadores
        const ganhadores = await verificarCartelasSala(sala.id)

        // Se acabamos de sortear o 75º número, finalizar sala automaticamente
        if (todosNumeros.length >= 75) {
          await prisma.salaBingo.update({
            where: { id: sala.id },
            data: {
              sorteioAutomatico: false, // Desativa sorteio automático
            },
          })

          // Finalizar sala automaticamente
          const resultadoFinalizacao = await finalizarSalaBingo(sala.id)
          
          if (resultadoFinalizacao.sucesso) {
            console.log(`[BINGO AUTO] Sala ${sala.nome}: Finalizada automaticamente após sortear o 75º número`)
            resultados.push({
              salaId: sala.id,
              salaNome: sala.nome,
              numeroSorteado: novoNumero,
              totalSorteados: todosNumeros.length,
              status: 'finalizada',
              message: 'Sala finalizada automaticamente - 75º número sorteado',
              ganhadores: resultadoFinalizacao.ganhadores,
              resultados: resultadoFinalizacao.resultados,
            })
          } else {
            console.error(`[BINGO AUTO] Erro ao finalizar sala ${sala.nome}:`, resultadoFinalizacao.erro)
            resultados.push({
              salaId: sala.id,
              salaNome: sala.nome,
              numeroSorteado: novoNumero,
              totalSorteados: todosNumeros.length,
              status: 'erro_finalizacao',
              message: `Erro ao finalizar sala: ${resultadoFinalizacao.erro}`,
              ganhadores,
            })
          }
        } else {
          resultados.push({
            salaId: sala.id,
            salaNome: sala.nome,
            numeroSorteado: novoNumero,
            totalSorteados: todosNumeros.length,
            ganhadores,
            proximoSorteio,
          })

          console.log(`[BINGO AUTO] Sala ${sala.nome}: Sorteado número ${novoNumero} (${todosNumeros.length}/75)`)
        }
      } catch (error: any) {
        console.error(`Erro ao processar sala ${sala.id}:`, error)
        resultados.push({
          salaId: sala.id,
          salaNome: sala.nome,
          status: 'erro',
          error: error.message,
        })
      }
    }

    return NextResponse.json({
      message: `Processadas ${salas.length} sala(s)`,
      salasProcessadas: salas.length,
      resultados,
      timestamp: agora.toISOString(),
    })
  } catch (error: any) {
    console.error('Erro ao executar sorteios automáticos:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao executar sorteios automáticos' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/admin/bingo/sorteios-automaticos
 * Retorna status dos sorteios automáticos
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
  } catch (error) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  try {
    const salas = await prisma.salaBingo.findMany({
      where: {
        emAndamento: true,
        sorteioAutomatico: true,
      },
      select: {
        id: true,
        nome: true,
        intervaloSorteio: true,
        proximoSorteio: true,
        numerosSorteados: true,
        _count: {
          select: {
            cartelas: true,
          },
        },
      },
    })

    const agora = new Date()
    const salasComStatus = salas.map((sala) => {
      const numerosSorteados = (sala.numerosSorteados as number[]) || []
      const tempoRestante = sala.proximoSorteio
        ? Math.max(0, Math.floor((sala.proximoSorteio.getTime() - agora.getTime()) / 1000))
        : 0

      return {
        ...sala,
        totalSorteados: numerosSorteados.length,
        tempoRestanteSegundos: tempoRestante,
        proximoSorteioEm: sala.proximoSorteio?.toISOString(),
      }
    })

    return NextResponse.json({
      totalSalas: salas.length,
      salas: salasComStatus,
    })
  } catch (error: any) {
    console.error('Erro ao buscar status dos sorteios:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar status' },
      { status: 500 }
    )
  }
}
