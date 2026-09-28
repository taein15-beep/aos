"use client";

import { useEffect } from "react";

/**
 * 신규등록은 목록 모달로 통합.
 * 기존 /members/staff/new 북마크 호환용 리디렉트.
 */
export default function StaffMemberNewRedirectPage() {
  useEffect(() => {
    window.location.replace("/members/staff?new=1");
  }, []);

  return (
    <div className="app-shell">
      <main className="content" style={{ padding: 24 }}>
        <p style={{ margin: 0, color: "#64748b", fontSize: 13 }}>신규등록 화면으로 이동 중…</p>
      </main>
    </div>
  );
}
