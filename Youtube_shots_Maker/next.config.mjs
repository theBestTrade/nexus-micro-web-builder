/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "**.douyin.com" },
      { protocol: "https", hostname: "**.xiaohongshu.com" },
      { protocol: "https", hostname: "**.xhscdn.com" },
    ],
  },
};

export default nextConfig;
