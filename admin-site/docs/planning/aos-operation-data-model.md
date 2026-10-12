# AOS 출발회차 운영 데이터 모델 정의

> 12단계 산출물 · 실제 데이터 연동을 위한 데이터 구조 · 상태값 · 관계 정의
> 참고 타입: [`aos-operation-data-types.ts`](./aos-operation-data-types.ts) (실행 코드에서 import 하지 않음)
> 이 문서는 DB 테이블 · SQL · ORM · API Endpoint 정의가 아닙니다. 업무 Entity와 규칙만 정의합니다.

---

## 목차

1. 목적
2. 현재 Prototype 분석
3. 전체 Entity 관계
4. Product
5. Departure
6. Reservation
7. Passenger
8. BoardingGroup / BoardingPoint
9. VehicleOperation
10. GuideAssignment
11. Passenger 운영배정
12. Boarding
13. ScheduleOperation
14. Customer Communication
15. Kakao 안내방
16. OperationNote
17. OperationClosing
18. OperationReview
19. FollowUp
20. 상태값
21. 상태 전이
22. 파생값
23. Workflow 완료조건
24. 화면별 Data Source
25. ID / Code 정책
26. 데이터 변경 영향
27. 현재 Prototype과 목표 구조 차이
28. 향후 DB/API 연동 고려사항
29. 인계 용어 충돌 분석
30. 확정 결정사항 · 다음 단계 결정 필요사항

---

## 1. 목적

- 1~11단계에서 만든 출발회차 운영 Prototype(운영현황 → 출발회차 운영 마스터 → 운영배정 → 가이드 운영 → 탑승체크 → 현장운영 → 운영결과 → 관리자 확인)이 실제 DB/API와 연결될 때 사용할 **Entity · 관계 · 상태값 · 파생값 · 완료조건**을 정의합니다.
- 화면별로 흩어진 Mock 데이터와 세션 저장소가 하나의 데이터 원천으로 합쳐질 때 의미가 깨지지 않도록 기준을 정합니다.
- 현재 Prototype의 한계(식별자 · 이름 참조 · 상태 혼합 등)를 `[필수] / [권장] / [추후]`로 분류해 다음 단계 의사결정 자료로 사용합니다.

범위 밖: DB 테이블 생성, SQL, Prisma/ORM, Migration, API Endpoint, 백엔드 구현, 기존 화면 수정.

---

## 2. 현재 Prototype 분석

### 2.1 분석한 파일

| 구분 | 파일 | 역할 |
| --- | --- | --- |
| 출발회차 · 운영배정 | `lib/admin/guide-operation-data.ts` | 출발회차(`GuideDeparture`), 탑승객, 호차, 가이드, 탑승기록, 운영인계 조건 |
| 예약 → 출발회차 | `lib/admin/operation-assignment-data.ts` | 예약 목록을 출발회차로 묶고 운영 대상 판정 |
| 예약 | `lib/admin/reservations-data.ts`, `lib/admin/reservation-permission.ts` | 예약 · 결제 · 취소 · 공유상품 운영관리 권한 인계 |
| 상품 · 탑승지 | `lib/admin/products-data.ts`, `lib/admin/product-boarding-data.ts` | 상품 목록, 상품별 탑승지 그룹 |
| 일정 | `lib/admin/guide-schedule-data.ts` | 일정 원본 · 호차별 진행기록 |
| 고객소통 | `lib/admin/guide-communication-data.ts` | 연락 대상 · 중복 제거 · 발송이력 · 변수 |
| 안내방 | `lib/admin/guide-chatroom-data.ts` | 카카오 안내방 링크 · 운영방식 |
| 운영기록 | `lib/admin/guide-notes-data.ts` | 운영메모 · 특이사항 |
| 운영종료 | `lib/admin/guide-closing-data.ts` | 운영종료 체크 · 차단조건 · 스냅샷 |
| 관리자 확인 | `lib/admin/guide-review-data.ts` | 검토 체크 · 후속조치 · 운영 진행단계 |
| 운영현황 | `lib/admin/operations-board-data.ts` | 출발회차 목록 · 운영준비 항목 · 단계 |
| 정산 | `lib/admin/settlement-data.ts` | 정산 출발일 그룹 · 운영인계 완료 확인 |
| 화면 | `app/reservations/**`, `components/reservations/ReservationSource.tsx`, `components/guide/*` | 위 데이터를 사용하는 화면 |

### 2.2 현재 Entity (Prototype)

| Prototype 타입 | 의미 | 저장 위치 |
| --- | --- | --- |
| `ProductListItem` | 상품 (id 없음, `code`가 식별자) | 정적 Mock |
| `ProductBoardingGroup` / `ProductBoardingPoint` | 상품코드별 탑승지 그룹 · 탑승지 (id 있음) | 정적 Mock (`SAMPLE_BOARDING_GROUPS[productCode]`) |
| `GuideDeparture` | 출발회차 + 예약그룹 + 호차 + 가이드 + 탑승기록을 한 객체로 보관 | SAMPLE 시드 또는 예약 목록에서 생성 |
| `GuideReservationGroup` | 출발회차 안의 예약 (`id`, `reservationCode`, `phone`, `boardingPoint`) | 시드 / 예약에서 생성 |
| `GuidePassenger` | 탑승객 (`passengers[0]`가 대표, 연락처 없음) | 시드 / 예약 인원수로 "일행N" 생성 |
| `GuideVehicle` | 호차 (`id`, `name`, `capacity`, `plateNo`, 기사, `guideId`, `boardingGroupId`) | `GuideOperationPlan` 세션 |
| `GuideStaff` | 출발회차 가이드 풀 (역할은 leadStaffId · vehicle.guideId로 파생) | 시드 |
| `GuideOperationPlan` | 호차 · 배정(passengerId → {vehicleId, seat}) · 탑승지(passengerId → 이름) · 운영인계 | 세션 (새로고침 시 초기화) |
| `GuideBoardingRecord` | 탑승상태 · 사유 · 메모 · 실제 탑승지(이름) | 세그먼트별 세션 |
| `GuideScheduleItem` / `GuideScheduleProgress` | 출발회차 일정 원본 / 호차별 진행기록 | 시드 / 세션 |
| `GuideMessageBatch` / `GuideMessageResult` | 발송 1회 / 번호별 결과 | 세션 |
| `GuideChatRoom` / `GuideChatState` | 안내방 / 운영방식 | 세션 |
| `GuideNote` | 운영기록 | 세션 |
| `GuideClosingState` | 운영종료 체크 · 메모 · `adminReview` · 스냅샷 | 세션 |
| `GuideReviewState` / `GuideFollowUp` | 관리자 검토 / 후속조치 | 세션 |
| `ReservationDetail` | 예약 (`code`, `productName`, `departureAt`, `reserveStatus`, `paymentStatus`, `source`) | 정적 Mock + 세션 패치 |

### 2.3 현재 데이터 흐름

```text
예약 목록(ReservationDetail)
  └─ productName + departureAt 문자열로 묶음 (operation-assignment-data.listDepartureEntries)
       ├─ SAMPLE 시드가 있으면  → 시드 key (예: GC-WINE-20261017), 시드 탑승객 사용
       └─ 시드가 없으면         → DEP-YYYYMMDD-NN key, 예약 인원수로 탑승객 생성
            └─ getOperationDeparture(key)
                 = 상품코드(이름으로 조회)별 탑승지 그룹 + 세션 운영배정/탑승기록 적용
                      └─ 가이드 운영 · 일정 · 소통 · 안내방 · 운영기록 · 운영종료 · 관리자 확인
                         (모두 departure key 기준 세션 저장소)
```

### 2.4 현재 구조의 핵심 특징

- 출발회차가 **예약 목록에서 계산되는 값**이며, 독립된 원본 데이터가 아닙니다.
- 예약은 출발회차를 ID가 아니라 **상품명 + 출발일시 문자열**로 가리킵니다.
- 탑승지는 원본에 id가 있지만, 배정 · 실제 탑승지 · 일정 집결시각은 **탑승지 이름 문자열**로 참조합니다.
- 운영 데이터 대부분이 **departure key 단위 세션 저장소**에 있어 key가 바뀌면 연결이 끊어집니다.

---

## 3. 전체 Entity 관계

```text
Product (상품 원본)
├─ BoardingGroup (1:N, 상품 단위)
│   └─ BoardingPoint (1:N)
├─ ProductSchedule (1:N, 상품 일정표 원본)
└─ Departure (1:N, 출발회차)
    ├─ Reservation (1:N)
    │   └─ Passenger (1:N, 대표 1명 + 동행자)
    │       ├─ PassengerOperationAssignment (1:N, 구간별 · 기본 DEFAULT 1건)
    │       │     → VehicleOperation, BoardingPoint
    │       └─ BoardingRecord (1:N, 구간별 1건)
    │             → BoardingSegment, BoardingPoint(실제)
    ├─ BoardingSegment (1:N, 가는편 · 오는편)
    ├─ VehicleOperation (1:N, 호차)
    │     → BoardingGroup (상품의 그룹 중 선택)
    │     → VehicleMaster (추후)
    ├─ GuideAssignment (1:N, CHIEF 1 + 호차별 VEHICLE_GUIDE)
    │     → Guide → Staff (선택)
    ├─ DepartureBoardingTime (1:N, 탑승지 · 호차별 집결시각)
    ├─ ScheduleOperation (1:N, 호차 × 일정)
    │     → ProductSchedule (원본)
    ├─ MessageCampaign (1:N)
    │   └─ MessageRecipient (1:N, 번호 단위)
    │       └─ MessageResult (1:N, 채널별)
    ├─ KakaoRoom (1:N, 전체 1 또는 호차별)
    ├─ OperationNote (1:N)
    │     ↔ Passenger (N:M, OperationNotePassenger)
    ├─ OperationHandover (1:1, Departure.handover)
    ├─ OperationClosing (1:1)
    ├─ OperationReview (1:1, 운영종료 후)
    └─ FollowUp (1:N)
          → OperationNote (선택)
```

관계 요약

| 관계 | 카디널리티 | 연결 키 |
| --- | --- | --- |
| Product → Departure | 1:N | `Departure.productId` |
| Departure → Reservation | 1:N | `Reservation.departureId` |
| Reservation → Passenger | 1:N | `Passenger.reservationId` |
| Product → BoardingGroup → BoardingPoint | 1:N:N | `BoardingGroup.productId`, `BoardingPoint.boardingGroupId` |
| Departure → VehicleOperation | 1:N | `VehicleOperation.departureId` |
| VehicleOperation → BoardingGroup | N:1 | `VehicleOperation.boardingGroupId` (같은 상품의 그룹만) |
| Departure → GuideAssignment | 1:N | `GuideAssignment.departureId` (+ `vehicleOperationId`) |
| Passenger → PassengerOperationAssignment | 1:N (구간별) | `passengerId` + `segmentId` 유일 |
| Passenger → BoardingRecord | 1:N (구간별) | `passengerId` + `segmentId` 유일 |
| OperationNote ↔ Passenger | N:M | `OperationNotePassenger` |
| Departure → OperationClosing / OperationReview | 1:1 | `departureId` |
| OperationNote → FollowUp | 1:N (선택) | `FollowUp.operationNoteId` |

---

## 4. Product

**목표 필드:** `id`, `productCode`, `productName`, `status`, `tripDays`, `supplierAgencyId` + 생성/수정 정보

규칙

- 상품은 **출발일별 데이터를 갖지 않습니다.** 호차 · 가이드 · 탑승기록 · 예약은 모두 Departure 이하에 둡니다.
- 상품이 소유하는 운영 원본: BoardingGroup / BoardingPoint, ProductSchedule(일정표).
- 관계는 `productId`로 연결하고 `productCode`는 표시 · 검색용입니다.
- 상품 원본 상세는 **[상품정보] 읽기전용 Modal을 유지**합니다. (결정사항 1 · 별도 상품 상세 페이지는 이번 범위 아님)

현재 Prototype

- `ProductListItem`에 id가 없고 `code`가 식별자입니다.
- 판매 상태는 `visible` · `soldout` boolean입니다. `period`는 판매기간이며 여행일수가 아닙니다.
- 예약 목록에만 있는 상품은 `resolveBoardingProductCode`가 `PRD-RSV-NN` 임시 코드를 만듭니다. 상품명 정렬 순서로 번호가 정해져 상품이 추가되면 바뀔 수 있습니다.

---

## 5. Departure

**목표 필드:** `id`, `departureCode`, `productId`, `departureDate`, `departureTime?`, `endDate?`, `departureStatus`, `handover`, `operationStartedAt?`, `kakaoRoomMode`

규칙

- Product 1 : N Departure. 같은 상품이라도 출발일 · 회차가 다르면 데이터를 완전히 분리합니다.
- `departureId`는 **불변 내부 식별자**입니다. 예약 추가 · 정렬 · 출발일 정정으로 바뀌지 않습니다. (결정사항 2)
- `departureCode`는 표시 · 검색용입니다. 예: `GC-WINE-20261017-01`. 유일해야 하지만 관계 키로 쓰지 않습니다.
- 같은 상품 · 같은 날 오전/오후 회차처럼 **동일 날짜 복수 회차**를 허용합니다. 따라서 `productId + departureDate`만으로 출발회차를 식별하지 않습니다.
- `departureStatus`(출발 확정 · 취소)는 운영 진행단계(OperationPhase)와 다른 축입니다.
- 운영 진행단계는 저장하지 않고 운영인계 · 현장기록 · 운영종료 기록에서 파생합니다. (22장)

현재 Prototype

- 출발회차 원본이 없고, 예약 목록을 `productName + departureAt`으로 묶어 계산합니다.
- key 체계가 3가지입니다.
  - SAMPLE 시드: `GC-WINE-20261017`, `OPS-<NAME>-YYYYMMDD`
  - 예약 기반: `DEP-YYYYMMDD-NN`. NN은 같은 날짜 안에서 `출발일시|상품명`으로 정렬한 순번이라, 새 상품 예약이 들어오면 바뀔 수 있습니다.
  - 정산: `${productCode}_${departureAt}`. 상품코드가 없으면 상품명을 씁니다.
- `GuideDeparture.status`(출발예정/운행중/행사완료/출발취소), `notifiedCount`, `noteCount`, `chatRoom.joinedCount`, `guideName`, `itinerary`는 시드에만 있는 레거시 필드입니다. 현재 화면 판단에는 쓰지 않습니다. 단, `itinerary`는 가이드 운영 화면의 일정 미리보기에 쓰입니다.
- 결정사항 2에 따라 Prototype의 `DEP-YYYYMMDD-NN` key는 **현재 유지**합니다. 목표 구조에서 `departureId`/`departureCode`로 분리합니다.

---

## 6. Reservation

**목표 필드:** `id`, `reservationNo`, `departureId`, `bookerName`, `bookerPhone`, `bookerEmail?`, `reservationStatus`, `paymentStatus`, `reservationSource`, `requestedBoardingPointId?`, `amounts`, `salesClosedAt/By?`, `operatorTransfer?`, `cancellation?`, `createdAt`

규칙

- Departure 1 : N Reservation, Reservation 1 : N Passenger.
- 예약은 `departureId`로 출발회차를 가리킵니다. 상품은 `Departure.productId`로 따라갑니다. 예약에 상품명을 복사해 둘 경우 표시용 스냅샷일 뿐입니다.
- **예약자(booker)는 예약 연락 주체**이며 대표 탑승객과 같은 사람이라는 보장이 없습니다.
- 예약상태는 예약 자체의 진행만 표현합니다. 아래 값은 예약상태에서 분리합니다.
  - 예약마감 → `salesClosedAt` (판매 마감 기록)
  - 공유상품 운영관리 권한 인계 → `operatorTransfer` (29장 용어 충돌 참고)
  - 행사완료 → 출발회차 운영종료(OperationClosing)에서 파생
- 금액 의미를 섞지 않습니다: `productAmount` · `optionAmount` · `discountAmount` · `totalAmount` · `paidAmount` · `refundAmount`. 미수금은 `totalAmount - paidAmount` 파생입니다.
- 예약 단위 희망 탑승지(`requestedBoardingPointId`)는 고객 선택값이며, 실제 운영 탑승지(배정)와 다를 수 있습니다.

현재 Prototype

- `ReservationDetail`에 productCode · departureId가 없고 `productName` · `departureAt` 문자열만 있습니다.
- `code`가 예약번호이자 식별자입니다.
- 예약상태(`RESERVE_EDIT_STATUS_OPTIONS`)에 예약접수 · 예약확정 · 대기 · **예약마감 · 운영인계 · 행사완료** · 취소요청 · 취소완료가 섞여 있습니다.
- 인원은 `counts {adult, child, infant}`로만 있고 탑승객 명단이 없습니다.

---

## 7. Passenger

**목표 필드:** `id`, `reservationId`, `name`, `ageType`, `role (REPRESENTATIVE | COMPANION)`, `phone?`, `passengerStatus`, `sortOrder`, `requestNotes?`

규칙

- Reservation 1 : N Passenger. 대표 탑승객(REPRESENTATIVE)은 예약당 1명입니다.
- 예약자를 대표 탑승객으로 강제하지 않습니다. 예: 자녀가 부모 여행을 대신 예약하는 경우.
- **연락처 분리**
  - 예약 연락처: `Reservation.bookerPhone`
  - 탑승객 연락처: `Passenger.phone` (선택)
  - 안내 발송은 기본적으로 예약 연락처로 보냅니다. "동행자 개별 연락처 포함" 옵션을 켜면 개인 번호가 있는 동행자에게 별도로 보냅니다.
- **인원 vs 연락 대상 분리**
  - `passengerCount`: 탑승객 수
  - `contactRecipientCount`: 정규화한 전화번호 기준 중복 제거 후 발송 대상 수
  - 같은 번호는 한 번만 발송합니다. 두 값은 서로 대체하지 않습니다.
- 부분취소는 탑승객 단위 `passengerStatus = CANCELLED`로 처리합니다. 탑승상태(NO_SHOW)와 다릅니다.

현재 Prototype

- `passengers[0]`가 암묵적으로 대표입니다. 역할 · 연령구분 필드가 없습니다.
- 탑승객 연락처 필드가 없습니다. 동행자 번호는 고객소통 데이터의 별도 SAMPLE 맵(`SAMPLE_COMPANION_PHONES`)에 있습니다.
- 예약 기반 출발회차는 인원수만큼 "예약자명 + 일행N" 탑승객을 생성합니다.
- 연락 대상 중복 제거는 `buildGuideContactTargets`가 번호 문자열 일치로 수행합니다(정규화 없음).

---

## 8. BoardingGroup / BoardingPoint

**BoardingGroup:** `id`, `productId`, `name`, `sortOrder`, `active`
**BoardingPoint:** `id`, `boardingGroupId`, `name`, `sortOrder`, `defaultMeetingTime?`, 추후 `meetingDescription` · `address` · `latitude` · `longitude` · `memo`, `active`
**DepartureBoardingTime:** `departureId`, `boardingPointId`, `vehicleOperationId | null`, `meetingTime`

규칙

- 탑승지 그룹은 **상품(Product) 단위 설정**입니다. 출발회차의 각 호차가 상품의 그룹 중 하나를 선택합니다.
- 현재 Prototype이 **상품코드로 탑승지 그룹을 조회하는 구조는 오류가 아닙니다.** (확정 원칙)
- 같은 실제 장소라도 그룹이 다르면 별도 BoardingPoint id입니다. 장소 원본(Place Master)은 추후 검토합니다.
- 배정 · 탑승기록 · 집결시각은 모두 `boardingPointId`로 참조합니다. 이름 문자열로 참조하지 않습니다.
- 출발회차별 집결시각은 DepartureBoardingTime 한 곳에서 관리합니다.

현재 Prototype

- 원본 `ProductBoardingPoint`에는 id가 있지만, 운영배정(`plan.boardingPoints`), 실제 탑승지(`actualPoint`), 일정 집결시각(`pointTimes`)이 모두 **이름**을 씁니다.
- 같은 상품 안에서 그룹마다 이름이 다른 경우가 있습니다. 예: GC-WINE의 BG-A는 "영등포", BG-B는 "영등포역". 이름이 달라 호차 그룹을 바꾸면 "확인필요"가 됩니다.
- 탑승 시각이 3곳에 있습니다.
  - 탑승지 원본의 `meetingTime`
  - 출발 시드의 `boardingPoints[].time`
  - 일정 시드의 `pointTimes`
  - 같은 출발회차라도 세 값이 다를 수 있습니다.

---

## 9. VehicleOperation

**목표 필드:** `id`, `departureId`, `vehicleOrder`, `vehicleName`, `vehicleTypeLabel?`, `vehicleNumber?`, `capacity`, `driverName?`, `driverPhone?`, `boardingGroupId`, `vehicleMasterId?`(추후)

규칙

- Departure 1 : N VehicleOperation. 출발회차마다 새로 구성하는 **운영 호차**입니다.
- 차량 원본(Vehicle Master: 차량번호 · 차종 · 소속업체)과 구분합니다. 추후 `vehicleMasterId`로 연결합니다.
- `boardingGroupId`는 출발회차 상품의 BoardingGroup만 선택할 수 있습니다.
- 차량번호 · 기사명 · 기사 연락처는 **운영인계 후 입력할 수 있는 항목**입니다. 이 값만 바꾸면 운영인계를 유지합니다.
- 배정 고객이 있는 호차는 삭제할 수 없습니다. 먼저 배정을 해제해야 합니다.

현재 Prototype: `GuideVehicle` (`plateNo` = vehicleNumber). 운영배정 세션에 저장합니다. 호차 id(`V-1`)는 출발회차 안에서만 유일합니다.

---

## 10. GuideAssignment

**목표 필드:** `id`, `departureId`, `vehicleOperationId | null`, `guideId`, `role (CHIEF | VEHICLE_GUIDE)`

규칙

- CHIEF(총괄가이드)는 출발회차당 1명이고 `vehicleOperationId = null`입니다.
- VEHICLE_GUIDE(호차 담당가이드)는 호차당 1명입니다.
- 같은 가이드가 총괄과 호차 담당을 겸할 수 있습니다.
- Guide 원본은 직원(Staff) 또는 외부 가이드입니다. 직원이면 `staffId`로 연결합니다.

현재 Prototype

- 역할을 저장하지 않고 `plan.leadStaffId`(총괄)와 `vehicle.guideId`(호차)로 파생합니다.
- 가이드 풀은 출발회차 시드의 `staff`이며 직원관리 Mock과 연결되어 있지 않습니다.
- 관리자 후속조치 담당자는 직원관리 Mock의 `adminCode`를 씁니다. 가이드 id(`G-xx`)와 체계가 다릅니다.

---

## 11. Passenger 운영배정

**목표 필드 (`PassengerOperationAssignment`):** `departureId`, `passengerId`, `segmentId`, `vehicleOperationId | null`, `boardingPointId | null`, `seatNumber | null`

규칙

- 저장은 **탑승객 단위**입니다. 예약 단위 일괄배정은 화면 Action이며, 결과는 탑승객별 행으로 저장합니다.
  - 예약 기본값: 같은 예약의 탑승객을 같은 호차 · 탑승지로 배정합니다.
  - 탑승객 override: 특정 탑승객만 다른 호차 · 탑승지 · 좌석으로 바꿉니다.
- 기본 배정은 DEFAULT 구간 1건입니다. 오는편 호차가 다른 경우에만 구간별 행을 추가합니다.
- 호차 변경 시
  - `seatNumber`를 초기화합니다.
  - 기존 탑승지가 새 호차 그룹에 있으면 유지하고, 없으면 해제합니다. 자동 대체하지 않습니다.
- 탑승지를 바꿔도 호차 · 좌석은 바뀌지 않습니다.
- 호차의 탑승지 그룹을 바꾸면 같은 이름(목표: 같은 id)의 탑승지는 유지하고 나머지는 "확인필요"로 남깁니다.
- 정원을 초과해도 저장은 경고와 함께 허용합니다. 대신 운영인계는 차단합니다.
- 배정 정보(호차 · 탑승지 · 좌석 · 가이드 · 그룹)가 바뀌면 운영인계를 해제하고 재인계가 필요합니다. 차량번호 · 기사 정보만 바꾸면 운영인계를 유지합니다.

현재 Prototype

- `plan.assignments[passengerId] = {vehicleId, seat}`이며, 좌석 0은 미지정입니다.
- `plan.boardingPoints[passengerId] = 탑승지 이름`입니다.
- 구간별 배정은 `assignment["default"]` + 구간 키로 처리합니다.

---

## 12. Boarding

**목표 필드 (`BoardingRecord`):** `departureId`, `passengerId`, `segmentId`, `status`, `noShowReason?`, `actualBoardingPointId?`, `memo?`, `recordedAt`, `recordedBy`

규칙

- **예약상태와 탑승상태는 별개입니다.** 예약확정 고객도 미탑승일 수 있고, 미탑승이 예약취소를 뜻하지 않습니다.
- 탑승상태: `UNCONFIRMED`(미확인) / `BOARDED`(탑승완료) / `NO_SHOW`(미탑승)
- "탑승취소" 상태는 두지 않습니다. **탑승확인 취소는 Action**(BOARDED → UNCONFIRMED)입니다.
- 미탑승 사유(`NO_SHOW`일 때만): `CUSTOMER_CANCELLED_ATTENDANCE`(고객 연락됨 · 불참), `UNREACHABLE`(연락두절), `NOT_ARRIVED`(출발시간 미도착), `OTHER_BOARDING_POINT`(다른 탑승지 탑승), `OTHER`(기타)
- 예정 탑승지 = 배정의 `boardingPointId`. 실제 탑승지 = `actualBoardingPointId`(다른 곳에서 탑승한 경우만).
- 구간이 여러 개이면 이전 구간 `NO_SHOW` 고객은 이후 구간에서 `EXCLUDED`로 표시합니다. 이 값은 저장하지 않는 표시상태입니다.

현재 Prototype

- 상태값은 `unchecked / boarded / no_show`, 사유는 한글 Label입니다.
- 다른 탑승지에서 탑승하면 `status: boarded` + `reason: "다른 탑승지 탑승"` + `actualPoint: 이름`으로 저장합니다. 미탑승 사유 목록의 값을 탑승완료 기록에도 씁니다. 목표 구조에서는 `actualBoardingPointId`만으로 표현하고 `noShowReason`은 NO_SHOW에만 씁니다.

---

## 13. ScheduleOperation

**ProductSchedule (계획 원본):** `productId`, `dayNo`, `sortOrder`, `title`, `place`, `kind`, `plannedArrivalTime?`, `plannedDepartureTime?`, `freeMinutes?`, `meetingTime?`, `meetingPlace?`, `moveMinutes?`, `boardingSegmentKey?`
**ScheduleOperation (출발회차 × 호차 운영):** 위 계획값 복사 + `operationalArrivalTime?` · `operationalDepartureTime?` · `actualArrivalTime?` · `actualDepartureTime?` · `freeStartedAt?` · `meetingTime?` · `meetingPlace?` · `status` · `memo?`

규칙

- 시간 3종을 분리합니다.
  - **예정(planned)**: 상품 일정표 원본. 현장에서 바꾸지 않습니다.
  - **운영(operational)**: 현장에서 변경한 출발 · 도착 예정
  - **실제(actual)**: 도착 · 출발 확인 시각
- 상태: `PLANNED` → `IN_PROGRESS` → `COMPLETED`
- 지연(분)은 저장하지 않고 `actual(또는 operational) - planned`로 계산합니다.
- 같은 일정도 호차마다 독립적으로 진행합니다. 그래서 출발회차 × 호차 단위로 둡니다.
- 출발회차 생성 시 ProductSchedule을 복사합니다. 이후 상품 일정이 바뀌어도 이미 생성된 출발회차는 자동 변경하지 않습니다. 반영 여부는 결정 필요입니다.

현재 Prototype

- 일정 원본이 **상품이 아니라 departure key별 시드**(`SAMPLE_SCHEDULES[key]`)입니다. 시드가 없는 출발회차에는 일정이 없습니다.
- 진행기록은 호차별입니다(`state[vehicleId][itemId]`).
- 표시상태는 `done / current / delayed / next / planned`입니다. 지연은 파생 표시이고, 목표 상태값 3종과 다릅니다.

---

## 14. Customer Communication

**MessageCampaign** (발송 1회) → **MessageRecipient** (번호 단위) → **MessageResult** (채널별 결과)

규칙

- 대상 선택 범위(호차 · 탑승지 · 고객)와 실제 발송 단위(정규화 전화번호)를 분리합니다.
- 같은 번호는 한 Campaign에서 1건만 발송합니다. 함께 안내된 탑승객은 `MessageRecipient.passengerIds`에 남깁니다.
- 알림톡 실패 후 SMS/LMS 대체발송이 켜져 있으면 결과가 2건(채널별)입니다.
- 실패건 재발송은 새 Campaign을 만들고 `retryOfCampaignId`로 연결합니다.
- 연락처별 상태(발송완료 · 미발송 · 발송실패)는 최근 결과에서 파생합니다.

메시지 변수 원천

| 변수 | 원천 |
| --- | --- |
| `{고객명}` | MessageRecipient.recipientName (대표 연락처면 대표 탑승객명) |
| `{상품명}` | Product.productName |
| `{출발일}` | Departure.departureDate |
| `{탑승지}` | PassengerOperationAssignment.boardingPointId → BoardingPoint.name |
| `{호차}` | PassengerOperationAssignment.vehicleOperationId → VehicleOperation.vehicleName |
| `{가이드명}` | 호차 VEHICLE_GUIDE → 없으면 CHIEF → Guide.name |
| `{가이드연락처}` | 위와 동일 Guide.phone |
| `{안내방링크}` | KakaoRoom.roomUrl (전체 또는 호차별) |

현재 Prototype: `GuideMessageBatch` + `GuideMessageResult`(번호별, 채널 1개)입니다. Recipient와 Result가 하나로 합쳐져 있고, 대체발송은 최종 채널만 남습니다.

---

## 15. Kakao 안내방

**목표 필드:** `id`, `departureId`, `targetType (ALL | VEHICLE)`, `vehicleOperationId | null`, `roomName`, `roomUrl`, `activeStatus (ACTIVE | INACTIVE)`, 생성/수정 정보
**Departure.kakaoRoomMode:** `ALL | VEHICLE`

규칙

- AOS는 카카오 오픈채팅방을 만들지 않습니다. 가이드가 만든 방의 링크만 등록합니다.
- **참여 여부 · 참여인원은 확인할 수 없으므로 정의하지 않습니다.**
- 참여 안내 상태(`noticeStatus`: NOT_SENT / PARTIAL / SENT)는 안내방 참여 템플릿 Campaign에서 파생합니다. 저장하지 않습니다.
- 운영방식을 바꿔도 다른 방식의 안내방은 삭제하지 않고 보관합니다.
- 사용중지(INACTIVE)는 AOS에서만 쓰지 않는다는 뜻이며, 오픈채팅방 자체는 삭제되지 않습니다.

현재 Prototype

- `GuideChatRoom {id: ROOM-{scope}, scope: "all" | vehicleId, name, link, active, registeredAt, updatedAt}`
- 레거시 `GuideDeparture.chatRoom.joinedCount`(참여인원)는 정책상 사용하지 않습니다.

---

## 16. OperationNote

**목표 필드:** `id`, `departureId`, `vehicleOperationId | null`, `scheduleOperationId | null`, `category`, `importance`, `title`, `content`, `occurredAt`, `adminReviewRequired`, `processingStatus`, `detail`, `attachments`, `canceledAt/By?`, 생성/수정 정보
**OperationNotePassenger:** `operationNoteId`, `passengerId` (N:M)

규칙

- 구분(category) · 중요도(importance) · 처리상태(processingStatus)는 **서로 다른 축**입니다.
  - 구분: 일반메모 · 고객관련 · 일정관련 · 분실물 · 차량 · 식당/관광지 · 민원 · 사고/안전 · 기타
  - 중요도: 일반 · 확인필요 · 중요
  - 처리상태: 기록 · 확인대기 · 확인완료 · 처리중 · 처리완료
- 관리자 확인 필요로 저장하면 초기 상태가 `확인대기`, 아니면 `기록`입니다.
- 중요/확인필요 또는 사고/안전 기록은 삭제하지 않고 **기록 취소**로 남깁니다.
- 운영기록 저장은 고객 메시지를 보내지 않습니다(소통과 분리).
- 관리자 후속조치는 별도 Entity(FollowUp)이며, 가이드 원본 기록을 덮어쓰지 않습니다.
- `occurredAt`은 다일정 상품을 위해 날짜를 포함합니다.

현재 Prototype

- `occurredAt`가 `HH:MM`만 있어 다일정 상품에서 날짜를 알 수 없습니다.
- 호차 전체는 `vehicleId: "all"` 문자열입니다.
- 첨부는 파일명만 보관합니다.

---

## 17. OperationClosing

**목표 필드:** `departureId`, `closingStatus (IN_OPERATION | READY_TO_CLOSE | CLOSED)`, `checks`, `finalGuideMemo`, `adminHandoffMemo`, `closedAt?`, `closedBy?`, `snapshot?`

규칙

- 운영종료는 가이드가 현장 운영을 마치고 관리자에게 결과를 넘기는 기록입니다.
- 운영종료 시점 집계를 `snapshot`으로 보관합니다. 이후 원본이 바뀌어도 보고 기준값은 유지합니다.
- 관리자 확인 상태는 OperationClosing에 두지 않고 **OperationReview로 분리**합니다.
- 운영 재오픈은 향후 관리자 권한 Action입니다(현재 미제공). 재오픈 시 closedAt 이력을 남깁니다.

현재 Prototype

- `GuideClosingState`에 `adminReview`(관리자 확인대기/확인완료)가 함께 있습니다.
- 관리자 확인완료 시 `closing.adminReview`와 `review.reviewedAt`을 동시에 갱신합니다. 같은 사실이 두 곳에 저장됩니다.

---

## 18. OperationReview

**목표 필드:** `departureId`, `reviewStatus (PENDING | COMPLETED)`, `checks`(7항목), `confirmedNoteIds`, `followUpNeeds`, `reviewMemo`, `reviewedAt?`, `reviewedBy?`

규칙

- 운영종료(CLOSED) 이후에만 생성합니다. 운영종료 시 `PENDING`으로 생성합니다.
- `COMPLETED` = 관리자가 운영결과를 검토했다는 의미입니다. 후속조치 완료를 뜻하지 않습니다.
- 확인완료 후에도 후속조치는 계속 관리합니다.

현재 Prototype: `GuideReviewState {checks, needs, confirmedIssues, followUps, memo, reviewedAt?, reviewedBy?}`이며, 후속조치 배열이 검토 상태 안에 있습니다.

---

## 19. FollowUp

**목표 필드:** `id`, `departureId`, `operationNoteId | null`, `type`, `assigneeStaffId`, `dueDate?`, `content`, `status`, `memo`, `logs`, 생성/수정 정보

규칙

- 상태: `WAITING`(처리대기) / `IN_PROGRESS`(처리중) / `COMPLETED`(처리완료) / `ON_HOLD`(보류)
- OperationReview와 **독립적**입니다. 관리자 확인완료 여부와 관계없이 진행합니다.
- 환불/보상은 처리하지 않고 "검토 필요" 업무로만 기록합니다(정산 · 환불 미연동).
- 유형: 고객확인 · 분실물 · 차량업체 · 식당 · 관광지 · 가이드 · 환불/보상 검토 · 민원확인 · 안전관련 · 기타
- 기한초과는 `dueDate < 오늘 && status ≠ COMPLETED`로 파생합니다.

현재 Prototype: `GuideFollowUp`이 `GuideReviewState.followUps`에 포함됩니다. 운영현황에서는 처리대기 · 처리중 · 보류를 합쳐 "진행중"으로 표시합니다. 이 "진행중"은 상태값 "처리중"과 Label이 겹칩니다.

---

## 20. 상태값

**원칙:** 하나의 거대한 상태값을 만들지 않습니다. 축별로 독립된 상태를 두고, 화면 단계는 파생합니다.

| 축 | 소유 Entity | 목표 값 (코드 → Label) | 현재 Prototype 값 | 저장/파생 |
| --- | --- | --- | --- | --- |
| 상품 판매 | Product | DRAFT 작성중 · ON_SALE 판매중 · SALE_STOPPED 판매중지 · ARCHIVED 보관 | `visible`, `soldout` boolean | 저장 |
| 출발 확정 | Departure | SCHEDULED 출발예정 · CONFIRMED 출발확정 · CANCELLED 출발취소 | 레거시 `status` (미사용) | 저장 |
| 예약 | Reservation | RECEIVED 예약접수 · CONFIRMED 예약확정 · WAITLISTED 대기 · CANCEL_REQUESTED 취소요청 · CANCELLED 취소완료 | + 예약마감 · 운영인계 · 행사완료 혼재 | 저장 |
| 결제 | Reservation | UNPAID 미결제 · PENDING 결제대기 · PARTIAL 부분결제 · PAID 결제완료 · REFUND_IN_PROGRESS 환불진행 · REFUNDED 환불완료 | 환불진행 없음 | 저장 |
| 탑승객 | Passenger | ACTIVE · CANCELLED | 없음 | 저장 |
| 운영 대상 | Reservation | ELIGIBLE 운영대상 · CAUTION 확인필요 · PENDING 확정대기 · EXCLUDED 운영제외 | 동일 4종 | 파생 |
| 배정 진행 | Departure | NOT_ASSIGNED 미배정 · PARTIALLY_ASSIGNED 일부배정 · ASSIGNED 배정완료 | + 운영인계완료 | 파생 |
| 탑승지 확인 | Passenger | PENDING_VEHICLE · NO_GROUP · MISSING · NEEDS_CHECK · OK | pending · no_group · missing · check · ok | 파생 |
| 운영 진행단계 | Departure | ASSIGNING 운영배정 · HANDED_OVER 운영인계 · IN_OPERATION 운영중 · CLOSED 운영종료 | 동일 4종 | 파생 |
| 탑승 | BoardingRecord | UNCONFIRMED 미확인 · BOARDED 탑승완료 · NO_SHOW 미탑승 | unchecked · boarded · no_show | 저장 |
| 일정 | ScheduleOperation | PLANNED 예정 · IN_PROGRESS 진행중 · COMPLETED 완료 | done · current · delayed · next · planned (표시값) | 저장 |
| 발송결과 | MessageResult | SUCCESS · FAILED | success · failed | 저장 |
| 연락처 발송상태 | (파생) | 발송완료 · 미발송 · 발송실패 | 동일 | 파생 |
| 안내방 사용 | KakaoRoom | ACTIVE · INACTIVE | `active` boolean | 저장 |
| 안내방 안내 | (파생) | NOT_SENT · PARTIAL · SENT | before · partial · done | 파생 |
| 운영기록 처리 | OperationNote | RECORDED 기록 · WAITING_CONFIRM 확인대기 · CONFIRMED 확인완료 · IN_PROGRESS 처리중 · RESOLVED 처리완료 | 동일 5종 (한글) | 저장 |
| 운영종료 | OperationClosing | IN_OPERATION 운영중 · READY_TO_CLOSE 운영종료 준비 · CLOSED 운영종료 | 동일 3종 (준비는 파생) | 저장(CLOSED) / 파생(준비) |
| 관리자 확인 | OperationReview | PENDING 관리자 확인대기 · COMPLETED 관리자 확인완료 | `closing.adminReview` | 저장 |
| 후속조치 | FollowUp | WAITING 처리대기 · IN_PROGRESS 처리중 · COMPLETED 처리완료 · ON_HOLD 보류 | 동일 4종 (한글) | 저장 |
| 공유상품 운영권한 | Reservation | open · 인계대기 · 인계완료 (`operatorTransfer` 기반) | `getReservationOperationStage` | 파생 |

### 20.1 운영 진행단계와 배정 상태 분석

- **운영 진행단계**(운영배정 · 운영인계 · 운영중 · 운영종료)는 출발회차 전체가 어느 업무 단계에 있는지 나타냅니다.
- **배정 상태**(미배정 · 일부배정 · 배정완료 · 운영인계완료)는 고객 배정이 얼마나 끝났는지 나타냅니다.
- 현재 `운영인계완료`가 배정 상태에 포함되어 있어 두 축이 겹칩니다. 목표 구조에서는 배정 상태를 3종으로 줄이고, 인계 여부는 진행단계(HANDED_OVER)로만 표현합니다. 화면 Label "운영인계완료"는 `ASSIGNED && handover` 조합으로 만들 수 있습니다.
- 운영인계 후 예약이 추가되어 미배정이 생기면, 현재는 배정 상태가 "일부배정"으로 돌아갑니다. 반면 진행단계는 "운영인계"로 남습니다. 이 조합을 화면에서 어떻게 경고할지는 결정이 필요합니다(30장).
- 관리자 확인 · 후속조치는 진행단계에 넣지 않습니다. 운영현황의 `reviewed`(확인완료) 단계 · "운영기록 없음"(stale)은 화면 분류용 파생값입니다.

---

## 21. 상태 전이

### 21.1 Reservation

| From | To | Action | 조건 · 비고 |
| --- | --- | --- | --- |
| (신규) | RECEIVED | 예약 접수 | |
| RECEIVED | CONFIRMED | 예약 확정 | |
| RECEIVED | WAITLISTED | 대기 등록 | 좌석 부족 |
| WAITLISTED | CONFIRMED | 대기 확정 | |
| RECEIVED · CONFIRMED · WAITLISTED | CANCEL_REQUESTED | 취소 요청 | 운영 대상에는 남음(CAUTION) |
| CANCEL_REQUESTED | CONFIRMED | 취소 요청 철회 | |
| CANCEL_REQUESTED · CONFIRMED | CANCELLED | 전체 취소 완료 | 운영 대상 제외 (26.2) |
| CONFIRMED | CONFIRMED | 부분 취소 | 해당 Passenger만 CANCELLED |

예약마감(`salesClosedAt`), 공유상품 운영사 인계(`operatorTransfer`), 행사완료(운영종료 파생)는 상태 전이가 아니라 별도 기록입니다.

### 21.2 Boarding

| From | To | Action | 조건 |
| --- | --- | --- | --- |
| UNCONFIRMED | BOARDED | 탑승 확인 | 실제 탑승지가 다르면 actualBoardingPointId 기록 |
| UNCONFIRMED | NO_SHOW | 미탑승 처리 | noShowReason 필수 |
| BOARDED | UNCONFIRMED | **탑승확인 취소** (Action) | 확인 Modal |
| NO_SHOW | UNCONFIRMED | 미탑승 취소 | 사유 삭제 |
| NO_SHOW | BOARDED | 늦은 탑승 확인 | 사유 삭제 |

운영종료(CLOSED) 이후에는 탑승기록을 변경하지 않습니다(재오픈 필요).

### 21.3 배정 진행 (파생)

| From | To | 계기 |
| --- | --- | --- |
| NOT_ASSIGNED | PARTIALLY_ASSIGNED | 1명 이상 배정 |
| PARTIALLY_ASSIGNED | ASSIGNED | 전원 호차 + 탑승지 OK |
| ASSIGNED | PARTIALLY_ASSIGNED | 예약 추가 · 배정 해제 · 그룹 변경으로 확인필요 발생 |

### 21.4 운영 진행단계 (파생)

| From | To | 계기 | 되돌림 |
| --- | --- | --- | --- |
| 운영배정 | 운영인계 | 운영인계 확정 (23.2 조건 충족) | 배정 정보 변경 시 인계 해제 → 운영배정 |
| 운영인계 | 운영중 | 첫 현장 기록 (현재: 첫 탑승체크) | 없음 |
| 운영중 | 운영종료 | 운영종료 확정 (23.3 조건 충족) | 재오픈 (추후, 관리자) |

### 21.5 OperationClosing

| From | To | Action | 조건 |
| --- | --- | --- | --- |
| IN_OPERATION | READY_TO_CLOSE | 종료 체크 진행 / 일정 완료 | 파생 가능 |
| READY_TO_CLOSE | CLOSED | 운영종료 | 체크 5개 + 차단조건 0 |
| CLOSED | IN_OPERATION | 운영 재오픈 | 추후 · 관리자 권한 · Review 초기화 여부 결정 필요 |

### 21.6 OperationReview

| From | To | Action | 조건 |
| --- | --- | --- | --- |
| (없음) | PENDING | 운영종료 시 생성 | |
| PENDING | COMPLETED | 관리자 확인완료 | 검토 체크 7개 + 중요이슈 확인 |
| COMPLETED | PENDING | 확인 취소 | 추후 · 권한 필요 |

### 21.7 FollowUp

| From | To | Action |
| --- | --- | --- |
| (신규) | WAITING | 후속조치 등록 |
| WAITING | IN_PROGRESS | 처리 시작 |
| WAITING · IN_PROGRESS | ON_HOLD | 보류 |
| ON_HOLD | WAITING · IN_PROGRESS | 재개 |
| WAITING · IN_PROGRESS | COMPLETED | 처리완료 |
| COMPLETED | IN_PROGRESS | 재처리 |

모든 전이는 `FollowUpLog`에 남깁니다.

---

## 22. 파생값

**원칙:** 원본에서 계산할 수 있는 값은 저장하지 않습니다. 단, 운영종료 스냅샷처럼 **시점 기준값**은 저장합니다.

| 파생값 | 계산식 | 사용 화면 |
| --- | --- | --- |
| 운영 진행단계 | closing.closedAt → 운영종료 / BoardingRecord(UNCONFIRMED 외) 존재 → 운영중 / handover → 운영인계 / 그 외 운영배정 | 운영현황, 마스터, 가이드 운영 |
| 운영 대상 예약 · 인원 | Reservation(CANCELLED 제외) · Passenger(ACTIVE) | 운영배정, 마스터 |
| 연락 대상 수 | 정규화 전화번호 distinct | 고객소통 |
| 정원 · 잔여석 | Σ capacity − 배정 인원 | 운영배정 |
| 미배정 인원 | 운영 대상 − 호차 배정 | 운영배정, 운영현황 |
| 탑승지 확인필요 | 배정 탑승지가 호차 그룹에 없음 / 미지정 | 운영배정 |
| 배정 진행 | 21.3 | 운영배정, 운영현황 |
| 탑승 · 미탑승 · 미확인 | BoardingRecord 집계 (구간별) | 탑승체크, 운영결과 |
| 일정 지연(분) | max(0, actual/operational − planned) | 현장운영, 관리자 확인 |
| 연락처 발송상태 | 최근 MessageResult | 고객소통 |
| 안내방 안내 상태 | 안내방 템플릿 Campaign 대상 대비 성공 | 안내방 |
| 미처리 운영기록 | processingStatus ∉ {CONFIRMED, RESOLVED} && !canceled | 운영결과, 관리자 확인 |
| 중요 이슈 | importance = IMPORTANT 또는 category = ACCIDENT_SAFETY | 관리자 확인 |
| 후속조치 진행중 · 기한초과 | status ≠ COMPLETED / dueDate < 오늘 | 운영현황, 관리자 확인 |
| 미수금 | totalAmount − paidAmount | 마스터, 예약 |
| 대표 출발시각 | departureTime 또는 첫 DepartureBoardingTime | 목록 |
| 공유상품 운영권한 단계 | operatorTransfer · salesClosedAt | 예약 목록 · 상세 |
| 행사완료 (예약 표시) | Departure 운영종료 | 예약 목록 |

저장하는 시점값: `OperationClosing.snapshot`, `OperationHandover.checksSnapshot`, `MessageRecipient.renderedBody`.

---

## 23. Workflow 완료조건

### 23.1 운영준비 (5항목)

현재 운영현황(`buildPrepItems`) 기준입니다.

| # | 항목 | 완료 조건 |
| --- | --- | --- |
| 1 | 호차배정 | VehicleOperation ≥ 1 |
| 2 | 가이드배정 | CHIEF 지정 + 모든 호차 VEHICLE_GUIDE 지정 |
| 3 | 탑승지 설정 | 모든 호차 boardingGroupId 지정 + 탑승지 확인필요 0 |
| 4 | 고객배정 | 미배정 0 + 정원초과 · 좌석중복 0 |
| 5 | 운영인계 | handover 존재 |

> 참고: 후보안(호차 · 차량/기사 · 가이드 · 탑승지 · 고객배정)과 다릅니다. 현재 구현은 **차량/기사를 운영인계 후 입력 가능한 선택 항목**으로 두고, 5번째를 운영인계로 둡니다. 어느 쪽을 표준으로 할지 결정이 필요합니다(30장).

### 23.2 운영인계 조건 (`getGuideHandoverChecks`)

| 구분 | 조건 |
| --- | --- |
| 필수 | 호차 ≥ 1 |
| 필수 | 미배정 고객 0 |
| 필수 | 모든 호차 탑승지 그룹 지정 |
| 필수 | 탑승지 미지정 · 확인필요 0 |
| 필수 | 총괄가이드 지정 |
| 필수 | 모든 호차 담당가이드 지정 |
| 필수 | 정원초과 0 · 좌석중복 0 |
| 선택 | 차량번호 (인계 후 입력 가능) |
| 선택 | 기사명 · 기사 연락처 (인계 후 입력 가능) |

필수 항목이 모두 충족되어야 운영인계를 확정할 수 있습니다. 인계 후 필수 항목 관련 정보가 바뀌면 인계를 해제합니다.

### 23.3 운영종료 조건

| 구분 | 조건 |
| --- | --- |
| 필수 체크 | 탑승현황 · 미탑승 고객 · 일정 운영결과 · 특이사항 · 미처리사항 (5개) |
| 차단 | 첫 탑승 구간 미확인 고객 > 0 |
| 차단 | 미완료 일정 > 0 (호차별 합계) |
| 경고 | 미처리 운영기록 > 0 (관리자에게 미처리로 인계) |
| 입력 | 최종 운영메모 · 관리자 전달사항 (선택) |

### 23.4 관리자 확인 조건

| 구분 | 조건 |
| --- | --- |
| 전제 | OperationClosing = CLOSED |
| 필수 체크 | 탑승결과 · 미탑승 고객 · 일정 변경/지연 · 운영기록 · 중요이슈 · 미처리사항 · 관리자 전달사항 (7개) |
| 차단 | 확인하지 않은 중요 이슈 > 0 |
| 경고 | 진행중 후속조치 > 0 (확인완료 후에도 계속 관리) |

---

## 24. 화면별 Data Source

| # | 화면 | 경로 | 목표 Data Source | 현재 Prototype 함수 |
| --- | --- | --- | --- | --- |
| 1 | 운영현황 | `/reservations/operations` | Departure + 파생 요약(DepartureOperationSummary) | `getOpsBoardItems` |
| 2 | 출발회차 운영 마스터 | `/reservations/operations/[key]` | Departure · Product · Reservation · VehicleOperation · GuideAssignment · Closing · Review · FollowUp | `getOpsBoardItem`, `getOperationDeparture` |
| 3 | 예약 목록 (출발회차 연결) | `/reservations?departure=` | Reservation (departureId) | `getReservationOperationView` |
| 4 | 운영배정 | `/reservations/departures/[key]/assignment` | Reservation · Passenger · VehicleOperation · GuideAssignment · BoardingGroup/Point · PassengerOperationAssignment | `getOperationDeparture`, `saveOperationPlan` |
| 5 | 가이드 운영 운영판 | `/departures/[key]/guide` | Departure · 배정 · BoardingRecord 요약 · ScheduleOperation 요약 | `getOperationDeparture` |
| 6 | 탑승체크 | `/guide/customers` | Passenger · PassengerOperationAssignment · BoardingSegment · BoardingRecord | `getGuideBoardingRecord`, `getGuideSegmentStatus` |
| 7 | 일정 · 현장운영 | `/guide/schedule` | ProductSchedule → ScheduleOperation · DepartureBoardingTime | `getGuideSchedule`, `getGuideScheduleState` |
| 8 | 고객소통 | `/guide/communication` | Passenger · Reservation 연락처 · MessageCampaign/Recipient/Result | `getGuideCommRows`, `getGuideMessageBatches` |
| 9 | 카카오 안내방 | `/guide/chat-room` | KakaoRoom · Departure.kakaoRoomMode · MessageCampaign | `getGuideChatState` |
| 10 | 운영메모 · 특이사항 | `/guide/notes` | OperationNote · OperationNotePassenger | `getGuideNotes` |
| 11 | 운영결과 (운영종료) | `/guide/closing` | OperationClosing + 집계(Boarding · Schedule · Note · Message) | `getGuideClosingState`, `buildGuideClosingReport` |
| 12 | 관리자 확인 | `/departures/[key]/review` | OperationReview · FollowUp · OperationClosing.snapshot · OperationNote | `getGuideReviewState` |
| 13 | 예약 상세 (운영배정 카드 · 운영관리 권한) | `/reservations/[id]` | Reservation · Passenger 배정 · operatorTransfer | `getReservationOperationView`, `handoverReservation` |
| 14 | 정산 (출발일 그룹 · 운영인계 확인) | `/settlements/departures/[key]` | Departure · Reservation · operatorTransfer · OperationClosing | `getSettlementDepartureGroups` |

---

## 25. ID / Code 정책

| Entity | 내부 ID (불변 · 관계용) | 표시 Code (검색 · 화면) | 현재 Prototype |
| --- | --- | --- | --- |
| Product | productId | productCode (`GC-WINE`) | code만 있음 · 임시 `PRD-RSV-NN` |
| Departure | departureId | departureCode (`GC-WINE-20261017-01`) | `GC-WINE-20261017` · `DEP-YYYYMMDD-NN` · 정산 `code_date` |
| Reservation | reservationId | reservationNo | code 겸용 |
| Passenger | passengerId (전역 유일) | 없음 (이름 표시) | 출발회차 안에서만 유일 (`P-01`, `${code}-P1`) |
| BoardingGroup / Point | id | name | id 있으나 운영 참조는 name |
| VehicleOperation | id | vehicleOrder · vehicleName | `V-1` (출발회차 내 유일) |
| Guide | guideId (+ staffId) | 이름 | `G-xx` (시드별) |
| MessageCampaign | id | — | `MSG-<base36>-n` |
| KakaoRoom | id | roomName | `ROOM-{scope}` (출발회차 내 유일) |
| OperationNote | id | — | `NOTE-01` (출발회차 내 유일) |
| FollowUp | id | — | `FU-001` (세션 순번) |

원칙

1. **관계는 항상 내부 ID**로 연결합니다. 이름 · 코드 · 날짜 문자열 조합으로 연결하지 않습니다.
2. 내부 ID는 생성 후 변경하지 않습니다. 정렬 순서 · 날짜 · 개수에서 만들어진 값을 ID로 쓰지 않습니다.
3. Code는 사람이 읽고 검색하는 값입니다. 변경될 수 있으며 URL에는 Code 또는 ID 중 하나를 일관되게 사용합니다(결정 필요).
4. 같은 상품 · 같은 날짜의 **복수 출발회차**를 지원합니다. `departureCode`에 회차 순번(`-01`)을 둡니다.
5. Prototype의 `DEP-YYYYMMDD-NN`은 현재 유지합니다(결정사항 2). 실제 연동 시 `departureId` 발급 후 기존 key는 사용하지 않습니다.

### 25.1 다중 출발일 처리

- 상품 1개에 여러 출발회차가 있어도 운영배정 · 가이드 · 탑승 · 기록은 `departureId`로 완전히 분리합니다.
- 예약 목록의 출발회차 필터는 `departureId` 기준입니다. 현재는 `departureKey` 기준입니다.
- 다일정 상품은 `departureDate` ~ `endDate`입니다. 일정은 `dayNo`, 운영기록은 날짜를 포함한 `occurredAt`으로 구분합니다.
- 같은 고객이 여러 출발회차를 예약하면 Reservation과 Passenger를 각각 따로 둡니다. 고객(Member) 통합은 이번 범위 밖입니다.

---

## 26. 데이터 변경 영향

### 26.1 변경 유형별 영향

| 변경 | 영향 받는 데이터 | 처리 원칙 |
| --- | --- | --- |
| 예약 추가 | Passenger, 미배정, 연락 대상, 정원 | 미배정으로 추가. 운영인계 후라면 배정 진행이 "일부배정"으로 바뀌고 경고 |
| 예약 인원 변경 | Passenger 추가/취소, 배정, 좌석 | 추가 인원은 미배정. 취소 인원은 배정 · 좌석 해제 |
| 출발일 변경 (예약) | 예약의 departureId 변경 | 기존 출발회차 배정 · 탑승기록 해제 후 새 출발회차에서 미배정 |
| 상품 탑승지 그룹 · 탑승지 수정 | VehicleOperation 그룹, 배정 탑승지 | id 기준 유지. 비활성 탑승지 배정은 확인필요. 자동 대체 금지 |
| 호차 그룹 변경 | 해당 호차 배정 탑승지 | 같은 id 유지, 나머지 확인필요. 운영인계 해제 |
| 호차 삭제 | 배정 | 배정 고객이 있으면 삭제 불가 |
| 호차 변경 (고객) | 좌석, 탑승지 | 좌석 초기화, 그룹 밖 탑승지 해제. 운영인계 해제 |
| 가이드 변경 | GuideAssignment, 메시지 변수 | 운영인계 해제. 이후 발송분부터 새 가이드 정보 |
| 차량번호 · 기사 변경 | VehicleOperation | 운영인계 유지 |
| 상품 일정 변경 | ProductSchedule | 이미 생성된 ScheduleOperation 자동 변경 안 함 (반영 Action 결정 필요) |
| 상품명 변경 | 표시값 | id 연결이라 관계 영향 없음. 현재 Prototype은 이름으로 연결해 끊어짐 |
| 운영종료 후 원본 변경 | 스냅샷 | 스냅샷 유지. 변경은 재오픈 후 |

### 26.2 예약취소 영향

| 상황 | 운영 처리 |
| --- | --- |
| 취소요청 (CANCEL_REQUESTED) | 운영 대상 유지 + "확인필요(CAUTION)" 표시. 배정 유지 |
| 전체 취소완료 (CANCELLED) | 운영 대상 제외. 배정 · 좌석 해제, 연락 대상 제외. 기존 발송이력 · 운영기록은 보존 |
| 부분 취소 | 취소된 Passenger만 제외 · 배정 해제 |
| 운영인계 후 취소 | 배정 해제로 인계 조건 변동. 인계 해제 여부 결정 필요(인원 감소는 유지 제안) |
| 탑승 기록 후 취소 | 탑승기록 보존(감사 목적). 집계에서는 제외 |
| 운영종료 후 취소 | 운영 데이터 변경 없음. 정산 · 환불에서 처리 |

**예약취소 ≠ 미탑승(NO_SHOW).**
- 예약취소는 예약 계약이 끝난 것입니다(환불 대상 가능).
- 미탑승은 예약은 유효하지만 현장에 오지 않은 것입니다(환불 정책 별도).
- 미탑승 사유 "고객 연락됨 · 불참"도 예약취소가 아닙니다. 관리자 확인 화면에서 두 개념을 구분해 표시합니다.

현재 Prototype

- 예약 기반 출발회차는 취소완료 예약을 운영 대상에서 제외합니다.
- **SAMPLE 시드 출발회차는 예약 목록 상태와 관계없이 시드 탑승객을 그대로 사용합니다.** 예약을 취소해도 운영 화면에 남습니다.

---

## 27. 현재 Prototype과 목표 구조 차이

`[필수]` 실제 연동 전 반드시 해결 · `[권장]` 연동 시 함께 정리 · `[추후]` 기능 확장 시

| # | 분류 | 현재 Prototype | 목표 구조 | 영향 |
| --- | --- | --- | --- | --- |
| 1 | [필수] | 출발회차 원본 없음 (예약에서 계산) | Departure Entity 독립 | 전체 |
| 2 | [필수] | 예약 → 출발회차 연결이 `productName + departureAt` 문자열 | `Reservation.departureId` | 운영배정, 예약, 정산 |
| 3 | [필수] | 출발회차 key 3종, `DEP-YYYYMMDD-NN` 순번 불안정 | 불변 `departureId` + 표시 `departureCode` | 모든 운영 세션 데이터 |
| 4 | [필수] | 정산 출발일 key `productCode_departureAt` (상품명 대체) | `departureId` | 정산 |
| 5 | [필수] | 상품 id 없음, 임시 `PRD-RSV-NN`(정렬 순번) | `productId` | 탑승지 그룹 조회 |
| 6 | [필수] | 탑승지 참조가 이름 문자열 (배정 · 실제 탑승지 · 집결시각) | `boardingPointId` | 운영배정, 탑승체크, 일정, 소통 |
| 7 | [필수] | 예약상태에 예약마감 · 운영인계 · 행사완료 혼재 | 예약상태 5종 + 별도 기록 | 예약, 권한, 정산 |
| 8 | [필수] | 탑승객 명단 없음 (인원수 → "일행N") | Passenger Entity | 운영배정, 탑승체크, 소통 |
| 9 | [필수] | SAMPLE 시드 출발회차는 예약 취소 · 인원 변경 미반영 | 예약 원본 기준 | 운영배정 |
| 10 | [필수] | 운영 데이터 세션 저장 (새로고침 초기화) | 영속 저장 | 전체 |
| 11 | [권장] | 상태값이 한글 Label | 코드 + Label 분리 | 전체 |
| 12 | [권장] | 대표 탑승객 = `passengers[0]` 암묵 규칙 | `Passenger.role` | 소통, 탑승체크 |
| 13 | [권장] | 동행자 연락처가 별도 SAMPLE 맵 | `Passenger.phone` | 소통 |
| 14 | [권장] | 전화번호 정규화 없이 문자열 비교 | NormalizedPhone | 소통 중복 제거 |
| 15 | [권장] | 가이드 역할 파생 (leadStaffId · vehicle.guideId) | GuideAssignment | 운영배정, 소통 변수 |
| 16 | [권장] | 배정 상태에 "운영인계완료" 포함 | 배정 3종 + 진행단계 | 운영배정, 운영현황 |
| 17 | [권장] | 관리자 확인 상태가 closing · review 두 곳 | OperationReview만 | 운영결과, 관리자 확인 |
| 18 | [권장] | 후속조치가 검토 상태 내부 배열 | FollowUp Entity | 관리자 확인, 운영현황 |
| 19 | [권장] | 일정 원본이 departure key별 시드 | ProductSchedule → ScheduleOperation | 일정 |
| 20 | [권장] | 탑승 시각 3곳 분산 | DepartureBoardingTime | 일정, 소통, 목록 |
| 21 | [권장] | 같은 장소 이름 불일치 ("영등포" / "영등포역") | id 참조 + 이름 정비 | 운영배정 |
| 22 | [권장] | 다른 탑승지 탑승을 미탑승 사유값으로 기록 | actualBoardingPointId만 | 탑승체크, 운영결과 |
| 23 | [권장] | 운영기록 발생시각 `HH:MM` | 날짜 포함 | 운영기록 (다일정) |
| 24 | [권장] | 레거시 필드 (`status` · `notifiedCount` · `noteCount` · `chatRoom.joinedCount` · `guideName`) | 제거 또는 파생 | 시드 |
| 25 | [권장] | 발송결과가 번호별 1건 (대체발송 최종 채널만) | Recipient + 채널별 Result | 소통 |
| 26 | [권장] | "운영인계" 용어 이중 사용 (29장) | 공유상품 쪽 명칭 변경 검토 | 예약, 정산, 공유상품 |
| 27 | [권장] | ID가 출발회차 안에서만 유일 (`P-01`, `V-1`, `NOTE-01`) | 전역 유일 ID | 전체 |
| 28 | [권장] | 일시 문자열 `YYYY-MM-DD HH:mm` (시간대 없음) | ISO 8601 + 시간대 | 전체 |
| 29 | [권장] | "진행중" Label이 후속조치 집계와 상태 "처리중"에 겹침 | Label 정리 | 운영현황 |
| 30 | [추후] | 차량 원본 없음 | Vehicle Master + `vehicleMasterId` | 운영배정 |
| 31 | [추후] | 가이드가 직원관리와 미연결 | Guide ↔ Staff | 운영배정, 후속조치 담당자 |
| 32 | [추후] | 탑승지 주소 · 좌표 · 안내 없음 | BoardingPoint 확장 | 소통, 지도 |
| 33 | [추후] | 운영 재오픈 · 확인 취소 없음 | 권한 Action + 이력 | 운영결과, 관리자 확인 |
| 34 | [추후] | 상품 일정 변경 → 출발회차 반영 Action 없음 | 반영 Action | 일정 |
| 35 | [추후] | 첨부 파일명만 | 파일 저장 | 운영기록 |
| 36 | [추후] | 장소 원본(Place Master) 없음 | 그룹 간 같은 장소 연결 | 탑승지 |

---

## 28. 향후 DB/API 연동 고려사항

Endpoint가 아니라 **필요한 데이터 Action**만 정리합니다.

| 영역 | 데이터 Action |
| --- | --- |
| 출발회차 | 출발회차 생성(상품 · 날짜 · 회차), 출발일 정정, 출발 취소, 운영요약 조회 |
| 예약 | 출발회차별 예약 조회, 예약 출발회차 변경, 부분/전체 취소, 예약마감, 공유상품 운영사 인계 |
| 탑승객 | 명단 등록 · 수정, 대표 지정, 개인 연락처 등록 |
| 호차 | 호차 추가 · 수정 · 삭제(배정 없을 때), 그룹 지정, 차량 · 기사 정보 입력 |
| 가이드 | 총괄 · 호차 담당 지정/해제 |
| 운영배정 | 예약 단위 일괄배정, 탑승객 override, 좌석 지정, 배정 해제 |
| 운영인계 | 인계 조건 조회, 인계 확정, 인계 해제(변경 시 자동) |
| 탑승 | 탑승 확인, 미탑승 처리(사유), 탑승확인 취소, 실제 탑승지 기록 |
| 일정 | 출발회차 일정 생성(상품 일정 복사), 도착 · 출발 확인, 운영시간 변경, 집결 변경, 메모 |
| 소통 | 대상 조회(중복 제거), 발송, 실패건 재발송, 발송이력 · 결과 조회 |
| 안내방 | 운영방식 변경, 링크 등록 · 수정 · 사용중지 |
| 운영기록 | 작성 · 수정 · 기록 취소, 처리상태 변경, 관련 고객 연결 |
| 운영종료 | 종료 체크 저장, 메모 저장, 운영종료 확정(스냅샷), 재오픈(추후) |
| 관리자 확인 | 검토 체크, 중요이슈 확인, 후속조치 필요 여부, 확인완료 |
| 후속조치 | 등록 · 담당자 · 기한 · 상태 변경, 처리 로그 |

공통 고려사항

- **동시 수정:** 운영배정 · 탑승체크는 여러 사람이 동시에 수정할 수 있습니다. 버전 확인 또는 마지막 수정자 표시가 필요합니다.
- **이력:** 상태 변경(예약 · 탑승 · 인계 · 종료 · 확인 · 후속조치)은 누가 · 언제 바꿨는지 남깁니다.
- **권한:** 판매여행사 · 공급여행사 · 판매점 · 가이드 · 관리자별로 수정 범위가 다릅니다(공유상품 운영권한과 연결).
- **현장 환경:** 가이드 화면은 모바일 · 불안정한 네트워크를 고려합니다(임시 저장 · 재시도).
- **개인정보:** 연락처는 마스킹 표시를 기본으로 하고, 발송 · 조회 기록을 남깁니다.
- **시간대:** 저장은 시간대 포함, 표시는 출발지 현지시각으로 합니다.
- **스냅샷:** 운영종료 집계, 발송 본문, 인계 시점 조건은 시점값으로 보관합니다.

---

## 29. 인계 용어 충돌 분석

**결정사항 3:**
- 공유상품의 "인계완료"와 가이드 운영의 "운영인계"는 **다른 개념**입니다.
- 가이드 운영은 "운영인계"를 유지합니다.
- 화면 문구는 이번 단계에서 **일괄 변경하지 않습니다.**
- 향후 공유상품 쪽을 "운영사 인계" 등으로 바꿀 때를 대비해 영향 범위를 기록합니다.

### 29.1 용어 비교

| 항목 | 가이드 운영 "운영인계" | 공유상품 "운영인계 / 인계대기 / 인계완료" |
| --- | --- | --- |
| 현재 용어 | 운영인계, 운영인계완료, 운영인계 조건, 재인계 | 운영인계(예약상태 값), 운영인계 대기/완료, 인계대기/인계완료(Badge), 운영인계(이력 · 버튼) |
| 업무 의미 | 운영 담당자가 배정(호차 · 가이드 · 탑승지 · 고객)을 확정해 **가이드에게 출발회차 운영을 넘김** | 예약마감 후 **예약 수정 · 운영관리 권한을 판매여행사에서 공급(운영)여행사로 이전** |
| 단위 | 출발회차 1건 | 예약 1건 (공유상품 · 제휴/판매점 예약만) |
| 저장 위치 | `GuideOperationPlan.handover {at, by}` | `ReservationSource.handoverAt/By`, 예약상태 "운영인계", 이력 `operation_handover` |
| 목표 필드 | `Departure.handover: OperationHandover` | `Reservation.operatorTransfer: OperatorTransfer` |
| 사용 화면 | 운영현황, 출발회차 운영 마스터, 운영배정, 가이드 운영, 가이드 운영 목록 | 예약 목록, 예약 상세, 예약 수정, 상품 공유설정, 정산 목록 · 상세 · 문서, 출발일 정산 |

### 29.2 혼동 가능성

1. **같은 필드명 · 다른 의미:** `handover`가 출발회차 운영인계(`GuideOperationPlan.handover`)와 공유상품 권한 인계(`ReservationSource.handoverAt`)에 함께 쓰입니다.
2. **같은 화면 동시 노출:** 예약 상세의 운영배정 카드는 가이드 상태 "운영인계완료"를 보여 줍니다. 같은 화면의 운영관리 카드는 "운영인계 완료"(권한 이전)를 보여 줍니다(`ReservationSource.tsx`). 띄어쓰기만 다른 Label이 서로 다른 뜻입니다.
3. **정산 조건 오해:** 정산의 "운영인계 완료" 확인 항목(`settlement-data.ts`)은 공유상품 권한 이전을 뜻합니다. 가이드 운영인계로 오해할 수 있습니다.
4. **예약상태 값:** 예약상태 "운영인계"가 공유상품 권한 이전 단계라는 것을 예약 목록 필터만 봐서는 알 수 없습니다.
5. 운영현황 등 가이드 화면은 "인계완료"라는 짧은 Label을 쓰지 않습니다. 반면 예약 목록 Badge는 "인계완료"를 써서 가이드 운영인계 완료로 읽힐 수 있습니다.

### 29.3 권장 명칭 (적용 보류)

| 현재 (공유상품) | 권장 명칭 후보 | 비고 |
| --- | --- | --- |
| 운영인계 (예약상태 값) | 예약상태에서 제거 → `operatorTransfer` 기록 | 상태 분리(27장 #7)와 함께 |
| 운영인계 대기 / 완료 | 운영사 인계 대기 / 운영사 인계 완료 | |
| 인계대기 / 인계완료 (Badge) | 운영사 인계대기 / 운영사 인계완료 | 짧게 써야 하면 "운영사 인계" |
| 운영인계 (버튼 · Modal · 이력) | 운영사로 인계 / 운영관리 권한 인계 | |
| 정산 "운영인계 완료" | 운영사 인계 완료 | 가이드 운영종료 확인과 별도 항목 |

가이드 운영 쪽 "운영인계"는 유지합니다.

### 29.4 변경 시 영향 화면 · 파일

| 화면 | 파일 · 위치 | 현재 문구 · 로직 |
| --- | --- | --- |
| 예약 목록 | `app/reservations/page.tsx` (`ReservationOperationStageBadge compact`) | 인계대기 / 인계완료 Badge |
| 예약 상세 | `app/reservations/[id]/page.tsx` (운영인계 Modal · 버튼), `components/reservations/ReservationSource.tsx` (운영관리 카드 · 권한 안내 · 운영배정 카드) | "운영관리 권한을 공급여행사로 인계하시겠습니까?", 운영인계 대기/완료 |
| 예약 수정 | `app/reservations/[id]/edit/page.tsx`, `lib/admin/reservation-permission.ts` (`ACTION_ONLY_STATUSES`) | 예약상태 "운영인계" 선택 제한 |
| 예약 데이터 · 이력 | `lib/admin/reservations-data.ts` (`RESERVE_EDIT_STATUS_OPTIONS`, `operation_handover` 이력 Label, `handoverReservation`) | 운영인계 |
| 권한 판단 | `lib/admin/reservation-permission.ts` (`OPERATOR_MANAGED_STATUSES`, `isOperationHandedOver`, `getReservationOperationStage`, `getReservationEditOwnerName`) | "운영인계" 상태값 비교 — **문구 변경 시 로직 영향** |
| 상품 공유설정 | `app/products/[code]/share/page.tsx` | 인계 안내 문구 |
| 정산 | `lib/admin/settlement-data.ts` (확인 항목 "운영인계 완료"), `components/settlements/SettlementDocumentParts.tsx`, `app/settlements/**` | 정산 확정 조건 |

> 주의: 공유상품 쪽은 한글 Label을 **상태값으로 직접 비교**합니다(`reserveStatus === "운영인계"`). 그래서 문구만 바꾸면 권한 판단 로직이 깨집니다. 명칭 변경은 상태값 코드 분리(27장 #7, #11)와 함께 진행해야 합니다.

---

## 30. 확정 결정사항 · 다음 단계 결정 필요사항

### 30.1 확정 결정사항 (이번 문서에 반영)

1. 상품 원본 상세는 [상품정보] 읽기전용 Modal을 유지하고, 상품 상세 페이지는 만들지 않습니다.
2. `DEP-YYYYMMDD-NN` Prototype key는 유지합니다. 목표 구조는 불변 `departureId`와 표시용 `departureCode`로 분리합니다.
3. 가이드 "운영인계"는 유지합니다. 공유상품 "인계완료"는 용어 충돌로 기록하고(29장), 화면 문구는 변경하지 않습니다.
4. 탑승지 그룹은 상품 단위이며, 상품코드 기준 그룹 조회는 오류가 아닙니다.

### 30.2 다음 단계 결정 필요사항

1. 운영준비 5항목 기준: 현재 구현(호차 · 가이드 · 탑승지 · 고객 · 운영인계)과 후보안(호차 · 차량/기사 · 가이드 · 탑승지 · 고객) 중 무엇을 표준으로 할지
2. 운영인계 후 예약 추가 · 취소 시 인계를 자동 해제할지, 경고만 할지
3. "운영중" 진입 기준: 첫 탑승체크(현재) 또는 별도 "운영 시작" Action
4. 상품 일정 변경을 이미 생성된 출발회차에 반영하는 방식
5. 출발회차 URL에 `departureCode`와 `departureId` 중 무엇을 쓸지
6. 공유상품 "운영인계" 명칭 변경 시점과 예약상태 코드 분리 순서
7. 운영 재오픈 · 관리자 확인 취소 권한과 이력 정책
8. SAMPLE 시드 출발회차의 예약 상태 반영 여부. Prototype 단계에서 맞출지, 실제 연동 때 해결할지
9. 상품 판매 상태를 enum으로 바꿀지(현재 visible · soldout boolean)
