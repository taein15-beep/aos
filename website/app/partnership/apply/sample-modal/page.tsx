import type { Metadata } from "next";
import { PartnershipSampleModalPage } from "./PartnershipSampleModalPage";

export const metadata: Metadata = {
  title: "제휴여행사 확인 모달 샘플 | AOS",
  description: "제휴여행사 가입신청 시 표시되는 플랫폼 등록 여행사 확인 모달 샘플 화면입니다.",
};

export default function PartnershipApplySampleModalRoute() {
  return <PartnershipSampleModalPage />;
}
