import type { Metadata, Viewport } from "next";
import TourHomeClient from "./TourHomeClient";

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#f7fbf5" };

export async function generateMetadata({ params }: { params: Promise<{ tourCode: string }> }): Promise<Metadata> {
  const { tourCode } = await params;
  return {
    title: "철원 DMZ 평화관광 스탬프투어",
    description: "철원의 평화관광 명소를 여행하고 단계별 스탬프와 경품을 만나보세요.",
    alternates: { canonical: `/tour/${tourCode}` },
    openGraph: { title: "철원 DMZ 평화관광 스탬프투어", description: "철원의 평화관광 명소를 여행하고 스탬프를 모아보세요.", images: [] },
    twitter: { title: "철원 DMZ 평화관광 스탬프투어", description: "철원의 평화관광 명소를 여행하고 스탬프를 모아보세요.", images: [] },
  };
}

export default async function TourHomePage({ params }: { params: Promise<{ tourCode: string }> }) {
  return <TourHomeClient tourCode={(await params).tourCode} />;
}
