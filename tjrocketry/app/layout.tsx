import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import NavbarManager from "./components/NavbarManager";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

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
      className={`${geistSans.variable} antialiased`}
    >
      <body className="min-h-screen flex flex-col font-sans">
        <NavbarManager />
        <main className="flex-grow">
          {children}
        </main>
      </body>
    </html>
  );
}
