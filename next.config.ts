import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  /* config options here */
  devIndicators: false,
  webpack: (config) => {
    config.module.rules.push({
      test: /\.(glsl|vs|fs|vert|frag)$/,
      use: ['raw-loader', 'glslify', 'glslify-loader'],
    })
    return config
  },
}

export default nextConfig
