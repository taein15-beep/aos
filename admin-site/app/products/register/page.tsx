"use client";

import { ProductAdminShell } from "@/components/products/ProductAdminShell";

/** Keep the original registration prototype isolated from the ERP's global styles and scripts. */
export default function ProductRegisterPage() {
  return (
    <ProductAdminShell currentChild="상품등록" breadcrumb={<><span>상품관리</span><b>/</b><strong>상품등록</strong></>} onNotify={(message) => window.alert(message)}>
      <iframe
        title="상품등록 기본설정"
        src="/product-registration/index.html"
        sandbox="allow-scripts allow-modals"
        style={{ width: "100%", height: "calc(100vh - 100px)", minHeight: 640, border: 0, display: "block" }}
      />
    </ProductAdminShell>
  );
}
