import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://tjrocketry.org";

  return [
    { url: base, lastModified: new Date(), changeFrequency: "yearly", priority: 1 },
    { url: `${base}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/apply`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/sponsors`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/support`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/teams`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/projects/current`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/projects/past`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
  ];
}
