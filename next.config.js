/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  typescript: {
    // ⚠️ Configuración temporal para ignorar errores de TypeScript durante el desarrollo
    ignoreBuildErrors: true,
  },
  eslint: {
    // ⚠️ Configuración temporal para ignorar errores de ESLint durante el desarrollo
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig
