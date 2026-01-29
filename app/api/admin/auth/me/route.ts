import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    // Debug: verificar cookies recebidos
    const cookieStore = await cookies()
    const adminCookie = cookieStore.get('admin_session')
    
    // Debug: listar todos os cookies recebidos
    const allCookies = cookieStore.getAll()
    console.log('🍪 Cookies recebidos:', allCookies.map(c => c.name).join(', '))
    
    if (!adminCookie) {
      console.log('⚠️ Cookie admin_session não encontrado. Cookies disponíveis:', allCookies.map(c => c.name))
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    console.log('✅ Cookie admin_session encontrado, verificando sessão...')
    const session = await getAdminSession()

    if (!session) {
      console.log('⚠️ Sessão admin inválida ou usuário não é admin')
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    console.log('✅ Sessão válida para:', session.email)
    return NextResponse.json({ user: session })
  } catch (error) {
    console.error('❌ Erro ao verificar sessão admin:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
