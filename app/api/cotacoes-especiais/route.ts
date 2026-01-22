import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/cotacoes-especiais
 * Retorna todas as cotações especiais ativas
 */
export async function GET() {
  try {
    const cotacoes = await prisma.cotacao.findMany({
      where: { active: true },
      orderBy: { createdAt: 'desc' },
    })
    
    // Transformar para o formato esperado pelo frontend
    const formatted = cotacoes.map((c) => ({
      id: c.id,
      name: c.name || '',
      value: c.value || '',
      time: extractTimeFromName(c.name || ''),
    }))
    
    return NextResponse.json({ cotacoes: formatted })
  } catch (error) {
    console.error('Erro ao buscar cotações especiais:', error)
    return NextResponse.json({ cotacoes: [] }, { status: 500 })
  }
}

/**
 * Extrai o horário do nome da cotação (ex: "PONTO-NOITE 18h" -> "18h")
 */
function extractTimeFromName(name: string): string {
  const timeMatch = name.match(/(\d{1,2}h)/i)
  if (timeMatch) return timeMatch[1]
  
  // Fallback para nomes conhecidos
  if (name.toLowerCase().includes('madrugada')) return 'madrugada'
  if (name.toLowerCase().includes('noite')) return '18h'
  if (name.toLowerCase().includes('tarde')) return '15h'
  if (name.toLowerCase().includes('meio-dia')) return '12h'
  
  return ''
}
