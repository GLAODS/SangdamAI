import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import React from 'react';

const geist = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "PeakChat - AI 상담 플랫폼",
  description: "AI 기반 심리 상담 서비스",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className={geist.variable}>
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
