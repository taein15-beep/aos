"use client";

import { ProductAdminShell } from "@/components/products/ProductAdminShell";

export default function ReservationCalendarPage() {
  return (
    <ProductAdminShell activeMenu="예약관리" currentChild="예약달력" breadcrumb={<><span>예약관리</span><b>/</b><strong>예약달력</strong></>} onNotify={(message) => window.alert(message)}>
      <iframe title="예약달력" src="/reservation-calendar/index.html" sandbox="allow-scripts allow-modals" style={{ width: "100%", height: "calc(100vh - 100px)", minHeight: 640, border: 0, display: "block" }} />
    </ProductAdminShell>
  );
}
