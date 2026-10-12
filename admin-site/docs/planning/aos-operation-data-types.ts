/**
 * AOS 출발회차 운영 데이터 모델 — 목표 TypeScript 타입 (참고용)
 *
 * - 설계 문서 `aos-operation-data-model.md`의 Entity · 상태값 · 관계를 타입으로 옮긴 참고 자료입니다.
 * - 실행 코드에서 import 하지 않으며 화면 · Mock 데이터와 연결되어 있지 않습니다.
 * - DB 테이블 · API 스펙이 아닙니다. 실제 DB/API 설계 시 출발점으로만 사용합니다.
 * - 상태값은 저장용 코드(영문 대문자)와 화면 표시용 Label을 분리합니다. 현재 Prototype은 한글 Label을 값으로 사용합니다.
 */

/* ================================================================ 공통 */

/** 내부 식별자. 생성 후 변경하지 않으며 화면 표시 · 검색에는 Code를 사용합니다. */
type Id<Brand extends string> = string & { readonly __entity: Brand };

export type ProductId = Id<"Product">;
export type DepartureId = Id<"Departure">;
export type ReservationId = Id<"Reservation">;
export type PassengerId = Id<"Passenger">;
export type BoardingGroupId = Id<"BoardingGroup">;
export type BoardingPointId = Id<"BoardingPoint">;
export type BoardingSegmentId = Id<"BoardingSegment">;
export type VehicleOperationId = Id<"VehicleOperation">;
export type VehicleMasterId = Id<"VehicleMaster">;
export type GuideId = Id<"Guide">;
export type StaffId = Id<"Staff">;
export type GuideAssignmentId = Id<"GuideAssignment">;
export type PassengerOperationAssignmentId = Id<"PassengerOperationAssignment">;
export type BoardingRecordId = Id<"BoardingRecord">;
export type ProductScheduleId = Id<"ProductSchedule">;
export type ScheduleOperationId = Id<"ScheduleOperation">;
export type MessageCampaignId = Id<"MessageCampaign">;
export type MessageRecipientId = Id<"MessageRecipient">;
export type MessageResultId = Id<"MessageResult">;
export type KakaoRoomId = Id<"KakaoRoom">;
export type OperationNoteId = Id<"OperationNote">;
export type FollowUpId = Id<"FollowUp">;
export type AgencyId = Id<"Agency">;
export type SellerId = Id<"Seller">;

/** YYYY-MM-DD */
export type DateString = string;
/** HH:mm (출발일 기준 현지시각) */
export type TimeString = string;
/** ISO 8601 (예: 2026-10-17T07:40:00+09:00). 현재 Prototype은 "YYYY-MM-DD HH:mm" 문자열을 사용합니다. */
export type DateTimeString = string;
/** 숫자만 남긴 정규화 전화번호 (예: 01000005678). 연락처 중복 판단 기준입니다. */
export type NormalizedPhone = string;

/** 처리자. 직원(Staff) 또는 가이드(Guide)가 기록합니다. */
export type Actor = {
  actorType: "STAFF" | "GUIDE" | "SYSTEM";
  actorId: string;
  /** 기록 시점 이름 (이름이 바뀌어도 이력은 유지) */
  actorName: string;
};

/** 생성 · 수정 정보 */
export type AuditFields = {
  createdAt: DateTimeString;
  createdBy: Actor;
  updatedAt?: DateTimeString;
  updatedBy?: Actor;
};

/* ================================================================ Product */

/** 판매 상태. 현재 Prototype은 visible · soldout boolean으로 표현합니다. (결정 필요) */
export type ProductStatus = "DRAFT" | "ON_SALE" | "SALE_STOPPED" | "ARCHIVED";

/** 상품 원본. 출발일별 운영 데이터(호차 · 가이드 · 탑승 등)는 갖지 않습니다. */
export type Product = AuditFields & {
  id: ProductId;
  /** 표시 · 검색용 상품코드 (예: GC-WINE). 변경 가능성을 고려해 관계는 id로 연결합니다. */
  productCode: string;
  productName: string;
  status: ProductStatus;
  /** 여행일수 (당일 = 1). 다일정 출발회차의 종료일 계산에 사용합니다. */
  tripDays: number;
  /** 공급(운영)여행사. 자사 상품이면 자사 Agency */
  supplierAgencyId: AgencyId;
};

/* ================================================================ Departure */

/** 출발 확정 여부. 운영 진행단계(OperationPhase)와는 별도입니다. */
export type DepartureStatus = "SCHEDULED" | "CONFIRMED" | "CANCELLED";

/** 카카오 안내방 운영방식 (출발회차 단위 설정) */
export type KakaoRoomMode = "ALL" | "VEHICLE";

/** 상품의 특정 출발일 운영 단위. Product 1 : N Departure */
export type Departure = AuditFields & {
  /** 불변 내부 식별자. 예약 추가 · 정렬 변경 · 출발일 정정으로 바뀌지 않습니다. */
  id: DepartureId;
  /** 표시 · 검색용 코드 (예: GC-WINE-20261017-01). 유일해야 하지만 관계 키로 쓰지 않습니다. */
  departureCode: string;
  productId: ProductId;
  departureDate: DateString;
  /** 대표 출발시각. 미지정 시 첫 탑승지 집결시각으로 표시합니다. */
  departureTime?: TimeString;
  /** 종료일 (다일정 상품). 미지정 시 departureDate + Product.tripDays - 1 */
  endDate?: DateString;
  departureStatus: DepartureStatus;
  /** 운영인계 기록. null이면 운영배정 단계입니다. */
  handover: OperationHandover | null;
  /** 첫 현장 기록 시각. 현재는 첫 탑승체크로 파생하며 저장 여부는 결정 필요입니다. */
  operationStartedAt?: DateTimeString;
  kakaoRoomMode: KakaoRoomMode;
};

/** 가이드 운영 시작 전 운영 담당자가 확정하는 운영인계. (공유상품 "운영관리 권한 인계"와 다른 개념) */
export type OperationHandover = {
  handedOverAt: DateTimeString;
  handedOverBy: Actor;
  /** 인계 시점 확인값 (선택 항목 미입력 등 추적용) */
  checksSnapshot?: Partial<Record<HandoverCheckKey, boolean>>;
};

/* ================================================================ Reservation */

/** 예약상태. 예약마감 · 운영사 인계 · 행사완료는 별도 필드/파생값으로 분리합니다. */
export type ReservationStatus = "RECEIVED" | "CONFIRMED" | "WAITLISTED" | "CANCEL_REQUESTED" | "CANCELLED";

export type PaymentStatus = "UNPAID" | "PENDING" | "PARTIAL" | "PAID" | "REFUND_IN_PROGRESS" | "REFUNDED";

export type ReservationSourceType = "DIRECT" | "AFFILIATE" | "SELLER";

export type Reservation = AuditFields & {
  id: ReservationId;
  /** 표시 · 검색용 예약번호 (예: RSV-20261017-0001) */
  reservationNo: string;
  departureId: DepartureId;
  /** 예약 연락 주체. 대표 탑승객과 같은 사람이라는 보장이 없습니다. */
  bookerName: string;
  bookerPhone: string;
  bookerEmail?: string;
  reservationStatus: ReservationStatus;
  paymentStatus: PaymentStatus;
  reservationSource: ReservationSource;
  /** 예약자가 선택한 희망 탑승지. 실제 운영 탑승지는 PassengerOperationAssignment에서 관리합니다. */
  requestedBoardingPointId?: BoardingPointId;
  amounts: ReservationAmounts;
  /** 예약마감 (판매 마감) 기록 */
  salesClosedAt?: DateTimeString;
  salesClosedBy?: Actor;
  /** 공유상품 운영관리 권한 이전 기록 (현재 UI 용어: 운영인계 / 인계완료) */
  operatorTransfer?: OperatorTransfer;
  cancellation?: ReservationCancellation;
};

/** 금액 의미를 섞지 않습니다. 미수금은 저장하지 않고 파생합니다. */
export type ReservationAmounts = {
  productAmount: number;
  optionAmount: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  refundAmount: number;
};

export type ReservationSource = {
  sourceType: ReservationSourceType;
  sellingAgencyId?: AgencyId;
  supplierAgencyId?: AgencyId;
  sellerId?: SellerId;
  /** 공유상품 코드 · 원본 상품코드 (표시용) */
  sharedProductCode?: string;
  originalProductCode?: string;
};

/** 공유상품: 판매여행사 → 공급(운영)여행사 운영관리 권한 이전. 가이드 운영인계(OperationHandover)와 별개입니다. */
export type OperatorTransfer = {
  transferredAt: DateTimeString;
  transferredBy: Actor;
  fromAgencyId: AgencyId;
  toAgencyId: AgencyId;
};

export type ReservationCancellation = {
  cancelType: "PARTIAL" | "FULL";
  requestedAt: DateTimeString;
  completedAt?: DateTimeString;
  reason: string;
  /** 부분취소 시 취소된 탑승객 */
  cancelledPassengerIds: PassengerId[];
};

/* ================================================================ Passenger */

export type PassengerAgeType = "ADULT" | "CHILD" | "INFANT";
/** 대표 탑승객 / 동행자. 예약자(booker)와 별개입니다. */
export type PassengerRole = "REPRESENTATIVE" | "COMPANION";
/** 부분취소 시 탑승객 단위로 취소 처리합니다. 탑승상태(BoardingStatus)와 별개입니다. */
export type PassengerStatus = "ACTIVE" | "CANCELLED";

export type Passenger = AuditFields & {
  id: PassengerId;
  reservationId: ReservationId;
  name: string;
  ageType: PassengerAgeType;
  role: PassengerRole;
  /** 탑승객 개인 연락처. 없으면 예약 연락처(bookerPhone)로 안내합니다. */
  phone?: string;
  passengerStatus: PassengerStatus;
  sortOrder: number;
  /** 고객 요청 · 특이사항 (예약 단계 입력값) */
  requestNotes?: string[];
};

/* ================================================================ BoardingGroup / BoardingPoint */

/** 상품 단위 탑승지 그룹. Product 1 : N BoardingGroup */
export type BoardingGroup = {
  id: BoardingGroupId;
  productId: ProductId;
  name: string;
  sortOrder: number;
  active: boolean;
};

/** BoardingGroup 1 : N BoardingPoint. 같은 장소라도 그룹이 다르면 별도 id입니다. */
export type BoardingPoint = {
  id: BoardingPointId;
  boardingGroupId: BoardingGroupId;
  name: string;
  sortOrder: number;
  /** 기본 집결시각 (출발회차별 시각이 없을 때 사용) */
  defaultMeetingTime?: TimeString;
  meetingDescription?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  memo?: string;
  active: boolean;
};

/** 출발회차 · 호차별 탑승지 집결시각. 현재는 3곳(탑승지 원본 · 출발 시드 · 일정 시드)에 흩어져 있습니다. */
export type DepartureBoardingTime = {
  departureId: DepartureId;
  boardingPointId: BoardingPointId;
  /** null이면 출발회차 전체 공통 */
  vehicleOperationId: VehicleOperationId | null;
  meetingTime: TimeString;
};

/* ================================================================ VehicleOperation */

/** 출발회차별 호차 운영정보. 차량 원본(Vehicle Master)과 구분합니다. Departure 1 : N VehicleOperation */
export type VehicleOperation = AuditFields & {
  id: VehicleOperationId;
  departureId: DepartureId;
  /** 1호차 · 2호차 순번 (출발회차 내 유일) */
  vehicleOrder: number;
  vehicleName: string;
  vehicleTypeLabel?: string;
  /** 운영인계 후 입력 가능 */
  vehicleNumber?: string;
  capacity: number;
  /** 운영인계 후 입력 가능 */
  driverName?: string;
  driverPhone?: string;
  /** 상품의 BoardingGroup 중 이 호차가 사용할 그룹 */
  boardingGroupId: BoardingGroupId | null;
  /** 추후 차량 원본 연결 */
  vehicleMasterId?: VehicleMasterId | null;
};

/* ================================================================ Guide / GuideAssignment */

/** 가이드 원본. 직원(Staff) 또는 외부 프리랜서 가이드일 수 있습니다. */
export type Guide = {
  id: GuideId;
  name: string;
  phone: string;
  staffId?: StaffId | null;
  active: boolean;
};

export type GuideRole = "CHIEF" | "VEHICLE_GUIDE";

/**
 * 출발회차 가이드 배정
 * - CHIEF: 출발회차당 1명 (vehicleOperationId = null)
 * - VEHICLE_GUIDE: 호차당 1명. 같은 가이드가 총괄과 호차 담당을 겸할 수 있습니다.
 */
export type GuideAssignment = AuditFields & {
  id: GuideAssignmentId;
  departureId: DepartureId;
  vehicleOperationId: VehicleOperationId | null;
  guideId: GuideId;
  role: GuideRole;
};

/* ================================================================ Passenger 운영배정 */

/** 탑승 구간 (가는편 · 오는편 등). 구간이 하나면 DEFAULT 1개만 둡니다. */
export type BoardingSegment = {
  id: BoardingSegmentId;
  departureId: DepartureId;
  /** DEFAULT · OUTBOUND · RETURN 등 출발회차 내 유일 키 */
  segmentKey: string;
  label: string;
  sortOrder: number;
  /** true면 배정 탑승지 기준으로 체크 (첫 구간) */
  usesBoardingPoint: boolean;
};

/**
 * 탑승객 운영배정 (호차 · 탑승지 · 좌석)
 * - 저장은 탑승객 단위입니다. 예약 단위 일괄배정은 화면 Action이며 결과는 탑승객별 행으로 저장합니다.
 * - 호차를 바꾸면 seatNumber는 초기화하고, 새 호차 그룹에 없는 탑승지는 해제합니다.
 */
export type PassengerOperationAssignment = AuditFields & {
  id: PassengerOperationAssignmentId;
  departureId: DepartureId;
  passengerId: PassengerId;
  /** 기본 배정은 DEFAULT 구간. 구간별 다른 호차가 필요할 때만 추가 행 */
  segmentId: BoardingSegmentId;
  vehicleOperationId: VehicleOperationId | null;
  /** 예정 탑승지 */
  boardingPointId: BoardingPointId | null;
  seatNumber: number | null;
};

/* ================================================================ Boarding */

/** 탑승상태. 예약상태와 분리합니다. 탑승확인 취소는 상태가 아니라 BOARDED → UNCONFIRMED Action입니다. */
export type BoardingStatus = "UNCONFIRMED" | "BOARDED" | "NO_SHOW";

/** 이전 구간 미탑승으로 이후 구간에서 제외되는 표시상태 (저장하지 않음) */
export type BoardingDisplayStatus = BoardingStatus | "EXCLUDED";

export type NoShowReason =
  "CUSTOMER_CANCELLED_ATTENDANCE" | "UNREACHABLE" | "NOT_ARRIVED" | "OTHER_BOARDING_POINT" | "OTHER";

/** 탑승객 × 구간 1건 */
export type BoardingRecord = {
  id: BoardingRecordId;
  departureId: DepartureId;
  passengerId: PassengerId;
  segmentId: BoardingSegmentId;
  status: BoardingStatus;
  /** NO_SHOW일 때만 사용 */
  noShowReason?: NoShowReason;
  /** 예정 탑승지와 다른 곳에서 탑승한 경우 실제 탑승지 (BOARDED) */
  actualBoardingPointId?: BoardingPointId | null;
  memo?: string;
  recordedAt: DateTimeString;
  recordedBy: Actor;
};

/* ================================================================ Schedule */

export type ScheduleKind = "MEETING" | "DEPARTURE" | "VISIT";

/** 상품 일정표 원본 (계획). 상품 단위 */
export type ProductSchedule = {
  id: ProductScheduleId;
  productId: ProductId;
  /** 다일정 상품의 일차 (당일 = 1) */
  dayNo: number;
  sortOrder: number;
  title: string;
  place: string;
  kind: ScheduleKind;
  plannedArrivalTime?: TimeString;
  plannedDepartureTime?: TimeString;
  freeMinutes?: number;
  meetingTime?: TimeString;
  meetingPlace?: string;
  moveMinutes?: number;
  /** 탑승체크 구간 연결 (DEFAULT · RETURN 등) */
  boardingSegmentKey?: string;
};

export type ScheduleStatus = "PLANNED" | "IN_PROGRESS" | "COMPLETED";

/**
 * 출발회차 × 호차별 일정 운영 기록
 * - 예정시간(planned*)은 ProductSchedule 복사본이며 현장에서 바꾸지 않습니다.
 * - 운영시간(operational*)은 현장 변경값, 실제시간(actual*)은 확인 시각입니다.
 * - 지연(분)은 저장하지 않고 파생합니다.
 */
export type ScheduleOperation = {
  id: ScheduleOperationId;
  departureId: DepartureId;
  vehicleOperationId: VehicleOperationId;
  /** 출발회차 전용 일정이면 null */
  productScheduleId: ProductScheduleId | null;
  sortOrder: number;
  title: string;
  place: string;
  kind: ScheduleKind;
  plannedArrivalTime?: TimeString;
  plannedDepartureTime?: TimeString;
  operationalArrivalTime?: TimeString;
  operationalDepartureTime?: TimeString;
  actualArrivalTime?: DateTimeString;
  actualDepartureTime?: DateTimeString;
  freeStartedAt?: DateTimeString;
  meetingTime?: TimeString;
  meetingPlace?: string;
  status: ScheduleStatus;
  memo?: string;
};

/* ================================================================ Customer Communication */

export type MessageChannel = "ALIMTALK" | "SMS_LMS";

/** 고객 안내 발송 1회 */
export type MessageCampaign = {
  id: MessageCampaignId;
  departureId: DepartureId;
  templateKey: string;
  templateLabel: string;
  /** 변수 치환 전 본문 */
  bodyTemplate: string;
  /** 알림톡 실패 시 SMS/LMS 대체발송 */
  fallbackEnabled: boolean;
  /** 대상 범위 (표시 · 재조회용) */
  targetScope: {
    vehicleOperationIds: VehicleOperationId[];
    boardingPointIds: BoardingPointId[];
    passengerIds: PassengerId[];
    includeCompanionPhones: boolean;
  };
  /** 카카오 안내방 참여 안내인 경우 */
  kakaoRoomId?: KakaoRoomId;
  /** 실패건 재발송이면 원 발송 */
  retryOfCampaignId?: MessageCampaignId;
  sentAt: DateTimeString;
  sentBy: Actor;
};

/** 실제 발송 단위. 같은 번호는 1건으로 묶습니다. */
export type MessageRecipient = {
  id: MessageRecipientId;
  campaignId: MessageCampaignId;
  phone: NormalizedPhone;
  recipientName: string;
  /** 이 번호로 함께 안내된 탑승객 */
  passengerIds: PassengerId[];
  /** 대표 연락처로 동행자를 함께 안내한 경우 true */
  viaRepresentative: boolean;
  /** 변수 치환 후 본문 */
  renderedBody: string;
};

export type MessageResultStatus = "SUCCESS" | "FAILED";

/** 채널별 발송결과. 알림톡 실패 → SMS 대체발송이면 2건입니다. */
export type MessageResult = {
  id: MessageResultId;
  recipientId: MessageRecipientId;
  channel: MessageChannel;
  status: MessageResultStatus;
  failureReason?: string;
  resultAt: DateTimeString;
};

/** 메시지 변수와 원천 데이터 */
export type MessageVariableSource = {
  "{고객명}": "MessageRecipient.recipientName";
  "{상품명}": "Product.productName";
  "{출발일}": "Departure.departureDate";
  "{탑승지}": "PassengerOperationAssignment.boardingPointId → BoardingPoint.name";
  "{호차}": "PassengerOperationAssignment.vehicleOperationId → VehicleOperation.vehicleName";
  "{가이드명}": "GuideAssignment(VEHICLE_GUIDE → CHIEF) → Guide.name";
  "{가이드연락처}": "GuideAssignment(VEHICLE_GUIDE → CHIEF) → Guide.phone";
  "{안내방링크}": "KakaoRoom.roomUrl";
};

/* ================================================================ Kakao 안내방 */

export type KakaoRoomTargetType = "ALL" | "VEHICLE";
export type KakaoRoomActiveStatus = "ACTIVE" | "INACTIVE";
/** 참여 안내 발송 현황 (MessageCampaign에서 파생). 실제 참여 여부 · 참여인원은 확인할 수 없어 정의하지 않습니다. */
export type KakaoNoticeStatus = "NOT_SENT" | "PARTIAL" | "SENT";

export type KakaoRoom = AuditFields & {
  id: KakaoRoomId;
  departureId: DepartureId;
  targetType: KakaoRoomTargetType;
  /** targetType = VEHICLE일 때만 */
  vehicleOperationId: VehicleOperationId | null;
  roomName: string;
  roomUrl: string;
  activeStatus: KakaoRoomActiveStatus;
};

/* ================================================================ OperationNote */

export type OperationNoteCategory =
  | "GENERAL"
  | "CUSTOMER"
  | "SCHEDULE"
  | "LOST_ITEM"
  | "VEHICLE"
  | "RESTAURANT_ATTRACTION"
  | "COMPLAINT"
  | "ACCIDENT_SAFETY"
  | "OTHER";

export type OperationNoteImportance = "NORMAL" | "NEEDS_CHECK" | "IMPORTANT";

export type OperationNoteStatus = "RECORDED" | "WAITING_CONFIRM" | "CONFIRMED" | "IN_PROGRESS" | "RESOLVED";

/** 구분별 추가 입력값 */
export type OperationNoteDetail = {
  vehicleIssue?: string;
  lostItem?: string;
  lostFoundAt?: string;
  lostKeeper?: string;
  lostState?: string;
  place?: string;
  action?: string;
  followUpNote?: string;
  plannedTime?: TimeString;
  changedTime?: TimeString;
  delayReason?: string;
};

export type OperationNoteAttachment = {
  fileName: string;
  fileUrl?: string;
};

/** 가이드 현장 운영기록. 고객 안내(Communication)와 별개이며 원본은 관리자 검토 후에도 덮어쓰지 않습니다. */
export type OperationNote = AuditFields & {
  id: OperationNoteId;
  departureId: DepartureId;
  /** null이면 전체 호차 */
  vehicleOperationId: VehicleOperationId | null;
  scheduleOperationId: ScheduleOperationId | null;
  category: OperationNoteCategory;
  importance: OperationNoteImportance;
  title: string;
  content: string;
  /** 발생일시 (작성시각과 별개). 다일정 상품을 위해 날짜를 포함합니다. */
  occurredAt: DateTimeString;
  adminReviewRequired: boolean;
  processingStatus: OperationNoteStatus;
  detail: OperationNoteDetail;
  attachments: OperationNoteAttachment[];
  /** 삭제 대신 기록 취소 */
  canceledAt?: DateTimeString;
  canceledBy?: Actor;
};

/** OperationNote N : M Passenger */
export type OperationNotePassenger = {
  operationNoteId: OperationNoteId;
  passengerId: PassengerId;
};

/* ================================================================ Closing / Review / FollowUp */

/** 운영종료 상태. READY_TO_CLOSE는 체크 진행 · 일정 완료로 파생 가능 (저장 여부 결정 필요) */
export type OperationClosingStatus = "IN_OPERATION" | "READY_TO_CLOSE" | "CLOSED";

export type ClosingCheckKey = "BOARDING" | "NO_SHOW" | "SCHEDULE" | "NOTES" | "UNRESOLVED";

/** 운영종료 시점 집계 (이후 원본 데이터가 바뀌어도 보고 기준값 유지) */
export type OperationClosingSnapshot = {
  passengerCount: number;
  boardedCount: number;
  noShowCount: number;
  scheduleCompleted: number;
  scheduleTotal: number;
  noteCount: number;
  unresolvedNoteCount: number;
};

/** 가이드 운영종료 (Departure 1 : 1) */
export type OperationClosing = {
  departureId: DepartureId;
  closingStatus: OperationClosingStatus;
  checks: Record<ClosingCheckKey, boolean>;
  finalGuideMemo: string;
  adminHandoffMemo: string;
  closedAt?: DateTimeString;
  closedBy?: Actor;
  snapshot?: OperationClosingSnapshot;
};

export type OperationReviewStatus = "PENDING" | "COMPLETED";

export type ReviewCheckKey = "BOARDING" | "NO_SHOW" | "SCHEDULE" | "NOTES" | "IMPORTANT" | "UNRESOLVED" | "ADMIN_NOTE";

/** 관리자 운영결과 확인 (Departure 1 : 1). 운영종료 후에만 생성합니다. */
export type OperationReview = {
  departureId: DepartureId;
  reviewStatus: OperationReviewStatus;
  checks: Record<ReviewCheckKey, boolean>;
  /** 확인 처리한 중요 이슈 */
  confirmedNoteIds: OperationNoteId[];
  /** 기록별 후속조치 필요 여부 */
  followUpNeeds: Partial<Record<OperationNoteId, "NEEDED" | "NOT_NEEDED">>;
  reviewMemo: string;
  reviewedAt?: DateTimeString;
  reviewedBy?: Actor;
};

export type FollowUpType =
  | "CUSTOMER_CHECK"
  | "LOST_ITEM"
  | "VEHICLE_COMPANY"
  | "RESTAURANT"
  | "ATTRACTION"
  | "GUIDE"
  | "REFUND_COMPENSATION_REVIEW"
  | "COMPLAINT_CHECK"
  | "SAFETY"
  | "OTHER";

/** 관리자 후속조치 상태. 관리자 확인(OperationReview)과 독립적입니다. */
export type FollowUpStatus = "WAITING" | "IN_PROGRESS" | "COMPLETED" | "ON_HOLD";

export type FollowUpLog = {
  at: DateTimeString;
  by: Actor;
  text: string;
  status?: FollowUpStatus;
};

export type FollowUp = AuditFields & {
  id: FollowUpId;
  departureId: DepartureId;
  /** 관련 운영기록 (없으면 운영결과 전체 관련) */
  operationNoteId: OperationNoteId | null;
  type: FollowUpType;
  assigneeStaffId: StaffId | null;
  dueDate?: DateString;
  content: string;
  status: FollowUpStatus;
  memo: string;
  logs: FollowUpLog[];
};

/* ================================================================ 파생 상태 (저장하지 않음) */

/** 운영 진행단계: closing.closedAt → 운영종료, 현장기록 존재 → 운영중, handover → 운영인계, 그 외 운영배정 */
export type OperationPhase = "ASSIGNING" | "HANDED_OVER" | "IN_OPERATION" | "CLOSED";

/** 고객 배정 진행상태 (운영인계 여부와 분리) */
export type AssignmentProgress = "NOT_ASSIGNED" | "PARTIALLY_ASSIGNED" | "ASSIGNED";

/** 탑승객 탑승지 배정 확인 상태 */
export type PassengerPointStatus = "PENDING_VEHICLE" | "NO_GROUP" | "MISSING" | "NEEDS_CHECK" | "OK";

/** 예약의 운영 대상 여부 */
export type OperationEligibility = "ELIGIBLE" | "CAUTION" | "PENDING" | "EXCLUDED";

/** 운영인계 조건 키. required = 인계 차단, deferrable = 인계 후 입력 가능 */
export type HandoverCheckKey =
  | "VEHICLES"
  | "UNASSIGNED"
  | "BOARDING_GROUPS"
  | "BOARDING_POINTS"
  | "CHIEF_GUIDE"
  | "VEHICLE_GUIDES"
  | "CAPACITY_SEAT"
  | "VEHICLE_NUMBER"
  | "DRIVER";

/** 출발회차 운영 요약 (목록 · 마스터 화면 표시값) */
export type DepartureOperationSummary = {
  departureId: DepartureId;
  phase: OperationPhase;
  reviewStatus: OperationReviewStatus | null;
  /** 운영 대상 예약 · 인원 (CANCELLED 제외) */
  reservationCount: number;
  passengerCount: number;
  /** 정규화 전화번호 중복 제거 후 연락 대상 수 */
  contactRecipientCount: number;
  vehicleCount: number;
  totalCapacity: number;
  unassignedCount: number;
  pointIssueCount: number;
  boardedCount: number;
  noShowCount: number;
  unconfirmedCount: number;
  delayedScheduleCount: number;
  unresolvedNoteCount: number;
  openFollowUpCount: number;
  overdueFollowUpCount: number;
  unpaidAmount: number;
};
