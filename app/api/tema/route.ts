import { NextResponse } from 'next/server'
import { getTemaAtivo } from '@/lib/temas-store'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const tema = await getTemaAtivo()
    return NextResponse.json(
      { tema },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    )
  } catch (error) {
    console.error('Erro ao buscar tema ativo:', error)
    return NextResponse.json({ error: 'Erro ao buscar tema ativo' }, { status: 500 })
  }
}
