import type { Metadata } from "next";
import { PartnershipApplyComplete } from "./PartnershipApplyComplete";

export const metadata: Metadata = {
  title: "가입신청 완료 | AOS 통합여행플랫폼",
  description: "제휴여행사 가입신청이 접수되었습니다. 관리자 검토 후 안내드립니다.",
};

export default function PartnershipApplyCompletePage() {
  return <PartnershipApplyComplete />;
}
