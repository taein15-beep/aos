/**
 * 가이드 운영 (출발상품 단위) 샘플 데이터 (SAMPLE)
 * - 고객명·연락처는 실제 고객과 무관한 더미 값이며, 연락처는 010-0000-XXXX 형식만 사용합니다.
 * - 화면에는 연락처를 마스킹해서 표시합니다.
 * - 실제 문자/알림톡/카카오 발송은 연동하지 않습니다.
 */
import type { ProductBoardingGroup } from "@/lib/admin/product-boarding-data";

/**
 * QA 테스트 기준일 (프로토타입 전용 · 실제 현재일이 아님)
 * 운영현황 D-Day 계산, 관리자 처리일, 후속조치 기한 계산이 모두 이 값을 기준으로 합니다.
 * 실제 서비스에서는 서버 현재일로 대체합니다.
 */
export const TEST_REFERENCE_DATE = "2026-10-17";

/** 운영 Workflow 처리시각 (운영인계 · 발송 · 운영종료 · 관리자 확인): TEST_REFERENCE_DATE + 현재 시:분 */
export function formatTestReferenceNow() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${TEST_REFERENCE_DATE} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

export type GuideDepartureStatus = "출발예정" | "운행중" | "행사완료" | "출발취소";

export type GuideBoardingPoint = { name: string; time: string; count: number };

export type GuideChatRoom = { registered: boolean; name?: string; joinedCount?: number };

/**
 * 탑승상태는 예약상태와 분리된 값입니다. 미탑승이어도 예약인원·예약상태는 변경하지 않습니다.
 * - unchecked: 미확인 (기본값)
 * - boarded: 탑승완료
 * - no_show: 미탑승 (예약은 유지, 실제로 탑승하지 않음)
 */
export type GuideBoardingStatus = "unchecked" | "boarded" | "no_show";

/** 이전 구간 미탑승으로 해당 구간 탑승 대상에서 제외된 경우를 포함한 화면 표시용 상태 */
export type GuideBoardingDisplayStatus = GuideBoardingStatus | "excluded";

export const GUIDE_NO_SHOW_REASONS = [
  "고객 연락됨 · 불참",
  "연락두절",
  "출발시간 미도착",
  "다른 탑승지 탑승",
  "기타",
] as const;

export type GuideNoShowReason = (typeof GUIDE_NO_SHOW_REASONS)[number];

export const GUIDE_OTHER_POINT_REASON: GuideNoShowReason = "다른 탑승지 탑승";

export type GuideBoardingRecord = {
  status: GuideBoardingStatus;
  reason?: GuideNoShowReason;
  memo?: string;
  /** 예약 탑승지와 다른 곳에서 탑승한 경우의 실제 탑승지 (탑승완료로 기록) */
  actualPoint?: string;
};

/**
 * 이동수단(버스·기차 등)과 무관한 이동 구간 단위 탑승확인.
 * 구간을 배열 순서대로 추가하면 관광지 이동·재탑승 등으로 확장할 수 있습니다.
 */
export type GuideBoardingSegment = {
  key: string;
  label: string;
  route: string;
  /** 예약 탑승지별로 탑승하는 구간인지 (다른 탑승지 탑승 사유 허용 여부) */
  usesReservationPoint: boolean;
  /** 이 구간에 운행하는 차량 id. 미지정 시 출발상품의 전체 차량이 운행합니다. */
  vehicleIds?: string[];
};

/** 호차와 좌석은 별도 값으로 관리합니다. ("1호차 12번" 같은 고정 문자열로 저장하지 않음) */
export type GuideSeatAssignment = { vehicleId: string; seat: number };

/** 구간별 배정이 없을 때 사용하는 기본 배정 key */
export const GUIDE_DEFAULT_ASSIGNMENT_KEY = "default";

/** 예약 데이터에 탑승지가 없을 때의 표기. 운영배정에서는 미지정으로 취급합니다. */
export const GUIDE_POINT_UNDECIDED = "탑승지 미정";

export type GuidePassenger = {
  id: string;
  name: string;
  notes?: string[];
  /** 출발 시 실제 탑승지명. 호차·좌석과 별도 값이며 빈 문자열은 미지정입니다. */
  boardingPoint: string;
  /** 구간 key별 탑승 기록. 기록이 없으면 미확인입니다. */
  boarding: Record<string, GuideBoardingRecord>;
  /**
   * 차량·좌석 배정. default + 구간 key별 배정(선택).
   * 출발·귀가 차량이 다를 경우 구간 key로 별도 배정할 수 있습니다.
   */
  assignment: Record<string, GuideSeatAssignment>;
};

export type GuideStaffRole = "lead" | "vehicle";

export const GUIDE_STAFF_ROLE_LABEL: Record<GuideStaffRole, string> = {
  lead: "총괄가이드",
  vehicle: "호차 담당가이드",
};

export type GuideStaff = { id: string; name: string; phone: string; roles: GuideStaffRole[] };

export type GuideVehicle = {
  id: string;
  name: string;
  plateNo: string;
  driverName: string;
  driverPhone: string;
  guideId: string;
  capacity: number;
  /** 상품 탑승지 설정의 탑승지 그룹 id. 빈 문자열은 미선택입니다. 여러 호차가 같은 그룹을 사용할 수 있습니다. */
  boardingGroupId: string;
};

export const GUIDE_BOARDING_STATUS_META: Record<
  GuideBoardingDisplayStatus,
  { label: string; symbol: string; badge: string }
> = {
  boarded: { label: "탑승완료", symbol: "●", badge: "success" },
  unchecked: { label: "미확인", symbol: "○", badge: "warn" },
  no_show: { label: "미탑승", symbol: "×", badge: "danger" },
  excluded: { label: "대상 제외", symbol: "–", badge: "gray" },
};

/** 예약 1건 = 대표예약자(passengers[0]) + 동행자. 연락처는 대표예약자 기준입니다. */
export type GuideReservationGroup = {
  id: string;
  /** 예약접수현황의 예약번호 (SAMPLE) */
  reservationCode: string;
  reservedAt: string;
  boardingPoint: string;
  phone: string;
  passengers: GuidePassenger[];
};

export type GuideDeparture = {
  key: string;
  productCode: string;
  productName: string;
  departureDate: string;
  guideName: string;
  status: GuideDepartureStatus;
  totalPeople: number;
  /** 첫 구간(출발 탑승) 기준 집계 */
  boardedCount: number;
  uncheckedCount: number;
  noShowCount: number;
  notifiedCount: number;
  noteCount: number;
  chatRoom: GuideChatRoom;
  boardingPoints: GuideBoardingPoint[];
  itinerary: string[];
  segments: GuideBoardingSegment[];
  /** 운영배정에서 지정된 가이드 풀. roles는 총괄/호차 배정 결과로 계산됩니다. */
  staff: GuideStaff[];
  leadStaffId: string;
  vehicles: GuideVehicle[];
  reservations: GuideReservationGroup[];
  handover: GuideHandover | null;
  /** 상품 탑승지 설정에 등록된 탑승지 그룹 (운영배정 데이터에서 주입) */
  boardingGroups: ProductBoardingGroup[];
};

export type GuideHandover = { at: string; by: string };

/** 운영배정 화면에서 편집하는 값. 예약 정보와 분리해 출발상품 단위로 관리합니다. */
export type GuideOperationPlan = {
  leadStaffId: string;
  vehicles: GuideVehicle[];
  /** 탑승객 id → 기본 호차/좌석. null 이면 미배정 */
  assignments: Record<string, GuideSeatAssignment | null>;
  /** 탑승객 id → 탑승지명. 기본값은 예약(대표예약자) 탑승지입니다. */
  boardingPoints: Record<string, string>;
  handover: GuideHandover | null;
};

export type GuideDepartureSeed = Omit<
  GuideDeparture,
  "totalPeople" | "boardedCount" | "uncheckedCount" | "noShowCount" | "boardingPoints" | "staff" | "boardingGroups"
> & {
  staff: Omit<GuideStaff, "roles">[];
  boardingTimes: { name: string; time: string }[];
  /** 예약 그룹별 초기 배정 차량. 목록에 없는 그룹은 미배정으로 시작합니다. */
  initialVehicleByGroup: Record<string, string>;
};

export type GuideMessageTemplate = {
  key: string;
  label: string;
  description: string;
  urgent?: boolean;
  body: string;
};

export const GUIDE_DEPARTURE_STATUS_BADGE: Record<GuideDepartureStatus, string> = {
  출발예정: "info",
  운행중: "success",
  행사완료: "gray",
  출발취소: "danger",
};

/** outbound: 출발 탑승 구간 기록. 귀가 탑승은 모두 미확인으로 시작합니다. */
const passenger = (
  id: string,
  name: string,
  outbound: GuideBoardingStatus | GuideBoardingRecord,
  notes?: string[],
): GuidePassenger => ({
  id,
  name,
  ...(notes ? { notes } : {}),
  boardingPoint: "",
  boarding: { outbound: typeof outbound === "string" ? { status: outbound } : outbound },
  assignment: {},
});

/* 운영현황 통합관리 SAMPLE 출발상품용 짧은 표기 */
const samplePassengers = (prefix: string, names: string[], outbound: GuideBoardingStatus | GuideBoardingRecord) =>
  names.map((name, index) => passenger(`${prefix}-${String(index + 1).padStart(2, "0")}`, name, outbound));

const sampleGroup = (
  id: string,
  reservationCode: string,
  reservedAt: string,
  boardingPoint: string,
  passengers: GuidePassenger[],
): GuideReservationGroup => ({
  id,
  reservationCode,
  reservedAt,
  boardingPoint,
  phone: `010-0000-${reservationCode.slice(-4)}`,
  passengers,
});

const sampleVehicle = (
  id: string,
  name: string,
  guideId: string,
  boardingGroupId: string,
  plateNo = "",
  driverName = "",
): GuideVehicle => ({
  id,
  name,
  plateNo,
  driverName,
  driverPhone: driverName ? "010-0000-2100" : "",
  guideId,
  capacity: 28,
  boardingGroupId,
});

const outboundSegment = (route: string): GuideBoardingSegment[] => [
  { key: "outbound", label: "출발 탑승", route, usesReservationPoint: true },
];

const SAMPLE_GUIDE_DEPARTURE_SEEDS: GuideDepartureSeed[] = [
  {
    key: "GC-WINE-20261017",
    productCode: "GC-WINE01",
    productName: "국악와인열차 고창 당일여행",
    departureDate: "2026-10-17",
    guideName: "장윤호",
    status: "출발예정",
    notifiedCount: 29,
    noteCount: 2,
    chatRoom: { registered: true, name: "국악와인열차 10/17 안내방", joinedCount: 27 },
    boardingTimes: [
      { name: "서울역", time: "07:40" },
      { name: "영등포역", time: "07:55" },
      { name: "수원역", time: "08:30" },
    ],
    itinerary: ["서울역", "와인열차", "고창", "선운사"],
    segments: [
      { key: "outbound", label: "출발 탑승", route: "서울역/영등포역/수원역 → 고창", usesReservationPoint: true },
      { key: "return", label: "귀가 탑승", route: "고창 → 서울역/영등포역/수원역", usesReservationPoint: false },
    ],
    staff: [
      { id: "G-01", name: "장윤호", phone: "010-0000-1001" },
      { id: "G-02", name: "홍길동", phone: "010-0000-1002" },
      { id: "G-03", name: "이수민", phone: "010-0000-1003" },
      { id: "G-04", name: "박정우", phone: "010-0000-1004" },
    ],
    leadStaffId: "G-01",
    handover: null,
    vehicles: [
      {
        id: "V-1",
        name: "1호차",
        plateNo: "12가 3456",
        driverName: "김정훈",
        driverPhone: "010-0000-2001",
        guideId: "G-01",
        capacity: 45,
        boardingGroupId: "",
      },
      {
        id: "V-2",
        name: "2호차",
        plateNo: "34나 7890",
        driverName: "박상철",
        driverPhone: "010-0000-2002",
        guideId: "G-02",
        capacity: 45,
        boardingGroupId: "",
      },
    ],
    initialVehicleByGroup: {
      "GR-01": "V-1",
      "GR-02": "V-1",
      "GR-03": "V-1",
      "GR-04": "V-1",
      "GR-08": "V-1",
      "GR-11": "V-1",
      "GR-05": "V-2",
      "GR-06": "V-2",
      "GR-07": "V-2",
      "GR-09": "V-2",
      "GR-10": "V-2",
    },
    reservations: [
      {
        id: "GR-01",
        reservationCode: "AOS-RSV-261001",
        reservedAt: "2026-09-02",
        boardingPoint: "서울역",
        phone: "010-0000-3481",
        passengers: [
          passenger("P-01", "장민호", "boarded"),
          passenger("P-02", "김영희", "boarded"),
          passenger("P-03", "장지형", "boarded"),
          passenger("P-04", "장지용", { status: "no_show", reason: "고객 연락됨 · 불참" }),
        ],
      },
      {
        id: "GR-02",
        reservationCode: "AOS-RSV-261002",
        reservedAt: "2026-09-04",
        boardingPoint: "서울역",
        phone: "010-0000-1234",
        passengers: [
          passenger("P-05", "김민준", "unchecked", [
            "앞좌석 요청",
            "휠체어 이용 (접이식 휠체어 지참, 승하차 보조 필요)",
          ]),
          passenger("P-06", "김순자", "boarded"),
        ],
      },
      {
        id: "GR-03",
        reservationCode: "AOS-RSV-261003",
        reservedAt: "2026-09-05",
        boardingPoint: "서울역",
        phone: "010-0000-9012",
        passengers: [passenger("P-07", "박지훈", "unchecked")],
      },
      {
        id: "GR-04",
        reservationCode: "AOS-RSV-261004",
        reservedAt: "2026-09-08",
        boardingPoint: "서울역",
        phone: "010-0000-2207",
        passengers: [
          passenger("P-08", "정다은", "boarded"),
          passenger("P-09", "정민재", "boarded"),
          passenger("P-10", "정서윤", "boarded"),
        ],
      },
      {
        id: "GR-05",
        reservationCode: "AOS-RSV-261005",
        reservedAt: "2026-09-10",
        boardingPoint: "서울역",
        phone: "010-0000-7316",
        passengers: [
          passenger("P-11", "최하은", "boarded", ["유아 동반 (만 3세)", "식사 관련 요청 (견과류 알레르기)"]),
          passenger("P-12", "오준혁", "boarded"),
          passenger("P-13", "오하린", "boarded"),
        ],
      },
      {
        id: "GR-06",
        reservationCode: "AOS-RSV-261006",
        reservedAt: "2026-09-11",
        boardingPoint: "서울역",
        phone: "010-0000-4420",
        passengers: [
          passenger("P-14", "한지민", "boarded"),
          passenger("P-15", "한도윤", { status: "boarded", reason: GUIDE_OTHER_POINT_REASON, actualPoint: "영등포역" }),
        ],
      },
      {
        id: "GR-07",
        reservationCode: "AOS-RSV-261007",
        reservedAt: "2026-09-13",
        boardingPoint: "서울역",
        phone: "010-0000-6153",
        passengers: [
          passenger("P-16", "윤성호", "boarded"),
          passenger("P-17", "윤미경", "boarded"),
          passenger("P-18", "윤재희", "boarded"),
        ],
      },
      {
        id: "GR-08",
        reservationCode: "AOS-RSV-261008",
        reservedAt: "2026-09-15",
        boardingPoint: "영등포역",
        phone: "010-0000-5678",
        passengers: [passenger("P-19", "이서준", "unchecked"), passenger("P-20", "이은비", "boarded")],
      },
      {
        id: "GR-09",
        reservationCode: "AOS-RSV-261009",
        reservedAt: "2026-09-18",
        boardingPoint: "영등포역",
        phone: "010-0000-8842",
        passengers: [
          passenger("P-21", "강민서", "boarded"),
          passenger("P-22", "송가은", "boarded"),
          passenger("P-23", "강도윤", "boarded"),
          passenger("P-24", "강하윤", "boarded"),
        ],
      },
      {
        id: "GR-10",
        reservationCode: "AOS-RSV-261010",
        reservedAt: "2026-09-21",
        boardingPoint: "영등포역",
        phone: "010-0000-3075",
        passengers: [passenger("P-25", "조현우", "boarded"), passenger("P-26", "조은서", "boarded")],
      },
      {
        id: "GR-11",
        reservationCode: "AOS-RSV-261011",
        reservedAt: "2026-09-24",
        boardingPoint: "수원역",
        phone: "010-0000-1968",
        passengers: [
          passenger("P-27", "임채원", "boarded"),
          passenger("P-28", "임재현", "unchecked"),
          passenger("P-29", "문소희", "boarded"),
        ],
      },
      {
        id: "GR-12",
        reservationCode: "AOS-RSV-261012",
        reservedAt: "2026-09-28",
        boardingPoint: "수원역",
        phone: "010-0000-2589",
        passengers: [passenger("P-30", "신동혁", "boarded")],
      },
      {
        id: "GR-13",
        reservationCode: "AOS-RSV-261013",
        reservedAt: "2026-10-01",
        boardingPoint: "수원역",
        phone: "010-0000-7731",
        passengers: [passenger("P-31", "서예린", "boarded"), passenger("P-32", "서지우", "boarded")],
      },
    ],
  },
  /* ---- 운영현황 통합관리 QA SAMPLE (TEST_REFERENCE_DATE 기준 · 예약번호 QA-RSV-*) ---- */
  {
    key: "OPS-NAMWON-20261017",
    productCode: "OPS-NAMWON01",
    productName: "남원 광한루 · 춘향테마파크 당일",
    departureDate: "2026-10-17",
    guideName: "김서연",
    status: "운행중",
    notifiedCount: 8,
    noteCount: 0,
    chatRoom: { registered: true, name: "남원 10/17 안내방", joinedCount: 7 },
    boardingTimes: [
      { name: "서울역", time: "07:00" },
      { name: "사당역", time: "07:20" },
    ],
    itinerary: ["서울역", "광한루원", "춘향테마파크"],
    segments: outboundSegment("서울역/사당역 → 남원"),
    staff: [
      { id: "G-31", name: "김서연", phone: "010-0000-1031" },
      { id: "G-32", name: "최민호", phone: "010-0000-1032" },
    ],
    leadStaffId: "G-31",
    handover: { at: "2026-10-16 16:30", by: "유미진" },
    vehicles: [sampleVehicle("V-1", "1호차", "G-31", "BG-N1", "56다 1203", "오상철")],
    initialVehicleByGroup: { "NW-R1": "V-1", "NW-R2": "V-1", "NW-R3": "V-1", "NW-R4": "V-1" },
    reservations: [
      sampleGroup(
        "NW-R1",
        "QA-RSV-262101",
        "2026-09-20",
        "서울역",
        samplePassengers("NW-A", ["이도현", "이수아"], "boarded"),
      ),
      sampleGroup("NW-R2", "QA-RSV-262102", "2026-09-22", "서울역", samplePassengers("NW-B", ["박서준"], "boarded")),
      sampleGroup(
        "NW-R3",
        "QA-RSV-262103",
        "2026-09-25",
        "사당역",
        samplePassengers("NW-C", ["정하늘", "정우진", "정예린"], "boarded"),
      ),
      sampleGroup(
        "NW-R4",
        "QA-RSV-262104",
        "2026-09-29",
        "사당역",
        samplePassengers("NW-D", ["한유나", "한지호"], "boarded"),
      ),
    ],
  },
  {
    key: "OPS-DAMYANG-20261017",
    productCode: "OPS-DAMYANG01",
    productName: "담양 죽녹원 · 메타세쿼이아길 당일",
    departureDate: "2026-10-17",
    guideName: "박정우",
    status: "출발예정",
    notifiedCount: 6,
    noteCount: 0,
    chatRoom: { registered: true, name: "담양 10/17 안내방", joinedCount: 5 },
    boardingTimes: [
      { name: "서울역", time: "09:00" },
      { name: "수원역", time: "09:40" },
    ],
    itinerary: ["서울역", "죽녹원", "메타세쿼이아길"],
    segments: outboundSegment("서울역/수원역 → 담양"),
    staff: [{ id: "G-41", name: "박정우", phone: "010-0000-1041" }],
    leadStaffId: "G-41",
    handover: { at: "2026-10-16 18:00", by: "유미진" },
    vehicles: [sampleVehicle("V-1", "1호차", "G-41", "BG-D1", "78라 4512", "남기수")],
    initialVehicleByGroup: { "DY-R1": "V-1", "DY-R2": "V-1", "DY-R3": "V-1" },
    reservations: [
      sampleGroup(
        "DY-R1",
        "QA-RSV-262201",
        "2026-09-18",
        "서울역",
        samplePassengers("DY-A", ["문가영", "문태오"], "unchecked"),
      ),
      sampleGroup("DY-R2", "QA-RSV-262202", "2026-09-21", "서울역", samplePassengers("DY-B", ["배수진"], "unchecked")),
      sampleGroup(
        "DY-R3",
        "QA-RSV-262203",
        "2026-09-30",
        "수원역",
        samplePassengers("DY-C", ["서하준", "서지안", "서이현"], "unchecked"),
      ),
    ],
  },
  {
    key: "OPS-JEJU-20261018",
    productCode: "OPS-JEJU01",
    productName: "제주 올레길 3박4일 힐링",
    departureDate: "2026-10-18",
    guideName: "장윤호",
    status: "출발예정",
    notifiedCount: 0,
    noteCount: 0,
    chatRoom: { registered: false, name: "", joinedCount: 0 },
    boardingTimes: [{ name: "김포공항", time: "07:30" }],
    itinerary: ["김포공항", "제주", "올레길"],
    segments: outboundSegment("김포공항 → 제주"),
    staff: [
      { id: "G-21", name: "장윤호", phone: "010-0000-1001" },
      { id: "G-22", name: "이수민", phone: "010-0000-1003" },
    ],
    leadStaffId: "G-21",
    handover: null,
    vehicles: [
      sampleVehicle("V-1", "1호차", "G-21", "BG-J1", "제주 31바 2201", "고영수"),
      sampleVehicle("V-2", "2호차", "", ""),
    ],
    initialVehicleByGroup: { "JJ-R1": "V-1", "JJ-R2": "V-1", "JJ-R3": "V-1", "JJ-R4": "V-2" },
    reservations: [
      sampleGroup(
        "JJ-R1",
        "QA-RSV-262301",
        "2026-09-10",
        "김포공항",
        samplePassengers("JJ-A", ["강지원", "강하람"], "unchecked"),
      ),
      sampleGroup(
        "JJ-R2",
        "QA-RSV-262302",
        "2026-09-12",
        "김포공항",
        samplePassengers("JJ-B", ["노은채", "노시우", "노유진"], "unchecked"),
      ),
      sampleGroup(
        "JJ-R3",
        "QA-RSV-262303",
        "2026-09-15",
        "김포공항",
        samplePassengers("JJ-C", ["백승호"], "unchecked"),
      ),
      sampleGroup(
        "JJ-R4",
        "QA-RSV-262304",
        "2026-09-19",
        "김포공항",
        samplePassengers("JJ-D", ["성다인", "성민재"], "unchecked"),
      ),
      sampleGroup(
        "JJ-R5",
        "QA-RSV-262305",
        "2026-10-05",
        "김포공항",
        samplePassengers("JJ-E", ["윤채아", "윤도겸"], "unchecked"),
      ),
    ],
  },
  {
    key: "OPS-DANYANG-20261018",
    productCode: "OPS-DANYANG01",
    productName: "단양 도담삼봉 · 패러글라이딩 당일",
    departureDate: "2026-10-18",
    guideName: "홍길동",
    status: "출발예정",
    notifiedCount: 6,
    noteCount: 0,
    chatRoom: { registered: true, name: "단양 10/18 안내방", joinedCount: 4 },
    boardingTimes: [
      { name: "잠실역", time: "07:00" },
      { name: "동서울터미널", time: "07:20" },
    ],
    itinerary: ["잠실역", "도담삼봉", "패러글라이딩"],
    segments: outboundSegment("잠실역/동서울터미널 → 단양"),
    staff: [{ id: "G-51", name: "홍길동", phone: "010-0000-1002" }],
    leadStaffId: "G-51",
    handover: { at: "2026-10-16 19:10", by: "유미진" },
    vehicles: [sampleVehicle("V-1", "1호차", "G-51", "BG-Y1", "90마 3321", "류정민")],
    initialVehicleByGroup: { "DN-R1": "V-1", "DN-R2": "V-1", "DN-R3": "V-1" },
    reservations: [
      sampleGroup(
        "DN-R1",
        "QA-RSV-262401",
        "2026-09-23",
        "잠실역",
        samplePassengers("DN-A", ["구본희", "구민서"], "unchecked"),
      ),
      sampleGroup(
        "DN-R2",
        "QA-RSV-262402",
        "2026-09-26",
        "동서울터미널",
        samplePassengers("DN-B", ["하승우", "하윤슬", "하도하"], "unchecked"),
      ),
      sampleGroup("DN-R3", "QA-RSV-262403", "2026-10-02", "잠실역", samplePassengers("DN-C", ["표지훈"], "unchecked")),
    ],
  },
  {
    key: "OPS-JEONJU-20261016",
    productCode: "OPS-JEONJU01",
    productName: "전주 한옥마을 · 남부시장 당일",
    departureDate: "2026-10-16",
    guideName: "이수민",
    status: "행사완료",
    notifiedCount: 10,
    noteCount: 3,
    chatRoom: { registered: true, name: "전주 10/16 안내방", joinedCount: 9 },
    boardingTimes: [
      { name: "서울역", time: "07:30" },
      { name: "영등포역", time: "07:50" },
    ],
    itinerary: ["서울역", "전주 한옥마을", "남부시장"],
    segments: outboundSegment("서울역/영등포역 → 전주"),
    staff: [
      { id: "G-61", name: "이수민", phone: "010-0000-1003" },
      { id: "G-62", name: "박정우", phone: "010-0000-1004" },
    ],
    leadStaffId: "G-61",
    handover: { at: "2026-10-15 17:00", by: "유미진" },
    vehicles: [
      sampleVehicle("V-1", "1호차", "G-61", "BG-E1", "11가 5501", "장동수"),
      sampleVehicle("V-2", "2호차", "G-62", "BG-E1", "22나 6602", "엄태식"),
    ],
    initialVehicleByGroup: { "JU-R1": "V-1", "JU-R2": "V-1", "JU-R3": "V-1", "JU-R4": "V-2", "JU-R5": "V-2" },
    reservations: [
      sampleGroup(
        "JU-R1",
        "QA-RSV-262501",
        "2026-09-11",
        "서울역",
        samplePassengers("JU-A", ["김도윤", "김하린"], "boarded"),
      ),
      sampleGroup(
        "JU-R2",
        "QA-RSV-262502",
        "2026-09-14",
        "서울역",
        samplePassengers("JU-B", ["이준서"], { status: "no_show", reason: "연락두절" }),
      ),
      sampleGroup(
        "JU-R3",
        "QA-RSV-262503",
        "2026-09-17",
        "영등포역",
        samplePassengers("JU-C", ["박지아", "박시현"], "boarded"),
      ),
      sampleGroup(
        "JU-R4",
        "QA-RSV-262504",
        "2026-09-20",
        "영등포역",
        samplePassengers("JU-D", ["최유찬", "최서아", "최다온"], "boarded"),
      ),
      sampleGroup(
        "JU-R5",
        "QA-RSV-262505",
        "2026-09-24",
        "서울역",
        samplePassengers("JU-E", ["정로운", "정아린"], "boarded"),
      ),
    ],
  },
  {
    key: "OPS-ANDONG-20261015",
    productCode: "OPS-ANDONG01",
    productName: "안동 하회마을 · 월영교 당일",
    departureDate: "2026-10-15",
    guideName: "홍길동",
    status: "행사완료",
    notifiedCount: 6,
    noteCount: 3,
    chatRoom: { registered: true, name: "안동 10/15 안내방", joinedCount: 6 },
    boardingTimes: [
      { name: "서울역", time: "07:00" },
      { name: "양재역", time: "07:30" },
    ],
    itinerary: ["서울역", "하회마을", "월영교"],
    segments: outboundSegment("서울역/양재역 → 안동"),
    staff: [{ id: "G-71", name: "홍길동", phone: "010-0000-1002" }],
    leadStaffId: "G-71",
    handover: { at: "2026-10-14 16:00", by: "유미진" },
    vehicles: [sampleVehicle("V-1", "1호차", "G-71", "BG-A1", "33다 7703", "변상훈")],
    initialVehicleByGroup: { "AD-R1": "V-1", "AD-R2": "V-1", "AD-R3": "V-1" },
    reservations: [
      sampleGroup(
        "AD-R1",
        "QA-RSV-262601",
        "2026-09-08",
        "서울역",
        samplePassengers("AD-A", ["송지후", "송예준"], "boarded"),
      ),
      sampleGroup("AD-R2", "QA-RSV-262602", "2026-09-13", "양재역", samplePassengers("AD-B", ["임나연"], "boarded")),
      sampleGroup(
        "AD-R3",
        "QA-RSV-262603",
        "2026-09-27",
        "서울역",
        samplePassengers("AD-C", ["황보람", "황시온", "황다은"], "boarded"),
      ),
    ],
  },
];

/** 운영배정 화면에서 저장한 값 (새로고침 시 초기화되는 프론트 Mock 저장소) */
const sessionOperationPlans: Record<string, GuideOperationPlan> = {};

function cloneOperationPlan(plan: GuideOperationPlan): GuideOperationPlan {
  return {
    ...plan,
    vehicles: plan.vehicles.map((vehicle) => ({ ...vehicle, boardingGroupId: vehicle.boardingGroupId ?? "" })),
    assignments: Object.fromEntries(
      Object.entries(plan.assignments).map(([id, value]) => [id, value ? { ...value } : null]),
    ),
    boardingPoints: { ...(plan.boardingPoints ?? {}) },
    handover: plan.handover ? { ...plan.handover } : null,
  };
}

/** 예약 탑승지(대표예약자 선택)를 동행자의 기본 탑승지로 사용합니다. */
function defaultGroupPoint(group: GuideReservationGroup) {
  return group.boardingPoint === GUIDE_POINT_UNDECIDED ? "" : group.boardingPoint;
}

/** 초기 배정: 그룹별 지정 차량에 차량별 순번으로 좌석을 부여합니다. */
function buildSeedOperationPlan(seed: GuideDepartureSeed): GuideOperationPlan {
  const seatCounter: Record<string, number> = {};
  const assignments: GuideOperationPlan["assignments"] = {};
  const boardingPoints: GuideOperationPlan["boardingPoints"] = {};
  seed.reservations.forEach((group) => {
    const vehicleId = seed.initialVehicleByGroup[group.id];
    group.passengers.forEach((item) => {
      boardingPoints[item.id] = defaultGroupPoint(group);
      if (!vehicleId) {
        assignments[item.id] = null;
        return;
      }
      seatCounter[vehicleId] = (seatCounter[vehicleId] ?? 0) + 1;
      assignments[item.id] = { vehicleId, seat: seatCounter[vehicleId] };
    });
  });
  return cloneOperationPlan({
    leadStaffId: seed.leadStaffId,
    vehicles: seed.vehicles,
    assignments,
    boardingPoints,
    handover: seed.handover,
  });
}

function buildGuideDeparture(
  { boardingTimes, initialVehicleByGroup: _initial, staff: staffPool, ...rawSeed }: GuideDepartureSeed,
  plan: GuideOperationPlan,
): GuideDeparture {
  void _initial;
  const vehicles = plan.vehicles.map((vehicle) => ({ ...vehicle }));
  const staff: GuideStaff[] = staffPool.map((item) => {
    const roles: GuideStaffRole[] = [];
    if (item.id === plan.leadStaffId) roles.push("lead");
    if (vehicles.some((vehicle) => vehicle.guideId === item.id)) roles.push("vehicle");
    return { ...item, roles };
  });
  const seed = {
    ...rawSeed,
    guideName: staff.find((item) => item.id === plan.leadStaffId)?.name ?? rawSeed.guideName,
    leadStaffId: plan.leadStaffId,
    handover: plan.handover ? { ...plan.handover } : null,
    staff,
    vehicles,
    reservations: rawSeed.reservations.map((group) => ({
      ...group,
      passengers: group.passengers.map((item) => {
        const assigned = plan.assignments[item.id];
        const assignment = { ...item.assignment };
        if (assigned) assignment[GUIDE_DEFAULT_ASSIGNMENT_KEY] = { ...assigned };
        const boardingPoint = plan.boardingPoints?.[item.id] ?? defaultGroupPoint(group);
        return { ...item, assignment, boardingPoint };
      }),
    })),
  };
  const passengers = seed.reservations.flatMap((group) => group.passengers);
  const firstSegment = summarizeGuideBoarding(passengers, seed.segments, 0);
  /** 탑승객별 지정 탑승지 기준 집계. 운영배정에서 추가된 탑승지(기본 시간표에 없는 곳)도 포함합니다. */
  const { counts: pointCounts } = countGuidePassengersByPoint(passengers);
  const extraPoints = pointCounts
    .filter(({ point }) => !boardingTimes.some((item) => item.name === point))
    .map(({ point }) => ({ name: point, time: "-" }));
  return {
    ...seed,
    boardingGroups: [],
    totalPeople: passengers.length,
    boardedCount: firstSegment.boarded,
    uncheckedCount: firstSegment.unchecked,
    noShowCount: firstSegment.noShow,
    boardingPoints: [...boardingTimes, ...extraPoints].map((point) => ({
      ...point,
      count: pointCounts.find((item) => item.point === point.name)?.count ?? 0,
    })),
  };
}

export const SAMPLE_GUIDE_DEPARTURE_KEY = SAMPLE_GUIDE_DEPARTURE_SEEDS[0].key;

function findGuideDepartureSeed(key: string) {
  return SAMPLE_GUIDE_DEPARTURE_SEEDS.find((departure) => departure.key === key) ?? null;
}

/** 가이드 운영 SAMPLE 데이터가 있는 출발회차(상품 + 출발일) 키 */
export function findGuideSampleDepartureKey(productName: string, departureDate: string) {
  return (
    SAMPLE_GUIDE_DEPARTURE_SEEDS.find(
      (seed) => seed.productName === productName && seed.departureDate === departureDate,
    )?.key ?? null
  );
}

/** 운영배정용 가이드 후보 (SAMPLE · 실제 직원 데이터 연동 전) */
export const GUIDE_SAMPLE_STAFF_POOL: Omit<GuideStaff, "roles">[] = SAMPLE_GUIDE_DEPARTURE_SEEDS[0].staff.map(
  (item) => ({
    ...item,
  }),
);

/** 저장된 배정값이 있으면 사용하고, 없으면 시드의 초기 배정을 사용합니다. */
export function getGuideOperationPlanForSeed(seed: GuideDepartureSeed) {
  return cloneOperationPlan(sessionOperationPlans[seed.key] ?? buildSeedOperationPlan(seed));
}

export function buildGuideDepartureFromSeed(seed: GuideDepartureSeed, plan?: GuideOperationPlan) {
  return buildGuideDeparture(seed, plan ?? sessionOperationPlans[seed.key] ?? buildSeedOperationPlan(seed));
}

export function saveGuideOperationPlanForKey(key: string, plan: GuideOperationPlan) {
  sessionOperationPlans[key] = cloneOperationPlan(plan);
}

export function getGuideDeparture(key: string) {
  const seed = findGuideDepartureSeed(key);
  return seed ? buildGuideDepartureFromSeed(seed) : null;
}

/** 운영배정 화면 편집 중 값으로 출발상품 데이터를 미리 계산합니다 (저장하지 않음). */
export function previewGuideDeparture(key: string, plan: GuideOperationPlan) {
  const seed = findGuideDepartureSeed(key);
  return seed ? buildGuideDeparture(seed, plan) : null;
}

export function getGuideOperationPlan(key: string) {
  const seed = findGuideDepartureSeed(key);
  return seed ? getGuideOperationPlanForSeed(seed) : null;
}

export function saveGuideOperationPlan(key: string, plan: GuideOperationPlan) {
  if (!findGuideDepartureSeed(key)) return;
  saveGuideOperationPlanForKey(key, plan);
}

/** 출발회차 SAMPLE이 참조하는 원본 상품 (상품코드 기준 · 중복 제거) */
export function getGuideSampleProducts() {
  const products = new Map<string, { code: string; name: string }>();
  SAMPLE_GUIDE_DEPARTURE_SEEDS.forEach((seed) => {
    if (!products.has(seed.productCode))
      products.set(seed.productCode, { code: seed.productCode, name: seed.productName });
  });
  return Array.from(products.values());
}

/** 예약접수현황 목록에 표시할 운영 출발상품 예약 (SAMPLE). 예약 데이터는 예약관리에서 사용합니다. */
export function getGuideTourReservationSeeds() {
  return SAMPLE_GUIDE_DEPARTURE_SEEDS.flatMap((seed) =>
    seed.reservations.map((group) => ({
      code: group.reservationCode,
      reservedAt: group.reservedAt,
      departureKey: seed.key,
      productName: seed.productName,
      departureDate: seed.departureDate,
      bookerName: group.passengers[0]?.name ?? "",
      phone: group.phone,
      boardingPoint: group.boardingPoint,
      people: group.passengers.length,
      notes: group.passengers.flatMap((item) => item.notes ?? []),
    })),
  );
}

export function getGuideOperationPath(key: string) {
  return `/reservations/departures/${encodeURIComponent(key)}/guide`;
}

export function getGuideAssignmentPath(key: string) {
  return `/reservations/departures/${encodeURIComponent(key)}/assignment`;
}

export type GuideAssignmentStatus = "미배정" | "일부배정" | "배정완료" | "운영인계완료";

export const GUIDE_ASSIGNMENT_STATUS_BADGE: Record<GuideAssignmentStatus, string> = {
  미배정: "gray",
  일부배정: "warn",
  배정완료: "info",
  운영인계완료: "success",
};

/** assigned: 호차 배정 인원, complete: 호차·탑승지 모두 지정된 인원 */
function resolveAssignmentStatus(
  complete: number,
  total: number,
  handedOver: boolean,
  assigned = complete,
): GuideAssignmentStatus {
  if (total === 0 || assigned === 0) return "미배정";
  if (complete < total) return "일부배정";
  return handedOver ? "운영인계완료" : "배정완료";
}

function isGuidePassengerAssigned(departure: GuideDeparture, item: GuidePassenger) {
  const vehicleId = item.assignment[GUIDE_DEFAULT_ASSIGNMENT_KEY]?.vehicleId;
  return Boolean(vehicleId && departure.vehicles.some((vehicle) => vehicle.id === vehicleId));
}

export function getGuidePassengerPoint(item: GuidePassenger) {
  return item.boardingPoint ?? "";
}

export function getGuidePassengerVehicle(departure: GuideDeparture, item: GuidePassenger) {
  const vehicleId = item.assignment[GUIDE_DEFAULT_ASSIGNMENT_KEY]?.vehicleId;
  return departure.vehicles.find((vehicle) => vehicle.id === vehicleId) ?? null;
}

/** 호차에 선택된 탑승지 그룹. 상품 탑승지 설정에서 삭제된 그룹이면 null 입니다. */
export function getGuideVehicleBoardingGroup(departure: GuideDeparture, vehicle: GuideVehicle | null) {
  if (!vehicle?.boardingGroupId) return null;
  return departure.boardingGroups.find((group) => group.id === vehicle.boardingGroupId) ?? null;
}

/** 탑승객이 선택할 수 있는 탑승지 = 배정 호차의 탑승지 그룹에 포함된 탑승지 (탑승 순서) */
export function getGuidePassengerPointOptions(departure: GuideDeparture, item: GuidePassenger) {
  const group = getGuideVehicleBoardingGroup(departure, getGuidePassengerVehicle(departure, item));
  return group ? group.points.map((point) => point.name) : [];
}

/**
 * 탑승지 상태
 * - pending: 호차 미배정 (호차 배정 후 판단)
 * - no_group: 배정 호차에 탑승지 그룹이 선택되지 않음
 * - missing: 탑승지 미지정
 * - check: 지정된 탑승지가 호차의 탑승지 그룹에 없음 (확인필요)
 * - ok: 정상
 */
export type GuidePassengerPointStatus = "pending" | "no_group" | "missing" | "check" | "ok";

export function getGuidePassengerPointStatus(
  departure: GuideDeparture,
  item: GuidePassenger,
): GuidePassengerPointStatus {
  const vehicle = getGuidePassengerVehicle(departure, item);
  if (!vehicle) return "pending";
  const group = getGuideVehicleBoardingGroup(departure, vehicle);
  if (!group) return "no_group";
  const point = getGuidePassengerPoint(item);
  if (!point) return "missing";
  return group.points.some((value) => value.name === point) ? "ok" : "check";
}

/** 호차와 탑승지가 모두 정상 지정되어야 운영배정 완료로 봅니다. */
function isGuidePassengerComplete(departure: GuideDeparture, item: GuidePassenger) {
  return getGuidePassengerPointStatus(departure, item) === "ok";
}

/** 지정된 탑승지명별 인원 (탑승객 순서 기준). 미지정 인원은 missing 으로 분리합니다. */
export function countGuidePassengersByPoint(passengers: GuidePassenger[]) {
  const counts: { point: string; count: number }[] = [];
  passengers.forEach((item) => {
    const point = getGuidePassengerPoint(item);
    if (!point) return;
    const found = counts.find((value) => value.point === point);
    if (found) found.count += 1;
    else counts.push({ point, count: 1 });
  });
  return { counts, missing: passengers.filter((item) => !getGuidePassengerPoint(item)).length };
}

export function getGuideOperationSummary(departure: GuideDeparture) {
  const passengers = departure.reservations.flatMap((group) => group.passengers);
  const assigned = passengers.filter((item) => isGuidePassengerAssigned(departure, item)).length;
  const complete = passengers.filter((item) => isGuidePassengerComplete(departure, item)).length;
  const pointStatuses = passengers.map((item) => getGuidePassengerPointStatus(departure, item));
  const guideIds = new Set(
    [departure.leadStaffId, ...departure.vehicles.map((vehicle) => vehicle.guideId)].filter(Boolean),
  );
  return {
    total: passengers.length,
    assigned,
    unassigned: passengers.length - assigned,
    /** 호차 배정 고객 중 탑승지 미지정 */
    pointMissing: pointStatuses.filter((status) => status === "missing").length,
    /** 호차 배정 고객 중 탑승지 확인필요 (그룹에 없는 탑승지 또는 호차 탑승지 그룹 미선택) */
    pointCheck: pointStatuses.filter((status) => status === "check" || status === "no_group").length,
    vehicleCount: departure.vehicles.length,
    guideCount: guideIds.size,
    status: resolveAssignmentStatus(complete, passengers.length, Boolean(departure.handover), assigned),
  };
}

/** 예약 1건의 운영배정 표시값. 예약상태와 별도로 계산합니다. */
export function getGuideReservationOperation(departure: GuideDeparture, reservationCode: string) {
  const group = departure.reservations.find((item) => item.reservationCode === reservationCode);
  if (!group) return null;
  const vehicleIds = Array.from(
    new Set(
      group.passengers
        .filter((item) => isGuidePassengerAssigned(departure, item))
        .map((item) => item.assignment[GUIDE_DEFAULT_ASSIGNMENT_KEY]?.vehicleId ?? ""),
    ),
  );
  const assignedVehicles = departure.vehicles.filter((vehicle) => vehicleIds.includes(vehicle.id));
  const assignedPassengers = group.passengers.filter((item) => isGuidePassengerAssigned(departure, item));
  const assigned = assignedPassengers.length;
  const vehicleCounts = assignedVehicles.map((vehicle) => ({
    vehicle,
    count: assignedPassengers.filter((item) => item.assignment[GUIDE_DEFAULT_ASSIGNMENT_KEY]?.vehicleId === vehicle.id)
      .length,
  }));
  const seats = assignedPassengers
    .map((item) => item.assignment[GUIDE_DEFAULT_ASSIGNMENT_KEY]?.seat ?? 0)
    .filter((seat) => seat > 0)
    .sort((a, b) => a - b);
  const complete = group.passengers.filter((item) => isGuidePassengerComplete(departure, item)).length;
  const pointSummary = countGuidePassengersByPoint(group.passengers);
  const pointStatuses = group.passengers.map((item) => getGuidePassengerPointStatus(departure, item));
  return {
    status: resolveAssignmentStatus(complete, group.passengers.length, Boolean(departure.handover), assigned),
    assigned,
    total: group.passengers.length,
    vehicleCounts,
    pointCounts: pointSummary.counts,
    pointMissing: pointSummary.missing,
    pointCheck: pointStatuses.filter((status) => status === "check" || status === "no_group").length,
    /** 좌석 미지정 인원은 제외. 여러 호차면 "1호차 3, 4" 형태로 표기 */
    seatLabel:
      vehicleCounts.length > 1
        ? vehicleCounts
            .map(({ vehicle }) => {
              const list = assignedPassengers
                .map((item) => item.assignment[GUIDE_DEFAULT_ASSIGNMENT_KEY])
                .filter((value) => value?.vehicleId === vehicle.id && value.seat > 0)
                .map((value) => value?.seat ?? 0)
                .sort((a, b) => a - b);
              return list.length ? `${vehicle.name} ${list.join(", ")}` : "";
            })
            .filter(Boolean)
            .join(" / ")
        : seats.join(", "),
    vehicleLabel: assignedVehicles.map((vehicle) => vehicle.name).join(" · "),
    guideLabel: Array.from(
      new Set(
        assignedVehicles
          .map((vehicle) => departure.staff.find((item) => item.id === vehicle.guideId)?.name ?? "")
          .filter(Boolean),
      ),
    ).join(" · "),
  };
}

/** required=false 항목은 미입력이어도 인계할 수 있고 인계 후에도 입력할 수 있습니다. */
export type GuideHandoverCheck = { key: string; label: string; ok: boolean; detail: string; required: boolean };

/** 차량번호·기사정보처럼 인계 후 입력해도 되는 차량 필드 */
export const GUIDE_DEFERRABLE_VEHICLE_FIELDS = ["plateNo", "driverName", "driverPhone"] as const;

export function isGuideHandoverReady(checks: GuideHandoverCheck[]) {
  return checks.every((check) => check.ok || !check.required);
}

/** 운영인계 전 확인 항목. 필수 항목을 모두 통과해야 인계할 수 있습니다. */
export function getGuideHandoverChecks(departure: GuideDeparture): GuideHandoverCheck[] {
  const summary = getGuideOperationSummary(departure);
  const passengers = departure.reservations.flatMap((group) => group.passengers);
  const noGuide = departure.vehicles.filter((vehicle) => !vehicle.guideId);
  const noBoardingGroup = departure.vehicles.filter((vehicle) => !getGuideVehicleBoardingGroup(departure, vehicle));
  const noPlate = departure.vehicles.filter((vehicle) => !vehicle.plateNo.trim());
  const noDriver = departure.vehicles.filter((vehicle) => !vehicle.driverName.trim() || !vehicle.driverPhone.trim());
  const overCapacity = departure.vehicles.filter(
    (vehicle) =>
      passengers.filter((item) => item.assignment[GUIDE_DEFAULT_ASSIGNMENT_KEY]?.vehicleId === vehicle.id).length >
      vehicle.capacity,
  );
  const seatKeys = passengers
    .map((item) => item.assignment[GUIDE_DEFAULT_ASSIGNMENT_KEY])
    .filter((value): value is GuideSeatAssignment => Boolean(value && value.seat > 0))
    .map((value) => `${value.vehicleId}:${value.seat}`);
  const duplicatedSeats = seatKeys.length - new Set(seatKeys).size;
  const names = (list: GuideVehicle[]) => list.map((vehicle) => vehicle.name).join(", ");
  const noVehicle = departure.vehicles.length === 0;
  const needVehicleLabel = "호차 등록 필요";
  return [
    {
      key: "vehicles",
      label: "운영차량 등록",
      ok: departure.vehicles.length > 0,
      required: true,
      detail: departure.vehicles.length > 0 ? `${departure.vehicles.length}대` : "등록된 호차가 없습니다.",
    },
    {
      key: "unassigned",
      label: "미배정 고객",
      ok: summary.unassigned === 0,
      required: true,
      detail: summary.unassigned === 0 ? "0명" : `미배정 고객이 ${summary.unassigned}명 있습니다.`,
    },
    {
      key: "boardingGroups",
      label: "호차별 탑승지 그룹",
      ok: departure.vehicles.length > 0 && noBoardingGroup.length === 0,
      required: true,
      detail: noVehicle
        ? needVehicleLabel
        : noBoardingGroup.length === 0
          ? "전체 선택"
          : `${names(noBoardingGroup)} 탑승지 그룹 미선택`,
    },
    {
      key: "points",
      label: "고객 탑승지",
      ok: summary.pointMissing === 0 && summary.pointCheck === 0,
      required: true,
      detail:
        summary.pointMissing === 0 && summary.pointCheck === 0
          ? "탑승지 미지정 0명"
          : [
              summary.pointMissing > 0 ? `탑승지 미지정 ${summary.pointMissing}명` : "",
              summary.pointCheck > 0 ? `확인필요 ${summary.pointCheck}명` : "",
            ]
              .filter(Boolean)
              .join(" · "),
    },
    {
      key: "lead",
      label: "총괄가이드 지정",
      ok: Boolean(departure.leadStaffId),
      required: true,
      detail: departure.leadStaffId ? departure.guideName : "총괄가이드를 지정해 주세요.",
    },
    {
      key: "guide",
      label: "호차별 담당가이드",
      ok: departure.vehicles.length > 0 && noGuide.length === 0,
      required: true,
      detail: noVehicle ? needVehicleLabel : noGuide.length === 0 ? "전체 지정" : `${names(noGuide)} 담당가이드 미지정`,
    },
    {
      key: "plate",
      label: "차량정보 (차량번호)",
      ok: departure.vehicles.length > 0 && noPlate.length === 0,
      required: false,
      detail: noVehicle
        ? needVehicleLabel
        : noPlate.length === 0
          ? "입력 완료"
          : `${names(noPlate)} 차량번호 미입력 · 인계 후 입력 가능`,
    },
    {
      key: "driver",
      label: "기사정보 (기사명·연락처)",
      ok: departure.vehicles.length > 0 && noDriver.length === 0,
      required: false,
      detail: noVehicle
        ? needVehicleLabel
        : noDriver.length === 0
          ? "입력 완료"
          : `${names(noDriver)} 기사정보 미입력 · 인계 후 입력 가능`,
    },
    {
      key: "capacity",
      label: "정원 초과 · 좌석 중복",
      ok: overCapacity.length === 0 && duplicatedSeats === 0,
      required: true,
      detail:
        overCapacity.length > 0
          ? `${names(overCapacity)} 정원 초과`
          : duplicatedSeats > 0
            ? `중복 좌석 ${duplicatedSeats}건`
            : "이상 없음",
    },
  ];
}

export function getGuideCustomersPath(key: string, status?: GuideBoardingFilter) {
  const base = `${getGuideOperationPath(key)}/customers`;
  return status && status !== "all" ? `${base}?status=${status}` : base;
}

export type GuideBoardingFilter = "all" | "boarded" | "unchecked" | "no_show" | "notes";

/** 구간별 배정이 있으면 우선 사용하고, 없으면 기본 배정을 사용합니다. */
export function getGuideAssignment(passenger: GuidePassenger, segmentKey: string): GuideSeatAssignment {
  return (
    passenger.assignment[segmentKey] ?? passenger.assignment[GUIDE_DEFAULT_ASSIGNMENT_KEY] ?? { vehicleId: "", seat: 0 }
  );
}

export function getGuideSegmentVehicles(departure: GuideDeparture, segment: GuideBoardingSegment) {
  return segment.vehicleIds
    ? departure.vehicles.filter((vehicle) => segment.vehicleIds?.includes(vehicle.id))
    : departure.vehicles;
}

export function getGuideStaff(departure: GuideDeparture, staffId: string) {
  return departure.staff.find((item) => item.id === staffId) ?? null;
}

export function getGuideLeadStaff(departure: GuideDeparture) {
  return departure.staff.find((item) => item.roles.includes("lead")) ?? null;
}

/**
 * 화면 기본 차량 선택. 총괄가이드는 전체, 호차 담당가이드는 배정 차량.
 * 실제 로그인 연동 시 로그인 사용자 id를 넘기면 됩니다.
 */
export function getGuideDefaultVehicleFilter(departure: GuideDeparture, staffId: string) {
  const staff = getGuideStaff(departure, staffId);
  if (!staff || staff.roles.includes("lead")) return "all";
  return departure.vehicles.find((vehicle) => vehicle.guideId === staffId)?.id ?? "all";
}

export function formatGuideSeat(seat: number) {
  return seat > 0 ? `${seat}번` : "미지정";
}

export function getGuideBoardingRecord(passenger: GuidePassenger, segmentKey: string): GuideBoardingRecord {
  return passenger.boarding[segmentKey] ?? { status: "unchecked" };
}

/** 이전 구간에서 미탑승으로 확정된 탑승객은 이후 구간에서 대상 제외로 표시합니다. */
export function getGuideSegmentStatus(
  passenger: GuidePassenger,
  segments: GuideBoardingSegment[],
  segmentIndex: number,
): GuideBoardingDisplayStatus {
  const excluded = segments
    .slice(0, segmentIndex)
    .some((segment) => getGuideBoardingRecord(passenger, segment.key).status === "no_show");
  if (excluded) return "excluded";
  const segment = segments[segmentIndex];
  return segment ? getGuideBoardingRecord(passenger, segment.key).status : "unchecked";
}

export type GuideBoardingSummary = ReturnType<typeof summarizeGuideBoarding>;

export function summarizeGuideBoarding(
  passengers: GuidePassenger[],
  segments: GuideBoardingSegment[],
  segmentIndex: number,
) {
  const statuses = passengers.map((item) => getGuideSegmentStatus(item, segments, segmentIndex));
  const count = (status: GuideBoardingDisplayStatus) => statuses.filter((item) => item === status).length;
  const boarded = count("boarded");
  const unchecked = count("unchecked");
  const noShow = count("no_show");
  const excluded = count("excluded");
  return {
    total: passengers.length,
    boarded,
    unchecked,
    noShow,
    excluded,
    /** 탑승 여부가 확정된 인원 (탑승완료 + 미탑승 + 대상 제외) */
    confirmed: boarded + noShow + excluded,
    complete: passengers.length > 0 && unchecked === 0,
  };
}

/** 탑승체크 화면에서 기록한 탑승상태 (세션 · SAMPLE). 새로고침하면 초기 샘플로 돌아갑니다. */
const sessionBoarding: Record<string, Record<string, Record<string, GuideBoardingRecord>>> = {};

export function saveGuideBoardingSession(key: string, groups: GuideReservationGroup[]) {
  sessionBoarding[key] = Object.fromEntries(
    groups.flatMap((group) => group.passengers.map((item) => [item.id, { ...item.boarding }])),
  );
}

/** 저장된 탑승상태를 반영하고 첫 구간 집계를 다시 계산합니다. 예약인원(totalPeople)은 변경하지 않습니다. */
export function applyGuideBoardingSession(departure: GuideDeparture): GuideDeparture {
  const saved = sessionBoarding[departure.key];
  if (!saved) return departure;
  const reservations = departure.reservations.map((group) => ({
    ...group,
    passengers: group.passengers.map((item) => (saved[item.id] ? { ...item, boarding: { ...saved[item.id] } } : item)),
  }));
  const summary = summarizeGuideBoarding(
    reservations.flatMap((group) => group.passengers),
    departure.segments,
    0,
  );
  return {
    ...departure,
    reservations,
    boardedCount: summary.boarded,
    uncheckedCount: summary.unchecked,
    noShowCount: summary.noShow,
  };
}

/** 010-0000-1234 → 010-****-1234 */
export function maskGuidePhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 8) return phone;
  return `${digits.slice(0, 3)}-****-${digits.slice(-4)}`;
}

export function getGuidePhoneHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

/** 미발송 인원은 저장하지 않고 전체 − 안내완료로 계산합니다. */
export function getGuideUnsentCount(departure: GuideDeparture) {
  return Math.max(0, departure.totalPeople - departure.notifiedCount);
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

/** YYYY-MM-DD → YYYY-MM-DD (요일). 시간대와 무관하게 동일한 결과를 냅니다. */
export function formatGuideDepartureDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return date;
  return `${date} (${WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()]})`;
}

export function buildGuideMessageTemplates(departure: GuideDeparture): GuideMessageTemplate[] {
  const firstPoint = departure.boardingPoints[0];
  const [, month, day] = departure.departureDate.split("-");
  const dateLabel = `${Number(month)}/${Number(day)}`;
  const meeting = firstPoint ? `${firstPoint.name} ${firstPoint.time}` : "집결장소";
  return [
    {
      key: "day-before",
      label: "출발 전날 안내",
      description: "집결시간·준비물 안내",
      body: `[${departure.productName}]\n내일(${dateLabel}) 여행 안내드립니다.\n집결: ${meeting}까지 도착 부탁드립니다.\n신분증과 편한 신발을 준비해 주세요.\n담당 가이드: ${departure.guideName}`,
    },
    {
      key: "meeting",
      label: "집결 안내",
      description: "현장 집결 위치 안내",
      body: `[${departure.productName}]\n지금 ${firstPoint?.name ?? "집결장소"}에서 집결 중입니다.\n도착하시면 담당 가이드 ${departure.guideName}에게 예약자 성함을 말씀해 주세요.`,
    },
    {
      key: "bus",
      label: "버스 위치",
      description: "탑승 차량 위치 안내",
      body: `[${departure.productName}]\n탑승하실 버스는 역 앞 관광버스 주차장에 있습니다.\n차량 앞 안내판(${departure.productName})을 확인해 주세요.`,
    },
    {
      key: "free-time",
      label: "자유시간 안내",
      description: "자유시간·재집결 시간",
      body: `[${departure.productName}]\n지금부터 자유시간입니다.\n재집결 시간과 장소는 가이드 안내에 따라 꼭 지켜 주세요.`,
    },
    {
      key: "time-change",
      label: "출발시간 변경",
      description: "변경된 출발시간 공지",
      body: `[${departure.productName}]\n현지 사정으로 출발시간이 변경되었습니다.\n변경 시간: __:__\n이용에 불편을 드려 죄송합니다.`,
    },
    {
      key: "emergency",
      label: "긴급공지",
      description: "전체 고객 긴급 안내",
      urgent: true,
      body: `[긴급] ${departure.productName}\n긴급 안내드립니다.\n(내용 입력)\n문의: 담당 가이드 ${departure.guideName}`,
    },
  ];
}
