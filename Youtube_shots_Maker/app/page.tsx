import { Suspense } from "react";
import type { Metadata } from "next";
import LandingPage from "@/components/landing/LandingPage";

export const metadata: Metadata = {
  title: "NOMAD Short Factory — 중국 숏폼 AI 재창작 자동화",
  description:
    "도우인·샤오홍수 바이럴 숏폼을 AI로 한국어 재창작해 유튜브 쇼츠·인스타·틱톡·네이버 블로그에 자동 배포하는 SaaS 플랫폼",
};

export default function Page() {
  return (
    <Suspense>
      <LandingPage />
    </Suspense>
  );
}
