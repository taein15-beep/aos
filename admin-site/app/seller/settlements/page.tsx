"use client";

import { SellerSectionPageHead } from "@/components/seller/SellerSectionPageHead";
import { SellerChannelSettlementPanel } from "@/components/settlements/SellerChannelSettlementPanel";
import { SELLER_ADMIN_DEMO_PROFILE } from "@/lib/seller/seller-admin-profile";
import { sellerReservationDetailPath } from "@/lib/seller/seller-reservations-data";
import { useSellerSession } from "@/lib/seller/use-seller-session";

const noop = () => undefined;

export default function SellerSettlementsPage() {
  const session = useSellerSession();
  const sellerId = session?.sellerId ?? SELLER_ADMIN_DEMO_PROFILE.sellerId;

  return (
    <div className="seller-settle-page">
      <SellerSectionPageHead
        title="정산관리"
        description="공급여행사에서 받을 판매점 수익 정산과 취소 · 차기정산 조정내역을 확인합니다. (조회 전용)"
      />
      <SellerChannelSettlementPanel audience="seller" sellerId={sellerId} reservationHref={sellerReservationDetailPath} onNotify={noop} />
    </div>
  );
}
