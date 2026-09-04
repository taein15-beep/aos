import type { Metadata } from "next";
import { PartnershipApplyForm } from "./PartnershipApplyForm";

export const metadata: Metadata = {
  title: "제휴여행사 가입신청 | AOS 통합여행플랫폼",
  description: "AOS 제휴여행사 가입신청. 여행사·담당자 정보를 입력하면 관리자가 검토합니다.",
};

export default function PartnershipApplyPage() {
  return <PartnershipApplyForm />;
}
