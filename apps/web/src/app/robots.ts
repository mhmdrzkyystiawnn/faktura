import type { MetadataRoute } from "next";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://faktura.muhamadrizky.my.id";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/features", "/pricing"],
        disallow: [
          "/api/",
          "/auth/",
          "/dashboard",
          "/clients",
          "/invoices",
          "/settings",
          "/public/invoice/",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
