import { prisma } from '@/lib/prisma'

export default async function FacebookPixelNoscript() {
  try {
    const config = await prisma.configuracaoTracking.findFirst({
      select: {
        facebookPixelId: true,
        ativo: true,
      },
      orderBy: {
        id: 'desc',
      },
    })

    if (!config?.facebookPixelId || !config?.ativo) {
      return null
    }

    return (
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: 'none' }}
          src={`https://www.facebook.com/tr?id=${config.facebookPixelId}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    )
  } catch (error) {
    console.error('Erro ao carregar pixel noscript:', error)
    return null
  }
}
