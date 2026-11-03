import { Suspense } from "react";
import { isDesignPreviewAllowed } from "@/lib/home-design/load-preview";
import { DesignPublishedPreviewApp } from "./DesignPublishedPreviewApp";

export const dynamic = "force-dynamic";
export const metadata = { referrer: "no-referrer" as const };

export default function DesignPublishedPreviewPage() {
  if (!isDesignPreviewAllowed(process.env.NODE_ENV)) {
    return (
      <main className="dp-page">
        <div className="dp-error">개발 전용 발행본 미리보기는 운영 환경에서 사용할 수 없습니다.</div>
      </main>
    );
  }
  return (
    <Suspense fallback={<div className="dp-empty">발행본 미리보기 준비 중…</div>}>
      <DesignPublishedPreviewApp />
    </Suspense>
  );
}
