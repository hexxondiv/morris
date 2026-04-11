/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{
        protocol: 'https',
        hostname: 'img.clerk.com',
        port: ''
      },
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
        port: ''
      },
      {
        protocol: 'https',
        hostname: 'doltwyadiqmdtfpgwnbd.supabase.co',
        port: ''
      },
      {
        protocol: 'https',
        hostname: 'asmfvpxvztbbkcrgkrtd.supabase.co',
        port: ''
      },
      {
        protocol: 'https',
        hostname: 'a.storyblok.com',
        port: ''
      },
      {
        protocol: 'https',
        hostname: 'www.christianonoh.com',
        port: ''
      },
    ],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error']
    } : false,
  }
};

module.exports = nextConfig;
