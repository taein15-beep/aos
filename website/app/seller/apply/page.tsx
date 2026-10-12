import type { Metadata } from "next";
import { SellerApplyEntry } from "./SellerApplyEntry";

export const metadata: Metadata = {
  title: "판매점 가입신청 | AOS",
  description:
    "공급여행사의 판매점 가입을 신청합니다. 기존 AOS 판매점 계정이 있다면 새 계정 없이 추가 가입할 수 있습니다.",
};

export default function SellerApplyPage() {
  return <SellerApplyEntry />;
}
