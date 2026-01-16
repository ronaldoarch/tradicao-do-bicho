import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { parseSessionToken } from '@/lib/auth'
import { gerarPDFDescarga } from '@/lib/pdf-descarga'

/**
 * GET /api/admin/descarga/pdf
 * Gera PDF de relatório de descarga
 */
export async function GET(request: NextRequest) {
  const session = cookies().get('lotbicho_session')?.value
  const user = parseSessionToken(session)

  if (!user || !user.isAdmin) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const modalidade = searchParams.get('modalidade') || undefined
    const premio = searchParams.get('premio') ? parseInt(searchParams.get('premio')!, 10) : undefined
    const dataConcurso = searchParams.get('dataConcurso')
      ? new Date(searchParams.get('dataConcurso')!)
      : undefined
    const incluirLimites = searchParams.get('incluirLimites') !== 'false'
    const incluirAlertas = searchParams.get('incluirAlertas') !== 'false'
    const incluirEstatisticas = searchParams.get('incluirEstatisticas') !== 'false'

    const pdfBuffer = await gerarPDFDescarga({
      modalidade,
      premio,
      dataConcurso,
      incluirLimites,
      incluirAlertas,
      incluirEstatisticas,
    })

    const filename = `descarga_${new Date().toISOString().split('T')[0]}.pdf`

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('Erro ao gerar PDF de descarga:', error)
    return NextResponse.json({ error: 'Erro ao gerar PDF' }, { status: 500 })
  }
}
