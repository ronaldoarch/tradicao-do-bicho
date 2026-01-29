import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Proteger todas as rotas admin (exceto login e API de login)
  if (
    pathname.startsWith('/admin') &&
    pathname !== '/admin/login' &&
    !pathname.startsWith('/api/admin/auth/login') &&
    !pathname.startsWith('/api/admin/auth/me')
  ) {
    const adminSession = request.cookies.get('admin_session')
    
    if (!adminSession) {
      // Se for API, retornar 401, senão redirecionar para login
      if (pathname.startsWith('/api/admin')) {
        return NextResponse.json(
          { error: 'Não autenticado' },
          { status: 401 }
        )
      }
      // Evitar redirecionamento infinito verificando se já está indo para login
      if (pathname !== '/admin/login') {
        return NextResponse.redirect(new URL('/admin/login', request.url))
      }
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
}
