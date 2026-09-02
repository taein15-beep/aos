export type ReservationDetail = {
  code: string;
  reservedAt: string;
  bookerName: string;
  phone: string;
  email: string;
  productName: string;
  departureAt: string;
  reserveStatus: string;
  reserveStatusClass: "success" | "warn" | "danger" | "gray" | "info";
  paymentStatus: string;
  paymentStatusClass: "success" | "warn" | "danger" | "gray" | "info";
  counts: {
    adult: number;
    child: number;
    infant: number;
  };
  productAmount: number;
  optionAmount: number;
  discountAmount: number;
  totalAmount: string;
  paidAmount: string;
  unpaidAmount: string;
  requestNote: string;
  adminMemo: string;
  internalNote: string;
  agency: string;
};

export type ReservationListItem = ReservationDetail & {
  memberId?: string;
};

export type ReservationPayment = {
  id: string;
  paidAt: string;
  paymentNumber: string;
  method: "신용카드" | "계좌이체" | "무통장입금" | "현금" | "기타";
  amount: number;
  status: "결제완료" | "결제대기" | "결제취소" | "부분취소";
  approvalNumber: string;
  processedBy: string;
};

export type ReservationRefund = {
  id: string;
  refundedAt: string;
  refundNumber: string;
  paymentNumber: string;
  method: "원결제 취소" | "계좌환불" | "수기환불";
  amount: number;
  status: "환불대기" | "환불완료" | "환불실패";
  reason: string;
  processedBy: string;
};

export const RESERVE_STATUS_FILTER_OPTIONS = [
  "전체",
  "예약접수",
  "예약확정",
  "대기",
  "취소요청",
  "취소완료",
] as const;

export const PAYMENT_STATUS_FILTER_OPTIONS = [
  "전체",
  "미결제",
  "결제대기",
  "부분결제",
  "결제완료",
  "환불완료",
] as const;

export const RESERVE_EDIT_STATUS_OPTIONS = [
  "예약접수",
  "예약확정",
  "대기",
  "취소요청",
  "취소완료",
] as const;

export const PAYMENT_EDIT_STATUS_OPTIONS = [
  "미결제",
  "결제대기",
  "부분결제",
  "결제완료",
  "환불완료",
] as const;

export function parseKrw(value: string | number) {
  if (typeof value === "number") return value;
  return Number(value.replace(/[^\d]/g, "")) || 0;
}

export function formatKrw(value: number) {
  return `${value.toLocaleString("ko-KR")}원`;
}

export function calculateReservationAmounts(productAmount: number, optionAmount: number, discountAmount: number, paidAmount: number) {
  const total = Math.max(0, productAmount + optionAmount - discountAmount);
  const unpaid = Math.max(0, total - paidAmount);
  return {
    totalAmount: formatKrw(total),
    unpaidAmount: formatKrw(unpaid),
    paidAmount: formatKrw(paidAmount),
  };
}

export function reserveStatusBadgeClass(status: string): ReservationDetail["reserveStatusClass"] {
  if (status === "예약확정") return "success";
  if (status === "대기" || status === "부분결제") return "warn";
  if (status === "취소요청") return "danger";
  if (status === "취소완료" || status === "환불완료") return "gray";
  if (status === "예약접수") return "info";
  return "info";
}

export function paymentStatusBadgeClass(status: string): ReservationDetail["paymentStatusClass"] {
  if (status === "결제완료") return "success";
  if (status === "미결제" || status === "결제대기" || status === "부분결제") return "warn";
  if (status === "환불완료") return "gray";
  return "info";
}

export function paymentRecordBadgeClass(status: ReservationPayment["status"]) {
  if (status === "결제완료") return "success";
  if (status === "결제대기" || status === "부분취소") return "warn";
  if (status === "결제취소") return "danger";
  return "gray";
}

export function refundRecordBadgeClass(status: ReservationRefund["status"]) {
  if (status === "환불완료") return "success";
  if (status === "환불대기") return "warn";
  if (status === "환불실패") return "danger";
  return "gray";
}

export function calculatePaymentSummary(
  totalReservationAmount: number,
  payments: ReservationPayment[],
  refunds: ReservationRefund[],
) {
  const totalPaid = payments
    .filter((item) => item.status === "결제완료" || item.status === "부분취소")
    .reduce((sum, item) => sum + item.amount, 0);
  const totalRefund = refunds
    .filter((item) => item.status === "환불완료" || item.status === "환불대기")
    .reduce((sum, item) => sum + item.amount, 0);
  const netPaid = Math.max(0, totalPaid - totalRefund);
  const unpaid = Math.max(0, totalReservationAmount - netPaid);

  return {
    totalReservationAmount,
    totalPaid,
    totalRefund,
    netPaid,
    unpaid,
    totalReservationLabel: formatKrw(totalReservationAmount),
    totalPaidLabel: formatKrw(totalPaid),
    totalRefundLabel: formatKrw(totalRefund),
    netPaidLabel: formatKrw(netPaid),
    unpaidLabel: formatKrw(unpaid),
  };
}

const RESERVATION_DETAILS: ReservationListItem[] = [
  {
    code: "R20260620001",
    reservedAt: "2026-06-20",
    bookerName: "홍길동",
    phone: "010-1234-5678",
    email: "hong@example.com",
    productName: "제주도 3박4일 힐링 패키지",
    departureAt: "2026-07-10",
    reserveStatus: "예약확정",
    reserveStatusClass: "success",
    paymentStatus: "결제완료",
    paymentStatusClass: "success",
    counts: { adult: 2, child: 0, infant: 0 },
    productAmount: 1800000,
    optionAmount: 180000,
    discountAmount: 0,
    totalAmount: "1,980,000원",
    paidAmount: "1,980,000원",
    unpaidAmount: "0원",
    requestNote: "창가 좌석 및 금연 객실 요청",
    adminMemo: "판매점 추천 예약. 담당자 확인 완료.",
    internalNote: "VIP 고객 예약",
    agency: "행복투어",
    memberId: "M000001",
  },
  {
    code: "R20260615002",
    reservedAt: "2026-06-15",
    bookerName: "홍길동",
    phone: "010-1234-5678",
    email: "hong@example.com",
    productName: "부산 해운대 2박3일",
    departureAt: "2026-08-05",
    reserveStatus: "예약확정",
    reserveStatusClass: "success",
    paymentStatus: "부분결제",
    paymentStatusClass: "warn",
    counts: { adult: 2, child: 1, infant: 0 },
    productAmount: 1300000,
    optionAmount: 150000,
    discountAmount: 0,
    totalAmount: "1,450,000원",
    paidAmount: "800,000원",
    unpaidAmount: "650,000원",
    requestNote: "아동 식사 옵션 확인 요청",
    adminMemo: "잔금 결제 안내 문자 발송 예정",
    internalNote: "잔금 결제 독촉 예정",
    agency: "행복투어",
    memberId: "M000001",
  },
  {
    code: "R20260528003",
    reservedAt: "2026-05-28",
    bookerName: "홍길동",
    phone: "010-1234-5678",
    email: "hong@example.com",
    productName: "경주 역사문화 1박2일",
    departureAt: "2026-06-10",
    reserveStatus: "취소완료",
    reserveStatusClass: "gray",
    paymentStatus: "환불완료",
    paymentStatusClass: "gray",
    counts: { adult: 2, child: 0, infant: 0 },
    productAmount: 1350000,
    optionAmount: 70000,
    discountAmount: 0,
    totalAmount: "1,420,000원",
    paidAmount: "0원",
    unpaidAmount: "0원",
    requestNote: "출발 3일 전 취소 요청",
    adminMemo: "환불 처리 완료. 취소 수수료 공제 후 환불",
    internalNote: "취소 수수료 10% 공제",
    agency: "행복투어",
    memberId: "M000001",
  },
  {
    code: "R20260701004",
    reservedAt: "2026-07-01",
    bookerName: "김민지",
    phone: "010-2222-3333",
    email: "minji@example.com",
    productName: "속초 해변 2박3일",
    departureAt: "2026-07-22",
    reserveStatus: "예약접수",
    reserveStatusClass: "info",
    paymentStatus: "미결제",
    paymentStatusClass: "warn",
    counts: { adult: 2, child: 0, infant: 0 },
    productAmount: 820000,
    optionAmount: 70000,
    discountAmount: 0,
    totalAmount: "890,000원",
    paidAmount: "0원",
    unpaidAmount: "890,000원",
    requestNote: "오션뷰 객실 요청",
    adminMemo: "결제 안내 문자 발송 예정",
    internalNote: "",
    agency: "직접가입",
    memberId: "M000002",
  },
  {
    code: "R20260712005",
    reservedAt: "2026-07-12",
    bookerName: "이성호",
    phone: "010-3333-4444",
    email: "sungho@example.com",
    productName: "강릉 바다여행 1박2일",
    departureAt: "2026-08-18",
    reserveStatus: "예약확정",
    reserveStatusClass: "success",
    paymentStatus: "결제대기",
    paymentStatusClass: "warn",
    counts: { adult: 1, child: 0, infant: 0 },
    productAmount: 580000,
    optionAmount: 40000,
    discountAmount: 0,
    totalAmount: "620,000원",
    paidAmount: "0원",
    unpaidAmount: "620,000원",
    requestNote: "-",
    adminMemo: "휴면 회원 복귀 후 결제 예정",
    internalNote: "휴면 회원 복귀 확인",
    agency: "우리여행사",
    memberId: "M000003",
  },
  {
    code: "R20260901006",
    reservedAt: "2026-08-20",
    bookerName: "박준영",
    phone: "010-4444-5555",
    email: "jun@example.com",
    productName: "여수 밤바다 2박3일",
    departureAt: "2026-09-01",
    reserveStatus: "예약확정",
    reserveStatusClass: "success",
    paymentStatus: "결제완료",
    paymentStatusClass: "success",
    counts: { adult: 2, child: 1, infant: 0 },
    productAmount: 1020000,
    optionAmount: 100000,
    discountAmount: 0,
    totalAmount: "1,120,000원",
    paidAmount: "1,120,000원",
    unpaidAmount: "0원",
    requestNote: "유아용 침대 요청",
    adminMemo: "오늘 출발 예약. 체크인 안내 완료",
    internalNote: "출발 당일 체크인 확인",
    agency: "행복투어",
    memberId: "M000004",
  },
  {
    code: "R20260815007",
    reservedAt: "2026-08-15",
    bookerName: "최유나",
    phone: "010-5555-6666",
    email: "yuna@example.com",
    productName: "전주 한옥마을 1박2일",
    departureAt: "2026-09-12",
    reserveStatus: "대기",
    reserveStatusClass: "warn",
    paymentStatus: "미결제",
    paymentStatusClass: "warn",
    counts: { adult: 3, child: 0, infant: 0 },
    productAmount: 720000,
    optionAmount: 60000,
    discountAmount: 0,
    totalAmount: "780,000원",
    paidAmount: "0원",
    unpaidAmount: "780,000원",
    requestNote: "한옥 체험 프로그램 포함 요청",
    adminMemo: "좌석 대기 중",
    internalNote: "",
    agency: "관리자 등록",
    memberId: "M000005",
  },
  {
    code: "R20260822008",
    reservedAt: "2026-08-22",
    bookerName: "한지우",
    phone: "010-8888-9999",
    email: "hanjiwoo@example.com",
    productName: "통영 케이블카 패키지",
    departureAt: "2026-09-20",
    reserveStatus: "취소요청",
    reserveStatusClass: "danger",
    paymentStatus: "부분결제",
    paymentStatusClass: "warn",
    counts: { adult: 2, child: 0, infant: 0 },
    productAmount: 500000,
    optionAmount: 40000,
    discountAmount: 0,
    totalAmount: "540,000원",
    paidAmount: "200,000원",
    unpaidAmount: "340,000원",
    requestNote: "일정 변경으로 취소 요청",
    adminMemo: "취소 수수료 안내 후 처리 예정",
    internalNote: "취소 요청 접수",
    agency: "행복투어",
  },
];

const RESERVATION_PAYMENTS: Record<string, ReservationPayment[]> = {
  R20260620001: [
    {
      id: "pay-001",
      paidAt: "2026.06.20 10:18",
      paymentNumber: "PAY-20260620-001",
      method: "신용카드",
      amount: 900000,
      status: "결제완료",
      approvalNumber: "12345678",
      processedBy: "시스템",
    },
    {
      id: "pay-002",
      paidAt: "2026.06.20 10:25",
      paymentNumber: "PAY-20260620-002",
      method: "신용카드",
      amount: 600000,
      status: "결제완료",
      approvalNumber: "12345679",
      processedBy: "시스템",
    },
  ],
  R20260615002: [
    {
      id: "pay-003",
      paidAt: "2026.06.15 14:42",
      paymentNumber: "PAY-20260615-001",
      method: "계좌이체",
      amount: 800000,
      status: "결제완료",
      approvalNumber: "99887766",
      processedBy: "시스템",
    },
  ],
  R20260528003: [
    {
      id: "pay-004",
      paidAt: "2026.05.28 11:05",
      paymentNumber: "PAY-20260528-001",
      method: "신용카드",
      amount: 1420000,
      status: "결제완료",
      approvalNumber: "55667788",
      processedBy: "시스템",
    },
  ],
};

const RESERVATION_REFUNDS: Record<string, ReservationRefund[]> = {
  R20260528003: [
    {
      id: "ref-001",
      refundedAt: "2026.06.08 16:20",
      refundNumber: "REF-20260608-001",
      paymentNumber: "PAY-20260528-001",
      method: "원결제 취소",
      amount: 1278000,
      status: "환불완료",
      reason: "출발 3일 전 취소 요청",
      processedBy: "장윤호",
    },
  ],
};

export function getReservationList(): ReservationListItem[] {
  return RESERVATION_DETAILS.map((item) => ({ ...item }));
}

export function getReservationDetail(id: string): ReservationDetail | undefined {
  return RESERVATION_DETAILS.find((reservation) => reservation.code === id);
}

export function getReservationPayments(code: string): ReservationPayment[] {
  return (RESERVATION_PAYMENTS[code] ?? []).map((item) => ({ ...item }));
}

export function getReservationRefunds(code: string): ReservationRefund[] {
  return (RESERVATION_REFUNDS[code] ?? []).map((item) => ({ ...item }));
}

export function formatReservationPeople(reservation: ReservationDetail) {
  const total = reservation.counts.adult + reservation.counts.child + reservation.counts.infant;
  return `${total}명`;
}

export function getReservationKpis(items: ReservationListItem[], today = new Date().toISOString().slice(0, 10)) {
  return {
    total: items.length,
    confirmed: items.filter((item) => item.reserveStatus === "예약확정").length,
    paymentPending: items.filter((item) => ["미결제", "결제대기", "부분결제"].includes(item.paymentStatus)).length,
    cancelled: items.filter((item) => item.reserveStatus.includes("취소")).length,
    departingToday: items.filter((item) => item.departureAt === today).length,
  };
}
