/** @type {import('next').NextConfig} */

const remotePatterns = [
  {
    protocol: "https",
    hostname: "img.clerk.com",
    port: "",
  },
  {
    protocol: "https",
    hostname: "images.pexels.com",
    port: "",
  },
  {
    protocol: "https",
    hostname: "doltwyadiqmdtfpgwnbd.supabase.co",
    port: "",
  },
  {
    protocol: "https",
    hostname: "asmfvpxvztbbkcrgkrtd.supabase.co",
    port: "",
  },
  {
    protocol: "https",
    hostname: "a.storyblok.com",
    port: "",
  },
  {
    protocol: "https",
    hostname: "www.christianonoh.com",
    port: "",
  },
];

const nextConfig = {
  images: {
    remotePatterns,
  },
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? {
            exclude: ["error"],
          }
        : false,
  },
};

module.exports = nextConfig;
