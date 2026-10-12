"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { SellerSupplierDrawer } from "@/components/seller/SellerSupplierDialogs";
import { SELLER_ADMIN_BASE_PATH } from "@/lib/seller/navigation";
import { SELLER_ADMIN_DEMO_PROFILE } from "@/lib/seller/seller-admin-profile";
import {
  formatSellerDashboardAmount,
  formatSellerDashboardCount,
  formatSellerDashboardDate,
} from "@/lib/seller/seller-dashboard-data";
import {
  SELLER_SUPPLIER_FILTERS,
  SELLER_SUPPLIERS_SCENARIOS,
  filterSellerSupplierRelations,
  getSellerSupplierRelations,
  summarizeSellerSupplierRelations,
  supplierLogoText,
  supplierRelationHasPerformance,
  supplierRelationProductTotal,
  supplierRelationStatusBadgeClass,
  type SellerSupplierFilterKey,
  type SellerSuppliersScenarioKey,
} from "@/lib/seller/seller-suppliers-data";
import { useSellerSession } from "@/lib/seller/use-seller-session";

export default function SellerSuppliersPage() {
  const session = useSellerSession();
  const seller = {
    sellerId: session?.sellerId ?? SELLER_ADMIN_DEMO_PROFILE.sellerId,
    sellerName: session?.sellerName ?? SELLER_ADMIN_DEMO_PROFILE.sellerName,
    sellerCode: session?.sellerCode ?? SELLER_ADMIN_DEMO_PROFILE.sellerCode,
  };
  const [scenarioKey, setScenarioKey] = useState<SellerSuppliersScenarioKey>("normal");
  const [filter, setFilter] = useState<SellerSupplierFilterKey>("전체");
  const [keyword, setKeyword] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const relations = useMemo(
    () => getSellerSupplierRelations(seller.sellerId, scenarioKey),
    [seller.sellerId, scenarioKey],
  );
  const summary = summarizeSellerSupplierRelations(relations);
  const rows = filterSellerSupplierRelations(relations, filter, keyword);
  const selected = relations.find((relation) => relation.supplierId === selectedId) ?? null;
  const filterCount: Record<SellerSupplierFilterKey, number> = {
    전체: summary.total,
    정상: summary.normal,
    승인대기: summary.pending,
    이용중지: summary.suspended,
    승인거절: summary.rejected,
  };
  const hasNoRelation = relations.length === 0;

  const closeDrawer = useCallback(() => setSelectedId(null), []);
  const addHref = `${SELLER_ADMIN_BASE_PATH}/suppliers/add`;

  return (
    <div className="seller-sup-page">
      <section className="page-head seller-sup-head">
        <div>
          <h1>공급여행사</h1>
          <p>가입한 공급여행사와 가입신청 현황을 확인합니다.</p>
        </div>
        <Link href={addHref} className="primary seller-sup-primary">
          + 공급여행사 추가
        </Link>
      </section>

      <section className="panel seller-sup-summary" aria-label="공급여행사 현황 요약">
        <dl className="seller-dash-stats">
          <div>
            <dt>가입/신청 공급여행사</dt>
            <dd>{formatSellerDashboardCount(summary.total, "곳")}</dd>
          </div>
          <div className="is-success">
            <dt>정상</dt>
            <dd>{formatSellerDashboardCount(summary.normal, "곳")}</dd>
          </div>
          <div className="is-warn">
            <dt>승인대기</dt>
            <dd>{formatSellerDashboardCount(summary.pending, "곳")}</dd>
          </div>
          <div className={summary.suspended > 0 ? "is-danger" : undefined}>
            <dt>이용중지</dt>
            <dd>{formatSellerDashboardCount(summary.suspended, "곳")}</dd>
          </div>
        </dl>
        <p className="seller-sup-policy">
          공급여행사별 거래상태는 서로 독립적입니다. 이용중지 공급여행사가 있어도 {seller.sellerName} 판매점 관리자와 다른
          정상 공급여행사의 상품·예약·정산은 계속 이용할 수 있습니다.
        </p>
      </section>

      <section className="panel seller-sup-list" aria-labelledby="seller-sup-list-title">
        <div className="panel-head">
          <div>
            <h2 id="seller-sup-list-title">
              공급여행사 목록 <span className="count">{rows.length}</span>
            </h2>
            <p>
              {filter === "전체"
                ? "전체는 정상·승인대기·이용중지 공급여행사입니다. 승인거절은 승인거절 필터에서 확인할 수 있습니다."
                : `${filter} 공급여행사만 표시합니다.`}
            </p>
          </div>
        </div>

        <div className="seller-sup-toolbar">
          <label className="seller-sup-search" htmlFor="seller-sup-keyword">
            <Search size={15} aria-hidden="true" />
            <input
              id="seller-sup-keyword"
              type="search"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="공급여행사명으로 검색"
              aria-label="공급여행사명 또는 코드 검색"
            />
          </label>
          <div className="segmented seller-sup-filter" role="group" aria-label="거래상태 필터">
            {SELLER_SUPPLIER_FILTERS.map((item) => (
              <button
                key={item}
                type="button"
                className={item === filter ? "active" : ""}
                aria-pressed={item === filter}
                onClick={() => setFilter(item)}
              >
                {item} <em>{filterCount[item]}</em>
              </button>
            ))}
          </div>
        </div>

        {hasNoRelation ? (
          <div className="seller-sup-empty">
            <h3>가입한 공급여행사가 없습니다.</h3>
            <p>공급여행사에 가입하면 판매 허용된 여행상품을 판매할 수 있습니다.</p>
            <Link href={addHref} className="primary seller-sup-primary">
              + 공급여행사 추가
            </Link>
          </div>
        ) : rows.length === 0 ? (
          <div className="seller-sup-empty">
            {keyword.trim() ? (
              <>
                <h3>검색 결과가 없습니다.</h3>
                <p>다른 공급여행사명을 검색해주세요.</p>
              </>
            ) : (
              <>
                <h3>{filter} 공급여행사가 없습니다.</h3>
                <p>다른 거래상태를 선택해주세요.</p>
              </>
            )}
          </div>
        ) : (
          <div className="table-wrap">
            <table className="seller-dash-table seller-sup-table">
              <thead>
                <tr>
                  <th>공급여행사</th>
                  <th>거래상태</th>
                  <th>가입일/신청일</th>
                  <th className="money">판매상품</th>
                  <th className="money">이번 달 예약</th>
                  <th className="money">이번 달 판매</th>
                  <th className="money">정산 예정</th>
                  <th>관리</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((relation) => {
                  const showPerformance = supplierRelationHasPerformance(relation);
                  const joined = relation.status === "정상" || relation.status === "이용중지";
                  const dateValue = joined && relation.joinedAt ? relation.joinedAt : relation.appliedAt;
                  return (
                    <tr
                      key={relation.supplierId}
                      className={
                        relation.status === "이용중지" ? "is-suspended" : relation.status === "승인거절" ? "is-rejected" : undefined
                      }
                    >
                      <td data-label="공급여행사">
                        <div className="seller-relation-name-cell">
                          <span className="seller-relation-logo" aria-hidden="true">
                            {supplierLogoText(relation.supplierName)}
                          </span>
                          <span className="seller-sup-name">
                            <b>{relation.supplierName}</b>
                            <small>{relation.supplierCode}</small>
                          </span>
                        </div>
                        {relation.status === "이용중지" ? (
                          <span className="seller-sup-row-note is-danger">현재 신규 상품 판매가 중지된 공급여행사입니다.</span>
                        ) : null}
                        {relation.status === "승인대기" ? (
                          <span className="seller-sup-row-note">가입 승인 대기 중</span>
                        ) : null}
                      </td>
                      <td data-label="거래상태">
                        <span className={`badge ${supplierRelationStatusBadgeClass(relation.status)}`}>{relation.status}</span>
                      </td>
                      <td data-label="가입일/신청일">
                        <span className="seller-sup-date">
                          {formatSellerDashboardDate(dateValue)}
                          <small>{joined ? "가입" : "신청"}</small>
                        </span>
                      </td>
                      <td data-label="판매상품" className="money">
                        {showPerformance ? formatSellerDashboardCount(supplierRelationProductTotal(relation) ?? 0, "개") : "-"}
                      </td>
                      <td data-label="이번 달 예약" className="money">
                        {showPerformance && relation.monthPerformance
                          ? formatSellerDashboardCount(relation.monthPerformance.reservationCount, "건")
                          : "-"}
                      </td>
                      <td data-label="이번 달 판매" className="money">
                        {showPerformance && relation.monthPerformance
                          ? formatSellerDashboardAmount(relation.monthPerformance.salesAmount)
                          : "-"}
                      </td>
                      <td data-label="정산 예정" className="money">
                        {showPerformance && relation.settlement ? formatSellerDashboardAmount(relation.settlement.pending) : "-"}
                      </td>
                      <td data-label="관리">
                        <button
                          type="button"
                          className="small-btn seller-sup-action"
                          onClick={() => setSelectedId(relation.supplierId)}
                          aria-label={`${relation.supplierName} ${joined ? "상세보기" : "신청정보"}`}
                        >
                          {joined ? "상세보기" : "신청정보"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <fieldset className="seller-dash-mock">
        <legend>프로토타입 Mock 시나리오</legend>
        <div role="radiogroup" aria-label="공급여행사 Mock 시나리오">
          {SELLER_SUPPLIERS_SCENARIOS.map((item) => (
            <label key={item.key} className={item.key === scenarioKey ? "is-selected" : undefined}>
              <input
                type="radio"
                name="seller-suppliers-scenario"
                value={item.key}
                checked={item.key === scenarioKey}
                onChange={() => {
                  setScenarioKey(item.key);
                  setSelectedId(null);
                }}
              />
              {item.label}
            </label>
          ))}
        </div>
      </fieldset>

      {selected ? <SellerSupplierDrawer relation={selected} seller={seller} onClose={closeDrawer} /> : null}
    </div>
  );
}
