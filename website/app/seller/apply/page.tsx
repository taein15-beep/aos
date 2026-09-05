import type { Metadata } from "next";
import { SellerApplyForm } from "./SellerApplyForm";

export const metadata: Metadata = {
  title: "판매점 가입신청 | AOS",
  description:
    "현재 홈페이지 운영 여행사의 판매점 가입을 신청합니다. 가입 승인 후 여행사가 판매 가능 상품과 수수료 조건을 설정합니다.",
};

export default function SellerApplyPage() {
  return <SellerApplyForm />;
}
