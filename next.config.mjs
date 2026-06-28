/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // quality gate is vitest + TS; ESLint not configured for this project
  eslint: { ignoreDuringBuilds: true },
}

export default nextConfig
