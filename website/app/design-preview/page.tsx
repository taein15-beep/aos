import { Suspense } from "react";
import { isDesignPreviewAllowed } from "@/lib/home-design/load-preview";
import { DesignPreviewApp } from "./DesignPreviewApp";
import "./design-preview.css";

export const dynamic = "force-dynamic";
export const metadata = { referrer: "no-referrer" as const };

export default function DesignPreviewPage() {
  if (!isDesignPreviewAllowed(process.env.NODE_ENV)) {
    return (
      <main className="dp-page">
        <div className="dp-error">개발 전용 디자인 미리보기는 운영 환경에서 사용할 수 없습니다.</div>
      </main>
    );
  }
  return (
    <Suspense fallback={<div className="dp-empty">미리보기 준비 중…</div>}>
      <DesignPreviewApp />
    </Suspense>
  );
}
