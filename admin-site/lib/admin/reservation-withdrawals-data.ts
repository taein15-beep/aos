/**
 * 예약상세 출금관리 Mock
 * - 정산서「예약별 지출금액」은 이 데이터를 읽기 전용으로 표시합니다.
 * - SAMPLE Mock 이며 실운영 출금·전표와 혼동하지 않습니다.
 */

import { formatKrw } from "@/lib/admin/reservations-data";

export type WithdrawalPaymentStatus = "지급" | "미지급";

export type ReservationWithdrawalLine = {
  id: string;
  reservationCode: string;
  /** 품목 및 규격 */
  itemSpec: string;
  /** 출금일 (YYYY-MM-DD 또는 YYYY-MM-DD HH:mm) */
  withdrawnAt: string;
  amount: number;
  vendorName: string;
  voucherNumber: string | null;
  /** 지급 / 미지급 */
  paymentStatus: WithdrawalPaymentStatus;
  /** 지급일. 상태가 지급일 때만 사용 */
  paidAt: string | null;
};

const WITHDRAWAL_BY_RESERVATION: Record<string, ReservationWithdrawalLine[]> = {
  "RSV-20261012-001": [
    {
      id: "wd-RSV-20261012-001-1",
      reservationCode: "RSV-20261012-001",
      itemSpec: "현지가이드비 / 1일",
      withdrawnAt: "2026-10-13",
      amount: 50000,
      vendorName: "현담여행사",
      voucherNumber: "WD-20261013-001",
      paymentStatus: "지급",
      paidAt: "2026-10-13",
    },
    {
      id: "wd-RSV-20261012-001-2",
      reservationCode: "RSV-20261012-001",
      itemSpec: "중식 추가 / 2인",
      withdrawnAt: "2026-10-14",
      amount: 36000,
      vendorName: "철원한정식",
      voucherNumber: "WD-20261013-001",
      paymentStatus: "지급",
      paidAt: "2026-10-14",
    },
    {
      id: "wd-RSV-20261012-001-3",
      reservationCode: "RSV-20261012-001",
      itemSpec: "기념품 대행 / 2세트",
      withdrawnAt: "2026-10-14",
      amount: 30000,
      vendorName: "철원토산품",
      voucherNumber: "WD-20261014-011",
      paymentStatus: "지급",
      paidAt: "2026-10-15",
    },
    {
      id: "wd-RSV-20261012-001-4",
      reservationCode: "RSV-20261012-001",
      itemSpec: "주차비 / 1회",
      withdrawnAt: "2026-10-15",
      amount: 10000,
      vendorName: "철원공영주차장",
      voucherNumber: null,
      paymentStatus: "미지급",
      paidAt: null,
    },
  ],
  "RSV-20261008-010": [
    {
      id: "wd-RSV-20261008-010-1",
      reservationCode: "RSV-20261008-010",
      itemSpec: "추가 간식비 / 2인",
      withdrawnAt: "2026-10-09",
      amount: 20000,
      vendorName: "현지매점",
      voucherNumber: "WD-20261009-014",
      paymentStatus: "지급",
      paidAt: "2026-10-09",
    },
    {
      id: "wd-RSV-20261008-010-2",
      reservationCode: "RSV-20261008-010",
      itemSpec: "택시비 / 왕복",
      withdrawnAt: "2026-10-09",
      amount: 28000,
      vendorName: "철원콜택시",
      voucherNumber: "WD-20261009-014",
      paymentStatus: "지급",
      paidAt: "2026-10-09",
    },
    {
      id: "wd-RSV-20261008-010-3",
      reservationCode: "RSV-20261008-010",
      itemSpec: "입장권 대행 / 2매",
      withdrawnAt: "2026-10-10",
      amount: 24000,
      vendorName: "국악와인열차",
      voucherNumber: "WD-20261010-007",
      paymentStatus: "지급",
      paidAt: "2026-10-10",
    },
    {
      id: "wd-RSV-20261008-010-4",
      reservationCode: "RSV-20261008-010",
      itemSpec: "사진인화 / 1세트",
      withdrawnAt: "2026-10-10",
      amount: 15000,
      vendorName: "철원포토샵",
      voucherNumber: null,
      paymentStatus: "미지급",
      paidAt: null,
    },
  ],
  "RSV-20261010-006": [
    {
      id: "wd-RSV-20261010-006-1",
      reservationCode: "RSV-20261010-006",
      itemSpec: "차량 대기비 / 2시간",
      withdrawnAt: "2026-10-11",
      amount: 80000,
      vendorName: "한빛관광버스",
      voucherNumber: "WD-20261011-022",
      paymentStatus: "지급",
      paidAt: "2026-10-11",
    },
    {
      id: "wd-RSV-20261010-006-2",
      reservationCode: "RSV-20261010-006",
      itemSpec: "입장권 대행 / 4매",
      withdrawnAt: "2026-10-12",
      amount: 48000,
      vendorName: "국악와인열차",
      voucherNumber: "WD-20261011-022",
      paymentStatus: "지급",
      paidAt: "2026-10-12",
    },
    {
      id: "wd-RSV-20261010-006-3",
      reservationCode: "RSV-20261010-006",
      itemSpec: "와인시음 추가 / 4잔",
      withdrawnAt: "2026-10-12",
      amount: 40000,
      vendorName: "철원와이너리",
      voucherNumber: "WD-20261011-022",
      paymentStatus: "지급",
      paidAt: "2026-10-12",
    },
    {
      id: "wd-RSV-20261010-006-4",
      reservationCode: "RSV-20261010-006",
      itemSpec: "간식·생수 / 4인",
      withdrawnAt: "2026-10-13",
      amount: 22000,
      vendorName: "현지매점",
      voucherNumber: null,
      paymentStatus: "미지급",
      paidAt: null,
    },
  ],
  "RSV-20261011-004": [
    {
      id: "wd-RSV-20261011-004-1",
      reservationCode: "RSV-20261011-004",
      itemSpec: "식사 추가 / 3인",
      withdrawnAt: "2026-10-12",
      amount: 45000,
      vendorName: "철원한정식",
      voucherNumber: "WD-20261012-025",
      paymentStatus: "지급",
      paidAt: "2026-10-12",
    },
    {
      id: "wd-RSV-20261011-004-2",
      reservationCode: "RSV-20261011-004",
      itemSpec: "가이드팁 / 1일",
      withdrawnAt: "2026-10-12",
      amount: 30000,
      vendorName: "현담여행사",
      voucherNumber: "WD-20261012-025",
      paymentStatus: "지급",
      paidAt: "2026-10-12",
    },
    {
      id: "wd-RSV-20261011-004-3",
      reservationCode: "RSV-20261011-004",
      itemSpec: "입장권 대행 / 3매",
      withdrawnAt: "2026-10-13",
      amount: 36000,
      vendorName: "국악와인열차",
      voucherNumber: "WD-20261013-012",
      paymentStatus: "미지급",
      paidAt: null,
    },
  ],
  "RSV-20261012-003": [
    {
      id: "wd-RSV-20261012-003-1",
      reservationCode: "RSV-20261012-003",
      itemSpec: "보험료 대납 / 2인",
      withdrawnAt: "2026-10-13",
      amount: 16000,
      vendorName: "KB손해보험",
      voucherNumber: "WD-20261013-031",
      paymentStatus: "지급",
      paidAt: "2026-10-13",
    },
    {
      id: "wd-RSV-20261012-003-2",
      reservationCode: "RSV-20261012-003",
      itemSpec: "셔틀비 / 왕복",
      withdrawnAt: "2026-10-13",
      amount: 25000,
      vendorName: "한빛관광버스",
      voucherNumber: "WD-20261013-031",
      paymentStatus: "지급",
      paidAt: "2026-10-13",
    },
    {
      id: "wd-RSV-20261012-003-3",
      reservationCode: "RSV-20261012-003",
      itemSpec: "중식 추가 / 2인",
      withdrawnAt: "2026-10-14",
      amount: 32000,
      vendorName: "철원한정식",
      voucherNumber: "WD-20261014-018",
      paymentStatus: "미지급",
      paidAt: null,
    },
    {
      id: "wd-RSV-20261012-003-4",
      reservationCode: "RSV-20261012-003",
      itemSpec: "기념품 대행 / 2세트",
      withdrawnAt: "2026-10-14",
      amount: 28000,
      vendorName: "철원토산품",
      voucherNumber: null,
      paymentStatus: "미지급",
      paidAt: null,
    },
  ],
};

export function listReservationWithdrawals(reservationCode: string): ReservationWithdrawalLine[] {
  return [...(WITHDRAWAL_BY_RESERVATION[reservationCode] ?? [])];
}

export function formatWithdrawalAmount(amount: number) {
  return formatKrw(amount);
}

export function formatWithdrawalVoucher(voucherNumber: string | null) {
  return voucherNumber?.trim() || "미발급";
}

/** 상태가 지급일 때만 일자 표기, 그 외 "-" */
export function formatWithdrawalPaidAt(line: Pick<ReservationWithdrawalLine, "paymentStatus" | "paidAt">) {
  if (line.paymentStatus !== "지급") return "-";
  return line.paidAt?.trim() || "-";
}

export function formatWithdrawalPaymentStatus(status: WithdrawalPaymentStatus) {
  return status;
}
