"use client";

import { Fragment, useEffect, useRef, type ReactNode } from "react";
import { AlertTriangle, Info as InfoIcon, X } from "lucide-react";
import { Info, useEscape, type SellerIdentity } from "@/components/seller/SellerSupplierDialogs";
import {
  supplierJoinGuide,
  supplierJoinStatusBadgeClass,
  supplierLogoText,
  supplierProductCategoryTotal,
  type SellerSupplierJoinStatus,
  type SellerSupplierSearchResult,
} from "@/lib/seller/seller-suppliers-data";

export function SupplierJoinStatusBadge({ status }: { status: SellerSupplierJoinStatus }) {
  return <span className={`badge ${supplierJoinStatusBadgeClass(status)}`}>{status}</span>;
}

export function SellerSupplierDirectoryDrawer({
  supplier,
  seller,
  onApply,
  onClose,
}: {
  supplier: SellerSupplierSearchResult;
  seller: SellerIdentity;
  onApply: (supplierCode: string) => void;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const guide = supplierJoinGuide(supplier.joinStatus);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  useEscape(onClose);

  return (
    <div className="seller-relation-drawer-layer">
      <button type="button" className="seller-relation-drawer-backdrop" aria-label="상세 패널 닫기" onClick={onClose} />
      <aside
        className="seller-relation-drawer seller-sup-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="seller-sup-join-drawer-title"
      >
        <header className="seller-relation-drawer-head">
          <div>
            <h2 id="seller-sup-join-drawer-title" className="seller-sup-drawer-title">
              공급여행사 정보
            </h2>
          </div>
          <button ref={closeRef} type="button" className="seller-relation-drawer-close" aria-label="닫기" onClick={onClose}>
            <X size={18} />
          </button>
        </header>

        <div className="seller-relation-drawer-body">
          <div className="seller-sup-identity">
            <span className="seller-relation-logo is-large" aria-hidden="true">
              {supplierLogoText(supplier.supplierName)}
            </span>
            <div>
              <strong>{supplier.supplierName}</strong>
              <small>{supplier.supplierCode}</small>
            </div>
            <SupplierJoinStatusBadge status={supplier.joinStatus} />
          </div>

          {guide.messages.length > 0 ? (
            <div className="seller-relation-drawer-alert" role="status">
              <AlertTriangle size={15} aria-hidden="true" />
              <span>
                {guide.messages.map((message, index) => (
                  <Fragment key={message}>
                    {index > 0 ? <br /> : null}
                    {message}
                  </Fragment>
                ))}
              </span>
            </div>
          ) : null}

          <section aria-labelledby="seller-sup-join-relation">
            <h3 id="seller-sup-join-relation">{seller.sellerName}와의 거래상태</h3>
            <dl className="seller-relation-dl">
              <Info label="판매점">
                {seller.sellerName} / {seller.sellerCode}
              </Info>
              <Info label="공급여행사">
                {supplier.supplierName} / {supplier.supplierCode}
              </Info>
              <Info label="현재 상태">
                <SupplierJoinStatusBadge status={supplier.joinStatus} />
              </Info>
            </dl>
          </section>

          <section aria-labelledby="seller-sup-join-basic">
            <h3 id="seller-sup-join-basic">공급여행사 기본정보</h3>
            <dl className="seller-relation-dl">
              <Info label="공급여행사명">{supplier.supplierName}</Info>
              <Info label="대표자">{supplier.representative}</Info>
              <Info label="대표전화">{supplier.contact.phone}</Info>
              <Info label="홈페이지">{supplier.homepage}</Info>
              <Info label="담당부서">{supplier.contact.department}</Info>
              <Info label="담당자">{supplier.contact.managerName}</Info>
              <Info label="담당자 연락처">{supplier.contact.managerPhone}</Info>
              <Info label="이메일">{supplier.contact.email}</Info>
            </dl>
          </section>

          <section aria-labelledby="seller-sup-join-products">
            <h3 id="seller-sup-join-products">
              공급상품 <small>총 {supplierProductCategoryTotal(supplier)}개 · 분류별 요약</small>
            </h3>
            <div className="seller-relation-stat-grid seller-sup-category-grid">
              {supplier.productCategories.map((category) => (
                <div key={category.label}>
                  <span>{category.label}</span>
                  <strong>{category.count}개</strong>
                </div>
              ))}
            </div>
            <div className="seller-sup-join-notice">
              <InfoIcon size={15} aria-hidden="true" />
              <p>
                공급여행사 가입이 승인되어도 모든 상품이 자동으로 판매되는 것은 아닙니다.
                <br />
                공급여행사가 {seller.sellerName}에 판매 허용한 상품만 판매상품에 표시됩니다.
              </p>
            </div>
          </section>
        </div>

        <footer className="seller-relation-drawer-foot">
          <button type="button" className="secondary" onClick={onClose}>
            닫기
          </button>
          {guide.canApply ? (
            <button type="button" className="primary seller-sup-primary" onClick={() => onApply(supplier.supplierCode)}>
              가입신청
            </button>
          ) : null}
        </footer>
      </aside>
    </div>
  );
}

export function SellerModalFrame({
  titleId,
  title,
  className,
  onClose,
  children,
  actions,
}: {
  titleId: string;
  title: string;
  className?: string;
  onClose: () => void;
  children: ReactNode;
  actions: ReactNode;
}) {
  useEscape(onClose);

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className={`modal seller-sup-modal ${className ?? ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <h3 id={titleId}>{title}</h3>
          <button type="button" aria-label="닫기" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="seller-sup-modal-body">{children}</div>
        <div className="modal-actions">{actions}</div>
      </div>
    </div>
  );
}

const SUPPLIER_SELLER_POLICY_ITEMS = [
  "판매점은 공급여행사가 판매 허용한 상품만 판매할 수 있습니다.",
  "상품별 판매방식과 판매조건은 공급여행사가 상품 판매 허용 시 정합니다.",
  "판매점은 상품정보·요금·일정을 공급여행사가 제공한 내용과 다르게 안내하지 않습니다.",
  "예약 접수 후 확정·취소·변경은 공급여행사의 예약 처리 기준을 따릅니다.",
  "정산은 공급여행사와 판매점 간 상품별 정산기준에 따라 진행됩니다.",
  "운영정책을 위반한 경우 공급여행사는 판매점과의 거래를 중지할 수 있습니다.",
];

export function SellerSupplierPolicyModal({
  supplierName,
  onClose,
}: {
  supplierName: string;
  onClose: () => void;
}) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmRef.current?.focus();
  }, []);

  return (
    <SellerModalFrame
      titleId="seller-sup-policy-title"
      title={`${supplierName} 판매점 운영정책`}
      className="seller-sup-policy-modal"
      onClose={onClose}
      actions={
        <button ref={confirmRef} type="button" className="secondary" onClick={onClose}>
          확인
        </button>
      }
    >
      <p className="seller-sup-modal-lead">
        {supplierName}에 가입하는 판매점이 지켜야 하는 운영정책입니다. (UI 확인용 요약 SAMPLE)
      </p>
      <ol className="seller-sup-policy-list">
        {SUPPLIER_SELLER_POLICY_ITEMS.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ol>
    </SellerModalFrame>
  );
}

export function SellerSupplierJoinConfirmModal({
  seller,
  supplierName,
  onCancel,
  onConfirm,
}: {
  seller: SellerIdentity;
  supplierName: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  return (
    <SellerModalFrame
      titleId="seller-sup-confirm-title"
      title="공급여행사 가입을 신청하시겠습니까?"
      onClose={onCancel}
      actions={
        <>
          <button ref={cancelRef} type="button" className="secondary" onClick={onCancel}>
            취소
          </button>
          <button type="button" className="primary seller-sup-primary" onClick={onConfirm}>
            가입신청
          </button>
        </>
      }
    >
      <p className="seller-sup-modal-lead">
        {seller.sellerName}({seller.sellerCode}) 계정으로 {supplierName}에 가입을 신청합니다.
      </p>
      <p className="seller-sup-modal-sub">신청 후 상태는 승인대기로 변경됩니다.</p>
    </SellerModalFrame>
  );
}
