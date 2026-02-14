import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Hardcoded to avoid undefined during prerender (NEXT_PUBLIC_* may not be set at build time)
const LOGO_URL = 'https://sgtxmsbfcpacrsryhcth.supabase.co/storage/v1/object/public/logo-etc/filthystream-logo.png';

export const metadata: Metadata = {
  title: "FilthyStream - Radio Stream from YouTube",
  description: "Create your own radio station and stream music from YouTube",
  icons: {
    icon: LOGO_URL,
    apple: LOGO_URL,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
