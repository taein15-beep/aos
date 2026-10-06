"use client";

import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ClipboardList, Minus, Plus, QrCode, Save, X } from "lucide-react";
import { ADMIN_MENU, navigateAdminChild } from "@/lib/admin/navigation";
import {
  PAYMENT_EDIT_STATUS_OPTIONS,
  RESERVE_EDIT_STATUS_OPTIONS,
  calculateReservationAmounts,
  formatKrw,
  getReservationDetail,
  parseKrw,
  paymentStatusBadgeClass,
  reserveStatusBadgeClass,
  addReservationHistory,
  buildReservationEditHistory,
  formatReservationTimestamp,
  saveReservationEdits,
  type ReservationDetail,
} from "@/lib/admin/reservations-data";
import {
  ACTION_ONLY_STATUSES,
  canEditReservation,
  getViewerActor,
  withReservationViewer,
} from "@/lib/admin/reservation-permission";
import { getSettlementRecordByReservation, syncSettlementAfterReservationChange } from "@/lib/admin/settlement-data";
import {
  ReservationPermissionBadges,
  ReservationPermissionNotices,
  ReservationSourceBadge,
  ReservationViewerSwitch,
  useReservationViewer,
} from "@/components/reservations/ReservationSource";

type EditFormState = {
  bookerName: string;
  phone: string;
  email: string;
  productName: string;
  departureAt: string;
  reserveStatus: string;
  paymentStatus: string;
  counts: {
    adult: number;
    child: number;
    infant: number;
  };
  productAmount: number;
  optionAmount: number;
  discountAmount: number;
  paidAmount: number;
  requestNote: string;
  adminMemo: string;
  internalNote: string;
  boardingPoint?: string;
};

function buildFormState(reservation: ReservationDetail): EditFormState {
  return {
    bookerName: reservation.bookerName,
    phone: reservation.phone,
    email: reservation.email,
    productName: reservation.productName,
    departureAt: reservation.departureAt,
    reserveStatus: reservation.reserveStatus,
    paymentStatus: reservation.paymentStatus,
    counts: { ...reservation.counts },
    productAmount: reservation.productAmount,
    optionAmount: reservation.optionAmount,
    discountAmount: reservation.discountAmount,
    paidAmount: parseKrw(reservation.paidAmount),
    requestNote: reservation.requestNote,
    adminMemo: reservation.adminMemo,
    internalNote: reservation.internalNote,
    boardingPoint: reservation.boardingPoint,
  };
}

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="member-web-edit-field member-web-edit-field--readonly">
      <span>{label}</span>
      <div className="member-web-edit-readonly">{value || "-"}</div>
    </div>
  );
}

function CountStepper({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const update = (next: number) => onChange(Math.max(0, next));

  return (
    <label className="member-web-edit-field reservation-count-field">
      <span>{label}</span>
      <div className="reservation-count-stepper">
        <button type="button" className="secondary" onClick={() => update(value - 1)} aria-label={`${label} 감소`}>
          <Minus size={14} />
        </button>
        <input
          type="number"
          min={0}
          value={value}
          onChange={(event) => update(Number(event.target.value) || 0)}
        />
        <button type="button" className="secondary" onClick={() => update(value + 1)} aria-label={`${label} 증가`}>
          <Plus size={14} />
        </button>
      </div>
    </label>
  );
}

function AmountField({
  label,
  value,
  onChange,
  readOnly = false,
}: {
  label: string;
  value: number;
  onChange?: (value: number) => void;
  readOnly?: boolean;
}) {
  if (readOnly) {
    return <ReadonlyField label={label} value={formatKrw(value)} />;
  }

  return (
    <label className="member-web-edit-field">
      <span>{label}</span>
      <input
        type="number"
        min={0}
        step={10000}
        value={value}
        onChange={(event) => onChange?.(Math.max(0, Number(event.target.value) || 0))}
      />
    </label>
  );
}

function ReservationEditForm({
  reservation,
  formRef,
  disabled,
  onCancel,
  onSave,
}: {
  reservation: ReservationDetail;
  formRef: MutableRefObject<EditFormState | null>;
  disabled: boolean;
  onCancel: () => void;
  onSave: () => void;
}) {
  const [form, setForm] = useState<EditFormState>(() => buildFormState(reservation));

  useEffect(() => {
    formRef.current = form;
  }, [form, formRef]);

  const update = <K extends keyof EditFormState>(key: K, value: EditFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const amounts = calculateReservationAmounts(
    form.productAmount,
    form.optionAmount,
    form.discountAmount,
    form.paidAmount,
  );
  const totalAmount = parseKrw(amounts.totalAmount);
  const unpaidAmount = parseKrw(amounts.unpaidAmount);
  const statusOptions = RESERVE_EDIT_STATUS_OPTIONS.filter(
    (option) =>
      !(ACTION_ONLY_STATUSES as readonly string[]).includes(option) || option === reservation.reserveStatus,
  );

  return (
    <div className="member-web-edit-stack">
      <fieldset className="reservation-edit-fieldset" disabled={disabled}>
      <section className="panel member-web-detail-card">
        <div className="member-web-detail-card-head">
          <strong>예약 기본정보</strong>
        </div>
        <div className="member-web-edit-form-body">
          <div className="member-web-edit-form-grid">
            <ReadonlyField label="예약번호" value={reservation.code} />
            <ReadonlyField label="최초 예약일" value={reservation.reservedAt} />
            <label className="member-web-edit-field">
              <span>예약자명</span>
              <input value={form.bookerName} onChange={(e) => update("bookerName", e.target.value)} />
            </label>
            <label className="member-web-edit-field">
              <span>연락처</span>
              <input value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="010-0000-0000" />
            </label>
            <label className="member-web-edit-field">
              <span>이메일</span>
              <input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} />
            </label>
            <label className="member-web-edit-field">
              <span>상품명</span>
              <input value={form.productName} onChange={(e) => update("productName", e.target.value)} />
            </label>
            <label className="member-web-edit-field">
              <span>출발일</span>
              <input type="date" value={form.departureAt} onChange={(e) => update("departureAt", e.target.value)} />
            </label>
            {form.boardingPoint !== undefined && (
              <label className="member-web-edit-field">
                <span>탑승지</span>
                <input value={form.boardingPoint} onChange={(e) => update("boardingPoint", e.target.value)} />
              </label>
            )}
            <label className="member-web-edit-field">
              <span>예약상태</span>
              <select value={form.reserveStatus} onChange={(e) => update("reserveStatus", e.target.value)}>
                {statusOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="member-web-edit-field">
              <span>결제상태</span>
              <select value={form.paymentStatus} onChange={(e) => update("paymentStatus", e.target.value)}>
                {PAYMENT_EDIT_STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </section>

      <section className="panel member-web-detail-card">
        <div className="member-web-detail-card-head">
          <strong>예약 인원</strong>
        </div>
        <div className="member-web-edit-form-body">
          <div className="member-web-edit-form-grid member-web-edit-form-grid--3">
            <CountStepper
              label="성인"
              value={form.counts.adult}
              onChange={(adult) => update("counts", { ...form.counts, adult })}
            />
            <CountStepper
              label="소아"
              value={form.counts.child}
              onChange={(child) => update("counts", { ...form.counts, child })}
            />
            <CountStepper
              label="유아"
              value={form.counts.infant}
              onChange={(infant) => update("counts", { ...form.counts, infant })}
            />
          </div>
        </div>
      </section>

      <section className="panel member-web-detail-card">
        <div className="member-web-detail-card-head">
          <strong>금액정보</strong>
        </div>
        <div className="member-web-edit-form-body">
          <div className="member-web-edit-form-grid">
            <AmountField
              label="상품금액"
              value={form.productAmount}
              onChange={(productAmount) => update("productAmount", productAmount)}
            />
            <AmountField
              label="옵션금액"
              value={form.optionAmount}
              onChange={(optionAmount) => update("optionAmount", optionAmount)}
            />
            <AmountField
              label="할인금액"
              value={form.discountAmount}
              onChange={(discountAmount) => update("discountAmount", discountAmount)}
            />
            <AmountField label="총 예약금액" value={totalAmount} readOnly />
            <AmountField
              label="결제금액"
              value={form.paidAmount}
              onChange={(paidAmount) => update("paidAmount", paidAmount)}
            />
            <AmountField label="미수금" value={unpaidAmount} readOnly />
          </div>
        </div>
      </section>

      <section className="panel member-web-detail-card">
        <div className="member-web-detail-card-head">
          <strong>고객 요청사항</strong>
        </div>
        <div className="member-web-edit-form-body">
          <label className="member-web-edit-field">
            <span>고객 요청사항</span>
            <textarea
              rows={4}
              value={form.requestNote}
              onChange={(e) => update("requestNote", e.target.value)}
              placeholder="고객 요청사항을 입력하세요."
            />
          </label>
        </div>
      </section>

      <section className="panel member-web-detail-card">
        <div className="member-web-detail-card-head">
          <strong>관리자 정보</strong>
        </div>
        <div className="member-web-edit-form-body">
          <div className="member-web-edit-form-grid member-web-edit-form-grid--admin">
            <label className="member-web-edit-field member-web-edit-field--span-3">
              <span>관리자 메모</span>
              <textarea
                rows={3}
                value={form.adminMemo}
                onChange={(e) => update("adminMemo", e.target.value)}
                placeholder="관리자 메모를 입력하세요."
              />
            </label>
            <label className="member-web-edit-field member-web-edit-field--span-3">
              <span>내부관리용 비고</span>
              <textarea
                rows={3}
                value={form.internalNote}
                onChange={(e) => update("internalNote", e.target.value)}
                placeholder="내부 운영 참고 사항을 입력하세요."
              />
            </label>
          </div>
        </div>
      </section>
      </fieldset>

      <div className="member-web-edit-footer">
        <button type="button" className="secondary" onClick={onCancel}>
          <X size={14} />
          {disabled ? "상세로 돌아가기" : "취소"}
        </button>
        <button type="button" className="primary" onClick={onSave} disabled={disabled}>
          <Save size={14} />
          변경사항 저장
        </button>
      </div>
    </div>
  );
}

export default function ReservationEditPage() {
  const params = useParams<{ id: string }>();
  const reservationId = useMemo(() => decodeURIComponent(params.id ?? ""), [params.id]);
  const reservation = useMemo(() => getReservationDetail(reservationId), [reservationId]);

  const [collapsed, setCollapsed] = useState(false);
  const [expanded, setExpanded] = useState(["예약관리"]);
  const [toast, setToast] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const router = useRouter();
  const [viewer, changeViewer] = useReservationViewer();
  const formRef = useRef<EditFormState | null>(null);
  const canEdit = reservation ? canEditReservation({ reservation, viewer }) : false;

  const act = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  };

  const toggleMenu = (label: string) =>
    setExpanded((value) => (value.includes(label) ? value.filter((item) => item !== label) : [...value, label]));

  const goDetail = () =>
    router.push(withReservationViewer(`/reservations/${reservation?.code ?? reservationId}`, viewer));

  const handleSave = () => {
    const form = formRef.current;
    if (!reservation || !form) return;
    if (!canEdit) {
      act("이 예약의 수정권한이 없습니다.");
      return;
    }
    const amounts = calculateReservationAmounts(
      form.productAmount,
      form.optionAmount,
      form.discountAmount,
      form.paidAmount,
    );
    const source = reservation.source ? { ...reservation.source, lastModifiedBy: viewer.agencyName } : undefined;
    const nextValues = {
      ...form,
      counts: { ...form.counts },
      paidAmount: amounts.paidAmount,
    };
    const actor = getViewerActor(viewer);
    const savedAt = formatReservationTimestamp(new Date());
    const historyEntries = buildReservationEditHistory(reservation, nextValues, actor, savedAt);
    if (historyEntries.length === 0) {
      act("변경된 항목이 없습니다.");
      return;
    }
    const settlementBefore = getSettlementRecordByReservation(reservation.code);
    saveReservationEdits(reservation.code, {
      boardingPoint: form.boardingPoint,
      bookerName: form.bookerName,
      phone: form.phone,
      email: form.email,
      productName: form.productName,
      departureAt: form.departureAt,
      reserveStatus: form.reserveStatus,
      reserveStatusClass: reserveStatusBadgeClass(form.reserveStatus),
      paymentStatus: form.paymentStatus,
      paymentStatusClass: paymentStatusBadgeClass(form.paymentStatus),
      counts: { ...form.counts },
      productAmount: form.productAmount,
      optionAmount: form.optionAmount,
      discountAmount: form.discountAmount,
      ...amounts,
      requestNote: form.requestNote,
      adminMemo: form.adminMemo,
      internalNote: form.internalNote,
      source,
    });
    addReservationHistory(reservation.code, historyEntries);
    if (settlementBefore) syncSettlementAfterReservationChange(settlementBefore, actor, savedAt);
    act("예약 정보를 저장했습니다.");
    window.setTimeout(() => goDetail(), 900);
  };

  if (!reservation) {
    return (
      <div className={`app-shell ${collapsed ? "is-collapsed" : ""}`}>
        <main className="content member-web-detail-content">
          <section className="panel member-web-detail-not-found">
            <strong>예약을 찾을 수 없습니다.</strong>
            <p>요청하신 예약번호({reservationId || "-"})에 해당하는 예약 정보가 없습니다.</p>
            <button type="button" className="secondary" onClick={() => window.location.assign("/reservations")}>
              <ArrowLeft size={14} />
              목록으로 돌아가기
            </button>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className={`app-shell ${collapsed ? "is-collapsed" : ""}`}>
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">A</div>
          <div className="brand-copy">
            <strong>AOS</strong>
            <span>TRAVEL ERP</span>
          </div>
          <button className="collapse" onClick={() => setCollapsed(!collapsed)} aria-label="사이드바 접기">
            ‹
          </button>
        </div>
        <nav aria-label="관리자 메뉴">
          {ADMIN_MENU.map((item) => (
            <div className="nav-group" key={item.label}>
              <button
                className={`nav-item ${item.label === "예약관리" ? "active" : ""}`}
                onClick={() =>
                  item.label === "대시보드"
                    ? window.location.assign("/")
                    : item.children
                      ? toggleMenu(item.label)
                      : act(`${item.label} 화면으로 이동합니다.`)
                }
              >
                <span className="nav-icon">
                  {item.icon === "qr" ? <QrCode size={16} strokeWidth={1.8} /> : item.icon}
                </span>
                <span className="nav-label">{item.label}</span>
                {item.children && <span className={`chevron ${expanded.includes(item.label) ? "open" : ""}`}>⌄</span>}
              </button>
              {item.children && expanded.includes(item.label) && !collapsed && (
                <div className="subnav">
                  {item.children.map((child) => (
                    <button key={child} onClick={() => navigateAdminChild(child, act)}>
                      {child}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
        <div className="sidebar-help">
          <span className="nav-icon">?</span>
          <div>
            <strong>업무지원센터</strong>
            <p>평일 09:00–18:00</p>
          </div>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <span>예약관리</span>
            <b>/</b>
            <span>예약목록</span>
            <b>/</b>
            <span>예약상세</span>
            <b>/</b>
            <strong>예약수정</strong>
          </div>
          <div className="top-actions">
            <label className="search">
              <span>⌕</span>
              <input aria-label="빠른 검색" placeholder="예약번호, 고객명, 상품명 검색" />
              <kbd>⌘ K</kbd>
            </label>
            <button className="icon-btn" title="업무지원" onClick={() => act("업무지원센터를 엽니다.")}>
              ?
            </button>
            <div className="dropdown-wrap">
              <button
                className="icon-btn notice"
                aria-label="알림"
                onClick={() => {
                  setNoticeOpen(!noticeOpen);
                  setProfileOpen(false);
                }}
              >
                ♢<i>5</i>
              </button>
              {noticeOpen && (
                <div className="dropdown notice-menu">
                  <div className="drop-head">
                    <strong>알림</strong>
                    <button onClick={() => setNoticeOpen(false)}>모두 읽음</button>
                  </div>
                  <button>예약 확정 요청 2건</button>
                  <button>결제 대기 1건</button>
                </div>
              )}
            </div>
            <div className="dropdown-wrap">
              <button
                className="profile"
                onClick={() => {
                  setProfileOpen(!profileOpen);
                  setNoticeOpen(false);
                }}
              >
                <span className="avatar">장</span>
                <span>
                  <b>애비아넥스트</b>
                  <small>관리자 장윤호</small>
                </span>
                <em>⌄</em>
              </button>
              {profileOpen && (
                <div className="dropdown profile-menu">
                  <button>내 정보</button>
                  <button>환경설정</button>
                  <hr />
                  <button className="logout">로그아웃</button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="content member-web-detail-content member-web-edit-content reservation-edit-content">
          <section className="page-head member-web-detail-page-head">
            <div>
              <p className="member-web-breadcrumb">예약관리 &gt; 예약목록 &gt; 예약상세 &gt; 예약수정</p>
              <div className="member-web-detail-title-row">
                <h1>{reservation.code}</h1>
                <span className={`badge ${reserveStatusBadgeClass(reservation.reserveStatus)}`}>
                  {reservation.reserveStatus}
                </span>
                <ReservationSourceBadge reservation={reservation} />
                <ReservationPermissionBadges reservation={reservation} viewer={viewer} />
              </div>
              <p className="member-web-detail-subtitle">{reservation.productName}</p>
            </div>
            <div className="member-web-detail-actions">
              <ReservationViewerSwitch viewer={viewer} onChange={changeViewer} />
              <button type="button" className="secondary" onClick={goDetail}>
                <X size={14} />
                취소
              </button>
              <button type="button" className="primary" onClick={handleSave} disabled={!canEdit}>
                <Save size={14} />
                변경사항 저장
              </button>
            </div>
          </section>

          <section className="panel member-web-detail-hero">
            <div className="member-web-detail-identity">
              <span className="member-web-detail-avatar">
                <ClipboardList size={23} />
              </span>
              <div>
                <div className="member-web-detail-code-row">
                  <span>{reservation.code}</span>
                  <span className={`badge ${reserveStatusBadgeClass(reservation.reserveStatus)}`}>
                    {reservation.reserveStatus}
                  </span>
                  <span className={`badge ${paymentStatusBadgeClass(reservation.paymentStatus)}`}>
                    {reservation.paymentStatus}
                  </span>
                </div>
                <h2>{reservation.productName}</h2>
                <p>
                  {reservation.bookerName} · {reservation.phone} · 출발 {reservation.departureAt}
                </p>
              </div>
            </div>
          </section>

          <ReservationPermissionNotices reservation={reservation} viewer={viewer} />

          <ReservationEditForm
            reservation={reservation}
            formRef={formRef}
            disabled={!canEdit}
            onCancel={goDetail}
            onSave={handleSave}
          />
        </main>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
