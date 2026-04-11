/** @type {import('next').NextConfig} */
function storageImageRemotePattern() {
  const base = process.env.S3_PUBLIC_BASE_URL;
  if (!base) return null;
  try {
    const u = new URL(base);
    const protocol = u.protocol.replace(":", "");
    if (protocol !== "http" && protocol !== "https") return null;
    return {
      protocol,
      hostname: u.hostname,
      port: u.port || "",
    };
  } catch {
    return null;
  }
}

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

const storagePattern = storageImageRemotePattern();
if (storagePattern) {
  remotePatterns.push(storagePattern);
}

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
