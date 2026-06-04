import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ContextOS",
  description: "Execution-first context recovery system",
  applicationName: "ContextOS",
  manifest: "/manifest.webmanifest"
};

export const viewport: Viewport = {
  themeColor: "#5e6ad2"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
