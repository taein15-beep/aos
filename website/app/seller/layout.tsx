import type { Metadata } from "next";
import { SellerChrome } from "./SellerChrome";

export const metadata: Metadata = {
  title: "판매점 안내 | AOS",
  description:
    "여행사 상품을 판매하고 추천회원의 여행 완료 실적에 따라 수수료를 정산받는 판매점 가입 안내입니다.",
};

export default function SellerLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <SellerChrome>{children}</SellerChrome>;
}
