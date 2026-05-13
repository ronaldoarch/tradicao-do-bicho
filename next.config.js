/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/depositar',
        destination: '/carteira?deposito=1',
        permanent: false,
      },
    ]
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ponto-do-bicho.b-cdn.net',
      },
      {
        protocol: 'https',
        hostname: 'pontodobicho.com',
      },
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Garantir que pdfkit seja tratado como módulo externo no servidor
      config.externals = config.externals || []
      config.externals.push({
        'pdfkit': 'commonjs pdfkit',
      })
    }
    return config
  },
}

module.exports = nextConfig
