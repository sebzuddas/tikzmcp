import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import { TIKZJAX_URL } from "@/lib/tikzjax";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TikZ Previewer",
  description: "Write TikZ, see the SVG. Rendered entirely in your browser with TeX compiled to WebAssembly.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href={`${TIKZJAX_URL}/fonts.css`} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
        <Script src={`${TIKZJAX_URL}/tikzjax.js`} strategy="afterInteractive" />
      </body>
    </html>
  );
}
