/** @type {import('next').NextConfig} */
const nextConfig = {
  // Rewrites removed as they bypassed secure token injection.
  // Token injection is now handled via /api/clarity-proxy/[...path]
};

export default nextConfig;
