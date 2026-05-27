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
  title: "Cosmic Chat - Premium Local AI Hub",
  description: "An ultra-fast, glassmorphic local AI chat assistant powered by Next.js and Ollama running on Docker.",
  keywords: ["Ollama", "Next.js", "Docker", "AI Chatbot", "Local LLM", "Hostinger VPS"],
  authors: [{ name: "Cosmic AI Developer" }],
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
