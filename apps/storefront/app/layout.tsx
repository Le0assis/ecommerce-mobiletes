import { CookieNotice } from "@/components/cookie-notice";
import { WhatsAppButton } from "@/components/whatsapp-button";
import { FloatingNav } from "@/components/floating-nav";
import { ShopProvider } from "@/components/shop-provider";
import { SiteFooter } from "@/components/site-footer";
import { StickyTestRide } from "@/components/sticky-test-ride";
import type { Metadata } from "next";
import { Inter_Tight } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";

const sans = Inter_Tight({
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600"],
  variable: "--font-sans",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://127.0.0.1:43123";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "LUME — motos e mobiletes elétricas",
    template: "%s · LUME",
  },
  description:
    "Motos e mobiletes elétricas para o Brasil. 21x sem juros no cartão, 5% no Pix, frete por CEP e conversa no WhatsApp.",
  openGraph: {
    locale: "pt_BR",
    siteName: "LUME",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "LUME — motos e mobiletes elétricas",
    description: "21x sem juros, Pix com 5% e frete por CEP.",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${sans.variable} dark h-full antialiased`}>
      <body className="min-h-full bg-background text-foreground">
        <ShopProvider>
          <a
            href="#conteudo"
            className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-full focus:bg-paper focus:px-4 focus:py-2 focus:text-background"
          >
            Pular para o conteúdo
          </a>
          <Suspense fallback={<div className="h-16" />}>
            <FloatingNav />
          </Suspense>
          {children}
          <SiteFooter />
          <Suspense fallback={null}>
            <StickyTestRide />
            <WhatsAppButton />
          </Suspense>
          <CookieNotice />
        </ShopProvider>
      </body>
    </html>
  );
}
