"use client";

import { ArrowLeft } from "lucide-react";

export function ProductAffiliateNotFound({
  onBack,
  title = "제휴여행사 공유설정을 열 수 없습니다.",
  message = "상품공급여행사 상품이 아니거나, 공유설정 샘플 데이터가 없는 상품입니다.",
  backLabel = "상품목록으로",
}: {
  onBack: () => void;
  title?: string;
  message?: string;
  backLabel?: string;
}) {
  return (
    <div className="panel product-affiliate-not-found">
      <strong>{title}</strong>
      <p>{message}</p>
      <button type="button" className="secondary" onClick={onBack}>
        <ArrowLeft size={14} />
        {backLabel}
      </button>
    </div>
  );
}
