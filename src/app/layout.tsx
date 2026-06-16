import type { Metadata, Viewport } from "next";
import "./globals.css";

function appUrl() {
  const localPort = process.env.PORT || process.env.PLAYWRIGHT_PORT || "3000";
  const candidate = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : `http://localhost:${localPort}`);
  try {
    return new URL(candidate);
  } catch {
    return new URL("http://localhost:3000");
  }
}

export const metadata: Metadata = {
  metadataBase: appUrl(),
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
    url: "/",
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
