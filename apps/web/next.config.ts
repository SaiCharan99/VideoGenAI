import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: [
    '@videogenai/channels',
    '@videogenai/db',
    '@videogenai/pipeline',
    '@videogenai/types',
  ],
  webpack(config) {
    // Workspace packages use .js extensions for ESM; map them to .ts sources
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    };
    return config;
  },
};

export default nextConfig;
