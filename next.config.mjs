/** @type {import('next').NextConfig} */
const nextConfig = {
  // Hier nur rein, was du wirklich brauchst – leer ist völlig ok
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
