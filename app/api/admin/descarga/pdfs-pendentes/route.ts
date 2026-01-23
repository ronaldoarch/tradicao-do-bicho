import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { readdir, stat } from 'fs/promises'
import { join } from 'path'

/**
 * GET /api/admin/descarga/pdfs-pendentes
 * Lista PDFs pendentes de envio
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
  } catch (error) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  try {
    const pdfsDir = join(process.cwd(), 'public', 'pdfs-pendentes')
    
    try {
      const files = await readdir(pdfsDir)
      
      // Buscar informações de cada arquivo
      const pdfs = await Promise.all(
        files
          .filter((file) => file.endsWith('.pdf'))
          .map(async (file) => {
            const filePath = join(pdfsDir, file)
            const stats = await stat(filePath)
            return {
              nome: file,
              caminho: `/pdfs-pendentes/${file}`,
              tamanho: stats.size,
              criadoEm: stats.birthtime,
              modificadoEm: stats.mtime,
            }
          })
      )

      // Ordenar por data de criação (mais recentes primeiro)
      pdfs.sort((a, b) => b.criadoEm.getTime() - a.criadoEm.getTime())

      return NextResponse.json({ pdfs })
    } catch (error: any) {
      // Se o diretório não existir, retornar lista vazia
      if (error.code === 'ENOENT') {
        return NextResponse.json({ pdfs: [] })
      }
      throw error
    }
  } catch (error: any) {
    console.error('Erro ao listar PDFs pendentes:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao listar PDFs' },
      { status: 500 }
    )
  }
}
