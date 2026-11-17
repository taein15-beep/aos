import type { Metadata } from "next";
import { PartnershipApplyForm } from "./PartnershipApplyForm";

export const metadata: Metadata = {
  title: "제휴여행사 가입신청 | AOS 통합여행플랫폼",
  description:
    "AOS 플랫폼 등록 여행사만 사업자등록번호 확인 후 제휴여행사 가입을 신청할 수 있습니다.",
};

export default function PartnershipApplyPage() {
  return <PartnershipApplyForm />;
}
