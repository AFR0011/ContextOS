import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ContextOS",
  description: "Execution-first context recovery system",
  applicationName: "ContextOS",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ContextOS",
  },
  openGraph: {
    type: "website",
    siteName: "ContextOS",
    description: "Execution-first context recovery system",
    images: [
      {
        url: "/icon-512.png",
        width: 512,
        height: 512,
        alt: "ContextOS logo",
      },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#5e6ad2",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          rel="apple-touch-icon"
          href="/apple-touch-icon-180.png"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
