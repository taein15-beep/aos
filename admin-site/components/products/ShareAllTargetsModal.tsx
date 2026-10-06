"use client";

import { Info, X } from "lucide-react";
import {
  formatAffiliateGroups,
  partnershipStatusBadgeClass,
  shareStatusBadgeClass,
} from "@/lib/admin/product-affiliate-data";
import type { AllShareClassification } from "@/lib/admin/product-share-setting-data";

/** 전체 제휴여행사 공유 대상/제외 확인용. 개별 선택은 제공하지 않습니다. */
export function ShareAllTargetsModal({
  classification,
  onClose,
}: {
  classification: AllShareClassification;
  onClose: () => void;
}) {
  const { shareable, excluded } = classification;

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal product-share-picker-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-all-targets-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <h3 id="share-all-targets-title">전체 공유 대상 여행사</h3>
          <button type="button" aria-label="닫기" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="product-share-picker-body">
          <p className="product-share-setting-alert" role="note">
            <Info size={13} />
            확인용 목록입니다. 여행사를 개별로 선택하려면 공유 대상에서 특정 제휴여행사 선택을 사용하세요.
          </p>

          <section className="product-share-all-section" aria-label="공유 대상">
            <h4>
              공유 대상 <span className="badge success">{shareable.length}곳</span>
            </h4>
            <div className="member-web-detail-table-wrap">
              <table className="member-web-detail-table product-share-all-table">
                <thead>
                  <tr>
                    <th>여행사명</th>
                    <th>공유그룹</th>
                    <th>제휴상태</th>
                    <th>현재 공유상태</th>
                  </tr>
                </thead>
                <tbody>
                  {shareable.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="product-affiliate-empty">
                        공유 가능한 제휴여행사가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    shareable.map((row) => (
                      <tr key={row.id}>
                        <td className="text-left">
                          <strong>{row.name}</strong>
                        </td>
                        <td className="text-left">{formatAffiliateGroups(row.groups) || "-"}</td>
                        <td>
                          <span className={`badge ${partnershipStatusBadgeClass(row.partnershipStatus)}`}>
                            {row.partnershipStatus}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${shareStatusBadgeClass(row.shareStatus)}`}>{row.shareStatus}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="product-share-all-section" aria-label="공유 제외">
            <h4>
              공유 제외 <span className="badge gray">{excluded.length}곳</span>
            </h4>
            <div className="member-web-detail-table-wrap">
              <table className="member-web-detail-table product-share-all-table is-excluded">
                <thead>
                  <tr>
                    <th>여행사명</th>
                    <th>제휴상태</th>
                    <th>제외 사유</th>
                  </tr>
                </thead>
                <tbody>
                  {excluded.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="product-affiliate-empty">
                        제외되는 제휴여행사가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    excluded.map(({ row, reason }) => (
                      <tr key={row.id}>
                        <td className="text-left">
                          <strong>{row.name}</strong>
                        </td>
                        <td>
                          <span className={`badge ${partnershipStatusBadgeClass(row.partnershipStatus)}`}>
                            {row.partnershipStatus}
                          </span>
                        </td>
                        <td className="text-left">{reason}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
        <div className="modal-actions product-share-picker-actions">
          <button type="button" className="primary" onClick={onClose}>
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
