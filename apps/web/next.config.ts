import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: [
    '@videogenai/channels',
    '@videogenai/db',
    '@videogenai/pipeline',
    '@videogenai/types',
  ],
};

export default nextConfig;
