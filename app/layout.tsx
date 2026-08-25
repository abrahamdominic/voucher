import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "NK Swift DATA — Fast Guest Wi-Fi",
    template: "%s · NK Swift DATA",
  },
  description:
    "Connect to fast, reliable Wi-Fi. Choose a plan, pay securely, and receive your access voucher instantly.",
  openGraph: {
    title: "NK Swift DATA — Fast Guest Wi-Fi",
    description:
      "Get connected in under a minute. Choose a plan, pay securely, and receive your access voucher instantly.",
    type: "website",
    siteName: "NK Swift DATA",
  },
  twitter: {
    card: "summary_large_image",
    title: "NK Swift DATA — Fast Guest Wi-Fi",
    description:
      "Get connected in under a minute. Choose a plan, pay securely, and receive your access voucher instantly.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      data-scroll-behavior="smooth"
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
