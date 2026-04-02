/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.googleusercontent.com"
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com"
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com"
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com"
      }
    ]
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
    instrumentationHook: true,
  },
  serverExternalPackages: ["pdfkit", "fontkit", "linebreak", "png-js"],
  // Include pdfkit font data in standalone build
  outputFileTracingIncludes: {
    "/api/employee/paystubs/[id]/pdf": [
      "../../node_modules/pdfkit/**/*",
      "../../node_modules/fontkit/**/*",
      "../../node_modules/linebreak/**/*",
      "../../node_modules/png-js/**/*",
      "../../node_modules/jpeg-exif/**/*",
    ],
  },
  // Improve production performance
  poweredByHeader: false,
  compress: true,

  // Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' cdnjs.cloudflare.com; img-src 'self' data: https:; font-src 'self' cdnjs.cloudflare.com; connect-src 'self' https://api.stripe.com; frame-src 'self' https://js.stripe.com;",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
        ],
      },
    ];
  },
};

export default nextConfig;
