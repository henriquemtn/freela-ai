import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { Nav } from "@/components/nav";
import "./globals.css";

const geistSans = Geist({ variable: "--font-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = { title: "FENIX", description: "CRM pessoal e prospecção" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full bg-background text-foreground">
        <Suspense>
          <Nav />
        </Suspense>
        <main className="mx-auto w-full min-w-0 max-w-6xl flex-1 px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
