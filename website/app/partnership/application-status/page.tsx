import type { Metadata } from "next";
import { Suspense } from "react";
import { PartnershipApplicationStatus } from "./PartnershipApplicationStatus";

export const metadata: Metadata = {
  title: "신청상태 확인 | AOS 통합여행플랫폼",
  description: "제휴여행사 가입신청 상태를 확인합니다. (프론트엔드 프로토타입·샘플 데이터)",
};

export default function PartnershipApplicationStatusPage() {
  return (
    <Suspense
      fallback={
        <main className="partnership-apply-page">
          <div className="shell partnership-apply-shell partnership-status-shell">
            <p className="partnership-apply-secure-note">신청상태를 불러오는 중…</p>
          </div>
        </main>
      }
    >
      <PartnershipApplicationStatus />
    </Suspense>
  );
}
