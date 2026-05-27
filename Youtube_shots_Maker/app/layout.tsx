import type { Metadata } from "next";
import { Bebas_Neue, Noto_Sans_KR } from "next/font/google";
import { Toaster } from "sonner";
import QueryProvider from "@/components/providers/QueryProvider";
import "./globals.css";

const bebasNeue = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bebas",
  display: "swap",
});

const notoSansKR = Noto_Sans_KR({
  subsets: ["latin"],
  variable: "--font-noto",
  display: "swap",
});

export const metadata: Metadata = {
  title: "NOMAD Short Factory",
  description: "중국 숏폼 AI 재창작 · 멀티채널 자동 배포 플랫폼",
  keywords: ["유튜브 쇼츠", "도우인", "샤오홍수", "AI 영상", "자동화"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className={`${bebasNeue.variable} ${notoSansKR.variable}`}>
      <body>
        <QueryProvider>
          {children}
          <Toaster
            richColors
            position="top-right"
            toastOptions={{
              style: {
                background: "hsl(222 47% 9%)",
                border: "1px solid hsl(222 47% 16%)",
                color: "hsl(210 40% 96%)",
              },
            }}
          />
        </QueryProvider>
      </body>
    </html>
  );
}
