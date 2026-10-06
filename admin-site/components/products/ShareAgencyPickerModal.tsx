"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import {
  formatAffiliateGroups,
  isPartnershipShareable,
  partnershipShareBlockReason,
  partnershipStatusBadgeClass,
  type AffiliateAgencyRow,
} from "@/lib/admin/product-affiliate-data";

/** 미공유 제휴여행사 중 공유 대상을 다중 선택합니다. 제휴 상태가 정상이 아닌 여행사는 선택할 수 없습니다. */
export function ShareAgencyPickerModal({
  candidates,
  applyLabel,
  onClose,
  onConfirm,
}: {
  candidates: AffiliateAgencyRow[];
  applyLabel: string;
  onClose: () => void;
  onConfirm: (ids: string[]) => void;
}) {
  const [keyword, setKeyword] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const visible = useMemo(() => {
    const value = keyword.trim();
    if (!value) return candidates;
    return candidates.filter((row) => row.name.includes(value) || row.groups.some((group) => group.includes(value)));
  }, [candidates, keyword]);

  const shareableVisibleIds = visible.filter((row) => isPartnershipShareable(row.partnershipStatus)).map((row) => row.id);
  const allVisibleSelected =
    shareableVisibleIds.length > 0 && shareableVisibleIds.every((id) => selectedIds.includes(id));
  const blockedCount = candidates.filter((row) => !isPartnershipShareable(row.partnershipStatus)).length;

  const toggle = (id: string) =>
    setSelectedIds((ids) => (ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]));

  const toggleAll = () => {
    if (allVisibleSelected) {
      setSelectedIds((ids) => ids.filter((id) => !shareableVisibleIds.includes(id)));
      return;
    }
    setSelectedIds((ids) => [...new Set([...ids, ...shareableVisibleIds])]);
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal product-share-picker-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-picker-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <h3 id="share-picker-title">제휴여행사 추가</h3>
          <button type="button" aria-label="닫기" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="product-share-picker-body">
          <p className="product-share-picker-lead">
            그룹 가입 승인된 제휴여행사 중 이 상품을 아직 공유하지 않은 여행사입니다. 제휴 상태가 정상인 여행사만 선택할 수
            있습니다.
          </p>
          <div className="product-share-picker-toolbar">
            <label className="product-share-setting-search-input">
              <Search size={14} />
              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="여행사명 / 공유그룹 검색"
                aria-label="추가할 제휴여행사 검색"
              />
            </label>
            <span>
              후보 {candidates.length}곳{blockedCount > 0 ? ` · 공유 불가 ${blockedCount}곳` : ""}
            </span>
          </div>
          <div className="member-web-detail-table-wrap">
            <table className="member-web-detail-table product-share-picker-table">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      aria-label="공유 가능한 여행사 전체 선택"
                      checked={allVisibleSelected}
                      disabled={shareableVisibleIds.length === 0}
                      onChange={toggleAll}
                    />
                  </th>
                  <th>제휴여행사</th>
                  <th>지역</th>
                  <th>제휴상태</th>
                  <th>공유 가능 여부</th>
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="product-affiliate-empty">
                      {candidates.length === 0 ? "추가할 수 있는 제휴여행사가 없습니다." : "검색 결과가 없습니다."}
                    </td>
                  </tr>
                ) : (
                  visible.map((row) => {
                    const blockedReason = partnershipShareBlockReason(row.partnershipStatus);
                    return (
                      <tr key={row.id} className={blockedReason ? "is-blocked" : undefined}>
                        <td>
                          <input
                            type="checkbox"
                            aria-label={`${row.name} 선택`}
                            checked={selectedIds.includes(row.id)}
                            disabled={Boolean(blockedReason)}
                            onChange={() => toggle(row.id)}
                          />
                        </td>
                        <td className="text-left">
                          <strong>{row.name}</strong>
                          <small className="product-share-setting-sub">{formatAffiliateGroups(row.groups) || "-"}</small>
                        </td>
                        <td>{row.region}</td>
                        <td>
                          <span className={`badge ${partnershipStatusBadgeClass(row.partnershipStatus)}`}>
                            {row.partnershipStatus}
                          </span>
                        </td>
                        <td className="text-left">
                          {blockedReason ? (
                            <div className="product-share-picker-blocked">
                              <span className="badge gray">공유 불가</span>
                              <small>{blockedReason}</small>
                            </div>
                          ) : (
                            <span className="badge success">공유 가능</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="modal-actions product-share-picker-actions">
          <span>
            선택 <b>{selectedIds.length}</b>곳 · {applyLabel}
          </span>
          <button type="button" className="secondary" onClick={onClose}>
            취소
          </button>
          <button
            type="button"
            className="primary"
            disabled={selectedIds.length === 0}
            onClick={() => onConfirm(selectedIds)}
          >
            선택 여행사 추가
          </button>
        </div>
      </div>
    </div>
  );
}
