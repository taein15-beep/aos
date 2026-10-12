"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import {
  SELLER_JOIN_BLOCK_REASONS,
  isSellerSelectable,
  sellerJoinStatusBadgeClass,
  type JoinedSeller,
} from "@/lib/admin/product-seller-sales-data";

export type SellerPickerModalProps = {
  joinedSellers: JoinedSeller[];
  /** 현재 상품에 이미 등록된 판매점 id */
  registeredIds: string[];
  onClose: () => void;
  onConfirm: (ids: string[]) => void;
};

/** 현재 공급여행사 가입 판매점 중 상품을 판매할 판매점을 다중 선택합니다. 거래상태 정상이면서 미등록인 판매점만 선택할 수 있습니다. */
export function SellerPickerModal({ joinedSellers, registeredIds, onClose, onConfirm }: SellerPickerModalProps) {
  const [keyword, setKeyword] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const visible = useMemo(() => {
    const term = keyword.trim().toLowerCase();
    if (!term) return joinedSellers;
    return joinedSellers.filter(
      (seller) => seller.sellerName.toLowerCase().includes(term) || seller.sellerCode.toLowerCase().includes(term),
    );
  }, [joinedSellers, keyword]);

  const canSelect = (seller: JoinedSeller) => isSellerSelectable(seller) && !registeredIds.includes(seller.id);
  const selectableVisibleIds = visible.filter(canSelect).map((seller) => seller.id);
  const allVisibleSelected =
    selectableVisibleIds.length > 0 && selectableVisibleIds.every((id) => selectedIds.includes(id));
  const registeredCount = joinedSellers.filter((seller) => registeredIds.includes(seller.id)).length;
  const selectableCount = joinedSellers.filter(canSelect).length;

  const toggle = (id: string) =>
    setSelectedIds((ids) => (ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]));

  const toggleAll = () =>
    setSelectedIds((ids) =>
      allVisibleSelected
        ? ids.filter((id) => !selectableVisibleIds.includes(id))
        : Array.from(new Set([...ids, ...selectableVisibleIds])),
    );

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal product-share-picker-modal seller-picker-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="seller-picker-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <h3 id="seller-picker-title">판매점 선택</h3>
          <button type="button" aria-label="닫기" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="product-share-picker-body">
          <p className="product-share-picker-lead">
            우리 여행사에 가입된 판매점 중 이 상품을 판매할 판매점을 선택해주세요. 거래상태가 정상인 판매점만 선택할 수
            있습니다.
          </p>

          {joinedSellers.length === 0 ? (
            <div className="seller-sales-empty">
              <strong>가입된 판매점이 없습니다.</strong>
              <p>판매점 관리에서 판매점 가입을 먼저 진행해주세요.</p>
            </div>
          ) : (
            <>
              <div className="product-share-picker-toolbar">
                <label className="product-share-setting-search-input">
                  <Search size={14} />
                  <input
                    value={keyword}
                    onChange={(event) => setKeyword(event.target.value)}
                    placeholder="판매점명 또는 코드를 입력해주세요."
                    aria-label="판매점명 또는 판매점코드 검색"
                  />
                </label>
                <span>
                  가입 판매점 {joinedSellers.length}곳 · 선택 가능 {selectableCount}곳 · 등록됨 {registeredCount}곳
                </span>
              </div>
              <div className="member-web-detail-table-wrap">
                <table className="member-web-detail-table product-share-picker-table seller-picker-table">
                  <thead>
                    <tr>
                      <th>
                        <input
                          type="checkbox"
                          aria-label="선택 가능한 판매점 전체 선택"
                          checked={allVisibleSelected}
                          disabled={selectableVisibleIds.length === 0}
                          onChange={toggleAll}
                        />
                      </th>
                      <th>판매점</th>
                      <th>판매점코드</th>
                      <th>거래상태</th>
                      <th>현재 상품</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="product-affiliate-empty">
                          검색 조건에 해당하는 판매점이 없습니다.
                        </td>
                      </tr>
                    ) : (
                      visible.map((seller) => {
                        const registered = registeredIds.includes(seller.id);
                        const blockReason =
                          seller.joinStatus === "정상" ? null : SELLER_JOIN_BLOCK_REASONS[seller.joinStatus];
                        return (
                          <tr key={seller.id} className={registered || blockReason ? "is-blocked" : undefined}>
                            <td>
                              <input
                                type="checkbox"
                                aria-label={`${seller.sellerName} 선택`}
                                checked={!blockReason && (registered || selectedIds.includes(seller.id))}
                                disabled={!canSelect(seller)}
                                onChange={() => toggle(seller.id)}
                              />
                            </td>
                            <td className="text-left">
                              <strong>{seller.sellerName}</strong>
                            </td>
                            <td>{seller.sellerCode}</td>
                            <td>
                              <span className={`badge ${sellerJoinStatusBadgeClass(seller.joinStatus)}`}>
                                {seller.joinStatus}
                              </span>
                            </td>
                            <td>
                              {blockReason ? (
                                <div className="product-share-picker-blocked seller-picker-registered">
                                  <span className="badge gray">선택불가</span>
                                  <small>{blockReason}</small>
                                  {registered ? <small>이 상품에 등록됨 · 판매중지</small> : null}
                                </div>
                              ) : registered ? (
                                <div className="product-share-picker-blocked seller-picker-registered">
                                  <span className="badge info">등록됨</span>
                                  <small>판매설정에서 조건 수정</small>
                                </div>
                              ) : (
                                <span className="badge gray">미등록</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
        <div className="modal-actions product-share-picker-actions">
          <span>
            <b>{selectedIds.length}</b>개 판매점 선택
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
            선택한 판매점 추가{selectedIds.length > 0 ? ` (${selectedIds.length})` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}
