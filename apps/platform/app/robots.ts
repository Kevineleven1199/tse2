import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/admin/",
          "/cleaner/",
          "/client/",
          "/hq/",
          "/manager/",
          "/_next/",
        ],
      },
    ],
    sitemap: "https://tsenow.com/sitemap.xml",
  };
}
