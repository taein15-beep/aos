"use client";

import Link from "next/link";
import { useEffect, useRef, type ReactNode } from "react";
import { AlertTriangle, X } from "lucide-react";
import { formatSellerDashboardAmount, formatSellerDashboardDate } from "@/lib/seller/seller-dashboard-data";
import { SELLER_ADMIN_BASE_PATH } from "@/lib/seller/navigation";
import {
  supplierLogoText,
  supplierProductModeBadgeClass,
  supplierProductStatusBadgeClass,
  supplierRelationProductTotal,
  supplierRelationStatusBadgeClass,
  type SellerSupplierRelation,
} from "@/lib/seller/seller-suppliers-data";

export type SellerIdentity = { sellerName: string; sellerCode: string };

export function useEscape(onClose: () => void) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);
}

export function Info({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function StatusBadge({ relation }: { relation: SellerSupplierRelation }) {
  return <span className={`badge ${supplierRelationStatusBadgeClass(relation.status)}`}>{relation.status}</span>;
}

export function SellerSupplierDrawer({
  relation,
  seller,
  onClose,
}: {
  relation: SellerSupplierRelation;
  seller: SellerIdentity;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  useEscape(onClose);

  const isTrading = relation.status === "정상" || relation.status === "이용중지";
  const isSuspended = relation.status === "이용중지";
  const isPending = relation.status === "승인대기";
  const isRejected = relation.status === "승인거절";
  const performance = relation.monthPerformance;

  return (
    <div className="seller-relation-drawer-layer">
      <button type="button" className="seller-relation-drawer-backdrop" aria-label="상세 패널 닫기" onClick={onClose} />
      <aside className="seller-relation-drawer seller-sup-drawer" role="dialog" aria-modal="true" aria-labelledby="seller-sup-drawer-title">
        <header className="seller-relation-drawer-head">
          <div>
            <h2 id="seller-sup-drawer-title" className="seller-sup-drawer-title">
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
              {supplierLogoText(relation.supplierName)}
            </span>
            <div>
              <strong>{relation.supplierName}</strong>
              <small>{relation.supplierCode}</small>
            </div>
            <StatusBadge relation={relation} />
          </div>

          {isSuspended ? (
            <div className="seller-relation-drawer-alert" role="status">
              <AlertTriangle size={15} aria-hidden="true" />
              <span>
                현재 이 공급여행사의 신규 상품 판매가 중지되어 있습니다.
                <br />
                기존 예약 및 정산내역은 계속 확인할 수 있습니다.
              </span>
            </div>
          ) : null}

          {isRejected ? (
            <div className="seller-relation-drawer-alert" role="status">
              <AlertTriangle size={15} aria-hidden="true" />
              <span>
                가입신청이 승인되지 않았습니다.
                <br />
                재가입이 필요한 경우 해당 공급여행사에 문의해주세요.
              </span>
            </div>
          ) : null}

          {isTrading ? (
            <section aria-labelledby="seller-sup-relation">
              <h3 id="seller-sup-relation">거래관계</h3>
              <dl className="seller-relation-dl">
                <Info label="판매점">
                  {seller.sellerName} / {seller.sellerCode}
                </Info>
                <Info label="공급여행사">
                  {relation.supplierName} / {relation.supplierCode}
                </Info>
                <Info label="거래상태">
                  <StatusBadge relation={relation} />
                </Info>
                <Info label="가입일">{relation.joinedAt ? formatSellerDashboardDate(relation.joinedAt) : "-"}</Info>
              </dl>
              <p className="seller-relation-drawer-help">
                {seller.sellerName}와 {relation.supplierName} 사이의 거래관계 정보입니다.
              </p>
            </section>
          ) : (
            <section aria-labelledby="seller-sup-application">
              <h3 id="seller-sup-application">가입신청 정보</h3>
              <dl className="seller-relation-dl">
                <Info label="판매점">{seller.sellerName}</Info>
                <Info label="공급여행사">{relation.supplierName}</Info>
                <Info label="신청일">{formatSellerDashboardDate(relation.appliedAt)}</Info>
                {isRejected ? (
                  <Info label="처리일">{relation.processedAt ? formatSellerDashboardDate(relation.processedAt) : "-"}</Info>
                ) : null}
                <Info label="상태">
                  <StatusBadge relation={relation} />
                </Info>
              </dl>
              {isPending ? (
                <p className="seller-relation-drawer-scope">{relation.supplierName}의 가입 승인을 기다리고 있습니다.</p>
              ) : null}
            </section>
          )}

          <section aria-labelledby="seller-sup-basic">
            <h3 id="seller-sup-basic">공급여행사 기본정보</h3>
            <dl className="seller-relation-dl">
              <Info label="공급여행사명">{relation.supplierName}</Info>
              <Info label="대표전화">{relation.contact.phone}</Info>
              <Info label="담당부서">{relation.contact.department}</Info>
              <Info label="담당자">{relation.contact.managerName}</Info>
              <Info label="담당자 연락처">{relation.contact.managerPhone}</Info>
              <Info label="이메일">{relation.contact.email}</Info>
            </dl>
          </section>

          {isTrading ? (
            <>
              <section aria-labelledby="seller-sup-sales">
                <h3 id="seller-sup-sales">
                  판매현황 <small>이번 달 · {relation.supplierName} 상품 기준</small>
                </h3>
                <div className="seller-relation-stat-grid">
                  <div>
                    <span>판매상품</span>
                    <strong>{supplierRelationProductTotal(relation) ?? 0}개</strong>
                  </div>
                  <div>
                    <span>이번 달 예약</span>
                    <strong>{performance?.reservationCount ?? 0}건</strong>
                  </div>
                  <div>
                    <span>이번 달 판매</span>
                    <strong>{formatSellerDashboardAmount(performance?.salesAmount ?? 0)}</strong>
                  </div>
                  <div>
                    <span>공급여행사 정산 예정</span>
                    <strong>{formatSellerDashboardAmount(relation.settlement?.pending ?? 0)}</strong>
                  </div>
                </div>
              </section>

              <section aria-labelledby="seller-sup-products">
                <h3 id="seller-sup-products">
                  판매상품 <small>일부 · 조회 전용</small>
                </h3>
                <p className="seller-relation-drawer-help">
                  가입 승인 후 공급여행사가 판매 허용한 상품만 판매할 수 있습니다. 판매방식은 상품별로 공급여행사가 설정합니다.
                </p>
                {relation.productPreview.length > 0 ? (
                  <ul className="seller-sup-products">
                    {relation.productPreview.map((product) => (
                      <li key={product.productName}>
                        <strong>{product.productName}</strong>
                        <dl>
                          <div>
                            <dt>판매방식</dt>
                            <dd>
                              <span className={`badge ${supplierProductModeBadgeClass(product.mode)}`}>{product.mode}</span>
                            </dd>
                          </div>
                          <div>
                            <dt>상태</dt>
                            <dd>
                              <span className={`badge ${supplierProductStatusBadgeClass(product.status)}`}>{product.status}</span>
                            </dd>
                          </div>
                        </dl>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="seller-relation-drawer-empty">판매 허용된 상품이 없습니다.</p>
                )}
              </section>
            </>
          ) : null}

          {isPending ? (
            <p className="seller-relation-drawer-help">가입 승인 후 공급여행사가 판매 허용한 상품만 판매할 수 있습니다.</p>
          ) : null}
        </div>

        <footer className="seller-relation-drawer-foot">
          {isTrading ? (
            <Link href={`${SELLER_ADMIN_BASE_PATH}/products`} className="secondary seller-sup-foot-link">
              판매상품에서 전체보기
            </Link>
          ) : null}
          <button type="button" className="secondary" onClick={onClose}>
            닫기
          </button>
        </footer>
      </aside>
    </div>
  );
}
