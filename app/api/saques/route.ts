import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { parseSessionToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getActiveGateway } from '@/lib/gateways-store'
import { getGateboxConfig, gateboxWithdraw } from '@/lib/gatebox-client'
import { getConfiguracoes } from '@/lib/configuracoes-store'

export const dynamic = 'force-dynamic'

/**
 * POST /api/saques
 * Cria solicitação de saque. Se o gateway ativo for Gatebox, dispara PIX automaticamente.
 */
export async function POST(request: NextRequest) {
  try {
    const session = cookies().get('lotbicho_session')?.value
    const user = parseSessionToken(session)

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { valor, chavePix } = body

    if (!valor || valor <= 0) {
      return NextResponse.json({ error: 'Valor inválido' }, { status: 400 })
    }

    const config = await getConfiguracoes()
    const minSaque = config.limiteSaqueMinimo ?? 30
    const maxSaque = config.limiteSaqueMaximo ?? 10000
    if (valor < minSaque) {
      return NextResponse.json(
        { error: `Valor mínimo para saque é R$ ${minSaque.toFixed(2).replace('.', ',')}.` },
        { status: 400 }
      )
    }
    if (valor > maxSaque) {
      return NextResponse.json(
        { error: `Valor máximo para saque é R$ ${maxSaque.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.` },
        { status: 400 }
      )
    }

    const gateway = await getActiveGateway()
    const isGatebox = gateway?.type === 'gatebox'
    if (isGatebox && (!chavePix || typeof chavePix !== 'string' || !chavePix.trim())) {
      return NextResponse.json(
        { error: 'Informe a chave PIX (CPF, e-mail, telefone ou chave aleatória) para receber o saque.' },
        { status: 400 }
      )
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        nome: true,
        cpf: true,
        saldo: true,
        saldoSacavel: true,
        bonus: true,
        bonusBloqueado: true,
        rolloverNecessario: true,
        rolloverAtual: true,
      },
    })

    if (!usuario) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    const temRolloverPendente = usuario.rolloverNecessario > 0 && usuario.rolloverAtual < usuario.rolloverNecessario
    if (temRolloverPendente) {
      const faltaRollover = usuario.rolloverNecessario - usuario.rolloverAtual
      return NextResponse.json(
        {
          error: 'Você ainda precisa completar o rollover antes de poder sacar.',
          detalhes: {
            rolloverNecessario: usuario.rolloverNecessario,
            rolloverAtual: usuario.rolloverAtual,
            faltaRollover,
            mensagem: `Você precisa apostar mais R$ ${faltaRollover.toFixed(2)} com dinheiro real antes de poder sacar.`,
          },
        },
        { status: 400 }
      )
    }

    const saldoSacavelBruto = usuario.saldoSacavel ?? 0
    const saldoDisponivelParaSaque = Math.max(0, saldoSacavelBruto)
    if (valor > saldoDisponivelParaSaque) {
      const saldoTotal = usuario.saldo
      const bonusTotal = (usuario.bonus ?? 0) + (usuario.bonusBloqueado ?? 0)
      const saldoNaoSacavel = saldoTotal - saldoSacavelBruto
      const mensagem = saldoDisponivelParaSaque <= 0
        ? 'Saldo insuficiente para saque. Bônus não pode ser sacado, apenas prêmios de apostas e depósitos.'
        : `Você pode sacar apenas R$ ${saldoDisponivelParaSaque.toFixed(2).replace('.', ',')}. Bônus não pode ser sacado, apenas prêmios de apostas e depósitos.`
      return NextResponse.json(
        {
          error: 'Saldo insuficiente para saque',
          detalhes: {
            saldoSacavel: saldoDisponivelParaSaque,
            saldoTotal,
            bonusTotal,
            saldoNaoSacavel,
            mensagem,
          },
        },
        { status: 400 }
      )
    }

    const chavePixTrim = typeof chavePix === 'string' ? chavePix.trim() : null

    const saque = await prisma.saque.create({
      data: {
        usuarioId: usuario.id,
        valor,
        status: 'pendente',
        chavePix: chavePixTrim,
      },
    })

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        saldo: { decrement: valor },
        saldoSacavel: { decrement: valor },
      },
    })

    if (isGatebox && chavePixTrim) {
      const gateboxConfig = await getGateboxConfig()
      if (!gateboxConfig) {
        await refundAndReject(usuario.id, saque.id, valor, 'Gateway Gatebox não configurado.')
        return NextResponse.json(
          { error: 'Saque automático indisponível. Tente novamente mais tarde ou entre em contato com o suporte.' },
          { status: 503 }
        )
      }

      try {
        const withdrawPayload = {
          externalId: `saque-${saque.id}`,
          key: chavePixTrim,
          name: usuario.nome,
          amount: valor,
          description: `Saque #${saque.id}`,
          documentNumber: usuario.cpf ?? undefined,
        }
        const result = await gateboxWithdraw(gateboxConfig, withdrawPayload)
        const refExterna = result.transactionId ?? result.endToEnd ?? null
        await prisma.saque.update({
          where: { id: saque.id },
          data: { status: 'processando', referenciaExterna: refExterna },
        })
        return NextResponse.json({
          message: 'Saque enviado. O PIX será processado em instantes. Acompanhe na sua carteira.',
          saque: { ...saque, status: 'processando', referenciaExterna: refExterna },
        })
      } catch (gateboxError: unknown) {
        const msg = gateboxError instanceof Error ? gateboxError.message : 'Falha ao enviar PIX'
        await refundAndReject(usuario.id, saque.id, valor, msg)
        return NextResponse.json(
          { error: 'Não foi possível processar o saque. Valor devolvido ao saldo. ' + msg },
          { status: 502 }
        )
      }
    }

    return NextResponse.json({
      message: 'Solicitação de saque criada. Aguarde a aprovação.',
      saque,
    })
  } catch (error) {
    console.error('Erro ao criar saque:', error)
    return NextResponse.json(
      { error: 'Erro ao criar saque' },
      { status: 500 }
    )
  }
}

async function refundAndReject(
  usuarioId: number,
  saqueId: number,
  valor: number,
  motivo: string
): Promise<void> {
  await prisma.$transaction([
    prisma.usuario.update({
      where: { id: usuarioId },
      data: {
        saldo: { increment: valor },
        saldoSacavel: { increment: valor },
      },
    }),
    prisma.saque.update({
      where: { id: saqueId },
      data: { status: 'rejeitado', motivo },
    }),
  ])
}

/**
 * GET /api/saques
 * Lista saques do usuário
 */
export async function GET() {
  try {
    const session = cookies().get('lotbicho_session')?.value
    const user = parseSessionToken(session)

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const saques = await prisma.saque.findMany({
      where: { usuarioId: user.id },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ saques })
  } catch (error) {
    console.error('Erro ao buscar saques:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar saques' },
      { status: 500 }
    )
  }
}
