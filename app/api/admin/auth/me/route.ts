import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    // Debug: verificar cookies recebidos
    const cookieStore = await cookies()
    const adminCookie = cookieStore.get('admin_session')
    
    if (!adminCookie) {
      console.log('⚠️ Cookie admin_session não encontrado')
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const session = await getAdminSession()

    if (!session) {
      console.log('⚠️ Sessão admin inválida ou usuário não é admin')
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    return NextResponse.json({ user: session })
  } catch (error) {
    console.error('❌ Erro ao verificar sessão admin:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
