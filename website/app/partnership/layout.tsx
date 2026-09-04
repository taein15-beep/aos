import type { Metadata } from "next";
import { PartnershipChrome } from "./PartnershipChrome";

export const metadata: Metadata = {
  title: "제휴여행사 안내 | AOS 통합여행플랫폼",
  description:
    "AOS 제휴여행사 가입 안내. 상품공유, 재고·예약·판매채널을 하나의 시스템에서 운영합니다.",
};

export default function PartnershipLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <PartnershipChrome>{children}</PartnershipChrome>;
}
