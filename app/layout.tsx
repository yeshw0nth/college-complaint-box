import type { Metadata } from "next";
import { Kalam, Special_Elite } from "next/font/google";
import "./globals.css";

const kalam = Kalam({
  weight: "400",
  variable: "--font-kalam",
  subsets: ["latin"],
});

const specialElite = Special_Elite({
  weight: "400",
  variable: "--font-special-elite",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Complaint box",
  description: "Anonymous submissions and admin access",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className={`${kalam.variable} ${specialElite.variable} min-h-full flex flex-col`}>
        {children}
      </body>
    </html>
  );
}
