import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@fiskai/db', '@fiskai/shared', '@fiskai/trpc', '@fiskai/ui'],
};

export default nextConfig;
