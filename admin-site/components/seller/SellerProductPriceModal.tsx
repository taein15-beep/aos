"use client";

import { AlertTriangle } from "lucide-react";
import { useCallback, useState, type FormEvent } from "react";
import { ShareConfirmDialog, type ShareConfirmDialogState } from "@/components/products/ShareConfirmDialog";
import { SellerModalFrame } from "@/components/seller/SellerSupplierJoinDialogs";
import {
  checkSellerPriceInput,
  formatSellerAdminProductPrice,
  formatSellerMarginRate,
  formatSellerPriceInput,
  getSellerProductPriceEditability,
  sellerAdminProductStatusBadgeClass,
  sellerProductModeBadgeClass,
  type SellerAdminProduct,
} from "@/lib/seller/seller-admin-products-data";

/** 판매가 설정/변경 버튼 — 수수료형 미표시, 거래 이용중지 · 상품 판매중지 시 비활성 + Tooltip */
export function SellerProductPriceAction({
  product,
  onOpen,
}: {
  product: SellerAdminProduct;
  onOpen: (product: SellerAdminProduct) => void;
}) {
  const editability = getSellerProductPriceEditability(product);
  if (editability.kind === "none") return null;
  const label = editability.mode === "set" ? "판매가 설정" : "판매가 변경";
  const className = editability.mode === "set" ? "primary seller-sup-primary" : "secondary";
  if (editability.kind === "locked") {
    return (
      <span className="seller-prod-action-lock" title={editability.reason}>
        <button type="button" className={className} disabled aria-label={`${product.productName} ${label} 불가 — ${editability.reason}`}>
          {label}
        </button>
      </span>
    );
  }
  return (
    <button type="button" className={className} aria-label={`${product.productName} ${label}`} onClick={() => onOpen(product)}>
      {label}
    </button>
  );
}

/**
 * 판매가 설정/변경 흐름 (가격 Modal → 공통 Confirm → 저장) — 목록 · 상세 공용
 * products는 최신 목록 (저장 후 상태 재계산 반영용)
 */
export function useSellerProductPriceFlow({
  products,
  sellerName,
  onSave,
  notify,
}: {
  products: readonly SellerAdminProduct[];
  sellerName: string;
  onSave: (product: SellerAdminProduct, price: number) => void;
  notify: (message: string, detail?: string) => void;
}) {
  const [targetId, setTargetId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ShareConfirmDialogState | null>(null);
  const target = targetId ? (products.find((product) => product.productId === targetId) ?? null) : null;

  const open = (product: SellerAdminProduct) => {
    if (getSellerProductPriceEditability(product).kind !== "editable") return;
    setTargetId(product.productId);
  };

  const close = () => {
    setConfirmDialog(null);
    setTargetId(null);
  };

  const requestSave = (product: SellerAdminProduct, price: number) => {
    const depositPrice = product.depositPrice ?? 0;
    const previousPrice = product.sellerPrice;
    const isChange = previousPrice !== null;
    setConfirmDialog({
      title: isChange ? "판매가를 변경하시겠습니까?" : "판매가를 설정하시겠습니까?",
      details: [
        { label: "상품", value: product.productName },
        { label: "입금가", value: formatSellerAdminProductPrice(depositPrice) },
        ...(isChange
          ? [
              { label: "기존 판매가", value: formatSellerAdminProductPrice(previousPrice) },
              { label: "변경 판매가", value: formatSellerAdminProductPrice(price) },
            ]
          : [{ label: "판매점 판매가", value: formatSellerAdminProductPrice(price) }]),
        { label: "예상 판매마진", value: formatSellerAdminProductPrice(price - depositPrice) },
      ],
      message: isChange
        ? `${sellerName}의 판매가만 변경됩니다. 상품 원본과 공급 입금가는 변경되지 않습니다.`
        : "설정 완료 시 판매상태가 판매중으로 전환됩니다. 상품 원본과 공급 입금가는 변경되지 않습니다.",
      confirmLabel: isChange ? "변경 완료" : "설정 완료",
      onConfirm: () => {
        close();
        if (getSellerProductPriceEditability(product).kind !== "editable" || price < depositPrice) return;
        onSave(product, price);
        if (isChange) notify("판매가가 변경되었습니다.", `${formatSellerAdminProductPrice(price)}으로 판매합니다.`);
        else notify("판매가가 설정되었습니다.", `${formatSellerAdminProductPrice(price)}으로 판매를 시작합니다.`);
      },
    });
  };

  const element = (
    <>
      {target ? (
        <SellerProductPriceModal
          key={target.productId}
          product={target}
          sellerName={sellerName}
          suspended={Boolean(confirmDialog)}
          onClose={close}
          onSubmit={(price) => requestSave(target, price)}
        />
      ) : null}
      <ShareConfirmDialog dialog={confirmDialog} onClose={() => setConfirmDialog(null)} />
    </>
  );

  return { open, element };
}

/** 입금가형 판매점 판매가 설정/변경 공통 Modal — 입금가는 Read Only, 판매점 판매가만 입력 */
export function SellerProductPriceModal({
  product,
  sellerName,
  suspended = false,
  onClose,
  onSubmit,
}: {
  product: SellerAdminProduct;
  sellerName: string;
  /** Confirm Modal이 위에 열려 있으면 Esc/닫기 무시 */
  suspended?: boolean;
  onClose: () => void;
  onSubmit: (price: number) => void;
}) {
  const depositPrice = product.depositPrice ?? 0;
  const currentPrice = product.sellerPrice;
  const isChange = currentPrice !== null;
  const [input, setInput] = useState(currentPrice !== null ? formatSellerPriceInput(String(currentPrice)) : "");

  const check = checkSellerPriceInput(input, depositPrice);
  const margin = check.price !== null ? check.price - depositPrice : null;
  const unchanged = isChange && check.price === currentPrice;
  const canSave = check.price !== null && !unchanged;

  const guardedClose = useCallback(() => {
    if (!suspended) onClose();
  }, [suspended, onClose]);

  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    if (canSave && check.price !== null) onSubmit(check.price);
  };

  const title = isChange ? "판매가 변경" : "판매가 설정";
  const helpText = unchanged ? "현재 판매가와 동일합니다. 변경할 금액을 입력해주세요." : "고객에게 실제 판매되는 최종 금액입니다.";

  return (
    <SellerModalFrame
      titleId="seller-price-modal-title"
      title={title}
      className="seller-price-modal"
      onClose={guardedClose}
      actions={
        <>
          <button type="button" className="secondary" onClick={guardedClose}>
            취소
          </button>
          <button type="submit" form="seller-price-form" className="primary seller-sup-primary" disabled={!canSave}>
            판매가 저장
          </button>
        </>
      }
    >
      <p className="seller-sup-modal-lead">입금가를 확인하고 {sellerName}의 최종 판매가를 설정해주세요.</p>

      <div className="seller-price-product">
        <span className="seller-product-thumb" aria-hidden="true">
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.imageUrl} alt="" />
          ) : (
            <em>IMG</em>
          )}
        </span>
        <div>
          <b>{product.productName}</b>
          <small>
            {product.productCode} · {product.supplyAgencyName}
          </small>
          <span className="seller-price-badges">
            <span className={`badge ${sellerProductModeBadgeClass(product.saleMode)}`}>{product.saleMode}</span>
            <span className={`badge ${sellerAdminProductStatusBadgeClass(product.salesStatus)}`}>{product.salesStatus}</span>
          </span>
        </div>
      </div>

      <section className="seller-price-section" aria-labelledby="seller-price-supply-title">
        <h4 id="seller-price-supply-title">공급조건</h4>
        <dl className="seller-price-readonly">
          <div>
            <dt>입금가</dt>
            <dd>{formatSellerAdminProductPrice(depositPrice)}</dd>
          </div>
        </dl>
        <p className="seller-price-help">공급여행사가 {sellerName}에 설정한 입금가입니다.</p>
        {isChange ? (
          <dl className="seller-price-readonly">
            <div>
              <dt>현재 판매가</dt>
              <dd>
                {formatSellerAdminProductPrice(currentPrice)}
                <small>판매마진 {formatSellerAdminProductPrice(currentPrice - depositPrice)}</small>
              </dd>
            </div>
          </dl>
        ) : null}
      </section>

      <form id="seller-price-form" className="seller-price-section" onSubmit={submit} noValidate>
        <h4>판매점 판매가</h4>
        <label className="seller-price-label" htmlFor="seller-price-input">
          최종 판매가
        </label>
        <div className={`seller-price-input${check.error ? " is-error" : ""}`}>
          <input
            id="seller-price-input"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            maxLength={15}
            value={input}
            placeholder={formatSellerPriceInput(String(depositPrice))}
            aria-invalid={Boolean(check.error)}
            aria-describedby="seller-price-input-help"
            onChange={(event) => setInput(formatSellerPriceInput(event.target.value))}
            autoFocus
          />
          <span>원</span>
        </div>
        <p
          id="seller-price-input-help"
          className={check.error ? "seller-price-error" : "seller-price-help"}
          role={check.error ? "alert" : undefined}
        >
          {check.error ?? helpText}
        </p>
        {check.warning ? (
          <p className="seller-price-warning" role="status">
            <AlertTriangle size={13} aria-hidden="true" />
            {check.warning}
          </p>
        ) : null}
      </form>

      <section className="seller-price-result" aria-label="예상 판매마진" aria-live="polite">
        <div>
          <span>예상 판매마진</span>
          <strong>{margin !== null ? formatSellerAdminProductPrice(margin) : "-"}</strong>
          <small>
            {check.price !== null
              ? `${formatSellerAdminProductPrice(check.price)} - ${formatSellerAdminProductPrice(depositPrice)}`
              : "판매가 - 입금가"}
          </small>
        </div>
        <div>
          <span>마진율</span>
          <strong>{margin !== null && check.price !== null ? formatSellerMarginRate(margin, check.price) : "-"}</strong>
          <small>예약 1인 기준 예상 수익</small>
        </div>
      </section>
    </SellerModalFrame>
  );
}
