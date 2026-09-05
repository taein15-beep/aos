import type { Metadata } from "next";
import { SellerApplicationStatus } from "./SellerApplicationStatus";

export const metadata: Metadata = {
  title: "판매점 가입 신청현황 | AOS",
  description: "판매점 가입신청의 접수정보와 처리상태를 확인합니다.",
};

export default function SellerApplicationStatusPage() {
  return <SellerApplicationStatus />;
}
