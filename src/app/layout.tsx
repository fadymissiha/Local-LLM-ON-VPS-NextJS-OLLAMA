import type { Metadata } from "next";
import { Outfit, Fira_Code } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const firaCode = Fira_Code({
  variable: "--font-fira",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Fast Chat",
  description: "A polished chat assistant with a premium interface.",
  keywords: ["Chat", "Assistant", "Web App", "AI Chat"],
  authors: [{ name: "Fast AI Developer" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${outfit.variable} ${firaCode.variable}`}>
        {children}
      </body>
    </html>
  );
}
