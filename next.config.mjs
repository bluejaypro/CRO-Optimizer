/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/clarity-proxy/:path*',
        destination: 'https://www.clarity.ms/:path*',
      },
    ]
  },
};

export default nextConfig;
