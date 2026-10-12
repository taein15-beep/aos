"use client";

import { AlertTriangle, Eye, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { useEscape } from "@/components/seller/SellerSupplierDialogs";
import {
  formatSellerAdminProductPrice,
  sellerProductSalePrice,
  type SellerAdminProduct,
} from "@/lib/seller/seller-admin-products-data";
import type { SellerProductDetail } from "@/lib/seller/seller-product-detail-data";

/** 고객에게 보여질 판매페이지 미리보기 (Preview UI 전용 — 실제 고객사이트 아님) */
export function SellerProductPreviewDrawer({
  product,
  detail,
  sellerName,
  onReserve,
  onClose,
}: {
  product: SellerAdminProduct;
  detail: SellerProductDetail;
  sellerName: string;
  onReserve: () => void;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const salePrice = sellerProductSalePrice(product);
  const stopped = product.salesStatus === "판매중지";

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  useEscape(onClose);

  return (
    <div className="seller-relation-drawer-layer">
      <button type="button" className="seller-relation-drawer-backdrop" aria-label="미리보기 닫기" onClick={onClose} />
      <aside
        className="seller-relation-drawer seller-pd-preview"
        role="dialog"
        aria-modal="true"
        aria-labelledby="seller-pd-preview-title"
      >
        <header className="seller-relation-drawer-head">
          <div>
            <div className="seller-relation-drawer-title">
              <Eye size={17} aria-hidden="true" />
              <h2 id="seller-pd-preview-title">판매페이지 미리보기</h2>
            </div>
            <small>고객에게 이 상품이 어떻게 보일지 확인하는 화면입니다.</small>
          </div>
          <button ref={closeRef} type="button" className="seller-relation-drawer-close" aria-label="닫기" onClick={onClose}>
            <X size={18} />
          </button>
        </header>

        <div className="seller-relation-drawer-body">
          {stopped ? (
            <div className="seller-relation-drawer-alert" role="status">
              <AlertTriangle size={15} aria-hidden="true" />
              <span>
                <b>판매중지 상품</b> — 현재 판매가 중지된 상품입니다. 고객은 예약할 수 없습니다.
              </span>
            </div>
          ) : null}

          <article className="seller-pd-preview-page" aria-label={`${sellerName} 판매페이지`}>
            <header className="seller-pd-preview-brand">
              <span aria-hidden="true">{sellerName.slice(0, 1)}</span>
              <b>{sellerName}</b>
            </header>

            <div className="seller-pd-preview-image">
              {product.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.imageUrl.replace("w=160&h=120", "w=640&h=400")} alt={product.productName} />
              ) : (
                <em>IMG</em>
              )}
            </div>

            <div className="seller-pd-preview-info">
              <span className="seller-pd-preview-chips">
                <span>{detail.productType}</span>
                <span>{detail.duration}</span>
                <span>
                  {detail.departure} 출발
                </span>
              </span>
              <h3>{product.productName}</h3>
              <p className="seller-pd-preview-price">
                <strong>{salePrice !== null ? formatSellerAdminProductPrice(salePrice) : "-"}</strong>
                <small>1인 기준</small>
              </p>
            </div>

            <section className="seller-pd-preview-section">
              <h4>일정 요약</h4>
              <ol className="seller-pd-preview-schedule">
                {detail.schedule.map((item) => (
                  <li key={`${item.day ?? ""}-${item.time}-${item.title}`}>
                    <span>{item.day ? `${item.day} ${item.time}` : item.time}</span>
                    {item.title}
                  </li>
                ))}
              </ol>
            </section>

            <section className="seller-pd-preview-section seller-pd-preview-incl">
              <div>
                <h4>포함</h4>
                <ul>
                  {detail.includes.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4>불포함</h4>
                <ul>
                  {detail.excludes.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </section>

            <div className="seller-pd-preview-cta">
              <button type="button" className="primary seller-sup-primary" disabled={stopped} onClick={onReserve}>
                예약하기
              </button>
              {stopped ? <small>현재 판매가 중지된 상품입니다.</small> : <small>Preview — 실제 예약은 진행되지 않습니다.</small>}
            </div>
          </article>

          <p className="seller-pd-preview-supplier">관리자 Preview 정보 · 공급: {product.supplyAgencyName}</p>
        </div>
      </aside>
    </div>
  );
}
