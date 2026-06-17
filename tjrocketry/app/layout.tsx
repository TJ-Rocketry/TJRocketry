import type { Metadata } from "next";
import "./globals.css";
import MarketingNavbar from "./components/MarketingNavbar";

export const metadata: Metadata = {
  title: "TJ Rocketry",
  description: "One of the most accomplished high school rocketry teams in the nation.",
  icons: {
    icon: "/icons/favicon.ico",
  },
  openGraph: {
    title: "TJ Rocketry",
    description: "One of the most accomplished high school rocketry teams in the nation.",
    images: ["/images/preview.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "TJ Rocketry",
    description: "One of the most accomplished high school rocketry teams in the nation.",
    images: ["/images/preview.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">
        <MarketingNavbar />
        <main className="flex-grow">
          {children}
        </main>
      </body>
    </html>
  );
}
