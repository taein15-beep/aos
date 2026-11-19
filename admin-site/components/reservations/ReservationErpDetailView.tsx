"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { SELLER_CHANNEL_SELLER_ID } from "@/lib/admin/seller-channel-reservations";
import { resolveReservationProductCode } from "@/lib/admin/reservation-settlement-draft";
import {
  formatKrw,
  formatPeopleLabel,
  type ReservationDetail,
  type ReservationHistoryEntry,
  type ReservationPayment,
} from "@/lib/admin/reservations-data";
import { getSellerCancelRequests } from "@/lib/seller/seller-cancel-request-store";
import { getSellerReservationDetail } from "@/lib/seller/seller-reservations-data";
import {
  formatWithdrawalVoucher,
  listReservationWithdrawals,
} from "@/lib/admin/reservation-withdrawals-data";

type Props = {
  reservation: ReservationDetail;
  displayReserveStatus: string;
  displayPaymentStatus: string;
  payments: ReservationPayment[];
  history: ReservationHistoryEntry[];
  productCode?: string;
  canEdit: boolean;
  canCancelRefund: boolean;
  canSettlement: boolean;
  lastEditLabel?: string;
  onBack: () => void;
  onSettlement: () => void;
  onCancelRefund: () => void;
  onSave: () => void;
  onAction: (message: string) => void;
};

type TravelerRow = {
  key: string;
  koreanName: string;
  gender: string;
  birthDate: string;
  boarding: string;
};

const RESERVE_STATUS_OPTIONS = ["예약접수", "예약확정", "대기", "취소요청", "취소완료"];
const PAYMENT_STATUS_OPTIONS = ["미결제", "부분결제", "결제완료", "환불진행", "환불완료"];
const CHANNEL_OPTIONS = ["자사판매", "제휴여행사", "판매점"];
const PAX_COLUMNS = ["No", "한글명", "성(영문)", "이름(영문)", "성별", "국적", "여권번호", "유효기간", "생일", "탑승지", "보험", "지자체증빙", "티켓", "여권"];
const OUTPUT_COLUMNS = ["No", "항목 및 규격", "수량", "단가", "합계", "승인번호", "일자", "비고", "거래처", "지출전표"];

function withCurrent(options: string[], current: string) {
  return current && !options.includes(current) ? [current, ...options] : options;
}

function channelOf(reservation: ReservationDetail) {
  const type = reservation.source?.type ?? "direct";
  if (type === "affiliate") return "제휴여행사";
  if (type === "seller") return "판매점";
  return "자사판매";
}

function parseKrw(value: string) {
  const digits = value.replace(/[^0-9-]/g, "");
  return digits ? Number(digits) : 0;
}

function datePart(value: string) {
  return value ? value.slice(0, 10) : "-";
}

function Panel({ title, actions, children }: { title: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="rv-panel">
      <div className="rv-panel-head">
        <span>{title}</span>
        {actions ? <div className="rv-panel-actions">{actions}</div> : null}
      </div>
      <div className="rv-panel-body">{children}</div>
    </section>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: string; tone?: "money" | "due" }) {
  return (
    <div className={`rv-card${tone ? ` ${tone}` : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function EmptyRow({ colSpan, message }: { colSpan: number; message: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="center">
        {message}
      </td>
    </tr>
  );
}

export function ReservationErpDetailView({
  reservation,
  displayReserveStatus,
  displayPaymentStatus,
  payments,
  history,
  productCode,
  canEdit,
  canCancelRefund,
  canSettlement,
  lastEditLabel,
  onBack,
  onSettlement,
  onCancelRefund,
  onSave,
  onAction,
}: Props) {
  const readOnly = !canEdit;
  const baseRef = useRef<HTMLDivElement>(null);

  const sellerDetail = useMemo(
    () =>
      getSellerReservationDetail(
        SELLER_CHANNEL_SELLER_ID,
        reservation.code,
        getSellerCancelRequests(SELLER_CHANNEL_SELLER_ID),
      ),
    [reservation.code],
  );

  const [channel, setChannel] = useState(channelOf(reservation));
  const [reserveStatus, setReserveStatus] = useState(displayReserveStatus);
  const [paymentStatus, setPaymentStatus] = useState(displayPaymentStatus);
  const [manager, setManager] = useState("");
  const [requestNote, setRequestNote] = useState(reservation.requestNote ?? "");
  const [adminMemo, setAdminMemo] = useState(reservation.adminMemo || sellerDetail?.supplierMemo || "");
  const [shareMemo, setShareMemo] = useState(reservation.requestNote || sellerDetail?.memo || "");

  useEffect(() => {
    setChannel(channelOf(reservation));
    setReserveStatus(displayReserveStatus);
    setPaymentStatus(displayPaymentStatus);
    setManager("");
    setRequestNote(reservation.requestNote ?? "");
    setAdminMemo(reservation.adminMemo || sellerDetail?.supplierMemo || "");
    setShareMemo(reservation.requestNote || sellerDetail?.memo || "");
    // 예약 건이 바뀔 때만 초기화합니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reservation.code]);

  const { adult, child, infant } = reservation.counts;
  const totalPeople = adult + child + infant;
  const unpaidValue = parseKrw(reservation.unpaidAmount);

  const resolvedProductCode =
    productCode?.trim() ||
    resolveReservationProductCode(reservation) ||
    sellerDetail?.productCode ||
    "-";

  const travelPeriod = sellerDetail?.travelEndDate
    ? `${sellerDetail.travelDate} ~ ${sellerDetail.travelEndDate}`
    : sellerDetail?.travelDate || reservation.departureAt
      ? "1일"
      : "-";

  const departureStatus = useMemo(() => {
    if (/취소/.test(displayReserveStatus)) return { label: "취소", tone: "gray" };
    const day = datePart(reservation.departureAt);
    const today = new Date().toISOString().slice(0, 10);
    return day !== "-" && day < today ? { label: "출발완료", tone: "gray" } : { label: "출발대기", tone: "blue" };
  }, [displayReserveStatus, reservation.departureAt]);

  const withdrawals = useMemo(() => listReservationWithdrawals(reservation.code), [reservation.code]);

  const travelers = useMemo<TravelerRow[]>(() => {
    const boarding = reservation.boardingPoint || sellerDetail?.boardingPlace || "";
    const rows: TravelerRow[] = [
      {
        key: "booker",
        koreanName: reservation.bookerName,
        gender: sellerDetail?.customerGender ?? "",
        birthDate: sellerDetail?.customerBirthDate ?? "",
        boarding,
      },
    ];
    if (sellerDetail) {
      sellerDetail.companions.forEach((companion, index) => {
        rows.push({
          key: `companion-${index}`,
          koreanName: companion.name,
          gender: "",
          birthDate: companion.birthDate,
          boarding,
        });
      });
    } else {
      for (let index = 1; index < totalPeople; index += 1) {
        rows.push({ key: `synth-${index}`, koreanName: "", gender: "", birthDate: "", boarding });
      }
    }
    return rows;
  }, [reservation.bookerName, reservation.boardingPoint, sellerDetail, totalPeople]);

  const optionAmount = reservation.optionAmount;
  const optionQty = adult + child;

  const lastPaymentDate = useMemo(() => {
    const dates = payments
      .filter((payment) => payment.status === "결제완료" || payment.status === "부분취소")
      .map((payment) => payment.paidAt)
      .filter(Boolean)
      .sort();
    return dates.length ? dates[dates.length - 1] : "";
  }, [payments]);

  const historyRows = useMemo(
    () =>
      history.flatMap((entry) => {
        const actor = entry.actor?.name || "-";
        if (entry.changes && entry.changes.length > 0) {
          return entry.changes.map((change, index) => ({
            key: `${entry.id}-${index}`,
            at: entry.at,
            label: change.label,
            before: change.before,
            after: change.after,
            actor,
          }));
        }
        return [
          {
            key: entry.id,
            at: entry.at,
            label: entry.summary || "-",
            before: "-",
            after: "-",
            actor,
          },
        ];
      }),
    [history],
  );

  const moveToBase = () => {
    baseRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    onAction("기본사항");
  };

  return (
    <div className="rv-page" key={reservation.code}>
      {/* 1. 페이지 헤더 */}
      <div className="rv-page-head">
        <div>
          <h1 className="rv-title">예약상세</h1>
          <p className="rv-desc">예약 1건의 상태, 결제, 여행자, 판매사/공급사 정보를 한 화면에서 관리합니다.</p>
          {lastEditLabel ? <p className="rv-last-edit">{lastEditLabel}</p> : null}
        </div>
        <div className="rv-top-actions">
          <button type="button" className="rv-btn" onClick={moveToBase}>
            기본사항
          </button>
          <button type="button" className="rv-btn" onClick={onSettlement} disabled={!canSettlement}>
            정산요청
          </button>
          <button type="button" className="rv-btn" onClick={() => onAction("알림톡")}>
            알림톡 발송
          </button>
          <button type="button" className="rv-btn red" onClick={onCancelRefund} disabled={!canCancelRefund}>
            취소/환불 처리
          </button>
          <button type="button" className="rv-btn" onClick={() => onAction("print")}>
            예약확인서 출력
          </button>
        </div>
      </div>

      {/* 2. 요약 카드 */}
      <div className="rv-summary">
        <SummaryCard label="예약상태" value={reserveStatus} />
        <SummaryCard label="결제상태" value={paymentStatus} />
        <SummaryCard label="예약접수일 / 출발일" value={`${datePart(reservation.reservedAt)} / ${datePart(reservation.departureAt)}`} />
        <SummaryCard label="예약자명 / 총인원" value={`${reservation.bookerName || "-"} / ${totalPeople}명`} />
        <SummaryCard label="총금액" value={reservation.totalAmount} tone="money" />
        <SummaryCard label="결제금액" value={reservation.paidAmount} tone="money" />
        <SummaryCard label="미수금" value={reservation.unpaidAmount} tone="due" />
      </div>

      {/* 3. 예약 기본정보 | 상품/출발정보 */}
      <div className="rv-grid-two rv-grid-two--base-product" ref={baseRef}>
        <Panel title="예약 기본정보">
          <div className="rv-form-grid">
            <div className="rv-field">
              <span className="rv-label">예약번호</span>
              <input type="text" value={reservation.code} readOnly />
            </div>
            <div className="rv-field">
              <span className="rv-label">예약접수일</span>
              <input type="text" value={reservation.reservedAt} readOnly />
            </div>
            <div className="rv-field">
              <span className="rv-label">예약경로</span>
              <select value={channel} onChange={(event) => setChannel(event.target.value)} disabled={readOnly}>
                {CHANNEL_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="rv-field">
              <span className="rv-label">예약상태</span>
              <select value={reserveStatus} onChange={(event) => setReserveStatus(event.target.value)} disabled={readOnly}>
                {withCurrent(RESERVE_STATUS_OPTIONS, reserveStatus).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="rv-field">
              <span className="rv-label">담당자</span>
              <select value={manager} onChange={(event) => setManager(event.target.value)} disabled={readOnly}>
                <option value="">미지정</option>
              </select>
            </div>
            <div className="rv-field">
              <span className="rv-label">결제상태</span>
              <select value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value)} disabled={readOnly}>
                {withCurrent(PAYMENT_STATUS_OPTIONS, paymentStatus).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="rv-field full">
              <span className="rv-label">예약자 요청사항</span>
              <textarea
                value={requestNote}
                onChange={(event) => setRequestNote(event.target.value)}
                readOnly={readOnly}
                placeholder="요청사항"
              />
            </div>
          </div>
        </Panel>

        <Panel title="상품/출발정보">
          <div className="rv-form-grid rv-form-grid--product-top">
            <div className="rv-field rv-field--grow">
              <span className="rv-label">상품명</span>
              <input type="text" className="rv-input-link" value={reservation.productName} readOnly />
            </div>
            <div className="rv-field rv-field--code">
              <span className="rv-label">상품코드</span>
              <input type="text" value={resolvedProductCode} readOnly />
            </div>
          </div>
          <div className="rv-form-grid">
            <div className="rv-field rv-field--depart">
              <span className="rv-label">출발일</span>
              <input type="text" value={reservation.departureAt} readOnly />
            </div>
            <div className="rv-field">
              <span className="rv-label">여행기간</span>
              <input type="text" value={travelPeriod} readOnly />
            </div>
            <div className="rv-field">
              <span className="rv-label">출발상태</span>
              <span className={`rv-badge ${departureStatus.tone}`}>{departureStatus.label}</span>
            </div>
          </div>
          <div className="rv-form-grid rv-form-grid--2">
            <button type="button" className="rv-btn rv-btn-block" onClick={() => onAction("일정표 보기")}>
              일정표 보기
            </button>
            <button type="button" className="rv-btn rv-btn-block" onClick={() => onAction("요금설정 보기")}>
              요금설정 보기
            </button>
          </div>
        </Panel>
      </div>

      {/* 4. 예약자 정보 | 옵션 정보 */}
      <div className="rv-grid-two rv-grid-two--booker-option">
        <Panel title="예약자 정보">
          <div className="rv-form-grid">
            <div className="rv-field">
              <span className="rv-label">예약자명</span>
              <input type="text" defaultValue={reservation.bookerName} readOnly={readOnly} />
            </div>
            <div className="rv-field">
              <span className="rv-label">휴대폰번호</span>
              <input type="text" defaultValue={reservation.phone} readOnly={readOnly} />
            </div>
            <div className="rv-field">
              <span className="rv-label">이메일</span>
              <input type="text" defaultValue={reservation.email || sellerDetail?.customerEmail || ""} readOnly={readOnly} />
            </div>
            <div className="rv-field">
              <span className="rv-label">생년월일</span>
              <input type="date" defaultValue={sellerDetail?.customerBirthDate ?? ""} readOnly={readOnly} />
            </div>
            <div className="rv-field">
              <span className="rv-label">성별</span>
              <select defaultValue={sellerDetail?.customerGender ?? ""} disabled={readOnly}>
                <option value="">선택</option>
                <option value="남">남</option>
                <option value="여">여</option>
              </select>
            </div>
            <div className="rv-field">
              <span className="rv-label">비상연락처</span>
              <input type="text" defaultValue="" readOnly={readOnly} />
            </div>
            <div className="rv-field full">
              <span className="rv-label">주소</span>
              <input type="text" defaultValue="-" readOnly={readOnly} />
            </div>
          </div>
        </Panel>

        <Panel
          title="옵션 정보"
          actions={
            <button type="button" className="rv-btn small" onClick={() => onAction("옵션수정")} disabled={readOnly}>
              옵션수정
            </button>
          }
        >
          <div className="rv-table-wrap">
            <table className="rv-table rv-table--option">
              <thead>
                <tr>
                  <th>선택 옵션명</th>
                  <th>적용방식</th>
                  <th>수량</th>
                  <th>옵션금액</th>
                  <th>필수/선택</th>
                </tr>
              </thead>
              <tbody>
                {optionAmount > 0 ? (
                  <tr>
                    <td>보험</td>
                    <td className="center">
                      <span className="rv-badge blue">인원당</span>
                    </td>
                    <td className="center">{optionQty > 0 ? optionQty : "-"}</td>
                    <td className="money">{formatKrw(optionAmount)}</td>
                    <td className="center">
                      <span className="rv-badge orange">필수</span>
                    </td>
                  </tr>
                ) : (
                  <EmptyRow colSpan={5} message="선택된 옵션이 없습니다." />
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      {/* 5. 인원/요금/결제 정보 */}
      <Panel
        title="인원/요금/결제 정보"
        actions={
          <>
            <button type="button" className="rv-btn small" onClick={() => onAction("할인추가")} disabled={readOnly}>
              할인추가
            </button>
            <button type="button" className="rv-btn small" onClick={() => onAction("추가금액")} disabled={readOnly}>
              추가금액
            </button>
            <button type="button" className="rv-btn small" onClick={() => onAction("결제내역")}>
              결제내역
            </button>
          </>
        }
      >
        <div className="rv-money-line">
          <div className="rv-money-box">
            <span>객실타입 -</span>
            <strong>{`대인 ${adult} / 소인 ${child} / 유아 ${infant}`}</strong>
          </div>
          <div className="rv-money-box">
            <span>총 예약금액</span>
            <strong>{reservation.totalAmount}</strong>
          </div>
          <div className="rv-money-box">
            <span>결제완료금액</span>
            <strong>{reservation.paidAmount}</strong>
          </div>
          <div className="rv-money-box due">
            <span>미수금</span>
            <strong>{reservation.unpaidAmount}</strong>
          </div>
        </div>

        <div className="rv-billing-grid">
          <div className="rv-billing-block">
            <div className="rv-billing-title">
              <span>
                요금 산출 <span className="rv-billing-subtitle">예약 당시 금액 고정, 조정금액은 이력 관리</span>
              </span>
            </div>
            <div className="rv-billing-body">
              <table className="rv-fee-table">
                <tbody>
                  <tr>
                    <th>상품금액</th>
                    <td className="money">{formatKrw(reservation.productAmount)}</td>
                  </tr>
                  <tr>
                    <th>옵션금액</th>
                    <td className="money">{formatKrw(optionAmount)}</td>
                  </tr>
                  <tr>
                    <th>할인금액</th>
                    <td className="money red">
                      {reservation.discountAmount > 0 ? `-${formatKrw(reservation.discountAmount)}` : formatKrw(0)}
                    </td>
                  </tr>
                  <tr>
                    <th>추가금액</th>
                    <td className="money green">{formatKrw(0)}</td>
                  </tr>
                  <tr className="total">
                    <th>총 예약금액</th>
                    <td className="money">{reservation.totalAmount}</td>
                  </tr>
                </tbody>
              </table>
              <div className="rv-table-wrap rv-table-wrap--compact">
                <table className="rv-table rv-table--adjust">
                  <thead>
                    <tr>
                      <th>구분</th>
                      <th>사유</th>
                      <th>금액</th>
                      <th>처리자</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reservation.discountAmount > 0 ? (
                      <tr>
                        <td className="center">할인</td>
                        <td>-</td>
                        <td className="money red">{`-${formatKrw(reservation.discountAmount)}`}</td>
                        <td className="center">-</td>
                      </tr>
                    ) : (
                      <EmptyRow colSpan={4} message="조정 내역이 없습니다." />
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="rv-billing-block">
            <div className="rv-billing-title">
              <span>결제/입금 처리</span>
              <span className="rv-badge blue">{paymentStatus}</span>
            </div>
            <div className="rv-billing-body">
              <div className="rv-pay-mini-grid">
                <div className="rv-pay-mini">
                  <span>계약금</span>
                  <strong>{reservation.paidAmount}</strong>
                </div>
                <div className="rv-pay-mini">
                  <span>잔금</span>
                  <strong>{reservation.unpaidAmount}</strong>
                </div>
                <div className="rv-pay-mini">
                  <span>결제상태</span>
                  <strong>{paymentStatus}</strong>
                </div>
                <div className="rv-pay-mini">
                  <span>최근 결제일</span>
                  <strong>{lastPaymentDate || "-"}</strong>
                </div>
              </div>
              <div className="rv-billing-actions">
                <button type="button" className="rv-btn blue small" onClick={() => onAction("카드 수기결제")} disabled={readOnly}>
                  카드 수기결제
                </button>
              </div>
              <div className="rv-table-wrap">
                <table className="rv-table rv-table--payment">
                  <thead>
                    <tr>
                      <th>결제일</th>
                      <th>결제방식</th>
                      <th>구분</th>
                      <th>금액</th>
                      <th>결제상태</th>
                      <th>입금자/승인번호</th>
                      <th>등록구분</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.length > 0 ? (
                      payments.map((payment) => (
                        <tr key={payment.id}>
                          <td className="center">{payment.paidAt || "-"}</td>
                          <td className="center">{payment.method}</td>
                          <td className="center">{payment.status === "결제취소" || payment.status === "부분취소" ? "취소" : "결제"}</td>
                          <td className="money">{formatKrw(payment.amount)}</td>
                          <td className="center">{payment.status}</td>
                          <td className="center">{payment.approvalNumber || payment.paymentNumber || "-"}</td>
                          <td className="center">{payment.processedBy || "-"}</td>
                        </tr>
                      ))
                    ) : (
                      <EmptyRow colSpan={7} message="등록된 결제 내역이 없습니다." />
                    )}
                  </tbody>
                </table>
              </div>
              <div className="rv-memo-row">
                <div className="rv-pay-mini">
                  <span>현금영수증</span>
                  <strong>
                    <button type="button" className="rv-btn small" onClick={() => onAction("현금영수증 신청")} disabled={readOnly}>
                      신청
                    </button>
                  </strong>
                </div>
                <div className="rv-pay-mini">
                  <span>세금계산서</span>
                  <strong className="rv-muted">미신청</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Panel>

      {/* 6. 여행자 정보 */}
      <Panel
        title="여행자 정보"
        actions={
          <>
            <button type="button" className="rv-pill sky" onClick={() => onAction("SMS")}>
              SMS
            </button>
            <button type="button" className="rv-pill purple" onClick={() => onAction("여권보기(V)")}>
              여권보기(V)
            </button>
            <button type="button" className="rv-pill sky" onClick={() => onAction("명단작성")} disabled={readOnly}>
              명단작성
            </button>
            <button type="button" className="rv-pill sky" onClick={() => onAction("명단복사")}>
              명단복사
            </button>
            <button type="button" className="rv-pill orange" onClick={() => onAction("엑셀다운")}>
              엑셀다운
            </button>
            <button type="button" className="rv-pill purple" onClick={() => onAction("여권업로드")} disabled={readOnly}>
              여권업로드
            </button>
          </>
        }
      >
        <div className="rv-table-wrap">
          <table className="rv-table">
            <thead>
              <tr>
                {PAX_COLUMNS.map((column) => (
                  <th key={column}>{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {travelers.map((traveler, index) => (
                <tr key={traveler.key}>
                  <td className="center">{index + 1}</td>
                  <td>
                    <input type="text" defaultValue={traveler.koreanName} readOnly={readOnly} placeholder="한글명" />
                  </td>
                  <td>
                    <input type="text" defaultValue="" readOnly={readOnly} placeholder="성(영문)" />
                  </td>
                  <td>
                    <input type="text" defaultValue="" readOnly={readOnly} placeholder="이름(영문)" />
                  </td>
                  <td>
                    <select defaultValue={traveler.gender} disabled={readOnly}>
                      <option value="">성별</option>
                      <option value="남">남</option>
                      <option value="여">여</option>
                    </select>
                  </td>
                  <td>
                    <input type="text" defaultValue="" readOnly={readOnly} placeholder="국적" />
                  </td>
                  <td>
                    <input type="text" defaultValue="" readOnly={readOnly} placeholder="여권번호" />
                  </td>
                  <td>
                    <input type="text" defaultValue="" readOnly={readOnly} placeholder="유효기간" />
                  </td>
                  <td>
                    <input type="text" defaultValue={traveler.birthDate} readOnly={readOnly} placeholder="생일" />
                  </td>
                  <td>
                    <input type="text" defaultValue={traveler.boarding} readOnly={readOnly} placeholder="탑승지" />
                  </td>
                  <td>
                    <select defaultValue="" disabled={readOnly}>
                      <option value="">보험</option>
                      <option value="가입">가입</option>
                      <option value="미가입">미가입</option>
                    </select>
                  </td>
                  <td>
                    <input type="text" defaultValue="" readOnly={readOnly} placeholder="지자체증빙" />
                  </td>
                  <td className="center">-</td>
                  <td className="center">
                    <button type="button" className="rv-btn small" onClick={() => onAction(`여권 ${index + 1}`)}>
                      여권
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="rv-muted" style={{ marginTop: 8 }}>
          {formatPeopleLabel(reservation.counts)}
        </p>
      </Panel>

      {/* 7. 출금관리 */}
      <Panel title="출금관리">
        <div className="rv-table-wrap">
          <table className="rv-table">
            <thead>
              <tr>
                {OUTPUT_COLUMNS.map((column) => (
                  <th key={column}>{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {withdrawals.length ? (
                withdrawals.map((line, index) => (
                  <tr key={line.id}>
                    <td className="center">{index + 1}</td>
                    <td>{line.itemSpec}</td>
                    <td className="center">1</td>
                    <td className="right">{formatKrw(line.amount)}</td>
                    <td className="right">{formatKrw(line.amount)}</td>
                    <td className="center">-</td>
                    <td className="center">{line.withdrawnAt}</td>
                    <td>-</td>
                    <td>{line.vendorName}</td>
                    <td>{formatWithdrawalVoucher(line.voucherNumber)}</td>
                  </tr>
                ))
              ) : (
                <EmptyRow colSpan={OUTPUT_COLUMNS.length} message="등록된 출금 내역이 없습니다." />
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* 8. 메모 / 첨부 / 발송내역 / 변경 이력 */}
      <div className="rv-order-footer">
        <div className="rv-grid-three rv-order-footer-top">
          <Panel title="관리자 메모">
            <textarea
              className="rv-memo-textarea rv-memo-textarea--panel"
              value={adminMemo}
              onChange={(event) => setAdminMemo(event.target.value)}
              readOnly={readOnly}
              placeholder="내부 메모를 입력하세요"
            />
            <div className="rv-memo-meta">작성자: - · -</div>
          </Panel>
          <Panel title="판매점 공유메모">
            <textarea
              className="rv-memo-textarea rv-memo-textarea--panel"
              value={shareMemo}
              onChange={(event) => setShareMemo(event.target.value)}
              readOnly={readOnly}
              placeholder="판매점 공유 메모를 입력하세요"
            />
            <div className="rv-memo-meta">작성자: - · -</div>
          </Panel>
          <Panel
            title="첨부파일"
            actions={
              <button type="button" className="rv-btn small" onClick={() => onAction("파일 추가")} disabled={readOnly}>
                파일 추가
              </button>
            }
          >
            <div className="rv-list-scroll rv-list-scroll--attach">
              <div className="rv-table-wrap">
                <table className="rv-table rv-table--attach">
                  <thead>
                    <tr>
                      <th>제목</th>
                      <th>파일명</th>
                      <th className="wh130">등록일</th>
                      <th className="wh70">삭제</th>
                    </tr>
                  </thead>
                  <tbody>
                    <EmptyRow colSpan={4} message="등록된 파일이 없습니다." />
                  </tbody>
                </table>
              </div>
            </div>
          </Panel>
        </div>

        <div className="rv-grid-two rv-order-footer-bottom">
          <Panel title="알림톡/문자 발송내역">
            <div className="rv-list-scroll">
              <div className="rv-table-wrap">
                <table className="rv-table rv-table--alram">
                  <thead>
                    <tr>
                      <th>구분</th>
                      <th className="wh100">발송상태</th>
                      <th className="wh140">발송일시</th>
                      <th className="wh100">수신자</th>
                      <th className="wh90">관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    <EmptyRow colSpan={5} message="발송 내역이 없습니다." />
                  </tbody>
                </table>
              </div>
            </div>
          </Panel>
          <Panel title="변경 이력">
            <div className="rv-list-scroll">
              <div className="rv-table-wrap">
                <table className="rv-table rv-table--log">
                  <thead>
                    <tr>
                      <th className="wh130">일시</th>
                      <th>항목</th>
                      <th>변경전</th>
                      <th>변경후</th>
                      <th className="wh90">처리자</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyRows.length > 0 ? (
                      historyRows.map((row) => (
                        <tr key={row.key}>
                          <td className="center">{row.at || "-"}</td>
                          <td>{row.label}</td>
                          <td>{row.before}</td>
                          <td>{row.after}</td>
                          <td className="center">{row.actor}</td>
                        </tr>
                      ))
                    ) : (
                      <EmptyRow colSpan={5} message="변경 이력이 없습니다." />
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </Panel>
        </div>
      </div>

      {/* 9. 저장 바 */}
      <div className="rv-save-bar">
        <div>
          <strong>예약상세 변경사항 저장</strong>
          <span className="rv-muted">예약 기본정보, 예약자 정보, 메모, 금액/결제 처리 결과를 저장하고 변경이력에 기록합니다.</span>{" "}
          <span className="rv-muted" style={{ color: "#d92d20" }}>
            저장하지 않고 이동하면 변경사항이 반영되지 않습니다.
          </span>
        </div>
        <div className="rv-top-actions">
          <button type="button" className="rv-btn" onClick={onBack}>
            목록으로
          </button>
          <button type="button" className="rv-btn green" onClick={onSave} disabled={readOnly}>
            변경사항 저장
          </button>
        </div>
      </div>
    </div>
  );
}
