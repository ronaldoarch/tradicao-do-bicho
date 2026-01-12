/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    domains: ['ponto-do-bicho.b-cdn.net', 'pontodobicho.com'],
  },
}

module.exports = nextConfig
