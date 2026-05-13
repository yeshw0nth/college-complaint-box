import type { Metadata, Viewport } from "next";
import { Caveat, JetBrains_Mono, Special_Elite } from "next/font/google";
import "./globals.css";

const caveat = Caveat({
  weight: ["400", "700"],
  variable: "--font-caveat",
  subsets: ["latin"],
});

const specialElite = Special_Elite({
  weight: "400",
  variable: "--font-special-elite",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "Complaint box",
  description: "Anonymous submissions and admin access",
};

export const viewport: Viewport = {
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="min-h-[100dvh]">
      <body
        className={`${caveat.variable} ${specialElite.variable} ${jetbrainsMono.variable} flex min-h-[100dvh] flex-col antialiased text-slate-800`}
      >
        {children}
      </body>
    </html>
  );
}
