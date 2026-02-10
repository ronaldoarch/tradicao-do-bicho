import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl

  // Guardar ref de promotor em cookie quando usuário acessa com ?ref=CODIGO (exceto rotas admin)
  const ref = searchParams.get('ref')
  const response = NextResponse.next()
  if (ref && ref.length >= 4 && !pathname.startsWith('/admin')) {
    response.cookies.set('lotbicho_ref', ref, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 dias
    })
  }

  // Proteger todas as rotas admin (exceto login e API de login)
  if (
    pathname.startsWith('/admin') &&
    pathname !== '/admin/login' &&
    !pathname.startsWith('/api/admin/auth/login') &&
    !pathname.startsWith('/api/admin/auth/me')
  ) {
    const adminSession = request.cookies.get('admin_session')
    
    if (!adminSession) {
      if (pathname.startsWith('/api/admin')) {
        return NextResponse.json(
          { error: 'Não autenticado' },
          { status: 401 }
        )
      }
      if (pathname !== '/admin/login') {
        return NextResponse.redirect(new URL('/admin/login', request.url))
      }
    }
  }

  return response
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*', '/', '/cadastro', '/jogo-do-bicho', '/apostar'],
}
