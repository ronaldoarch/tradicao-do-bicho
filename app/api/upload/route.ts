import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const type = formData.get('type') as string // 'banner' ou 'logo'

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })
    }

    // Validar tipo de arquivo
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Tipo de arquivo não permitido' }, { status: 400 })
    }

    // Validar tamanho (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'Arquivo muito grande (máximo 5MB)' }, { status: 400 })
    }

    // Determinar diretório baseado no tipo
    let uploadDir = 'banners'
    if (type === 'logo') {
      uploadDir = 'logos'
    } else if (type === 'story') {
      uploadDir = 'stories'
    }
    const uploadPath = join(process.cwd(), 'public', 'uploads', uploadDir)

    // Criar diretório se não existir
    if (!existsSync(uploadPath)) {
      await mkdir(uploadPath, { recursive: true })
    }

    // Gerar nome único para o arquivo
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(2, 15)
    const extension = file.name.split('.').pop()
    const fileName = `${timestamp}-${randomStr}.${extension}`
    const filePath = join(uploadPath, fileName)

    // Converter File para Buffer e salvar
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // Retornar URL do arquivo
    const fileUrl = `/uploads/${uploadDir}/${fileName}`

    return NextResponse.json({
      success: true,
      url: fileUrl,
      fileName,
    })
  } catch (error) {
    console.error('Erro ao fazer upload:', error)
    return NextResponse.json({ error: 'Erro ao fazer upload do arquivo' }, { status: 500 })
  }
}
