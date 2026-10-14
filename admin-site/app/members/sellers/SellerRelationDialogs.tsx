"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { AlertTriangle, ExternalLink, X } from "lucide-react";
import {
  CURRENT_SUPPLIER_NAME,
  formatSellerRelationDate,
  formatSellerRelationWon,
  sellerRelationLogoText,
  sellerRelationProductCondition,
  sellerRelationProductModeLabel,
  sellerRelationProductSellerPrice,
  sellerRelationStatusBadgeClass,
  type SellerRelation,
} from "@/lib/admin/members-seller-relation-data";

/** 상품공유 화면이 존재하는 샘플 상품만 기존 route로 연결한다. */
const LINKABLE_PRODUCT_CODES = new Set(["HT-DMZ01", "GC-WINE01"]);

function useEscape(onClose: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [enabled, onClose]);
}

function InfoItem({ label, value, span }: { label: string; value: string; span?: boolean }) {
  return (
    <div className={span ? "member-affiliate-review-modal-summary-span" : undefined}>
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}

export function SellerApplicationModal({
  seller,
  blocked,
  onClose,
  onApprove,
  onReject,
}: {
  seller: SellerRelation;
  /** 거절 확인 Modal이 열려 있으면 ESC 닫기를 막는다. */
  blocked: boolean;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  useEscape(onClose, !blocked);
  const pending = seller.status === "승인대기";

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal member-affiliate-review-modal member-affiliate-review-modal--wide seller-relation-apply-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="seller-relation-apply-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <h3 id="seller-relation-apply-title">판매점 가입신청</h3>
          <button type="button" onClick={onClose} aria-label="닫기">
            ×
          </button>
        </div>
        <div className="member-affiliate-review-modal-body">
          <p>
            {pending
              ? `${CURRENT_SUPPLIER_NAME}에 가입을 신청한 판매점입니다. 신청 내용을 확인한 후 승인 또는 거절해 주세요.`
              : "가입신청이 거절된 판매점입니다. 신청 내용은 조회만 가능합니다."}
          </p>
          <section className="seller-relation-apply-section" aria-labelledby="seller-relation-apply-info">
            <h4 id="seller-relation-apply-info">판매점 정보</h4>
            <div className="member-affiliate-review-modal-summary">
              <InfoItem label="판매점명" value={seller.sellerName} />
              <InfoItem label="판매점코드" value={seller.sellerCode} />
              <InfoItem label="대표자" value={seller.representative} />
              <InfoItem label="담당자" value={seller.managerName} />
              <InfoItem label="연락처" value={seller.phone} />
              <InfoItem label="이메일" value={seller.email} />
              <InfoItem label="사업자등록번호" value={seller.businessNumber} />
              <InfoItem label="사업자 구분" value={seller.businessType} />
            </div>
          </section>
          <section className="seller-relation-apply-section" aria-labelledby="seller-relation-apply-request">
            <h4 id="seller-relation-apply-request">신청정보</h4>
            <div className="member-affiliate-review-modal-summary seller-relation-apply-request">
              <InfoItem label="신청일" value={formatSellerRelationDate(seller.appliedAt)} />
              <InfoItem label="신청 공급여행사" value={CURRENT_SUPPLIER_NAME} />
              <div>
                <span>상태</span>
                <b>
                  <span className={`badge ${sellerRelationStatusBadgeClass(seller.status)}`}>{seller.status}</span>
                </b>
              </div>
            </div>
          </section>
          {pending ? (
            <p className="member-affiliate-detail-hint">
              승인하면 거래상태가 정상으로 변경되고, 상품공유의 판매점 추가 대상에 포함됩니다.
            </p>
          ) : null}
        </div>
        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onClose}>
            닫기
          </button>
          {pending ? (
            <>
              <button type="button" className="member-affiliate-detail-danger-btn" onClick={onReject}>
                가입거절
              </button>
              <button type="button" className="primary" onClick={onApprove}>
                가입승인
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function SellerRelationConfirmModal({
  title,
  message,
  notice,
  confirmLabel,
  tone,
  onCancel,
  onConfirm,
}: {
  title: string;
  message: string;
  notice?: string;
  confirmLabel: string;
  tone: "danger" | "primary";
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useEscape(onCancel);

  return (
    <div className="modal-backdrop seller-relation-confirm-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="modal member-affiliate-review-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="seller-relation-confirm-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <h3 id="seller-relation-confirm-title">{title}</h3>
          <button type="button" onClick={onCancel} aria-label="닫기">
            ×
          </button>
        </div>
        <div className="member-affiliate-review-modal-body">
          <p className="seller-relation-confirm-message">{message}</p>
          {notice ? <p className="member-affiliate-detail-hint">{notice}</p> : null}
        </div>
        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onCancel}>
            취소
          </button>
          <button
            type="button"
            className={tone === "danger" ? "member-affiliate-detail-danger-btn" : "primary"}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function SellerRelationDrawer({
  seller,
  blocked,
  onClose,
  onSuspend,
  onResume,
  onProductMock,
}: {
  seller: SellerRelation;
  /** 확인 Modal이 열려 있으면 Drawer의 ESC 닫기를 막는다. */
  blocked: boolean;
  onClose: () => void;
  onSuspend: () => void;
  onResume: () => void;
  onProductMock: (productName: string) => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  useEscape(onClose, !blocked);

  const suspended = seller.status === "이용중지";

  return (
    <div className="seller-relation-drawer-layer">
      <button type="button" className="seller-relation-drawer-backdrop" aria-label="상세 패널 닫기" onClick={onClose} />
      <aside className="seller-relation-drawer" role="dialog" aria-modal="true" aria-labelledby="seller-relation-drawer-title">
        <header className="seller-relation-drawer-head">
          <span className="seller-relation-logo is-large" aria-hidden="true">
            {sellerRelationLogoText(seller.sellerName)}
          </span>
          <div>
            <div className="seller-relation-drawer-title">
              <h2 id="seller-relation-drawer-title">{seller.sellerName}</h2>
              <span className={`badge ${sellerRelationStatusBadgeClass(seller.status)}`}>{seller.status}</span>
            </div>
            <small>{seller.sellerCode}</small>
          </div>
          <button ref={closeRef} type="button" className="seller-relation-drawer-close" aria-label="닫기" onClick={onClose}>
            <X size={18} />
          </button>
        </header>

        <div className="seller-relation-drawer-body">
          <p className="seller-relation-drawer-scope">
            {CURRENT_SUPPLIER_NAME}와 이 판매점 사이의 거래 정보만 표시합니다.
          </p>

          {suspended ? (
            <div className="seller-relation-drawer-alert" role="status">
              <AlertTriangle size={15} aria-hidden="true" />
              <span>
                이용중지 상태입니다. {CURRENT_SUPPLIER_NAME}에서 제공하는 상품의 신규 판매가 제한되며, 상품공유의 판매점
                추가 대상에서 제외됩니다.
              </span>
            </div>
          ) : null}

          <section aria-labelledby="seller-relation-basic">
            <h3 id="seller-relation-basic">기본정보</h3>
            <dl className="seller-relation-dl">
              <div>
                <dt>대표자</dt>
                <dd>{seller.representative}</dd>
              </div>
              <div>
                <dt>담당자</dt>
                <dd>{seller.managerName}</dd>
              </div>
              <div>
                <dt>연락처</dt>
                <dd>{seller.phone}</dd>
              </div>
              <div>
                <dt>이메일</dt>
                <dd>{seller.email}</dd>
              </div>
              <div>
                <dt>가입일</dt>
                <dd>{formatSellerRelationDate(seller.joinedAt)}</dd>
              </div>
            </dl>
          </section>

          <section aria-labelledby="seller-relation-sales">
            <h3 id="seller-relation-sales">
              판매현황 요약 <small>{CURRENT_SUPPLIER_NAME} 상품 기준</small>
            </h3>
            <div className="seller-relation-stat-grid">
              <div>
                <span>판매중 상품</span>
                <strong>{seller.productCount}개</strong>
              </div>
              <div>
                <span>누적 예약</span>
                <strong>{seller.reservationCount}건</strong>
              </div>
              <div>
                <span>이번 달 예약</span>
                <strong>{seller.monthReservationCount}건</strong>
              </div>
              <div>
                <span>이번 달 판매금액</span>
                <strong>{formatSellerRelationWon(seller.monthSalesAmount)}</strong>
              </div>
            </div>
          </section>

          <section aria-labelledby="seller-relation-products">
            <h3 id="seller-relation-products">
              판매상품 <small>{seller.products.length}개 · 조회 전용</small>
            </h3>
            <p className="seller-relation-drawer-help">
              판매조건 수정은 상품관리 &gt; 상품공유 &gt; 판매점 판매에서 처리합니다.
            </p>
            {seller.products.length > 0 ? (
              <div className="seller-relation-product-wrap">
                <table className="seller-relation-product-table">
                  <thead>
                    <tr>
                      <th>상품명</th>
                      <th>판매방식</th>
                      <th>판매조건</th>
                      <th>판매점 판매가</th>
                      <th>상태</th>
                      <th aria-label="상품보기" />
                    </tr>
                  </thead>
                  <tbody>
                    {seller.products.map((product) => {
                      const sellerPrice = sellerRelationProductSellerPrice(product);
                      return (
                        <tr key={product.productCode}>
                          <td className="seller-relation-product-name">
                            <b title={product.productName}>{product.productName}</b>
                            <small>{product.productCode}</small>
                          </td>
                          <td>
                            <span className={`badge ${product.mode === "commission" ? "info" : "warn"}`}>
                              {sellerRelationProductModeLabel(product.mode)}
                            </span>
                          </td>
                          <td>{sellerRelationProductCondition(product)}</td>
                          <td className="seller-relation-product-price">
                            {sellerPrice === null ? (
                              <span className="seller-relation-muted">미설정</span>
                            ) : (
                              formatSellerRelationWon(sellerPrice)
                            )}
                          </td>
                          <td>
                            <span
                              className={`badge ${
                                product.status === "판매중" ? "success" : product.status === "판매중지" ? "danger" : "gray"
                              }`}
                            >
                              {product.status}
                            </span>
                          </td>
                          <td>
                            {LINKABLE_PRODUCT_CODES.has(product.productCode) ? (
                              <Link
                                href={`/products/${product.productCode}/share`}
                                className="small-btn seller-relation-product-link"
                                aria-label={`${product.productName} 상품보기`}
                              >
                                상품보기
                                <ExternalLink size={11} aria-hidden="true" />
                              </Link>
                            ) : (
                              <button
                                type="button"
                                className="small-btn seller-relation-product-link"
                                aria-label={`${product.productName} 상품보기`}
                                onClick={() => onProductMock(product.productName)}
                              >
                                상품보기
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="seller-relation-drawer-empty">이 판매점에 열어준 상품이 없습니다.</p>
            )}
          </section>
        </div>

        <footer className="seller-relation-drawer-foot">
          <button type="button" className="secondary" onClick={onClose}>
            닫기
          </button>
          {seller.status === "정상" ? (
            <button type="button" className="member-affiliate-detail-danger-btn" onClick={onSuspend}>
              판매점 이용중지
            </button>
          ) : null}
          {suspended ? (
            <button type="button" className="primary" onClick={onResume}>
              이용 재개
            </button>
          ) : null}
        </footer>
      </aside>
    </div>
  );
}
