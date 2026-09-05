import type { Metadata } from "next";
import { SellerApplyComplete } from "./SellerApplyComplete";

export const metadata: Metadata = {
  title: "판매점 가입신청 완료 | AOS",
  description: "판매점 가입신청 접수 결과와 승인 절차를 확인합니다.",
};

export default function SellerApplyCompletePage() {
  return <SellerApplyComplete />;
}
