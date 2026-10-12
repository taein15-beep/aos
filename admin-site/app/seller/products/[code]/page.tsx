"use client";

import { AlertTriangle, ArrowLeft, Ban, Eye, History, Info as InfoIcon, Lock, PlayCircle } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { SellerProductPreviewDrawer } from "@/components/seller/SellerProductPreviewDrawer";
import { SellerProductPriceAction, useSellerProductPriceFlow } from "@/components/seller/SellerProductPriceModal";
import { SellerProductSaleStatusModal, type SellerProductSaleStatusAction } from "@/components/seller/SellerProductSaleStatusModal";
import { SellerProductsMockControls } from "@/components/seller/SellerProductsMockControls";
import { SELLER_ADMIN_DEMO_PROFILE } from "@/lib/seller/seller-admin-profile";
import {
  formatSellerAdminProductPrice,
  formatSellerMarginRate,
  getSellerProductSaleControl,
  sellerAdminProductStatusBadgeClass,
  sellerProductExpectedProfit,
  sellerProductModeBadgeClass,
  sellerProductSalePrice,
  sellerProductStopActor,
  type SellerAdminProduct,
  type SellerAdminProductSalesStatus,
} from "@/lib/seller/seller-admin-products-data";
import { getSellerProductDetail } from "@/lib/seller/seller-product-detail-data";
import { getSellerSupplierRelations } from "@/lib/seller/seller-suppliers-data";
import {
  resumeSellerProduct,
  saveSellerProductPrice,
  stopSellerProduct,
  useSellerProductsState,
} from "@/lib/seller/use-seller-products-state";
import { useSellerSession } from "@/lib/seller/use-seller-session";

const LIST_PATH = "/seller/products";

type ToastState = { message: string; detail?: string };

function statusDescription(status: SellerAdminProductSalesStatus, sellerName: string) {
  if (status === "판매중") return `현재 ${sellerName}에서 판매 가능한 상품입니다.`;
  if (status === "설정대기") return "판매가 설정 완료 후 판매를 시작할 수 있습니다.";
  return "현재 판매가 중지된 상품입니다.";
}

/** 판매중지 원인별 상단 안내 — 공급여행사 원인은 조회만 가능, 판매점 원인은 판매재개 안내 */
function stopNotice(product: SellerAdminProduct, sellerName: string): { tone: "danger" | "warn"; title: string; sub: string } | null {
  switch (product.stopCause) {
    case "공급여행사 거래 이용중지":
      return {
        tone: "danger",
        title: "공급여행사와의 거래가 이용중지되어 현재 판매할 수 없습니다.",
        sub: "판매재개 · 판매가 설정/변경은 할 수 없으며 상품정보 조회만 가능합니다.",
      };
    case "공급여행사 판매중지":
      return {
        tone: "danger",
        title: "공급여행사가 이 상품의 판매를 중지했습니다.",
        sub: "공급여행사에서 판매를 재개한 후 다시 확인해주세요.",
      };
    case "상품 운영종료":
      return {
        tone: "danger",
        title: "상품 운영이 종료되었습니다.",
        sub: `사유: ${product.operationEndReason ?? "-"} · 판매재개할 수 없습니다.`,
      };
    case "판매점 자체중지":
      return {
        tone: "warn",
        title: `${sellerName}에서 판매를 중지한 상품입니다.`,
        sub: "판매재개 시 다시 판매할 수 있습니다. 기존 예약과 판매이력은 유지됩니다.",
      };
    case "재개확인 필요":
      return {
        tone: "warn",
        title: `판매재개 확인이 필요한 상품입니다. (${product.stopReason})`,
        sub: "자동으로 판매가 재개되지 않습니다. 판매조건을 다시 확인한 후 판매재개해주세요.",
      };
    default:
      return null;
  }
}

function formatAllowedDate(value: string) {
  return value.replace(/-/g, ".");
}

function Row({ label, children, emphasis }: { label: string; children: ReactNode; emphasis?: boolean }) {
  return (
    <div className={emphasis ? "is-emphasis" : undefined}>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function SaleConditions({
  product,
  sellerName,
  onOpenPrice,
}: {
  product: SellerAdminProduct;
  sellerName: string;
  onOpenPrice: (product: SellerAdminProduct) => void;
}) {
  const salePrice = sellerProductSalePrice(product);
  const profit = sellerProductExpectedProfit(product);
  const isCommission = product.saleMode === "수수료형";

  return (
    <section className="panel seller-pd-card seller-pd-conditions" aria-labelledby="seller-pd-conditions-title">
      <div className="seller-pd-card-head">
        <h2 id="seller-pd-conditions-title">판매조건</h2>
        <SellerProductPriceAction product={product} onOpen={onOpenPrice} />
      </div>

      <dl className="seller-pd-conditions-dl">
        <Row label="판매방식">
          <span className={`badge ${sellerProductModeBadgeClass(product.saleMode)}`}>{product.saleMode}</span>
        </Row>
        {isCommission ? (
          <>
            <Row label="공급 판매가">{formatSellerAdminProductPrice(product.supplyPrice ?? 0)}</Row>
            <Row label="수수료율">{product.commissionRate ?? 0}%</Row>
            <Row label="판매점 판매가">
              {formatSellerAdminProductPrice(salePrice ?? 0)}
              <small>공급가 적용</small>
            </Row>
            <Row label="예상수익" emphasis>
              {profit !== null ? formatSellerAdminProductPrice(profit) : "-"}
              <small>수수료</small>
            </Row>
          </>
        ) : (
          <>
            <Row label="공급 입금가">
              {formatSellerAdminProductPrice(product.depositPrice ?? 0)}
              <small>공급여행사 설정</small>
            </Row>
            <Row label="판매점 판매가">
              {salePrice !== null ? formatSellerAdminProductPrice(salePrice) : <span className="badge warn">미설정</span>}
              <small>{sellerName} 설정</small>
            </Row>
            <Row label="예상 판매마진" emphasis>
              {profit !== null ? formatSellerAdminProductPrice(profit) : "-"}
            </Row>
            <Row label="마진율">{profit !== null && salePrice !== null ? formatSellerMarginRate(profit, salePrice) : "-"}</Row>
          </>
        )}
      </dl>

      {product.salesStatus === "판매중지" ? (
        <p className="seller-pd-conditions-stopped" role="note">
          현재 판매중지 상태로 판매할 수 없습니다. 판매가 · {isCommission ? "수익" : "마진"} 정보는 확인용으로 유지됩니다.
        </p>
      ) : null}

      <p className="seller-pd-conditions-desc">
        {isCommission
          ? "공급여행사가 설정한 판매가로 판매되며, 판매 완료 시 수수료를 수익으로 받습니다."
          : `공급여행사가 설정한 입금가를 기준으로 ${sellerName}가 최종 판매가를 설정합니다.`}
      </p>
      <p className="seller-pd-conditions-scope">
        <Lock size={12} aria-hidden="true" />
        {isCommission
          ? "수수료형 상품은 공급 판매가 · 수수료율 · 판매점 판매가를 변경할 수 없습니다."
          : `${sellerName}가 변경할 수 있는 항목은 판매점 판매가뿐입니다. 공급 입금가는 공급여행사에서 관리합니다.`}
      </p>
    </section>
  );
}

export default function SellerProductDetailPage() {
  const params = useParams<{ code: string }>();
  const productCode = decodeURIComponent(params.code ?? "");
  const session = useSellerSession();
  const sellerId = session?.sellerId ?? SELLER_ADMIN_DEMO_PROFILE.sellerId;
  const sellerName = session?.sellerName ?? SELLER_ADMIN_DEMO_PROFILE.sellerName;

  const { mock, history, products } = useSellerProductsState(sellerId);
  const product = products.find((row) => row.productCode === productCode) ?? null;
  const detail = useMemo(() => (product ? getSellerProductDetail(product) : null), [product]);
  const contact = useMemo(
    () =>
      product
        ? (getSellerSupplierRelations(sellerId, "normal").find((relation) => relation.supplierId === product.supplierTravelAgencyId)
            ?.contact ?? null)
        : null,
    [sellerId, product],
  );

  const [previewOpen, setPreviewOpen] = useState(false);
  const [saleAction, setSaleAction] = useState<SellerProductSaleStatusAction | null>(null);
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const notify = (message: string, detailText?: string) => {
    setToast({ message, detail: detailText });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), detailText ? 3200 : 2400);
  };

  const priceFlow = useSellerProductPriceFlow({
    products,
    sellerName,
    onSave: (target, price) => saveSellerProductPrice(sellerId, target, price),
    notify,
  });

  const scenarioFieldset = <SellerProductsMockControls sellerId={sellerId} mock={mock} />;

  if (!product || !detail) {
    return (
      <div className="seller-pd-page">
        <section className="panel seller-sup-empty">
          <h3>판매상품을 찾을 수 없습니다.</h3>
          <p>공급여행사가 {sellerName}에 판매 허용한 상품만 확인할 수 있습니다.</p>
          <Link href={LIST_PATH} className="secondary seller-pd-link-button">
            <ArrowLeft size={14} aria-hidden="true" />
            목록
          </Link>
        </section>
        {scenarioFieldset}
      </div>
    );
  }

  const salePrice = sellerProductSalePrice(product);
  const saleControl = getSellerProductSaleControl(product);
  const notice = stopNotice(product, sellerName);
  const stopActor = sellerProductStopActor(product, sellerName);
  const recentHistory = (history[product.productId] ?? []).slice(0, 3);

  const confirmSaleAction = () => {
    if (!saleAction) return;
    const control = getSellerProductSaleControl(product);
    setSaleAction(null);
    if (saleAction === "stop" && control.kind === "stop") {
      stopSellerProduct(sellerId, sellerName, product);
      notify("상품 판매를 중지했습니다.", "기존 예약과 판매이력은 유지됩니다.");
    } else if (saleAction === "resume" && control.kind === "resume") {
      resumeSellerProduct(sellerId, sellerName, product);
      notify("상품 판매를 재개했습니다.");
    }
  };
  const previewLocked = salePrice === null;
  const images = product.imageUrl ? [product.imageUrl, ...detail.gallery] : [];
  const mainImage = activeImage && images.includes(activeImage) ? activeImage : (images[0] ?? null);

  return (
    <div className="seller-pd-page">
      <section className="page-head seller-pd-head">
        <div>
          <h1>{product.productName}</h1>
          <p className="seller-pd-head-meta">
            <span className="seller-pd-code">{product.productCode}</span>
            <span className={`badge ${sellerAdminProductStatusBadgeClass(product.salesStatus)}`}>{product.salesStatus}</span>
            <span className={`badge ${sellerProductModeBadgeClass(product.saleMode)}`}>{product.saleMode}</span>
            <span className="seller-pd-head-supplier">
              공급여행사 <b>{product.supplyAgencyName}</b> <small>{product.supplierCode}</small>
            </span>
          </p>
        </div>
        <div className="seller-pd-head-actions">
          <Link href={LIST_PATH} className="secondary seller-pd-link-button">
            <ArrowLeft size={14} aria-hidden="true" />
            목록
          </Link>
          {previewLocked ? (
            <span className="seller-prod-action-lock" title="판매가 설정 후 미리볼 수 있습니다.">
              <button type="button" className="secondary seller-pd-preview-button" disabled aria-label="판매페이지 미리보기 불가 — 판매가 설정 후 미리볼 수 있습니다.">
                <Eye size={14} aria-hidden="true" />
                판매페이지 미리보기
              </button>
            </span>
          ) : (
            <button type="button" className="secondary seller-pd-preview-button" onClick={() => setPreviewOpen(true)}>
              <Eye size={14} aria-hidden="true" />
              판매페이지 미리보기
            </button>
          )}
          {saleControl.kind === "stop" ? (
            <button type="button" className="secondary seller-pd-danger" onClick={() => setSaleAction("stop")}>
              <Ban size={14} aria-hidden="true" />
              판매중지
            </button>
          ) : null}
          {saleControl.kind === "resume" ? (
            <button type="button" className="primary seller-sup-primary" onClick={() => setSaleAction("resume")}>
              <PlayCircle size={14} aria-hidden="true" />
              판매재개
            </button>
          ) : null}
        </div>
      </section>

      {notice ? (
        <div className={`seller-relation-drawer-alert seller-pd-alert${notice.tone === "warn" ? " is-warn" : ""}`} role="status">
          <AlertTriangle size={15} aria-hidden="true" />
          <span>
            <b>{notice.title}</b>
            <small>{notice.sub}</small>
          </span>
        </div>
      ) : null}

      <div className="seller-pd-top">
        <section className="panel seller-pd-card seller-pd-media" aria-label="상품 이미지">
          <div className="seller-pd-main-image">
            {mainImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mainImage.replace(/w=\d+&h=\d+/, "w=800&h=560")} alt={product.productName} />
            ) : (
              <em>IMG</em>
            )}
          </div>
          {images.length > 1 ? (
            <div className="seller-pd-thumbs" role="group" aria-label="상품 이미지 선택">
              {images.map((src, index) => (
                <button
                  key={src}
                  type="button"
                  className={src === mainImage ? "is-active" : undefined}
                  aria-label={`${product.productName} 이미지 ${index + 1}`}
                  aria-pressed={src === mainImage}
                  onClick={() => setActiveImage(src)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" />
                </button>
              ))}
            </div>
          ) : null}
        </section>

        <div className="seller-pd-side">
          <section className="panel seller-pd-card" aria-labelledby="seller-pd-basic-title">
            <div className="seller-pd-card-head">
              <h2 id="seller-pd-basic-title">상품 기본정보</h2>
            </div>
            <dl className="seller-relation-dl seller-pd-basic-dl">
              <Row label="상품명">{product.productName}</Row>
              <Row label="상품코드">{product.productCode}</Row>
              <Row label="공급여행사">
                {product.supplyAgencyName} <small>{product.supplierCode}</small>
              </Row>
              <Row label="상품유형">{detail.productType}</Row>
              <Row label="여행기간">{detail.duration}</Row>
              <Row label="출발지역">{detail.departure}</Row>
              <Row label="도착지역">{detail.arrival}</Row>
              <Row label="판매방식">
                <span className={`badge ${sellerProductModeBadgeClass(product.saleMode)}`}>{product.saleMode}</span>
              </Row>
              <Row label="판매상태">
                <span className={`badge ${sellerAdminProductStatusBadgeClass(product.salesStatus)}`}>{product.salesStatus}</span>
              </Row>
            </dl>
            <p className="seller-pd-origin-note">
              <InfoIcon size={12} aria-hidden="true" />
              상품 원본정보는 공급여행사에서 관리합니다. 상품 내용 변경이 필요한 경우 공급여행사에 문의해주세요.
            </p>
          </section>

          <SaleConditions product={product} sellerName={sellerName} onOpenPrice={priceFlow.open} />

          <section className="panel seller-pd-card seller-pd-status" aria-labelledby="seller-pd-status-title">
            <h2 id="seller-pd-status-title">판매상태</h2>
            <p>
              <span className={`badge ${sellerAdminProductStatusBadgeClass(product.salesStatus)}`}>{product.salesStatus}</span>
              <span>{statusDescription(product.salesStatus, sellerName)}</span>
            </p>
            {product.stopReason ? (
              <small className={product.stopCause === "재개확인 필요" ? "is-resume" : undefined}>
                사유: {product.stopReason}
                {stopActor && stopActor !== product.stopReason ? ` · ${stopActor}` : ""}
                {product.saleMode === "입금가형" && salePrice === null ? " · 판매가 미설정" : ""}
              </small>
            ) : null}
          </section>

          <section className="panel seller-pd-card seller-pd-history" aria-labelledby="seller-pd-history-title">
            <h2 id="seller-pd-history-title">
              <History size={14} aria-hidden="true" />
              최근 상태변경
            </h2>
            <ol>
              {recentHistory.map((entry, index) => (
                <li key={`${entry.at}-${entry.label}-${index}`}>
                  <time>{entry.at}</time>
                  <span>{entry.label}</span>
                </li>
              ))}
              <li>
                <time>{formatAllowedDate(product.allowedAt)}</time>
                <span>
                  {product.supplyAgencyName}에서 {sellerName}에 판매 허용
                </span>
              </li>
            </ol>
          </section>
        </div>
      </div>

      <div className="seller-pd-sections">
        <section className="panel seller-pd-card" aria-labelledby="seller-pd-intro-title">
          <h2 id="seller-pd-intro-title">상품소개</h2>
          <p className="seller-pd-text">{detail.intro}</p>
        </section>

        <section className="panel seller-pd-card" aria-labelledby="seller-pd-schedule-title">
          <h2 id="seller-pd-schedule-title">
            여행일정 <small>{detail.duration}</small>
          </h2>
          <ol className="seller-pd-timeline">
            {detail.schedule.map((item, index) => {
              const showDay = item.day && item.day !== detail.schedule[index - 1]?.day;
              return (
                <li key={`${item.day ?? ""}-${item.time}-${item.title}`}>
                  {showDay ? <em>{item.day}</em> : null}
                  <time>{item.time}</time>
                  <span>{item.title}</span>
                </li>
              );
            })}
          </ol>
        </section>

        <div className="seller-pd-incl">
          <section className="panel seller-pd-card" aria-labelledby="seller-pd-include-title">
            <h2 id="seller-pd-include-title">포함사항</h2>
            <ul className="seller-pd-list is-include">
              {detail.includes.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
          <section className="panel seller-pd-card" aria-labelledby="seller-pd-exclude-title">
            <h2 id="seller-pd-exclude-title">불포함사항</h2>
            <ul className="seller-pd-list is-exclude">
              {detail.excludes.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        </div>

        <section className="panel seller-pd-card" aria-labelledby="seller-pd-notice-title">
          <h2 id="seller-pd-notice-title">이용안내</h2>
          <ul className="seller-pd-list">
            {detail.notices.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        {contact ? (
          <section className="panel seller-pd-card" aria-labelledby="seller-pd-supplier-title">
            <h2 id="seller-pd-supplier-title">공급여행사 정보</h2>
            <dl className="seller-relation-dl seller-pd-supplier-dl">
              <Row label="공급여행사">
                {product.supplyAgencyName} <small>{product.supplierCode}</small>
              </Row>
              <Row label="담당자">
                {contact.managerName} <small>{contact.department}</small>
              </Row>
              <Row label="연락처">{contact.phone}</Row>
              <Row label="이메일">{contact.email}</Row>
            </dl>
            <p className="seller-relation-drawer-help">상품 관련 문의는 공급여행사 담당자에게 연락해주세요.</p>
          </section>
        ) : null}
      </div>

      {scenarioFieldset}

      {previewOpen ? (
        <SellerProductPreviewDrawer
          product={product}
          detail={detail}
          sellerName={sellerName}
          onReserve={() => notify("예약 기능은 다음 단계에서 제공됩니다.")}
          onClose={() => setPreviewOpen(false)}
        />
      ) : null}

      {priceFlow.element}

      {saleAction ? (
        <SellerProductSaleStatusModal
          action={saleAction}
          product={product}
          sellerName={sellerName}
          onConfirm={confirmSaleAction}
          onClose={() => setSaleAction(null)}
        />
      ) : null}

      {toast ? (
        <div className="toast seller-pd-toast" role="status">
          <span>✓</span>
          {toast.detail ? (
            <span className="seller-prod-toast-text">
              <b>{toast.message}</b>
              <small>{toast.detail}</small>
            </span>
          ) : (
            toast.message
          )}
        </div>
      ) : null}
    </div>
  );
}
