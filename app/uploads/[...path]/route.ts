import { NextRequest, NextResponse } from 'next/server'
import { createReadStream, statSync } from 'fs'
import { join } from 'path'

// Servir arquivos de upload diretamente do volume /public/uploads
export async function GET(
  _req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const relativePath = params.path.join('/')
    const filePath = join(process.cwd(), 'public', 'uploads', relativePath)
    const stat = statSync(filePath)

    const stream = createReadStream(filePath)
    const response = new NextResponse(stream as any, {
      status: 200,
      headers: {
        'Content-Length': stat.size.toString(),
        // Evitar cache de 404 - se o arquivo não existir, não cachear o erro
        'Cache-Control': 'public, max-age=86400, immutable',
      },
    })

    // Content-Type básico por extensão
    if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
      response.headers.set('Content-Type', 'image/jpeg')
    } else if (filePath.endsWith('.png')) {
      response.headers.set('Content-Type', 'image/png')
    } else if (filePath.endsWith('.webp')) {
      response.headers.set('Content-Type', 'image/webp')
    } else if (filePath.endsWith('.gif')) {
      response.headers.set('Content-Type', 'image/gif')
    }

    return response
  } catch (error) {
    // NÃO cachear 404 - evita que browser cache erro quando arquivo ainda não existe
    return NextResponse.json({ error: 'Arquivo não encontrado' }, {
      status: 404,
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    })
  }
}
