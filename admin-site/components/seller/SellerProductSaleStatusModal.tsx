"use client";

import { ShareConfirmDialog } from "@/components/products/ShareConfirmDialog";
import { useEscape } from "@/components/seller/SellerSupplierDialogs";
import {
  formatSellerAdminProductPrice,
  sellerProductSalePrice,
  type SellerAdminProduct,
} from "@/lib/seller/seller-admin-products-data";

export type SellerProductSaleStatusAction = "stop" | "resume";

/** 판매점 자체 판매중지 / 판매재개 확인 — 공통 Confirm 재사용, 중지 · 재개 하나의 Component */
export function SellerProductSaleStatusModal({
  action,
  product,
  sellerName,
  onConfirm,
  onClose,
}: {
  action: SellerProductSaleStatusAction;
  product: SellerAdminProduct;
  sellerName: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  useEscape(onClose);

  const salePrice = sellerProductSalePrice(product);
  const isStop = action === "stop";
  const resumeCheck =
    !isStop && product.stopCause === "재개확인 필요" ? "\n판매조건(판매가 · 판매방식)을 다시 확인한 후 재개해주세요." : "";

  return (
    <ShareConfirmDialog
      dialog={{
        title: isStop ? "판매를 중지하시겠습니까?" : "판매를 재개하시겠습니까?",
        details: [
          { label: "상품", value: product.productName },
          { label: "판매가", value: salePrice !== null ? formatSellerAdminProductPrice(salePrice) : "-" },
          { label: "공급여행사", value: product.supplyAgencyName },
        ],
        message: isStop
          ? `${sellerName}에서 이 상품의 신규 판매가 중지됩니다.\n기존 예약과 판매이력은 유지됩니다.`
          : `${sellerName}에서 이 상품의 신규 판매를 다시 시작합니다.${resumeCheck}`,
        confirmLabel: isStop ? "판매중지" : "판매재개",
        confirmTone: isStop ? "danger" : undefined,
        onConfirm,
      }}
      onClose={onClose}
    />
  );
}
