# AOS 공급여행사 ↔ 판매점 채널 데이터 모델 정의

> STEP 12 산출물 · 실제 데이터 연동을 위한 데이터 구조 · 상태값 · 관계 · 계산 기준 정의
> 참고 타입 · Helper: [`seller-channel-data-types.ts`](./seller-channel-data-types.ts) (실행 코드에서 import 하지 않음)
> 이 문서는 DB 테이블 · SQL · ORM · Migration · API Endpoint 정의가 아닙니다. 업무 Entity와 규칙만 정의합니다.
> 기준 Prototype: STEP 1~11 (판매점 가입 · 공급여행사 관계 · 판매상품 · 예약 · 취소/환불 · 인보이스 · 정산 · 지급 · 상호연동)

---

## 목차

1. 목적과 범위
2. 현재 Prototype 조사결과
3. 전체 Domain 구조 · 관계도
4. Supplier
5. Seller · SellerPayoutAccount
6. SupplierSellerRelation
7. Product
8. SellerProduct
9. 판매상태 우선순위 (Effective Sale Status)
10. Reservation · Pricing Snapshot
11. CancellationRequest
12. Refund
13. Invoice · InvoiceVersion
14. Settlement · SettlementItem
15. SettlementAdjustment (차기정산)
16. SettlementStatement (정산서 Version)
17. SettlementPayment (지급)
18. 상태값 전체 목록
19. 상태전이표 · 금지 전이
20. 권한 · 데이터 격리 정책
21. 금액 계산 정책
22. History · Audit · 삭제 정책
23. ID / Code 정책
24. 기존 Mock 매핑
25. 중복 Type · 상태 조사결과
26. 한글 상태 직접비교 현황
27. 실제 데이터 연동 시 영향 파일
28. 실제 데이터 연동 권장 순서
29. 남은 정책 결정사항

---

## 1. 목적과 범위

- 화면별로 흩어진 판매점 채널 Mock(판매점 관리자 `lib/seller/*`, 공급여행사 관리자 `lib/admin/seller-channel-*`, 판매점관리 `lib/admin/members-seller-*`)을 실제 데이터로 옮길 때 **의미가 깨지지 않도록 Entity · 상태 · 관계 · 계산 기준을 고정**합니다.
- 범위 밖: DB 생성, Migration, Prisma/ORM Schema, API · Server Action, Repository Layer, 실제 인증 · 결제 · 환불 · 이체, Mock 제거, 기존 화면 수정.

표기: `[필수]` 연동 시 반드시 지켜야 함 · `[권장]` 연동 시 적용 권장 · `[추후]` 운영 확대 시 검토.

---

## 2. 현재 Prototype 조사결과

### 2.1 Domain별 현재 Type · Data Source

| Domain | 현재 Type | 파일 | 비고 |
| --- | --- | --- | --- |
| 판매점 프로필 (판매점 관리자) | `SellerAdminProfile`, `SellerRegisteredInfo` | `lib/seller/seller-admin-profile.ts` | `sellerId`와 `sellerCode`가 모두 `SEL00032` |
| 판매점 인증 Mock | `SellerMockAccount`, `SellerSession` | `lib/seller/auth.ts` | 쿠키 세션 Mock |
| 판매점 계정 · 거래상태 | `SellerAccountStatus`, `SupplierTradeStatus` | `lib/seller/seller-login-mock.ts` | 계정 상태와 거래상태를 이미 분리 |
| 판매점 공통 도메인 (가입신청) | `SellerProfile`, `SellerAgencyRelation`, `SellerApprovalStatusCode` | `lib/seller/seller-domain.ts` | website와 동일 유지 규칙. 홈페이지 가입신청 Flow 기준 |
| 판매점 가입신청 (AOS 관리자) | `SellerApplication` | `lib/admin/members-seller-data.ts` | `seller-domain` 코드 사용 |
| 공급여행사 ↔ 판매점 관계 (판매점 시점) | `SellerSupplierRelation` | `lib/seller/seller-suppliers-data.ts` | 행복투어 · 현담 · A투어 |
| 공급여행사 ↔ 판매점 관계 (공급여행사 시점) | `SellerRelation`, `SellerRelationProduct` | `lib/admin/members-seller-relation-data.ts` | STEP 11에서 SEL00032만 판매점 Data 연결 |
| 판매점 판매상품 | `SellerAdminProduct`, `SellerProductStopCause` | `lib/seller/seller-admin-products-data.ts` | 판매상태 계산 함수 `resolveSalesStatus` 보유 |
| 판매상품 Client State | 가격 · 자체중지 · 재개확인 · 이력 | `lib/seller/use-seller-products-state.ts` | 메모리 Store |
| 상품별 판매점 판매설정 (공급여행사) | `SellerSalesRow`, `JoinedSeller` | `lib/admin/product-seller-sales-data.ts` | 독립 Mock |
| 판매점 상세 패널 (공급여행사) | `SellerAssignedProduct`, `SellerReservationRow`, `SellerSettlementRow` | `lib/admin/members-seller-{products,reservations,settlements}-data.ts` | 독립 Mock (구 구조) |
| 예약 (판매점) | `SellerReservation`, `SellerReservationCancelRequest` | `lib/seller/seller-reservations-data.ts` | 예약 당시 판매조건 Snapshot 계산 |
| 예약 (AOS 공통 · 공급여행사) | `ReservationDetail`, `ReservationBookingTerms`, `ReservationSellerCancelRequest`, `ReservationSellerRefund` | `lib/admin/reservations-data.ts` | 취소 승인 · 거절 · 환불 결과 저장 위치 |
| 판매점 채널 예약 Record | `SellerChannelRecord` | `lib/admin/seller-channel-reservations.ts` | 판매점 예약 → 공급여행사 화면 변환 |
| 취소요청 Store | `SellerCancelRequestState` | `lib/seller/seller-cancel-request-store.ts` | STEP 11 공용 Source |
| 취소 진행상태 (판매점 시점) | `SellerSupplierCancelProgress` | `lib/seller/use-seller-reservations-state.ts` | 공급여행사 처리결과를 판매점 상태로 변환 |
| 인보이스 | `SellerInvoice`, `SellerInvoiceVersion`, `SellerInvoiceSnapshot` | `lib/seller/seller-invoices-data.ts` | Version · Snapshot 구조 보유 |
| 인보이스 Client State | 재발행 · 발송 · 취소결과 | `lib/seller/use-seller-invoices-state.ts` | |
| 판매점 정산 · 지급 | `SellerSettlement`, `SellerSettlementLine`, `SellerNextAdjustment`, `SellerSettlementDocument`, `SellerSettlementPayment` | `lib/admin/seller-channel-settlements.ts` | 정산 · 정산서 Version · 차기정산 · 지급 모두 포함 |
| 지급계좌 | `SellerPayoutAccount` | `lib/seller/seller-admin-profile.ts` | Masking 값만 보관 |
| 판매점 Dashboard | `SellerDashboard*` | `lib/seller/seller-dashboard-data.ts` | 정적 집계 |

### 2.2 이미 목표 구조와 일치하는 부분

- 판매점 계정 상태와 공급여행사 거래상태 분리 (`seller-login-mock.ts`).
- 판매상태 계산값 · 우선순위 · 자동복구 금지 (`seller-admin-products-data.ts`, `use-seller-products-state.ts`).
- 예약 당시 판매조건 Snapshot (`BOOKING_TERMS`, `ReservationBookingTerms`).
- 취소요청 `previousReservationStatus` 보존 · 거절 시 복원 (`ReservationSellerCancelRequest`).
- 환불실패 시 취소승인 유지 · 환불 0원 취소완료 (`ReservationSellerRefund`).
- 인보이스 Version 보존 · Snapshot (`SellerInvoiceVersion`).
- 정산서 Version · 지급기준 Version · 지급 후 차기정산 (`seller-channel-settlements.ts`).

### 2.3 목표 구조와 차이 (연동 전 정리 대상)

| 차이 | 현재 | 목표 |
| --- | --- | --- |
| 식별자 | Code를 ID로 사용 (`SEL00032`, `RSV-…`, `AGENCY-HAPPY`) · 공급여행사는 이름 문자열로 필터 (`listSellerSettlementsBySupplier(supplierName)`) | 내부 `id` FK + 표시 Code `[필수]` |
| 상태값 | 한글 Label을 값으로 저장 · 비교 | 영문 코드 저장 + Label 매핑 `[필수]` |
| 관계 Entity | 판매점 시점 · 공급여행사 시점 관계 Mock이 따로 존재 | `SupplierSellerRelation` 1개 `[필수]` |
| 취소요청 | 판매점 Store + 관리자 예약 데이터에 분산 | `CancellationRequest` 1개 `[필수]` |
| 환불 | `ReservationSellerRefund` 1개에 시도 이력 배열 | `Refund` 시도 1회 = 1 Row `[권장]` |
| 정산 항목 | `SellerSettlementLine` + `otherReservations` 집계값 + `sampleLines` | `SettlementItem` 전부 개별 Row `[필수]` |
| 정산 금액 | 현재 정산 `principal + currentAdjustment`, 정적 정산 `Math.max(0, profit + current + carried)` 두 방식 | 단일 계산식 (21장) `[필수]` |
| 판매점 확인 | `sellerConfirmed: boolean` | `sellerConfirmedVersion` (확인한 정산서 Version) `[권장]` |

---

## 3. 전체 Domain 구조 · 관계도

```
AOS 사용자/조직 (User · Staff · Seller 로그인 계정)
  └─ Supplier (공급여행사)
       ├─ 1:N Product (원본상품)
       └─ N:M Seller  via SupplierSellerRelation
                         └─ 1:N SellerProduct (판매허용 상품 + 판매점별 판매조건)
                                  └─ 1:N Reservation (Pricing Snapshot)
                                           ├─ 1:N CancellationRequest
                                           │        └─ 1:N Refund
                                           ├─ 1:1 Invoice ─ 1:N InvoiceVersion
                                           └─ 1:N SettlementItem
  Supplier + Seller (Relation) ─ 1:N Settlement
                                    ├─ 1:N SettlementItem
                                    ├─ 1:N SettlementStatement (정산서 Version)
                                    ├─ 0..1 SettlementPayment (지급 · 현재 1회 지급 기준)
                                    └─ 1:N SettlementAdjustment (source / target)
  Seller ─ 0..1 SellerPayoutAccount (현재 유효 계좌 1개)
```

| 관계 | Cardinality | 비고 |
| --- | --- | --- |
| Supplier → Product | 1:N | 상품 원본 소유자는 Supplier |
| Supplier ↔ Seller | N:M | `SupplierSellerRelation`으로만 연결 |
| Product → SellerProduct | 1:N | 판매점마다 별도 판매조건 |
| Relation → SellerProduct | 1:N | `SellerProduct.relationId` |
| SellerProduct → Reservation | 1:N | 예약은 Snapshot 보유, SellerProduct 변경 영향 없음 |
| Reservation → CancellationRequest | 1:N | 거절 후 재요청 가능성 고려. 동시에 진행 중인 요청은 1건 |
| CancellationRequest → Refund | 1:N | 실패 후 재시도 |
| Reservation → Invoice | 1:1 | `INV-` 번호는 예약번호에서 파생, Version과 무관하게 고정 |
| Invoice → InvoiceVersion | 1:N | currentVersion 1개 |
| Relation → Settlement | 1:N | 공급여행사별 · 기간별 분리 |
| Settlement → SettlementItem | 1:N | 예약 1건은 한 정산에만 포함 |
| Settlement → SettlementStatement | 1:N | currentStatementVersion 1개 |
| Settlement → SettlementPayment | 0..1 | 분할지급은 추후 결정 (29장) |

---

## 4. Supplier

| 필드 | 설명 |
| --- | --- |
| `id` | 내부 ID |
| `supplierCode` | `SUP00001` (표시 · 검색) |
| `name` / `businessName` | 표시명 `행복투어` / 사업자 상호 |
| `businessNumber`, `representativeName`, `phone`, `email`, `address` | 사업자 정보 |
| `status` | `ACTIVE` · `SUSPENDED` |
| Audit | `createdAt/By`, `updatedAt/By` |

- `[필수]` 공급여행사 관리자 화면의 모든 조회 Scope는 로그인 사용자의 `supplierId`.
- 현재 Prototype은 `?view=supplier-happytour` 와 `SELLER_SETTLEMENT_SUPPLIER_NAME = "행복투어"` 문자열로 Scope를 표현합니다.

---

## 5. Seller · SellerPayoutAccount

### 5.1 Seller

| 필드 | 설명 |
| --- | --- |
| `id`, `sellerCode` (`SEL00032`), `loginId` | 로그인 ID는 Seller 1:1 (복수 사용자 계정은 추후) |
| `name`, `businessName`, `businessNumber`, `representativeName`, `managerName`, `phone`, `email`, `address` | 판매점 가입 시 등록 — 공급여행사 추가 가입 시 재입력하지 않음 |
| `accountStatus` | `ACTIVE` · `SUSPENDED` · `WITHDRAWN` |

- `[필수]` **판매점 계정상태 ≠ 공급여행사 관계상태.** 예: 그래가자 `ACTIVE` + 행복투어 관계 `INACTIVE` + 현담 관계 `ACTIVE` 가능.
- `accountStatus = SUSPENDED` → 판매점 관리자 로그인 제한(현재 Mock "이용제한"). 신규판매 전체 차단 여부는 29장 결정사항.
- 주민등록번호 등 고위험 개인정보는 보관하지 않습니다.

### 5.2 SellerPayoutAccount

| 필드 | 설명 |
| --- | --- |
| `bankCode`, `bankName`, `accountHolder` | |
| `accountNumberEncrypted` | 저장 시 암호화 · 응답/화면 노출 금지 |
| `accountNumberMasked` | 화면 표시용 (`123-****-****-01`) |
| `verifiedAt`, `status` | `ACTIVE` · `INACTIVE` |

- `[필수]` 화면 · 지급정보 Snapshot에는 Masking 값만 사용. 현재 Mock(`SellerPayoutAccount.maskedNumber`)도 Masking 값만 보관합니다.

---

## 6. SupplierSellerRelation

| 필드 | 설명 |
| --- | --- |
| `id`, `supplierId`, `sellerId` | (supplierId, sellerId) Unique |
| `status` | `PENDING` · `ACTIVE` · `INACTIVE` · `REJECTED` |
| `appliedAt`, `approvedAt`, `rejectedAt`, `suspendedAt`, `resumedAt` | 상태별 일시 |
| `rejectionReason` | 거절 사유 |

| 상태 | Label | 의미 | 신규판매 | 기존 거래 후속처리 |
| --- | --- | --- | --- | --- |
| `PENDING` | 승인대기 | 판매점 가입신청 · 공급여행사 승인대기 | 불가 (상품 미노출) | 해당 없음 |
| `ACTIVE` | 정상 | 정상 거래 | 가능 | 가능 |
| `INACTIVE` | 이용중지 | 관계 유지 · 신규판매 차단 | 불가 (상품 노출 · 판매중지 표시) | 가능 (취소 · 환불 · 인보이스 · 정산 · 지급) |
| `REJECTED` | 승인거절 | 가입신청 거절 | 불가 (상품 미노출) | 해당 없음 |

- `[필수]` 관계를 다시 `ACTIVE`로 바꿔도 `SellerProduct.sellerSaleStatus`와 재개확인 필요 상태는 자동 해제하지 않습니다.
- `[권장]` 관계는 삭제하지 않습니다. 종료가 필요하면 `WITHDRAWN` 상태 추가를 검토합니다(29장).
- 거절 후 재신청은 같은 Row를 `PENDING`으로 되돌리는 방식(현재 정의) 또는 새 Row 생성 중 선택이 필요합니다(29장).

---

## 7. Product

| 필드 | 설명 |
| --- | --- |
| `id`, `productCode` (`HT-WINE01`), `supplierId` | |
| `name`, `description`, `itinerary`, `images`, `travelPeriod`, `cancellationPolicy` | 원본 정보 — **판매점 수정 불가** |
| `status`, `stopReason` | `ACTIVE` · `STOPPED` · `ENDED` |

| 코드 | Label | 현재 Prototype 대응 |
| --- | --- | --- |
| `ACTIVE` | 판매중 | 기본 / 공유상품 `판매중` / 판매점관리 카탈로그 `판매중` |
| `STOPPED` | 판매중지 | `supplierStopReason = "공급여행사 판매중지"` / 공유상품 `판매중지` / 카탈로그 `비노출` |
| `ENDED` | 운영종료 | `operationEndOverrides` (판매기간 종료 · 시즌 종료) |

- 공유상품 `판매대기`(출시 전) · 카탈로그 `품절`(재고)은 상품 상태가 아니라 출발일 · 재고 Domain에서 다룹니다(29장).
- `[필수]` 상품 원본가격 · 일정 · 설명 · 이미지 수정 권한은 Supplier만 갖습니다.

---

## 8. SellerProduct

공급여행사가 특정 판매점에 판매권한을 부여한 관계 Entity. 기존 명칭(`SellerAdminProduct` · `SellerRelationProduct` · `SellerSalesRow`)을 하나로 통합하는 목표 명칭입니다.

| 필드 | 설정 주체 | 설명 |
| --- | --- | --- |
| `id`, `productId`, `supplierId`, `sellerId`, `relationId` | 시스템 | (relationId, productId) Unique |
| `salesMode` | 공급여행사 | `COMMISSION` · `DEPOSIT` |
| `supplierSalePrice` | 공급여행사 | COMMISSION 판매가(1인) |
| `commissionRate` | 공급여행사 | COMMISSION 수수료율 (10 = 10%) |
| `depositPrice` | 공급여행사 | DEPOSIT 입금가(1인) |
| `sellerSalePrice` | **판매점** | DEPOSIT 최종 판매가(1인) — 공급여행사는 조회만 |
| `sellerSaleStatus` | 판매점 | `ACTIVE` · `STOPPED` |
| `resumeConfirmationRequired` | 시스템 | 상위 원인 발생 시 판매중이던 상품 → 재개확인 필요 |
| `allowedAt`, `revokedAt` | 공급여행사 | 판매허용 / 허용해제 (Hard Delete 대신) |
| `sellerStoppedAt`, `sellerResumedAt` | 판매점 | 자체중지 / 재개 |

판매방식:

| 판매방식 | 공급여행사 설정 | 판매점 설정 | 판매점 수익 |
| --- | --- | --- | --- |
| `COMMISSION` 수수료형 | 판매가 · 수수료율 | 없음 (가격 변경 불가) | `예약금액 × 수수료율` |
| `DEPOSIT` 입금가형 | 입금가 | 최종 판매가 (≥ 입금가) | `(판매점 판매가 − 입금가) × 인원` |

- `[필수]` 판매점 판매가 변경 · 공급여행사 입금가/수수료율 변경은 **기존 예약에 영향 없음** (Snapshot).
- `[권장]` SellerProduct 조건 변경 이력(`판매가 변경 65,000원 → 70,000원`)은 History로 남깁니다(현재 `SellerProductHistoryEntry`).

---

## 9. 판매상태 우선순위 (Effective Sale Status)

`sellerSaleStatus`만으로 판매가능 여부를 결정하지 않고 아래 순서로 계산합니다. (`getSellerProductEffectiveStatus`)

| 순위 | 조건 | UI 상태 | Reason |
| --- | --- | --- | --- |
| 1 | Relation ≠ `ACTIVE` | 판매중지 | `SUPPLIER_RELATION_INACTIVE` |
| 2 | Product = `ENDED` | 판매중지 | `PRODUCT_ENDED` |
| 2 | Product = `STOPPED` | 판매중지 | `PRODUCT_STOPPED` |
| 3 | SellerProduct = `STOPPED` | 판매중지 | `SELLER_STOPPED` |
| 3 | 재개확인 필요 | 판매중지 | `RESUME_CONFIRMATION_REQUIRED` |
| 4 | DEPOSIT · 판매가 미설정 또는 입금가 미만 | **설정대기** | `PRICE_NOT_CONFIGURED` |
| - | 그 외 | 판매중 | - |

- UI는 `판매중` · `설정대기` · `판매중지` 3가지, 원인은 Reason으로 표시합니다.
- 노출 규칙: Relation `PENDING` · `REJECTED` 또는 `revokedAt` 존재 시 판매점 상품목록에서 제외 (`isSellerProductVisible`). 현재 Prototype도 승인대기 공급여행사 상품을 제외합니다.
- `[필수]` **자동복구 금지**: `SellerProduct STOPPED + Relation INACTIVE → Relation ACTIVE`가 되어도 `STOPPED` 유지.
- 현재 Prototype 우선순위(`resolveSalesStatus`)와 동일합니다. "재개확인 필요"는 요청서의 4단계에 없던 현재 Prototype 정책으로 3순위에 포함했습니다(29장).

---

## 10. Reservation · Pricing Snapshot

### 10.1 Reservation

| 필드 | 설명 |
| --- | --- |
| `id`, `reservationCode` (`RSV-20261012-001`) | |
| `sellerId`, `supplierId`, `relationId`, `sellerProductId`, `productId` | 예약 시점 FK — Scope · 정산 연결 기준 |
| `productSnapshot` | 예약 당시 상품코드 · 상품명 |
| `customer` | 고객 Snapshot (이름 · 연락처 Masking · 이메일) 또는 `customerId` |
| `reservationStatus` / `paymentStatus` | 별도 관리 |
| `bookedAt`, `travelDate`, `pricing`, `paidAmount`, `operationsHandoverAt` | |

### 10.2 ReservationPricingSnapshot `[필수]`

| 필드 | 설명 |
| --- | --- |
| `salesMode` | 예약 당시 판매방식 |
| `unitSalePrice` | 1인 판매가 (COMMISSION: 공급 판매가 / DEPOSIT: 판매점 판매가) |
| `depositPrice` | DEPOSIT 입금가 |
| `commissionRate` | COMMISSION 수수료율 |
| `headCount` | 인원 |
| `totalReservationAmount` | `unitSalePrice × headCount` |
| `expectedSellerIncome` | `calculateSellerIncome(snapshot)` |

- 예약 후 판매가 · 입금가 · 수수료율 · 상품가격이 바뀌어도 기존 예약 금액 · 수익은 바뀌지 않습니다.
- 현재 Prototype: `BOOKING_TERMS`는 판매상품 원본 Mock 기준이며 판매점 Client State(판매가 변경)를 반영하지 않습니다. STEP 11에서 판매가 70,000원 변경 후에도 기존 예약 금액이 유지되는 것을 확인했습니다.

### 10.3 예약상태 · 결제상태

| 예약상태 | Label | | 결제상태 | Label |
| --- | --- | --- | --- | --- |
| `RECEIVED` | 예약접수 | | `UNPAID` | 미결제 |
| `CONFIRMED` | 예약확정 | | `PARTIALLY_PAID` | 일부결제 |
| `CANCELLATION_REQUESTED` | 취소요청 | | `PAID` | 결제완료 |
| `CANCELLATION_APPROVED` | 취소승인 | | `REFUNDED` | 환불완료 |
| `CANCELLED` | 취소완료 | | | |

- 예약상태와 결제상태는 독립: `예약확정 + 미결제`, `취소승인 + 결제완료`, `취소완료 + 환불완료`, `취소완료 + 미결제` 모두 유효.
- **취소거절은 예약상태가 아닙니다.** 거절 시 `previousReservationStatus`로 복원하고 CancellationRequest(`REJECTED`) · ReservationStatusHistory에 기록합니다.
- AOS 공통 예약(`ReservationDetail.reserveStatus`)에는 `대기` · `예약마감` · `운영인계` · `행사완료` 등 운영 상태가 더 있습니다. 판매점 채널은 위 5개만 노출하고, 운영인계는 `operationsHandoverAt`으로 별도 관리합니다.

---

## 11. CancellationRequest

| 필드 | 설명 |
| --- | --- |
| `reservationId` | |
| `requestedByType` / `requestedById` | 시스템 등록주체. 고객 전화 요청도 판매점이 등록하면 `SELLER` / `SEL00032` |
| `requestedAt`, `reasonCode`, `reasonText`, `customerMessage` | 사유 코드: 고객 개인사정 · 일정 변경 · 건강상의 사유 · 중복예약 · 상품 변경 · 기타 |
| `previousReservationStatus` | `RECEIVED` · `CONFIRMED` — 거절 시 복원 |
| `status` | `REQUESTED` · `APPROVED` · `REJECTED` · `COMPLETED` |
| `reviewedBy`, `reviewedAt`, `rejectionReason`, `reviewMemo` | 공급여행사 검토 |
| `cancellationFee`, `expectedRefundAmount` | 승인 시 확정 |
| `completedAt` | 취소완료 일시 |

- 예약상태(`CANCELLATION_*`)와 취소요청 상태(`REQUESTED` …)는 다른 Enum입니다.
- `[필수]` 판매점은 등록만 가능합니다. 승인 · 거절 · 환불 처리는 공급여행사만 할 수 있습니다.
- `[필수]` 진행 중(`REQUESTED` · `APPROVED`) 요청이 있으면 중복 등록을 막습니다.
- `[필수]` **취소수수료는 고객 부과 금액**이며 판매점 정산수익과 자동 연결하지 않습니다(정산은 21장 기준).

---

## 12. Refund

| 필드 | 설명 |
| --- | --- |
| `reservationId`, `paymentId`, `cancellationRequestId` | |
| `refundMethod` | `ORIGINAL_PAYMENT`(원결제수단) · `BANK_TRANSFER`(계좌환불) |
| `refundAmount`, `status`, `processedAt`, `processedBy`, `reference`, `memo`, `failureReason` | |

| 상태 | Label | 예약 처리 |
| --- | --- | --- |
| `PENDING` | 환불대기 | `CANCELLATION_APPROVED` 유지 |
| `COMPLETED` | 환불완료 | `CANCELLED` + 결제상태 `REFUNDED` |
| `FAILED` | 환불실패 | `CANCELLATION_APPROVED` 유지 — **`CANCELLED` 금지** |

- `[필수]` 환불금액 > 0: Refund `COMPLETED` 후에만 예약 `CANCELLED`.
- `[필수]` 환불금액 = 0 (미결제 · 전액 수수료): Refund 없이 `CANCELLED` 가능. 미결제 취소는 결제상태 `UNPAID` 유지.
- `[권장]` 재시도는 새 Refund Row를 만듭니다. `FAILED`는 종료 상태입니다. 현재 Mock은 `attempts[]` 배열로 관리합니다.
- 계좌환불 계좌번호는 Masking 값만 보관합니다(현재 `bankAccount.accountMasked`).

---

## 13. Invoice · InvoiceVersion

| Invoice 필드 | 설명 |
| --- | --- |
| `invoiceCode` | `INV-YYYYMMDD-NNN` (예약번호에서 파생 · Version과 무관하게 고정) |
| `reservationId`, `sellerId`, `supplierId` | |
| `currentVersion` | 현재 유효 Version — 한 시점에 1개 |
| `status` | `NORMAL` · `REISSUE_REQUIRED` · `CANCELLED` |

| InvoiceVersion 필드 | 설명 |
| --- | --- |
| `version`, `status`, `issuedAt`, `issuedBy`, `amount`, `reason` | 과거 Version은 `VOID` |
| `snapshot` | 발행 당시 공급여행사 · 판매점 · 예약 · 결제 · 금액 |

| 상태 | Label | 의미 |
| --- | --- | --- |
| `NORMAL` | 정상 | 현재 Version 유효 |
| `REISSUE_REQUIRED` | 재발행 필요 | 취소승인 등으로 금액이 바뀔 예정. 환불 완료 전에는 재발행 불가 |
| `CANCELLED` | 취소 | 고객 최종 부담금 0원 취소 (Version 상태) |
| `VOID` | 무효 | 재발행으로 대체된 과거 Version |

- `[필수]` 재발행 시 v1 삭제 금지: v1 → `VOID`, v2 → `NORMAL`.
- 예: 결제 130,000 · 취소수수료 13,000 · 환불 117,000 → v1 130,000 (`VOID`) / v2 13,000 (`NORMAL`).
- `[필수]` Invoice Version과 SettlementStatement Version은 서로 독립적입니다.

---

## 14. Settlement · SettlementItem

### 14.1 Settlement

| 필드 | 설명 |
| --- | --- |
| `settlementCode` | `STL-YYYYMM-{공급여행사키}-NNN` (예: `STL-202610-HT-001`) |
| `supplierId`, `sellerId`, `relationId`, `periodStart`, `periodEnd` | **공급여행사별 분리** — 그래가자의 행복투어 정산과 현담 정산은 별도 |
| `status` | `PENDING` · `CONFIRMED` · `MODIFICATION_REQUIRED` · `RECONFIRMATION_REQUIRED` · `PAID` |
| `paymentStatus` | `WAITING` · `PAID` |
| `baseAmount`, `adjustmentAmount`, `finalAmount` | 21장 계산식 |
| `currentStatementVersion` | 현재 유효 정산서 Version |
| `operationsHandoverCompleted` | 정산확정 · 지급 필수 조건 |
| `sellerConfirmedVersion` | 판매점이 확인한 정산서 Version |
| `paidAmount` | 지급완료 금액 |

- `status`와 `paymentStatus`가 일부 중복되지만 기존 UI(정산상태 Badge + 지급상태 Badge)와 맞추기 위해 둘 다 유지합니다. `status = PAID` ⇔ `paymentStatus = PAID`.
- `[필수]` 정산확정 조건 (`canConfirmSettlement`): `PENDING` 또는 `RECONFIRMATION_REQUIRED`(판매점이 현재 Version 확인 완료) · **`operationsHandoverCompleted = true`** · 유효 정산서 존재.

### 14.2 SettlementItem

| 필드 | 설명 |
| --- | --- |
| `settlementId`, `reservationId`, `salesMode` | 예약 1건 = 1 Item, 한 정산에만 포함 |
| `originalSellerIncome` | 예약 Snapshot `expectedSellerIncome` |
| `adjustmentAmount` | 이 정산에 반영된 조정 (취소 시 `−originalSellerIncome`) |
| `finalSettlementAmount` | `originalSellerIncome + adjustmentAmount` |
| `status` | `NORMAL`(정상) · `ADJUSTED`(반영완료) · `ADJUSTMENT_PENDING`(반영대기) · `CARRIED_OVER`(차기정산 반영예정) · `CANCELLING`(취소처리중) |

| 예 | original | adjustment | final |
| --- | --- | --- | --- |
| 정상 예약 | 20,000 | 0 | 20,000 |
| 지급 전 취소완료 | 20,000 | −20,000 | 0 |

- 현재 Prototype의 `otherReservations`(집계값)와 `sampleLines`는 실제 연동 시 모두 개별 SettlementItem으로 대체합니다.

---

## 15. SettlementAdjustment (차기정산)

| 필드 | 설명 |
| --- | --- |
| `supplierId`, `sellerId`, `reservationId` | |
| `sourceSettlementId` | 지급완료된 원 정산 |
| `targetSettlementId` | 반영할 차기 정산 (생성 전이면 null) |
| `adjustmentType` | `CANCELLATION` (현재 유일) |
| `amount` | 음수 (예: −20,000) |
| `status` | `PENDING` · `SCHEDULED`(차기정산 대기) · `APPLIED`(반영완료) |
| `createdAt`, `appliedAt` | |

취소완료 시점의 정산상태별 처리 (`resolveCancellationSettlementPath`):

| 정산상태 | 처리 |
| --- | --- |
| `PENDING` | 현재 SettlementItem에 직접 조정 (`adjustmentAmount = −income`) |
| `CONFIRMED` (지급 전) | `MODIFICATION_REQUIRED` → Item 조정 → 정산서 재발행 → `RECONFIRMATION_REQUIRED` → 판매점 재확인 → `CONFIRMED` |
| `MODIFICATION_REQUIRED` | Item 조정 (재발행 전이므로 상태 유지) |
| `RECONFIRMATION_REQUIRED` | `MODIFICATION_REQUIRED`로 되돌린 뒤 Item 조정 → 재발행 → 판매점 재확인 다시 필요 |
| `PAID` | **금액 수정 금지.** SettlementAdjustment(`SCHEDULED`) 생성 → 차기 정산에 `APPLIED` |

- `[필수]` 같은 예약의 취소조정은 Item 조정 또는 Adjustment 중 **한 곳에만** 존재합니다. 이중 차감은 금지입니다.
- 예: 차기 정산 2,500,000 − 20,000 = 2,480,000.

---

## 16. SettlementStatement (정산서 Version)

| 필드 | 설명 |
| --- | --- |
| `settlementId`, `version`, `status` | `CURRENT` · `VOID` — 현재 유효 Version 1개 |
| `issuedAt`, `issuedBy`, `reason` | |
| `baseAmount`, `adjustmentAmount`, `finalAmount` | 발행 시점 금액 |
| `snapshot` | 발행 시점 Item 목록 |

- `[필수]` 재발행 시 이전 Version 보존 (`VOID`). 판매점 확인은 `sellerConfirmedVersion`으로 Version 단위로 기록합니다.
- Invoice Version과 별개 번호 체계입니다.

---

## 17. SettlementPayment (지급)

| 필드 | 설명 |
| --- | --- |
| `settlementId`, `amount`, `method` (`BANK_TRANSFER` · `OTHER`), `paidAt`, `reference`, `paidBy`, `memo` | |
| `settlementStatementVersion` | 지급기준 정산서 Version |
| `payoutAccountSnapshot` | 지급 시점 계좌 (Masking) |

- `[필수]` `Settlement.finalAmount = SettlementPayment.amount = 지급기준 정산서 finalAmount`.
- `[필수]` 지급 가능조건 (`canPaySettlement`): `status = CONFIRMED` · `paymentStatus = WAITING` · `operationsHandoverCompleted` · 현재 정산서 유효 + 금액 일치 · 판매점이 현재 Version 확인 · 지급계좌 `ACTIVE`.
- 지급완료 → `status = PAID`, `paymentStatus = PAID`. 지급처리 주체는 공급여행사만입니다.
- `[필수]` **지급완료 불변성**: `PAID` 이후 `baseAmount` · `adjustmentAmount` · `finalAmount` · `currentStatementVersion` · `paidAmount` 수정 금지. 이후 변동은 SettlementAdjustment로만 처리합니다.

---

## 18. 상태값 전체 목록

| Domain | 코드 → Label |
| --- | --- |
| Supplier | `ACTIVE` 정상 · `SUSPENDED` 이용중지 |
| Seller 계정 | `ACTIVE` 정상 · `SUSPENDED` 이용제한 · `WITHDRAWN` 탈퇴 |
| Relation | `PENDING` 승인대기 · `ACTIVE` 정상 · `INACTIVE` 이용중지 · `REJECTED` 승인거절 |
| Product | `ACTIVE` 판매중 · `STOPPED` 판매중지 · `ENDED` 운영종료 |
| SalesMode | `COMMISSION` 수수료형 · `DEPOSIT` 입금가형 |
| SellerProduct 자체 | `ACTIVE` · `STOPPED` 판매점 자체중지 |
| Effective Sale | `ON_SALE` 판매중 · `SETUP_REQUIRED` 설정대기 · `STOPPED` 판매중지 |
| Stop Reason | `SUPPLIER_RELATION_INACTIVE` · `PRODUCT_STOPPED` · `PRODUCT_ENDED` · `SELLER_STOPPED` · `RESUME_CONFIRMATION_REQUIRED` · `PRICE_NOT_CONFIGURED`(UI 설정대기) |
| Reservation | `RECEIVED` 예약접수 · `CONFIRMED` 예약확정 · `CANCELLATION_REQUESTED` 취소요청 · `CANCELLATION_APPROVED` 취소승인 · `CANCELLED` 취소완료 |
| Payment | `UNPAID` 미결제 · `PARTIALLY_PAID` 일부결제 · `PAID` 결제완료 · `REFUNDED` 환불완료 |
| Cancellation | `REQUESTED` 검토대기 · `APPROVED` 취소승인 · `REJECTED` 취소거절 · `COMPLETED` 취소완료 |
| Refund | `PENDING` 환불대기 · `COMPLETED` 환불완료 · `FAILED` 환불실패 |
| Invoice | `NORMAL` 정상 · `REISSUE_REQUIRED` 재발행 필요 · `CANCELLED` 취소 · `VOID` 무효 |
| Settlement | `PENDING` 정산대기 · `CONFIRMED` 정산확정 · `MODIFICATION_REQUIRED` 수정필요 · `RECONFIRMATION_REQUIRED` 재확인대기 · `PAID` 지급완료 |
| Settlement 지급 | `WAITING` 지급대기 · `PAID` 지급완료 |
| SettlementItem | `NORMAL` 정상 · `ADJUSTED` 반영완료 · `ADJUSTMENT_PENDING` 반영대기 · `CARRIED_OVER` 차기정산 반영예정 · `CANCELLING` 취소처리중 |
| Adjustment | `PENDING` 반영대기 · `SCHEDULED` 차기정산 대기 · `APPLIED` 반영완료 |
| Statement | `CURRENT` · `VOID` |
| Actor | `SELLER` · `SUPPLIER` · `SYSTEM` · `ADMIN` |

- `[필수]` Label 매핑은 한 곳(`STATUS_LABELS`)에서만 정의합니다. 화면 Label은 현재 Prototype 표기와 동일합니다.

---

## 19. 상태전이표 · 금지 전이

코드 기준: `*_TRANSITIONS` + `canTransition()`.

### 19.1 SupplierSellerRelation

| From | To | 주체 | 비고 |
| --- | --- | --- | --- |
| (없음) | `PENDING` | 판매점 | 가입신청 |
| `PENDING` | `ACTIVE` | 공급여행사 | 승인 · `approvedAt` |
| `PENDING` | `REJECTED` | 공급여행사 | 거절 · `rejectionReason` |
| `ACTIVE` | `INACTIVE` | 공급여행사 | 이용중지 · 신규판매 차단 |
| `INACTIVE` | `ACTIVE` | 공급여행사 | 재개 · 판매점 상품 자동재개 없음 |
| `REJECTED` | `PENDING` | 판매점 | 재신청 (29장) |

### 19.2 SellerProduct (판매점 자체상태)

| From | To | 주체 | 조건 |
| --- | --- | --- | --- |
| `ACTIVE` | `STOPPED` | 판매점 | 신규판매만 중지 · 판매가 · 예약 · 이력 유지 |
| `STOPPED` | `ACTIVE` | 판매점 | 상위 원인(관계 · 상품)이 해소된 경우에만 판매중으로 계산 |
| 재개확인 필요 | 해제 | 판매점 | 상위 원인 해소 후 판매재개 버튼 |

### 19.3 Reservation

| From | To | 주체 | 조건 |
| --- | --- | --- | --- |
| `RECEIVED` | `CONFIRMED` | 공급여행사 | |
| `RECEIVED` · `CONFIRMED` | `CANCELLATION_REQUESTED` | 판매점 | `previousReservationStatus` 저장 |
| `CANCELLATION_REQUESTED` | `CANCELLATION_APPROVED` | 공급여행사 | 수수료 · 환불예정금액 확정 |
| `CANCELLATION_REQUESTED` | previous (`RECEIVED`/`CONFIRMED`) | 공급여행사 | 거절 · History 기록 |
| `CANCELLATION_APPROVED` | `CANCELLED` | 공급여행사/시스템 | Refund `COMPLETED` 또는 환불 0원 |

### 19.4 CancellationRequest

`REQUESTED → APPROVED → COMPLETED` / `REQUESTED → REJECTED` (종료)

### 19.5 Refund

`PENDING → COMPLETED` / `PENDING → FAILED` (종료 · 재시도는 새 Row)

### 19.6 Invoice (현재 Version 기준)

| From | To | 조건 |
| --- | --- | --- |
| `NORMAL` | `REISSUE_REQUIRED` | 취소승인 등 금액 변경 예정 |
| `NORMAL` · `REISSUE_REQUIRED` · `CANCELLED` | `VOID` | 재발행 시 기존 Version · 새 Version 생성 |
| 새 Version | `NORMAL` / `CANCELLED` | 고객 최종 부담금 > 0 / = 0 |

### 19.7 Settlement

| From | To | 조건 |
| --- | --- | --- |
| `PENDING` | `CONFIRMED` | `canConfirmSettlement` |
| `CONFIRMED` | `MODIFICATION_REQUIRED` | 지급 전 취소완료 |
| `MODIFICATION_REQUIRED` | `RECONFIRMATION_REQUIRED` | Item 조정 + 정산서 재발행 |
| `RECONFIRMATION_REQUIRED` | `CONFIRMED` | 판매점이 현재 Version 확인 |
| `RECONFIRMATION_REQUIRED` | `MODIFICATION_REQUIRED` | 재확인 대기 중 추가 취소완료 |
| `CONFIRMED` | `PAID` | `canPaySettlement` + 지급 생성 |

### 19.8 SettlementAdjustment

`PENDING → SCHEDULED → APPLIED` / `PENDING → APPLIED` (차기 정산이 이미 열려 있는 경우)

### 19.9 SettlementPayment (지급상태)

`WAITING → PAID` (종료)

### 19.10 금지 전이 `[필수]`

| 금지 | 이유 |
| --- | --- |
| Reservation `CANCELLED → *` (예: `CONFIRMED`) | 취소완료는 종료 상태. 재판매는 새 예약 |
| Reservation `CANCELLATION_APPROVED → RECEIVED/CONFIRMED` | 승인 후 거절 불가 |
| Reservation `CANCELLATION_REQUESTED → CANCELLED` | 승인 · 환불 단계 생략 금지 |
| Refund `FAILED` → Reservation `CANCELLED` 자동처리 | 환불실패 시 취소승인 유지 |
| Invoice `VOID → NORMAL`(current) | 무효 Version 복구 금지 |
| Settlement `PAID → MODIFICATION_REQUIRED` 또는 금액 수정 | 지급완료 불변 — 차기정산 Adjustment로 처리 |
| Settlement `PENDING → PAID` | 정산확정 생략 금지 |
| Settlement `MODIFICATION_REQUIRED → CONFIRMED` | 재발행 · 판매점 재확인 생략 금지 |
| Relation `REJECTED → ACTIVE` | 재신청(`PENDING`) 경유 필요 |
| Product `ENDED → ACTIVE` | 운영종료 상품은 새 상품/새 기간으로 등록 |

---

## 20. 권한 · 데이터 격리 정책

### 20.1 Query Scope `[필수]`

| 사용자 | Scope | 조회 가능 |
| --- | --- | --- |
| 공급여행사 관리자 (행복투어) | `supplierId = 행복투어` | 행복투어 상품 · 행복투어와의 관계 · 행복투어 상품 예약 · 행복투어 정산 |
| 판매점 관리자 (그래가자) | `sellerId = 그래가자` | 그래가자의 모든 공급여행사 관계 · 상품 · 예약 · 정산 (공급여행사 Filter로 구분) |

- 공급여행사 A는 판매점의 **공급여행사 B 관계 · 상품 · 예약 · 정산 · 집계**를 조회할 수 없습니다. 예: 행복투어는 그래가자의 현담여행사 관계와 현담 예약 건수를 볼 수 없습니다.
- 판매점 상세의 집계(누적 예약 · 판매금액)도 `supplierId` Scope로 계산합니다. STEP 11에서 공급여행사 판매점관리 집계를 행복투어 상품 기준으로 수정했습니다.
- 코드 기준: `DataScope` + `isInScope()`. 실제 연동 시 Server에서 Scope를 강제하며, Client 필터에 의존하지 않습니다.

### 20.2 행위 권한

| 행위 | 공급여행사 | 판매점 |
| --- | --- | --- |
| 관계 승인 · 거절 · 이용중지 · 재개 | O | X (가입신청만) |
| 상품 원본 · 판매허용 · 판매방식 · 수수료율 · 입금가 | O | X (조회) |
| 입금가형 판매점 판매가 | X (조회) | O |
| 판매점 자체 판매중지 · 재개 | X | O |
| 취소요청 등록 | X | O |
| 취소 승인 · 거절 · 환불 · 취소완료 | O | X |
| 인보이스 재발행 · 발송 | - | O (환불 완료 후 재발행) |
| 정산 확정 · 정산서 재발행 · 지급 | O | X |
| 정산서 확인 · 재확인 | X | O |

### 20.3 민감정보

- 계좌번호: 암호화 저장 · Masking 표시. 연락처: 목록은 Masking (`010-****-5678`). 사업자정보: 업무 필요한 화면에만 노출.
- 비밀번호는 URL · 화면 · 로그에 노출하지 않습니다. 주민등록번호는 수집하지 않습니다.

---

## 21. 금액 계산 정책

### 21.1 공통 `[필수]`

- 금액은 원화 **정수**(Won)로 저장하고, 표시만 `65,000원` / `₩65,000`. Float 금지.
- 수수료율: 현재 Mock은 모두 **백분율 숫자**(`commissionRate: 10`, `customRate: 7`). → **`10 = 10%` 방식으로 통일**, 소수 2자리까지 허용합니다 (DB Decimal(5,2) 권장).
- 반올림: 수수료형 수익은 **예약 1건 단위 `Math.round`** (현재 Prototype과 동일). 정산은 Item 금액의 단순 합계로, 정산 단위 재계산은 하지 않습니다.
- 일시: 내부 ISO 8601, 화면 KST Format (`2026.10.12 15:11`).

### 21.2 계산식 · Source of Truth

| 계산 | 식 | Helper | 현재 위치 (중복) |
| --- | --- | --- | --- |
| 판매상태 | 9장 우선순위 | `getSellerProductEffectiveStatus` | `seller-admin-products-data.ts` `resolveSalesStatus`, `product-seller-sales-data.ts` |
| 판매점 수익 | COMMISSION `round(금액 × 율 / 100)` · DEPOSIT `(판매가 − 입금가) × 인원` | `calculateSellerIncome` | `sellerReservationBookedProfit`, `sellerProductExpectedProfit`, `ReservationBookingTerms.sellerProfit` |
| 취소완료 수익 | 0 | `sellerIncomeAfterStatus` | `sellerReservationExpectedProfit` |
| 환불금액 | `결제금액 − min(취소수수료, 결제금액)` | `calculateRefundAmount` | `sellerCancelRefundAmount`, `seller-invoices-data` `buildInvoice` |
| 인보이스 금액 | 정상: 총 예약금액 / 취소완료: `결제금액 − 환불금액` | `calculateInvoiceAmount` | `seller-invoices-data.ts` |
| 정산 금액 | 21.3 | `calculateSettlementAmount` | `seller-channel-settlements.ts` `buildCurrent` · `buildStatic` |
| 정산확정 가능 | 14.1 | `canConfirmSettlement` | `getSellerSettlementConfirmCheck` |
| 지급 가능 | 17장 | `canPaySettlement` | `getSellerSettlementPaymentCheck` |
| 취소완료 가능 | 환불 0원 또는 Refund `COMPLETED` | `canCompleteCancellation` | `reservations-data.ts` 환불처리 |

### 21.3 정산 합계 — 단일 계산식 `[필수]`

```
Settlement.baseAmount       = Σ SettlementItem.originalSellerIncome
Settlement.adjustmentAmount = Σ SettlementItem.adjustmentAmount
                            + Σ (targetSettlementId = 이 정산 AND status = APPLIED) SettlementAdjustment.amount
Settlement.finalAmount      = baseAmount + adjustmentAmount
```

- Item에 반영한 취소조정을 Summary에서 다시 빼지 않습니다.
- 지급완료 정산의 취소는 Item을 수정하지 않고 Adjustment로만 처리합니다 → 이중 차감 방지.

### 21.4 검증 예 (Helper 실행 결과와 일치)

| 시나리오 | 계산 | 결과 |
| --- | --- | --- |
| 국악와인열차 DEPOSIT 2인 (55,000 / 65,000) | 예약 130,000 · 수익 (65,000−55,000)×2 | 20,000 |
| 철원 DMZ COMMISSION 3인 (69,000 · 10%) | 207,000 × 10% | 20,700 |
| 취소 (결제 130,000 · 수수료 13,000) | 환불 117,000 · 인보이스 v2 | 13,000 |
| 지급 전 취소 (행복투어 10월) | 3,850,000 − 20,000 | 3,830,000 |
| 지급 후 취소 → 차기 정산 | 2,500,000 − 20,000 | 2,480,000 |

- 조정 −20,000(판매점 수익 차감)과 고객 환불 117,000 · 취소수수료 13,000은 서로 다른 금액이며 혼용하지 않습니다.

---

## 22. History · Audit · 삭제 정책

- `[권장]` 핵심 Entity 공통 Audit: `createdAt` · `createdBy` · `updatedAt` · `updatedBy`.
- `[필수]` 최소 추적 대상:
  - `ReservationStatusHistory` (`fromStatus` · `toStatus` · `actorType` · `actorId` · `reason` · `createdAt`)
  - InvoiceVersion (Version 자체가 이력)
  - `SettlementStatusHistory` + SettlementStatement (Version)
  - SettlementPayment · Refund (Row 자체가 이력)
- `[권장]` Relation 상태변경 · SellerProduct 조건/자체중지 변경 이력 (현재 `SellerProductHistoryEntry`, 판매점관리 처리이력).
- 모든 Domain에 History Table을 만들 필요는 없습니다.

| 대상 | 삭제 정책 |
| --- | --- |
| SupplierSellerRelation | 삭제 금지 — 상태로 비활성 · 종료 |
| SellerProduct | Hard Delete 금지 — `revokedAt` (예약 Snapshot · 이력 참조) |
| Reservation | 삭제 금지 — 취소예약은 `CANCELLED` 유지 |
| Invoice / InvoiceVersion | 삭제 금지 |
| Settlement / Item / Statement / Payment / Adjustment | 삭제 금지 |

---

## 23. ID / Code 정책

| Domain | 내부 ID (FK) | 표시 Code | 현재 Prototype |
| --- | --- | --- | --- |
| Supplier | `supplierId` | `SUP00001` | `AGENCY-HAPPY` + `SUP00001` + 이름 문자열 혼용 |
| Seller | `sellerId` | `SEL00032` | `sellerId = sellerCode = "SEL00032"`, 타 판매점은 `SELLER-001` + `SEL00001` |
| Relation | `relationId` | (없음) | `rel-032` (판매점관리 Mock) |
| Product | `productId` | `HT-WINE01` | `productId = productCode` |
| SellerProduct | `sellerProductId` | (없음) | 없음 (sellerId + productCode 조합) |
| Reservation | `reservationId` | `RSV-YYYYMMDD-NNN` | Code만 사용 |
| Invoice | `invoiceId` | `INV-YYYYMMDD-NNN` | 예약번호에서 파생 |
| Settlement | `settlementId` | `STL-YYYYMM-{키}-NNN` | Code만 사용 |

- `[필수]` Code는 표시 · 검색 · 외부 참조용입니다. Relation FK는 내부 ID로 겁니다.
- `[권장]` `INV-` 번호를 예약번호 문자열 치환으로 만드는 규칙은 표시 규칙으로만 유지하고, 연결은 `reservationId` FK로 합니다.

---

## 24. 기존 Mock 매핑

| 현재 Mock | 목표 Entity | 값 |
| --- | --- | --- |
| 행복투어 (`AGENCY-HAPPY`, `SUP00001`) | Supplier | `status ACTIVE` |
| 현담여행사 (`AGENCY-HYUNDAM`, `SUP00002`) | Supplier | `status ACTIVE` |
| A투어 (`SUP00003`) | Supplier | - |
| 그래가자 (`SEL00032`, `graegaja`) | Seller | `accountStatus ACTIVE` (Mock "정상"), "이용제한" → `SUSPENDED` |
| 행복투어 ↔ 그래가자 | SupplierSellerRelation | `ACTIVE` (Mock 이용중지 전환 → `INACTIVE`) |
| 현담 ↔ 그래가자 | SupplierSellerRelation | `ACTIVE` |
| A투어 ↔ 그래가자 | SupplierSellerRelation | `PENDING` |
| 판매점관리 승인대기 · 승인거절 판매점 (여행가자 등) | SupplierSellerRelation | `PENDING` · `REJECTED` |
| HT-WINE01 국악와인열차 판매허용 (입금가 55,000 · 판매가 65,000) | SellerProduct | `DEPOSIT`, `depositPrice 55000`, `sellerSalePrice 65000` |
| HT-DMZ01 철원 DMZ (69,000 · 10%) | SellerProduct | `COMMISSION`, `supplierSalePrice 69000`, `commissionRate 10` |
| HT-GC01 (판매가 미설정) | SellerProduct | `sellerSalePrice null` → 설정대기 |
| HT-NAMI01 (공급여행사 판매중지) | Product `STOPPED` | Effective 판매중지 / `PRODUCT_STOPPED` |
| HT-TA01 운영종료 Mock | Product `ENDED` | `PRODUCT_ENDED` |
| 판매점 자체중지 | SellerProduct `STOPPED` | `SELLER_STOPPED` |
| `RSV-20261012-001` 등 판매점 예약 38건 | Reservation + PricingSnapshot | 행복투어 21 · 현담 17 |
| 판매점 취소요청 (`seller-cancel-request-store`) | CancellationRequest `REQUESTED` | `requestedByType SELLER` |
| `sellerCancelRequest.approval` | CancellationRequest `APPROVED` | `cancellationFee` · `expectedRefundAmount` |
| `sellerCancelRequest.rejection` | CancellationRequest `REJECTED` | 예약상태 previous 복원 |
| `sellerCancelRequest.refund` (환불완료/환불실패/환불없음) | Refund `COMPLETED` / `FAILED` / (Refund 없음 + 취소완료) | |
| `INV-20261012-001` v1 · v2 | Invoice + InvoiceVersion | v1 `VOID` 130,000 / v2 `NORMAL` 13,000 |
| `STL-202610-HT-001` | Settlement (행복투어 × 그래가자 10월) | |
| `SellerSettlementLine` + `otherReservations` | SettlementItem | 집계값은 개별 Item으로 분해 |
| `SellerNextAdjustment` (차기정산 대기) | SettlementAdjustment `SCHEDULED` | |
| `SellerSettlementDocument` | SettlementStatement | `current` → `CURRENT` / 그 외 `VOID` |
| `SellerSettlementPayment` | SettlementPayment | `statementVersion` → `settlementStatementVersion` |
| `SellerPayoutAccount` | SellerPayoutAccount | `maskedNumber` → `accountNumberMasked` |
| `handoverCompletedAt` | `Settlement.operationsHandoverCompleted` | 예약 `operationsHandoverAt`에서 파생 |
| `sellerConfirmed` | `Settlement.sellerConfirmedVersion` | |

---

## 25. 중복 Type · 상태 조사결과

이번 STEP에서는 통합하지 않습니다. 실제 연동 시 **통합 권장 Source** 기준으로 정리합니다.

| 개념 | 중복 정의 (파일) | 차이 | 통합 권장 Source |
| --- | --- | --- | --- |
| 관계상태 | `SupplierTradeStatus` (seller-login-mock) · `SellerSupplierRelationStatus` (seller-suppliers-data) · `SellerRelationStatus` (members-seller-relation-data) · `SellerJoinStatus` (product-seller-sales-data) · `SellerStatus` (product-seller-data) | `SellerStatus`만 **"사용중지"** (나머지는 "이용중지"). `SupplierTradeStatus`에는 승인거절 없음 | `RelationStatus` + `STATUS_LABELS.relation` |
| 가입심사 상태 | `SellerApprovalStatusCode` (seller-domain: pending · reviewing · supplement_requested · approved · rejected) | 홈페이지 가입신청 Flow(보완요청 포함)로, 공급여행사 관계와 다른 단계 | 가입신청 Domain으로 유지, 승인 시 Relation `ACTIVE` 생성 (29장) |
| 판매방식 | `SellerProductSaleMode` · `SellerSupplierProductMode` (수수료형/입금가형) · `SellerRelationProductMode` · `SellerSalesMode` (commission/deposit) · inline (`ReservationBookingTerms`, `SellerSettlementLine`) | 한글/영문 혼재 | `SalesMode` |
| 판매상태 (Effective) | `SellerAdminProductSalesStatus` · `SellerSupplierProductStatus` · `SellerRelationProductStatus` (판매중/설정대기/판매중지) · `SellerSalesStatus` (product-seller-sales: **설정필요**/판매중/판매중지) · `SellerProductSalesStatus` (members-seller-products: **판매가능**/판매중지) · `SellerSalesStatusCode` (seller-domain: not_started/active/suspended) | "설정필요"는 공급여행사가 판매조건을 아직 설정하지 않은 상태, "설정대기"는 판매점 판매가 미설정 상태 | `EffectiveSaleStatus` + `SaleStopReason` (공급여행사 미설정은 SellerProduct 생성 전 단계로 정리) |
| 예약상태 | `SellerReservationStatus` (seller-reservations-data) · `SellerDashboardReservationStatus` (동일 값 재정의) · `SellerInvoiceReservationStatus` (`SellerReservationStatus | "취소승인"` — 이제 중복) · **`SellerReservationStatus` 동명** (members-seller-reservations-data: 예약접수/예약확정/취소) · `ReservationDetail.reserveStatus` (AOS 공통, string) | 동명 Type이 다른 값을 가짐 | `ReservationStatus` |
| 결제상태 | `SellerReservationPaymentStatus` · `ReservationDetail.paymentStatus` | | `PaymentStatus` |
| 취소요청 상태 | `ReservationSellerCancelStatus` (검토대기/취소승인/취소거절/취소완료) · `SellerReservationCancelRequest.processStatus` ("공급여행사 확인중"/…) · `SellerSupplierCancelProgress.kind` | 같은 단계에 판매점 · 공급여행사 Label이 다름 | `CancellationStatus` (판매점 Label "공급여행사 확인중"은 화면 Label로만) |
| 환불상태 | `ReservationSellerRefund.status` (환불실패/환불완료/환불없음) · `SellerRefundStage` (환불대기/환불실패/환불완료/환불없음) · `ReservationRefund.status` (환불대기/환불완료/환불실패) | "환불없음"은 상태가 아니라 Refund 미생성 | `RefundStatus` |
| 정산상태 | `SellerSettlementStatus` (seller-channel-settlements) · **`SellerSettlementStatus` 동명** (members-seller-settlements: 정산대기/정산예정/정산완료/보류) · `SettlementStatus` (settlement-data — AOS 공급/판매여행사 정산, 별도 Domain) | 동명 Type이 다른 값 | `SettlementStatus` (판매점 채널) |
| 정산 반영상태 | `SellerSettlementReflection` | | `SettlementItemStatus` |
| 지급계좌 | `SellerPayoutAccount` (seller-admin-profile) · `SellerSettlementAccountBusiness/Individual` (members-seller-settlements) | | `SellerPayoutAccount` |
| 판매점 프로필 | `SellerAdminProfile` · `SellerProfile` (seller-domain) · `SellerApplication` · `SellerRelation`(판매점 정보 내장) · `SellerStore` (product-seller-data) · `SellerMockAccount` · `SellerRegisteredInfo` | 대표자명도 Mock마다 다름 (김민수 / 최OO) | `Seller` |
| 판매점 계정상태 | `SellerAccountStatus` (정상/이용제한) | | `SellerAccountStatus` (`ACTIVE`/`SUSPENDED`/`WITHDRAWN`) |

---

## 26. 한글 상태 직접비교 현황

`status === "정상"` 같은 한글 문자열 직접비교 (판매점 채널 관련 파일, `[sS]tatus… ===/!== "한글"` 기준 약 300건):

| 파일 | 건수 |
| --- | --- |
| `lib/admin/seller-channel-settlements.ts` | 43 |
| `lib/seller/seller-invoices-data.ts` | 31 |
| `lib/seller/seller-reservations-data.ts` | 27 |
| `app/seller/reservations/[id]/page.tsx` | 26 |
| `lib/admin/reservations-data.ts` | 22 |
| `app/reservations/[id]/page.tsx` | 22 |
| `app/settlements/[id]/page.tsx` | 21 |
| `app/seller/invoices/[id]/page.tsx` | 15 |
| `app/seller/reservations/page.tsx` | 12 |
| `lib/seller/seller-suppliers-data.ts` · `lib/seller/seller-admin-products-data.ts` · `app/seller/settlements/[id]/page.tsx` | 각 11 |
| `lib/seller/seller-dashboard-data.ts` | 10 |
| `lib/admin/members-seller-relation-data.ts` · `app/seller/settlements/page.tsx` · `app/seller/invoices/page.tsx` | 각 8 |
| `lib/seller/use-seller-reservations-state.ts` · `lib/admin/seller-channel-reservations.ts` · `lib/admin/product-seller-sales-data.ts` | 각 7 |
| `app/members/sellers/SellerMemberList.tsx` | 6 |
| 그 외 (`app/seller/products`, `dashboard`, `suppliers`, `SellerRelationDialogs`, `use-seller-invoices-state` 등) | 1~5 |

- `[권장]` 실제 연동 시 Data 계층은 코드(`"ACTIVE"`) 비교로 바꾸고, 화면은 `STATUS_LABELS`로 표시합니다. 페이지 비교문은 Data 계층 Helper(`canX()` · `isX()`)로 옮겨 줄입니다.
- 이번 STEP에서는 리팩터링하지 않습니다.

---

## 27. 실제 데이터 연동 시 영향 파일

| 영역 | 파일 (`admin-site/` 기준) | 영향 |
| --- | --- | --- |
| 판매점 프로필 · 인증 | `lib/seller/seller-admin-profile.ts`, `lib/seller/auth.ts`, `lib/seller/use-seller-session.ts`, `lib/seller/seller-login-mock.ts` | 상 — Seller · 계정상태 · 지급계좌 |
| 판매점 가입 | `lib/seller/seller-domain.ts`, `lib/admin/members-seller-data.ts`, `lib/admin/members-seller-form.ts` | 중 — 가입신청 → Relation 생성 |
| 관계 (판매점 시점) | `lib/seller/seller-suppliers-data.ts` | 상 |
| 관계 (공급여행사 시점) | `lib/admin/members-seller-relation-data.ts`, `app/members/sellers/SellerMemberList.tsx`, `SellerRelationDialogs.tsx` | 상 — Component State 상태변경을 실제 저장으로 |
| 판매점 상세 패널 (구 구조) | `lib/admin/members-seller-{products,reservations,settlements}-data.ts`, `app/members/sellers/[id]/*` | 상 — 독립 Mock 대체 |
| 판매상품 | `lib/seller/seller-admin-products-data.ts`, `lib/seller/use-seller-products-state.ts`, `lib/seller/seller-product-detail-data.ts`, `lib/seller/seller-product-share.ts` | 상 — SellerProduct · Effective Status |
| 상품 판매점 판매설정 | `lib/admin/product-seller-sales-data.ts`, `lib/admin/product-seller-data.ts`, `app/products/[code]/seller-setting/*` | 상 — 같은 SellerProduct를 공급여행사 시점으로 |
| 예약 | `lib/seller/seller-reservations-data.ts`, `lib/seller/use-seller-reservations-state.ts`, `lib/admin/seller-channel-reservations.ts`, `lib/admin/reservations-data.ts` | 상 — Snapshot · 상태 |
| 취소 · 환불 | `lib/seller/seller-cancel-request-store.ts`, `lib/admin/reservations-data.ts` (`sellerCancelRequest`, 환불처리), `app/reservations/[id]/page.tsx` | 상 |
| 인보이스 | `lib/seller/seller-invoices-data.ts`, `lib/seller/use-seller-invoices-state.ts`, `app/seller/invoices/*` | 중 — 이미 Version 구조 |
| 정산 · 지급 | `lib/admin/seller-channel-settlements.ts`, `app/settlements/*`, `app/seller/settlements/*` | 상 — Item 분해 · 단일 계산식 |
| Dashboard | `lib/seller/seller-dashboard-data.ts`, `app/seller/dashboard/page.tsx` | 중 — 정적 집계 → 실제 집계 |

---

## 28. 실제 데이터 연동 권장 순서

| 순서 | 대상 | 근거 (현재 코드 구조) |
| --- | --- | --- |
| 0 | **Status 코드 · Label 매핑 + 계산 Helper를 `lib/` 공통 모듈로 이동** | 300건의 한글 비교와 4~6개의 중복 Type이 있어, 연동 전에 비교 기준을 먼저 고정해야 이후 단계의 변경 범위가 줄어듭니다. |
| 1 | Seller / Supplier / Relation | 모든 Scope(`sellerId` · `supplierId`)와 판매상태 1순위의 기준. 현재 관계 Mock이 판매점 · 공급여행사 시점에 따로 있어 가장 먼저 단일화해야 합니다. |
| 2 | Product / SellerProduct | 예약 Snapshot의 출처. `BOOKING_TERMS`가 `listSellerAdminProducts`에 의존합니다. |
| 3 | Reservation / Snapshot | 취소 · 인보이스 · 정산이 모두 예약을 참조합니다. |
| 4 | Cancellation / Refund | 현재 판매점 Store와 관리자 예약 데이터로 나뉘어 있어 단일 Entity로 합쳐야 합니다. |
| 5 | Invoice | 취소 · 환불 결과에 의존합니다(재발행 조건). 구조가 이미 Version 기반이라 위험이 낮습니다. |
| 6 | Settlement (Item · Statement · Adjustment) | 예약 Snapshot 수익 + 취소완료 결과에 의존합니다. |
| 7 | Payment | 정산확정 · 정산서 Version · 지급계좌에 의존합니다. |

- 요청서의 1~7 순서는 의존관계상 적절합니다. 다만 **0단계(상태 코드 · Helper 공통화)를 앞에 추가**하는 것을 권장합니다.
- 4와 5는 인보이스 재발행이 환불완료에 의존하므로 순서를 바꾸지 않습니다.
- 운영인계(`operationsHandoverCompleted`)는 출발회차 운영 모델(`aos-operation-data-model.md`)과의 연결이 필요하므로, 6단계 전에 운영 Domain과 인계 기준을 맞춰야 합니다.

---

## 29. 남은 정책 결정사항

1. **판매점 계정 `SUSPENDED` 시 신규판매** — 로그인 제한만 할지, 모든 공급여행사 상품의 판매를 0순위로 차단할지.
2. **재개확인 필요(`RESUME_CONFIRMATION_REQUIRED`)** — 현재 Prototype 정책(상위 원인 발생 시 판매중이던 상품은 해소 후 재개확인 필요)을 유지할지, 요청서 4단계(자체중지만 유지)로 단순화할지.
3. **관계 종료 상태** — `WITHDRAWN`(관계 종료 · 탈퇴) 추가 여부, 거절 후 재신청 시 같은 Relation Row를 재사용할지 새로 만들지.
4. **가입신청 Domain과 Relation 관계** — `seller-domain`의 보완요청 · 검토중 단계를 Relation `PENDING`의 하위 상태로 둘지, 별도 Application Entity로 둘지.
5. **공급여행사 판매조건 미설정 상품** — 공급여행사 화면의 "설정필요"(판매방식 · 조건 미설정)를 SellerProduct 상태로 둘지, 판매허용 전 단계(SellerProduct 미생성)로 볼지.
6. **상품 `판매대기` · `품절`** — Product 상태로 둘지, 출발일 · 재고 Domain으로 넘길지.
7. **분할지급** — Settlement:Payment를 0..1로 고정할지 1:N 분할지급을 허용할지.
8. **정산 음수 금액** — 차기정산 조정이 정산 원금보다 클 때 `finalAmount` 음수를 허용할지, 0원으로 처리하고 잔여분을 다음 정산으로 이월할지(현재 정적 정산 Mock은 `Math.max(0, …)`로 잘라냄).
9. **취소요청 재요청** — 거절된 예약의 재요청 허용 여부(현재 판매점 화면은 거절 후 취소요청 버튼 숨김).
10. **Invoice `CANCELLED` 사용 기준** — 미결제 취소(고객 부담 0원)에서 v2를 발행할지, 발행 없이 Invoice 상태만 `CANCELLED`로 바꿀지.
11. **판매점 Label 차이** — 취소요청 단계에서 판매점은 "공급여행사 확인중", 공급여행사는 "검토대기"로 표시하는 현재 방식 유지 여부.
12. **현담여행사 공급여행사 관점 연동 · 공급여행사 판매점관리 관계상태 저장** — STEP 11 남은 이슈. 실제 Relation 연동(1단계) 시 함께 해소합니다.
