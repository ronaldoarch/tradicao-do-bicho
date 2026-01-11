import { NextResponse } from 'next/server'
import { getModalidades } from '@/lib/modalidades-store'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Busca as modalidades do store compartilhado
    const modalidades = getModalidades()
    return NextResponse.json({ modalidades })
  } catch (error) {
    console.error('Erro ao buscar modalidades:', error)
    return NextResponse.json({ modalidades: [] }, { status: 500 })
  }
}
