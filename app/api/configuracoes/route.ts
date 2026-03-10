import { NextResponse } from 'next/server'
import { getConfiguracoes, getLimiteDepositoMinimoEfetivo } from '@/lib/configuracoes-store'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const configuracoes = await getConfiguracoes()
    const limiteDepositoMinimoEfetivo = getLimiteDepositoMinimoEfetivo(configuracoes.limiteDepositoMinimo)
    return NextResponse.json({
      configuracoes: { ...configuracoes, limiteDepositoMinimoEfetivo },
    })
  } catch (error) {
    console.error('Erro ao buscar configurações:', error)
    return NextResponse.json({ configuracoes: null }, { status: 500 })
  }
}
