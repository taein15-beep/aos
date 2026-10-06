"use client";

import { useState } from "react";
import { ShareConfirmDialog, type ShareConfirmDialogState } from "@/components/products/ShareConfirmDialog";
import { SharedProductRejectModal } from "@/components/products/SharedProductRejectModal";
import { SharedProductRequestModal } from "@/components/products/SharedProductRequestModal";
import type { ProductToastAction } from "@/components/products/ProductAdminShell";
import { formatFormSharePeriod } from "@/lib/admin/product-share-setting-data";
import {
  acceptSharedProductRequest,
  rejectSharedProductRequest,
  sharedConditionForm,
  type SharedProduct,
} from "@/lib/admin/product-shared-data";

const ALREADY_HANDLED_MESSAGE = "이미 처리된 공유 요청입니다.";

/**
 * 공유받은 상품의 수락/거절 업무 Action. 목록과 상세가 같은 흐름을 사용합니다.
 * 최종 실행 시 즉시 상태에 반영하며, 판매설정 저장 버튼과는 별개입니다.
 */
export function useSharedProductRequestFlow({
  notify,
  onChanged,
  onGoSales,
}: {
  notify: (message: string, action?: ProductToastAction) => void;
  onChanged: (product: SharedProduct) => void;
  onGoSales: (product: SharedProduct) => void;
}) {
  const [requestTarget, setRequestTarget] = useState<SharedProduct | null>(null);
  const [rejectTarget, setRejectTarget] = useState<SharedProduct | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ShareConfirmDialogState | null>(null);

  const openRequest = (product: SharedProduct) => setRequestTarget(product);

  const openAccept = (product: SharedProduct) => {
    const form = sharedConditionForm(product);
    setRequestTarget(null);
    setConfirmDialog({
      title: "상품공유 요청을 수락하시겠습니까?",
      message: "수락 후 자사 판매설정을 완료하면 상품 판매를 시작할 수 있습니다.",
      confirmLabel: "공유 수락",
      details: [
        { label: "상품명", value: product.name },
        { label: "공급여행사", value: product.supplierName },
        { label: "판매수수료", value: form.commissionRate ? `${form.commissionRate}%` : "미지정" },
        { label: "공유기간", value: formatFormSharePeriod(form) },
      ],
      onConfirm: () => {
        setConfirmDialog(null);
        const updated = acceptSharedProductRequest(product.code);
        if (!updated) {
          notify(ALREADY_HANDLED_MESSAGE);
          return;
        }
        onChanged(updated);
        notify("상품공유 요청을 수락했습니다.", { label: "판매설정 하기", onClick: () => onGoSales(updated) });
      },
    });
  };

  const openReject = (product: SharedProduct) => {
    setRequestTarget(null);
    setRejectTarget(product);
  };

  const modals = (
    <>
      {requestTarget && (
        <SharedProductRequestModal
          product={requestTarget}
          onClose={() => setRequestTarget(null)}
          onAccept={() => openAccept(requestTarget)}
          onReject={() => openReject(requestTarget)}
        />
      )}
      {rejectTarget && (
        <SharedProductRejectModal
          key={rejectTarget.code}
          product={rejectTarget}
          onClose={() => setRejectTarget(null)}
          onConfirm={(reason, detail) => {
            setRejectTarget(null);
            const updated = rejectSharedProductRequest(rejectTarget.code, reason, detail);
            if (!updated) {
              notify(ALREADY_HANDLED_MESSAGE);
              return;
            }
            onChanged(updated);
            notify("상품공유 요청을 거절했습니다.");
          }}
        />
      )}
      <ShareConfirmDialog dialog={confirmDialog} onClose={() => setConfirmDialog(null)} />
    </>
  );

  return { openRequest, openAccept, openReject, modals };
}
