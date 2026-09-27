/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@mewsense/shared-types', '@mewsense/validation'],
  reactStrictMode: true,
  async rewrites() {
    const rawApi = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
    const destination = rawApi.endsWith('/:path*')
      ? rawApi
      : (rawApi.endsWith('/') ? `${rawApi}:path*` : `${rawApi}/:path*`);
    return [
      {
        source: '/api/v1/:path*',
        destination,
      },
    ];
  },
};

export default nextConfig;
