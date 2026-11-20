import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist_Mono, Inter } from "next/font/google";
import { Breadcrumb, Nav } from "@/components/nav";
import "./globals.css";

const inter = Inter({ variable: "--font-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = { title: "freela-ai", description: "CRM pessoal e prospecção" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`dark ${inter.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full bg-background text-foreground">
        <Suspense>
          <Nav />
        </Suspense>
        <div className="flex min-w-0 flex-1 flex-col">
          <Suspense>
            <Breadcrumb />
          </Suspense>
          <main className="mx-auto w-full max-w-6xl flex-1 space-y-8 px-8 py-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
