export type TourStatus = "운영 예정" | "운영 중" | "일시중지" | "운영 종료";

export type MockSpot = {
  id: string;
  tourId: number;
  name: string;
  code: string;
  address: string;
  sortOrder: number;
  required: boolean;
  radius: number;
  total: number;
  qr: "발급 완료" | "미발급";
  operation: "운영 중" | "운영 중지";
  visible: boolean;
};

export type MockPrize = {
  id: string;
  tourId: number;
  name: string;
  type: string;
  requiredCount: number;
  stock: number;
  issued: number;
  active: boolean;
  method: "현장수령" | "택배발송";
  description: string;
};

export type MockParticipant = {
  id: number;
  number: string;
  name: string;
  phone: string;
  tourId: number;
  joined: string;
  recent: string;
  spots: number;
  completed: boolean;
  completedAt: string;
  reward: "-" | "미신청" | "신청완료";
  anomaly: boolean;
};

export type MockVerification = {
  id: number;
  number: string;
  date: string;
  participantId: number;
  participant: string;
  phone: string;
  tourId: number;
  spot: string;
  spotCode: string;
  method: string;
  result: "정상 인증" | "인증 실패";
  distance: string;
  distanceM: number;
  device: string;
  deviceType: "mobile" | "desktop";
  ip: string;
  anomaly: string;
  review: "미검수" | "정상" | "부정" | "확인 보류";
  lat: string;
  lng: string;
  spotLat: string;
  spotLng: string;
  place?: string;
  failureReason?: string;
};

export type MockRewardClaim = {
  id: number;
  participantId: number;
  participant: string;
  phone: string;
  tourId: number;
  verifiedCount: number;
  completed: boolean;
  completedAt: string;
  prizeName: string;
  appliedAt: string;
  status: "신청" | "검수중" | "지급완료" | "반려" | "미신청";
  paidAt: string;
};

export type MockTour = {
  id: number;
  code: string;
  name: string;
  start: string;
  end: string;
  spots: number;
  condition: string;
  completion: "all" | "count";
  requiredCount: number;
  participants: number;
  finishers: number;
  status: TourStatus;
  visible: boolean;
  created: string;
  department: string;
  manager: string;
  intro: string;
  detail: string;
  region: string;
};

export function completionRate(participants: number, finishers: number) {
  if (!participants) return "-";
  return `${Math.round((finishers / participants) * 100)}%`;
}

export function formatCondition(condition: string, spots: number) {
  const allMatch = condition.match(/^(\d+)곳\s*전체$/);
  if (allMatch) return `${Number(allMatch[1]) || spots}곳 전체`;
  if (condition.includes("전체") && spots) return `${spots}곳 전체`;
  const match = condition.match(/(\d+)곳\s*중\s*(\d+)곳/);
  if (match) {
    const total = Number(match[1]);
    const need = Number(match[2]);
    if (total === need) return `${total}곳 전체`;
    return `${total}곳 중 ${need}곳 이상`;
  }
  return condition || "-";
}

export function resolveTourStatus(tour: Pick<MockTour, "start" | "end" | "status">, today = "2026-11-16"): TourStatus {
  if (tour.status === "일시중지" || tour.status === "운영 예정") return tour.status;
  if (tour.end < today) return "운영 종료";
  if (tour.start > today) return "운영 예정";
  return "운영 중";
}

export const mockTours: MockTour[] = [
  {
    id: 107,
    code: "ST-2026-0107",
    name: "서울사무실 QR테스트입니다",
    start: "2026-11-11",
    end: "2026-11-30",
    spots: 6,
    condition: "6곳 중 5곳 이상",
    completion: "count",
    requiredCount: 5,
    participants: 3,
    finishers: 0,
    status: "운영 중",
    visible: true,
    created: "2026-11-11",
    department: "서울사무실",
    manager: "주우석",
    intro: "테스트",
    detail: "테스트",
    region: "서울 금천구",
  },
  {
    id: 106,
    code: "ST-2026-0106",
    name: "철원 스탬프투어 테스트입니다",
    start: "2026-11-11",
    end: "2026-11-30",
    spots: 10,
    condition: "10곳 중 5곳 이상",
    completion: "count",
    requiredCount: 5,
    participants: 0,
    finishers: 0,
    status: "운영 중",
    visible: true,
    created: "2026-11-11",
    department: "관광마케팅팀",
    manager: "김철원",
    intro: "철원 테스트 투어입니다.",
    detail: "테스트용 상세 안내입니다.",
    region: "강원 철원군",
  },
  {
    id: 105,
    code: "ST-2026-0105",
    name: "테스트3번째 스탬프투어",
    start: "2026-11-06",
    end: "2026-11-30",
    spots: 6,
    condition: "6곳 전체",
    completion: "all",
    requiredCount: 6,
    participants: 1,
    finishers: 0,
    status: "운영 중",
    visible: true,
    created: "2026-11-06",
    department: "관광마케팅팀",
    manager: "이테스트",
    intro: "세 번째 테스트 투어입니다.",
    detail: "전체 관광지 인증이 필요합니다.",
    region: "강원 철원군",
  },
  {
    id: 104,
    code: "ST-2026-0104",
    name: "테스트2번째 스탬프투어",
    start: "2026-11-03",
    end: "2026-11-30",
    spots: 6,
    condition: "6곳 중 5곳 이상",
    completion: "count",
    requiredCount: 5,
    participants: 4,
    finishers: 2,
    status: "운영 중",
    visible: true,
    created: "2026-11-03",
    department: "관광마케팅팀",
    manager: "박테스트",
    intro: "두 번째 테스트 투어입니다.",
    detail: "5곳 이상 인증 시 완주입니다.",
    region: "강원 철원군",
  },
  {
    id: 103,
    code: "ST-2026-0103",
    name: "테스트 스탬프투어",
    start: "2026-11-02",
    end: "2026-11-30",
    spots: 8,
    condition: "8곳 전체",
    completion: "all",
    requiredCount: 8,
    participants: 7,
    finishers: 6,
    status: "운영 중",
    visible: true,
    created: "2026-11-02",
    department: "관광마케팅팀",
    manager: "최테스트",
    intro: "테스트 스탬프투어입니다.",
    detail: "8곳 전체를 인증해야 완주입니다.",
    region: "강원 철원군",
  },
  {
    id: 102,
    code: "ST-2026-0102",
    name: "철원 힐링투어",
    start: "2026-11-02",
    end: "2026-12-31",
    spots: 8,
    condition: "8곳 전체",
    completion: "all",
    requiredCount: 8,
    participants: 1,
    finishers: 0,
    status: "운영 중",
    visible: true,
    created: "2026-11-02",
    department: "관광마케팅팀",
    manager: "정힐링",
    intro: "철원 힐링 코스입니다.",
    detail: "자연과 함께하는 힐링 스탬프투어입니다.",
    region: "강원 철원군",
  },
  {
    id: 101,
    code: "ST-2026-0101",
    name: "철원 DMZ 평화 관광 스탬프 투어",
    start: "2026-09-01",
    end: "2026-09-30",
    spots: 6,
    condition: "6곳 중 1곳 이상",
    completion: "count",
    requiredCount: 1,
    participants: 8,
    finishers: 5,
    status: "운영 종료",
    visible: false,
    created: "2026-08-24",
    department: "관광마케팅팀",
    manager: "장윤호",
    intro: "철원의 역사와 자연을 따라 여행하며 모바일 스탬프를 모아보세요.",
    detail: "각 관광지에 비치된 QR코드를 촬영하고 인증을 완료하면 스탬프가 적립됩니다.",
    region: "강원 철원군",
  },
];

const addressSeoul = "서울 금천구 가산디지털1로 142";
const addressCheorwon = "강원특별자치도 철원군 동송읍 태봉로 1825";

function spotsForTour(tourId: number, count: number, names?: string[]): MockSpot[] {
  return Array.from({ length: count }, (_, index) => {
    const order = index + 1;
    const name = names?.[index] ?? `테스트 관광지${order}`;
    return {
      id: `${tourId}-${order}`,
      tourId,
      name,
      code: `SPOT-${tourId}${String(order).padStart(2, "0")}`,
      address: tourId === 107 ? addressSeoul : addressCheorwon,
      sortOrder: order,
      required: order <= Math.ceil(count / 2),
      radius: 100,
      total: Math.max(0, 12 - order),
      qr: order % 4 === 0 ? "미발급" : "발급 완료",
      operation: order === 1 && tourId === 107 ? "운영 중지" : "운영 중",
      visible: true,
    };
  });
}

export const mockSpots: MockSpot[] = [
  ...spotsForTour(107, 6),
  ...spotsForTour(106, 10),
  ...spotsForTour(105, 6),
  ...spotsForTour(104, 6),
  ...spotsForTour(103, 8),
  ...spotsForTour(102, 8, ["고석정", "소이산 모노레일", "DMZ 두루미평화타운", "월정리역", "철원역사문화공원", "백마고지 전적지", "직탕폭포", "은하수교"]),
  ...spotsForTour(101, 6, ["고석정", "노동당사", "백마고지", "월정리역", "철원역사문화공원", "직탕폭포"]),
];

export const mockPrizes: MockPrize[] = [
  { id: "107-1", tourId: 107, name: "기프티콘 이용권", type: "모바일 쿠폰", requiredCount: 3, stock: 50, issued: 2, active: true, method: "현장수령", description: "이모티콘 플러스 14일권" },
  { id: "107-2", tourId: 107, name: "철원오대쌀 4Kg", type: "현물", requiredCount: 4, stock: 30, issued: 0, active: true, method: "택배발송", description: "철원에서 재배한 오대쌀 4kg 상품입니다." },
  { id: "107-3", tourId: 107, name: "테스트 경품1", type: "현물", requiredCount: 5, stock: 20, issued: 0, active: true, method: "현장수령", description: "테스트 경품입니다." },
  { id: "104-1", tourId: 104, name: "테스트 기념품", type: "현물", requiredCount: 5, stock: 40, issued: 2, active: true, method: "현장수령", description: "테스트2번째 투어 기념품" },
  { id: "103-1", tourId: 103, name: "완주 배지", type: "현물", requiredCount: 8, stock: 100, issued: 6, active: true, method: "현장수령", description: "전체 인증 완주 배지" },
  { id: "101-1", tourId: 101, name: "철원 관광기념품 세트", type: "현물", requiredCount: 1, stock: 80, issued: 5, active: false, method: "현장수령", description: "철원 대표 관광지를 담은 기념품 세트입니다." },
  { id: "101-2", tourId: 101, name: "철원사랑상품권 3만원", type: "상품권", requiredCount: 1, stock: 40, issued: 3, active: false, method: "현장수령", description: "철원군 관내 가맹점에서 사용할 수 있습니다." },
];

export const mockParticipants: MockParticipant[] = [
  { id: 1, number: "PT-2026-124", name: "김병구", phone: "010-8879-0079", tourId: 107, joined: "2026.11.13 09:24", recent: "2026.11.13 09:24", spots: 1, completed: false, completedAt: "-", reward: "-", anomaly: false },
  { id: 2, number: "PT-2026-123", name: "김종환", phone: "010-8906-3927", tourId: 107, joined: "2026.11.13 09:24", recent: "2026.11.13 09:24", spots: 1, completed: false, completedAt: "-", reward: "-", anomaly: false },
  { id: 3, number: "PT-2026-122", name: "주우석테스트 1111", phone: "010-6606-3408", tourId: 107, joined: "2026.11.11 14:11", recent: "2026.11.13 09:25", spots: 2, completed: false, completedAt: "-", reward: "-", anomaly: true },
  { id: 4, number: "PT-2026-121", name: "주우석테스트 1106", phone: "010-6606-3408", tourId: 105, joined: "2026.11.06 11:07", recent: "2026.11.13 11:55", spots: 4, completed: false, completedAt: "-", reward: "-", anomaly: false },
  { id: 5, number: "PT-2026-120", name: "주우석테스트 1105", phone: "010-6606-3408", tourId: 104, joined: "2026.11.05 14:04", recent: "2026.11.05 14:07", spots: 5, completed: false, completedAt: "-", reward: "-", anomaly: true },
  { id: 6, number: "PT-2026-119", name: "쭈", phone: "010-6606-3408", tourId: 104, joined: "2026.11.05 13:48", recent: "2026.11.05 13:48", spots: 1, completed: false, completedAt: "-", reward: "-", anomaly: false },
  { id: 7, number: "PT-2026-118", name: "장봉선", phone: "010-2694-9511", tourId: 104, joined: "2026.11.05 11:16", recent: "2026.11.05 11:18", spots: 5, completed: true, completedAt: "2026.11.05 11:20", reward: "신청완료", anomaly: false },
  { id: 8, number: "PT-2026-117", name: "이재돈", phone: "010-1111-2222", tourId: 104, joined: "2026.11.04 16:55", recent: "2026.11.04 16:55", spots: 5, completed: true, completedAt: "2026.11.04 16:58", reward: "미신청", anomaly: false },
  { id: 9, number: "PT-2026-116", name: "유미진", phone: "010-8007-6371", tourId: 103, joined: "2026.11.04 16:50", recent: "2026.11.04 16:57", spots: 8, completed: true, completedAt: "2026.11.04 16:58", reward: "미신청", anomaly: false },
  { id: 10, number: "PT-2026-115", name: "이재돈", phone: "010-1111-2222", tourId: 103, joined: "2026.11.04 16:45", recent: "2026.11.04 16:55", spots: 8, completed: true, completedAt: "2026.11.04 16:55", reward: "신청완료", anomaly: false },
  { id: 11, number: "PT-2026-114", name: "박서연", phone: "010-2201-1182", tourId: 103, joined: "2026.11.03 15:20", recent: "2026.11.03 18:02", spots: 8, completed: true, completedAt: "2026.11.03 18:02", reward: "신청완료", anomaly: true },
  { id: 12, number: "PT-2026-113", name: "최민준", phone: "010-3340-2201", tourId: 103, joined: "2026.11.03 11:08", recent: "2026.11.03 11:40", spots: 8, completed: true, completedAt: "2026.11.03 11:40", reward: "신청완료", anomaly: true },
  { id: 13, number: "PT-2026-112", name: "정하늘", phone: "010-4412-7780", tourId: 103, joined: "2026.11.02 17:33", recent: "2026.11.03 09:12", spots: 8, completed: true, completedAt: "2026.11.03 09:12", reward: "신청완료", anomaly: false },
  { id: 14, number: "PT-2026-111", name: "한지민", phone: "010-5520-4419", tourId: 103, joined: "2026.11.02 10:14", recent: "2026.11.02 16:48", spots: 8, completed: true, completedAt: "2026.11.02 16:48", reward: "신청완료", anomaly: false },
  { id: 15, number: "PT-2026-110", name: "오세훈", phone: "010-6631-2290", tourId: 103, joined: "2026.11.01 13:22", recent: "2026.11.01 18:05", spots: 3, completed: false, completedAt: "-", reward: "-", anomaly: false },
  { id: 16, number: "PT-2026-109", name: "윤가은", phone: "010-7742-3308", tourId: 102, joined: "2026.10.31 09:41", recent: "2026.10.31 15:16", spots: 2, completed: false, completedAt: "-", reward: "-", anomaly: false },
  { id: 17, number: "PT-2026-108", name: "서지호", phone: "010-8853-6612", tourId: 101, joined: "2026.09.20 14:05", recent: "2026.09.20 17:44", spots: 1, completed: true, completedAt: "2026.09.20 17:44", reward: "신청완료", anomaly: false },
  { id: 18, number: "PT-2026-107", name: "배수아", phone: "010-9964-1023", tourId: 101, joined: "2026.09.19 11:28", recent: "2026.09.19 16:09", spots: 1, completed: true, completedAt: "2026.09.19 16:09", reward: "신청완료", anomaly: false },
  { id: 19, number: "PT-2026-106", name: "문태경", phone: "010-1025-7784", tourId: 101, joined: "2026.09.18 10:16", recent: "2026.09.18 14:52", spots: 1, completed: true, completedAt: "2026.09.18 14:52", reward: "신청완료", anomaly: false },
  { id: 20, number: "PT-2026-105", name: "임도윤", phone: "010-2136-8895", tourId: 101, joined: "2026.09.17 15:37", recent: "2026.09.17 18:21", spots: 1, completed: true, completedAt: "2026.09.17 18:21", reward: "신청완료", anomaly: false },
  { id: 21, number: "PT-2026-104", name: "조은별", phone: "010-3247-9906", tourId: 101, joined: "2026.09.16 09:03", recent: "2026.09.16 13:40", spots: 1, completed: true, completedAt: "2026.09.16 13:40", reward: "신청완료", anomaly: false },
  { id: 22, number: "PT-2026-103", name: "남궁현", phone: "010-4358-1017", tourId: 101, joined: "2026.09.15 12:19", recent: "2026.09.15 16:33", spots: 0, completed: false, completedAt: "-", reward: "-", anomaly: false },
  { id: 23, number: "PT-2026-102", name: "황보민", phone: "010-5469-2128", tourId: 101, joined: "2026.09.14 08:55", recent: "2026.09.14 11:27", spots: 0, completed: false, completedAt: "-", reward: "-", anomaly: false },
  { id: 24, number: "PT-2026-101", name: "구자성", phone: "010-6570-3239", tourId: 101, joined: "2026.09.13 17:08", recent: "2026.09.13 19:14", spots: 0, completed: false, completedAt: "-", reward: "-", anomaly: false },
];

export const mockVerifications: MockVerification[] = [
  {
    id: 13,
    number: "VRF-20261113-169",
    date: "2026.11.13 09:25:18",
    participantId: 3,
    participant: "주우석테스트 1111",
    phone: "010-6606-3408",
    tourId: 107,
    spot: "테스트 관광지2",
    spotCode: "SPOT-10702",
    method: "QR + GPS",
    result: "정상 인증",
    distance: "23m",
    distanceM: 23,
    device: "Android 10 / 휴대폰 / Samsung",
    deviceType: "mobile",
    ip: "121.140.**.217",
    anomaly: "이상 인증 의심",
    review: "정상",
    lat: "37.4784304",
    lng: "126.8834802",
    spotLat: "37.478337",
    spotLng: "126.8832471",
    place: "가산점 (본점)",
  },
  {
    id: 1,
    number: "VRF-20261113-168",
    date: "2026.11.13 09:24:10",
    participantId: 1,
    participant: "김병구",
    phone: "010-8879-0079",
    tourId: 107,
    spot: "테스트 관광지1",
    spotCode: "SPOT-10701",
    method: "QR + GPS",
    result: "정상 인증",
    distance: "18m",
    distanceM: 18,
    device: "모바일 · iOS",
    deviceType: "mobile",
    ip: "121.140.**.100",
    anomaly: "없음",
    review: "정상",
    lat: "37.4784100",
    lng: "126.8834500",
    spotLat: "37.478337",
    spotLng: "126.8832471",
  },
  {
    id: 2,
    number: "VRF-20260920-10328",
    date: "2026.09.20 17:44:24",
    participantId: 17,
    participant: "서지호",
    phone: "010-8853-6612",
    tourId: 101,
    spot: "고석정",
    spotCode: "SPOT-10101",
    method: "QR + GPS",
    result: "정상 인증",
    distance: "32m",
    distanceM: 32,
    device: "모바일 · iOS",
    deviceType: "mobile",
    ip: "192.0.2.18",
    anomaly: "없음",
    review: "정상",
    lat: "38.186742",
    lng: "127.287914",
    spotLat: "38.186521",
    spotLng: "127.287663",
  },
  {
    id: 3,
    number: "VRF-20260915-10319",
    date: "2026.09.15 16:32:04",
    participantId: 22,
    participant: "남궁현",
    phone: "010-4358-1017",
    tourId: 101,
    spot: "월정리역",
    spotCode: "SPOT-10104",
    method: "QR + GPS",
    result: "인증 실패",
    distance: "684m",
    distanceM: 684,
    device: "모바일 · Android",
    deviceType: "mobile",
    ip: "192.0.2.91",
    anomaly: "GPS 허용 범위 밖",
    review: "미검수",
    lat: "38.308812",
    lng: "127.221904",
    spotLat: "38.314295",
    spotLng: "127.220304",
    failureReason: "허용 반경 초과",
  },
];

export const mockRewardClaims: MockRewardClaim[] = mockParticipants
  .filter((row) => row.completed)
  .map((row, index) => {
    const prize = mockPrizes.find((item) => item.tourId === row.tourId);
    return {
      id: index + 1,
      participantId: row.id,
      participant: row.name,
      phone: row.phone,
      tourId: row.tourId,
      verifiedCount: row.spots,
      completed: true,
      completedAt: row.completedAt,
      prizeName: prize?.name ?? "미선택",
      appliedAt: row.reward === "-" || row.reward === "미신청" ? "-" : row.completedAt,
      status: row.reward === "신청완료" ? "지급완료" : row.reward === "미신청" ? "미신청" : "신청",
      paidAt: row.reward === "신청완료" ? row.completedAt : "-",
    };
  });

export const mockStatsSummary = {
  tourCount: mockTours.length,
  participants: mockTours.reduce((sum, tour) => sum + tour.participants, 0),
  finishers: mockTours.reduce((sum, tour) => sum + tour.finishers, 0),
  samplePeriodLabel: "샘플 기준 기간: 2026.09.01 ~ 2026.11.16",
};

export function getTourById(id: number | string) {
  const numeric = Number(id);
  return mockTours.find((tour) => tour.id === numeric) ?? null;
}

export function getSpotsByTourId(tourId: number) {
  return mockSpots.filter((spot) => spot.tourId === tourId).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getPrizesByTourId(tourId: number) {
  return mockPrizes.filter((prize) => prize.tourId === tourId);
}

export function getParticipantsByTourId(tourId: number) {
  return mockParticipants.filter((row) => row.tourId === tourId);
}
