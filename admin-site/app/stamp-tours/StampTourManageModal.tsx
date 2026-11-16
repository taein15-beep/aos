"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ClipboardList, Eye, Gift, GripVertical, Info, LayoutGrid, MapPin, QrCode, RefreshCw, Trophy, UserRound } from "lucide-react";

export type ManageTour = {
  id: number;
  code: string;
  name: string;
  start: string;
  end: string;
  spots: number;
  condition: string;
  status: string;
  created: string;
};

type Spot = {
  id: string;
  name: string;
  code: string;
  address: string;
  today: number;
  total: number;
  status: "운영 중" | "일시중지";
};

type Prize = {
  id: string;
  name: string;
  description: string;
  image: "gift" | "rice" | "box" | "souvenir" | "donut" | "voucher";
  method: { kind: "spot"; spotName: string } | { kind: "text"; label: string };
  enabled: boolean;
  goal: number;
};

const managers: Record<number, string> = {
  107: "서울사무실 · 주우석",
};

const updatedAt: Record<number, string> = {
  107: "2026.11.11 11:10",
};

const unlinkedSpots: Spot[] = [
  { id: "SPOT-107", name: "고석정", code: "SPOT-107", address: "서울 금천구 가산디지털1로 142", today: 0, total: 0, status: "운영 중" },
  { id: "SPOT-119", name: "고석정", code: "SPOT-119", address: "강원특별자치도 철원군 동송읍 태봉로 1825 고석정", today: 0, total: 0, status: "운영 중" },
  { id: "SPOT-105", name: "노동당사", code: "SPOT-105", address: "서울 금천구 가산디지털1로 142", today: 0, total: 0, status: "운영 중" },
  { id: "SPOT-117", name: "대암홀스랜드", code: "SPOT-117", address: "강원특별자치도 철원군 갈말읍 태봉로 871 대암홀스랜드 승마장", today: 0, total: 0, status: "운영 중" },
  { id: "SPOT-106", name: "백마고지", code: "SPOT-106", address: "서울 금천구 가산디지털1로 142", today: 0, total: 0, status: "운영 중" },
  { id: "SPOT-115", name: "샘통고추냉이", code: "SPOT-115", address: "강원특별자치도 철원군 철원읍 금강산로 23", today: 0, total: 0, status: "운영 중" },
  { id: "솔향기", name: "솔향기", code: "", address: "", today: 0, total: 0, status: "운영 중" },
];

const sampleSpots: Spot[] = [
  { id: "s1", name: "테스트 관광지1", code: "SPOT-109", address: "서울 금천구 가산디지털1로 142", today: 0, total: 2, status: "일시중지" },
  { id: "s2", name: "테스트 관광지2", code: "SPOT-110", address: "서울 금천구 가산디지털1로 142", today: 0, total: 3, status: "운영 중" },
  { id: "s3", name: "테스트 관광지3", code: "SPOT-111", address: "서울 금천구 가산디지털1로 142", today: 0, total: 0, status: "운영 중" },
  { id: "s4", name: "테스트 관광지4", code: "SPOT-112", address: "서울 금천구 가산디지털1로 142", today: 0, total: 0, status: "운영 중" },
  { id: "s5", name: "테스트 관광지5", code: "SPOT-113", address: "서울 금천구 가산디지털1로 142", today: 0, total: 0, status: "운영 중" },
  { id: "s6", name: "테스트 관광지6", code: "SPOT-114", address: "서울 금천구 가산디지털1로 142", today: 0, total: 0, status: "운영 중" },
];

const unlinkedPrizes: Prize[] = [
  { id: "prize-souvenir", name: "철원 관광기념품 세트", description: "철원 대표 관광지를 담은 기념품 세트입니다.", image: "souvenir", method: { kind: "spot", spotName: "" }, enabled: true, goal: 1 },
  { id: "prize-donut", name: "철원 단풍도넛", description: "맛있는 단풍도넛", image: "donut", method: { kind: "spot", spotName: "" }, enabled: true, goal: 1 },
  { id: "prize-voucher", name: "철원사랑상품권 3만원", description: "철원군 관내 가맹점에서 사용할 수 있습니다.", image: "voucher", method: { kind: "spot", spotName: "" }, enabled: true, goal: 1 },
];

const samplePrizes: Prize[] = [
  { id: "p1", name: "기프티콘 이용권", description: "이모티콘 플러스 14일권", image: "gift", method: { kind: "spot", spotName: "테스트 관광지1" }, enabled: true, goal: 3 },
  { id: "p2", name: "철원오대쌀 4Kg", description: "철원에서 재배한 오대쌀 4kg 상품입니다.", image: "rice", method: { kind: "text", label: "택배" }, enabled: true, goal: 4 },
  { id: "p3", name: "테스트 경품1", description: "테스트 경품입니다.", image: "box", method: { kind: "spot", spotName: "테스트 관광지2" }, enabled: true, goal: 5 },
];

function dotDate(value: string) {
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${year}.${month}.${day}`;
}

function conditionText(condition: string, spots: number) {
  if (/곳\s*전체/.test(condition)) return spots ? `${spots}곳 전체` : condition;
  const match = condition.match(/(\d+)곳\s*중\s*(\d+)곳/);
  if (match) return `${match[1]}곳 중 ${match[2]}곳 이상`;
  return condition || "-";
}

function moveItem<T extends { id: string }>(items: T[], fromId: string, toId: string) {
  const from = items.findIndex((item) => item.id === fromId);
  const to = items.findIndex((item) => item.id === toId);
  if (from < 0 || to < 0 || from === to) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function prizeThumb(kind: Prize["image"]) {
  const svg =
    kind === "gift"
      ? `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72"><rect width="72" height="72" fill="#fff4c2"/><rect x="14" y="24" width="44" height="30" rx="4" fill="#fb7185"/><rect x="32" y="24" width="8" height="30" fill="#fde68a"/><rect x="14" y="35" width="44" height="8" fill="#fde68a"/><circle cx="24" cy="18" r="5" fill="#38bdf8"/><circle cx="36" cy="14" r="5" fill="#f59e0b"/><circle cx="48" cy="18" r="5" fill="#a78bfa"/></svg>`
      : kind === "rice"
        ? `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72"><rect width="72" height="72" fill="#f8fafc"/><rect x="20" y="12" width="32" height="48" rx="5" fill="#4d7c0f"/><rect x="24" y="20" width="24" height="16" rx="2" fill="#ecfccb"/><text x="36" y="32" text-anchor="middle" font-size="9" fill="#3f6212" font-family="sans-serif">쌀</text><rect x="26" y="42" width="20" height="3" rx="1" fill="#d9f99d"/></svg>`
        : kind === "donut"
          ? `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72"><rect width="72" height="72" fill="#f8fafc"/><circle cx="36" cy="36" r="22" fill="#c2410c"/><circle cx="36" cy="36" r="16" fill="#f59e0b"/><circle cx="36" cy="36" r="7" fill="#f8fafc"/><circle cx="28" cy="28" r="2" fill="#fde68a"/><circle cx="44" cy="30" r="2" fill="#fff"/><circle cx="40" cy="44" r="2" fill="#fde68a"/></svg>`
          : kind === "voucher"
            ? `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72"><rect width="72" height="72" fill="#fff"/><rect x="16" y="18" width="40" height="36" rx="3" fill="#fff" stroke="#ef4444" stroke-width="3"/><text x="36" y="34" text-anchor="middle" font-size="11" font-weight="700" fill="#ef4444" font-family="sans-serif">30,000</text><text x="36" y="46" text-anchor="middle" font-size="7" fill="#ef4444" font-family="sans-serif">철원사랑</text></svg>`
            : kind === "souvenir"
              ? `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72"><rect width="72" height="72" rx="16" fill="#e8f1ff"/><rect x="22" y="30" width="28" height="20" rx="3" fill="#2563eb"/><rect x="33" y="30" width="6" height="20" fill="#93c5fd"/><rect x="22" y="37" width="28" height="6" fill="#93c5fd"/><path d="M30 30c0-6 12-6 12 0" fill="none" stroke="#2563eb" stroke-width="3"/></svg>`
              : `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72"><rect width="72" height="72" fill="#f8fafc"/><rect x="16" y="26" width="40" height="30" rx="3" fill="#ef4444"/><rect x="16" y="26" width="40" height="9" fill="#b91c1c"/><rect x="33" y="26" width="6" height="30" fill="#fecaca"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export default function StampTourManageModal({
  tour,
  isPublic,
  onClose,
}: {
  tour: ManageTour;
  isPublic: boolean;
  onClose: () => void;
}) {
  const initialSpots = tour.id === 107 ? sampleSpots : [];
  const initialPrizes = tour.id === 107 ? samplePrizes : [];
  const [spots, setSpots] = useState(initialSpots);
  const [prizes, setPrizes] = useState(initialPrizes);
  const [dragId, setDragId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [pickerNote, setPickerNote] = useState("");
  const [prizePickerOpen, setPrizePickerOpen] = useState(false);
  const [selectedPrizeIds, setSelectedPrizeIds] = useState<string[]>([]);
  const [prizeSpotMap, setPrizeSpotMap] = useState<Record<string, string>>({});
  const [prizePickerNote, setPrizePickerNote] = useState("");
  const [updated, setUpdated] = useState(updatedAt[tour.id] || `${dotDate(tour.created)} 09:00`);
  const tell = (message: string) => {
    setNote(message);
    window.setTimeout(() => setNote(""), 2200);
  };
  const availableSpots = unlinkedSpots.filter((spot) => !spots.some((row) => row.code === spot.code));

  useEffect(() => {
    if (!pickerOpen && !prizePickerOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopImmediatePropagation();
      setPickerOpen(false);
      setPrizePickerOpen(false);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [pickerOpen, prizePickerOpen]);

  const openPicker = () => {
    setSelectedCodes([]);
    setPickerNote("");
    setPickerOpen(true);
  };

  const registerSelected = () => {
    const chosen = availableSpots.filter((spot) => selectedCodes.includes(spot.id));
    if (!chosen.length) {
      setPickerNote("등록할 관광지를 선택해 주세요.");
      return;
    }
    setSpots((rows) => [...rows, ...chosen]);
    setPickerOpen(false);
    tell(`${chosen.length}곳의 관광지를 등록했습니다.`);
  };

  const availablePrizes = unlinkedPrizes.filter((prize) => !prizes.some((row) => row.id === prize.id));

  const openPrizePicker = () => {
    setSelectedPrizeIds([]);
    setPrizeSpotMap({});
    setPrizePickerNote("");
    setPrizePickerOpen(true);
  };

  const registerPrizes = () => {
    const chosen = availablePrizes.filter((prize) => selectedPrizeIds.includes(prize.id));
    if (!chosen.length) {
      setPrizePickerNote("등록할 경품을 선택해 주세요.");
      return;
    }
    if (chosen.some((prize) => !prizeSpotMap[prize.id])) {
      setPrizePickerNote("수령 관광지를 선택해 주세요.");
      return;
    }
    setPrizes((rows) => [
      ...rows,
      ...chosen.map((prize) => ({ ...prize, method: { kind: "spot" as const, spotName: prizeSpotMap[prize.id] } })),
    ]);
    setPrizePickerOpen(false);
    tell(`${chosen.length}개의 경품을 등록했습니다.`);
  };

  const placeCount = spots.length || tour.spots;
  const summary = conditionText(tour.condition, tour.spots);
  const period = `${dotDate(tour.start)} ~ ${dotDate(tour.end)}`;
  const manager = managers[tour.id] || "—";
  const running = tour.status === "운영 중";
  const spotNames = useMemo(() => spots.map((spot) => spot.name), [spots]);

  return (
    <div className="stamp-manage-layer" role="dialog" aria-modal="true" aria-label="스탬프투어 관광지 관리">
      <button type="button" className="stamp-manage-backdrop" aria-label="닫기" onClick={onClose} />
      <div className="stamp-manage-modal">
        <header className="stamp-manage-head">
          <strong>
            <ClipboardList size={16} />
            스탬프투어 관광지 관리
          </strong>
          <button type="button" onClick={onClose} aria-label="닫기">
            ×
          </button>
        </header>
        <div className="stamp-manage-scroll">
          <section className="stamp-manage-hero">
            <div className="stamp-manage-mark">
              <LayoutGrid size={18} />
            </div>
            <div>
              <div className="stamp-manage-code">
                <span>{tour.code}</span>
                <em className={running ? "is-run" : "is-stop"}>{running ? "운영 중" : tour.status}</em>
                <b>
                  <Eye size={12} />
                  {isPublic ? "공개" : "비공개"}
                </b>
              </div>
              <h2>{tour.name}</h2>
              <p>
                운영기간 {period} · 관광지 {placeCount}곳 · {summary} 인증
              </p>
            </div>
          </section>

          <section className="stamp-manage-panel">
            <header>
              <div>
                <h3>운영정보</h3>
                <p>현재 적용 중인 투어 운영 기준</p>
              </div>
              <div className="stamp-manage-updated">
                최종 업데이트 {updated}
                <button
                  type="button"
                  aria-label="새로고침"
                  onClick={() => {
                    const now = new Date();
                    const pad = (value: number) => String(value).padStart(2, "0");
                    setUpdated(`${now.getFullYear()}.${pad(now.getMonth() + 1)}.${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`);
                    tell("운영정보를 새로고침했습니다.");
                  }}
                >
                  <RefreshCw size={14} />
                </button>
              </div>
            </header>
            <div className="stamp-manage-facts">
              <div>
                <span>
                  <CalendarDays size={14} />
                  운영기간
                </span>
                <strong>{period}</strong>
              </div>
              <div>
                <span>
                  <LayoutGrid size={14} />
                  관광지 수
                </span>
                <strong>총 {placeCount}곳</strong>
              </div>
              <div>
                <span>
                  <Trophy size={14} />
                  완주조건
                </span>
                <strong>{summary}</strong>
              </div>
              <div>
                <span>
                  <MapPin size={14} />
                  인증 반경
                </span>
                <strong>관광지 기준 100m</strong>
              </div>
              <div>
                <span>
                  <Gift size={14} />
                  경품 신청기간
                </span>
                <strong>{period}</strong>
              </div>
              <div>
                <span>
                  <UserRound size={14} />
                  담당자
                </span>
                <strong>{manager}</strong>
              </div>
            </div>
          </section>

          <section className="stamp-manage-panel">
            <header>
              <div>
                <h3>
                  관광지 진행 요약 <Info size={14} />
                </h3>
                <p>오늘 QR 및 인증 운영상태를 관광지별로 확인합니다.</p>
              </div>
              <button type="button" className="stamp-manage-outline" onClick={openPicker}>
                관광지 등록
              </button>
            </header>
            <div className="stamp-manage-table-wrap">
              <table className="stamp-manage-table">
                <colgroup>
                  <col className="col-grip" />
                  <col className="col-no" />
                  <col className="col-name" />
                  <col />
                  <col className="col-count" />
                  <col className="col-count" />
                  <col className="col-state" />
                  <col className="col-qr" />
                  <col className="col-delete" />
                </colgroup>
                <thead>
                  <tr>
                    <th />
                    <th>NO.</th>
                    <th>관광지명</th>
                    <th>주소</th>
                    <th>오늘 인증</th>
                    <th>누적 인증</th>
                    <th>운영상태</th>
                    <th>QR 생성</th>
                    <th>삭제</th>
                  </tr>
                </thead>
                <tbody>
                  {spots.length ? (
                    spots.map((spot, index) => (
                      <tr
                        key={spot.id}
                        draggable
                        onDragStart={() => setDragId(spot.id)}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={() => {
                          if (dragId) setSpots((rows) => moveItem(rows, dragId, spot.id));
                          setDragId(null);
                        }}
                      >
                        <td>
                          <GripVertical size={14} />
                        </td>
                        <td>{index + 1}</td>
                        <td className="name-cell">
                          <b>{spot.name}</b>
                          <small>{spot.code}</small>
                        </td>
                        <td className="address-cell">
                          <MapPin size={13} />
                          <span>{spot.address}</span>
                        </td>
                        <td className="count-cell">{spot.today}</td>
                        <td className="count-cell">{spot.total}</td>
                        <td>
                          <em className={spot.status === "운영 중" ? "is-run" : "is-pause"}>{spot.status}</em>
                        </td>
                        <td>
                          <button type="button" className="stamp-manage-qr" onClick={() => tell(`${spot.name} QR을 생성했습니다.`)}>
                            <QrCode size={13} /> QR 생성
                          </button>
                        </td>
                        <td>
                          <button type="button" className="stamp-manage-delete" onClick={() => setSpots((rows) => rows.filter((row) => row.id !== spot.id))}>
                            삭제
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="stamp-manage-empty">
                        등록된 관광지가 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="stamp-manage-panel">
            <header>
              <div>
                <h3>
                  경품 진행 요약 <Info size={14} />
                </h3>
                <p>경품별 목표 인증 수와 수령 조건을 설정합니다.</p>
              </div>
              <button type="button" className="stamp-manage-outline" onClick={openPrizePicker}>
                경품 등록
              </button>
            </header>
            <div className="stamp-manage-table-wrap">
              <table className="stamp-manage-table prize-table">
                <colgroup>
                  <col className="col-no" />
                  <col className="col-prize" />
                  <col />
                  <col className="col-method" />
                  <col className="col-use" />
                  <col className="col-goal" />
                  <col className="col-delete" />
                </colgroup>
                <thead>
                  <tr>
                    <th>NO.</th>
                    <th>경품명</th>
                    <th>경품설명</th>
                    <th>수령방법</th>
                    <th>사용여부</th>
                    <th>목표 인증</th>
                    <th>삭제</th>
                  </tr>
                </thead>
                <tbody>
                  {prizes.length ? (
                    prizes.map((prize, index) => (
                      <tr key={prize.id}>
                        <td>{index + 1}</td>
                        <td className="prize-name">
                          <span className="prize-cell">
                            <img src={prizeThumb(prize.image)} alt="" />
                            <b>{prize.name}</b>
                          </span>
                        </td>
                        <td className="desc-cell">{prize.description}</td>
                        <td>
                          {prize.method.kind === "text" ? (
                            <span className="method-text">{prize.method.label}</span>
                          ) : (
                            <select
                              aria-label={`${prize.name} 수령방법`}
                              value={prize.method.spotName}
                              onChange={(event) =>
                                setPrizes((rows) =>
                                  rows.map((row) => (row.id === prize.id ? { ...row, method: { kind: "spot", spotName: event.target.value } } : row)),
                                )
                              }
                            >
                              {(spotNames.includes(prize.method.spotName) ? spotNames : [prize.method.spotName, ...spotNames]).map((name) => (
                                <option key={name}>{name}</option>
                              ))}
                            </select>
                          )}
                        </td>
                        <td>
                          <button
                            type="button"
                            className={`manage-switch ${prize.enabled ? "on" : ""}`}
                            role="switch"
                            aria-checked={prize.enabled}
                            aria-label={`${prize.name} 사용여부`}
                            onClick={() => setPrizes((rows) => rows.map((row) => (row.id === prize.id ? { ...row, enabled: !row.enabled } : row)))}
                          >
                            <i />
                          </button>
                        </td>
                        <td className="goal-cell">
                          <input
                            aria-label={`${prize.name} 목표 인증`}
                            type="number"
                            min={0}
                            value={prize.goal}
                            onChange={(event) =>
                              setPrizes((rows) =>
                                rows.map((row) => (row.id === prize.id ? { ...row, goal: Math.max(0, Number(event.target.value) || 0) } : row)),
                              )
                            }
                          />
                          <span>/ {placeCount}곳</span>
                        </td>
                        <td>
                          <button type="button" className="stamp-manage-delete" onClick={() => setPrizes((rows) => rows.filter((row) => row.id !== prize.id))}>
                            삭제
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="stamp-manage-empty">
                        등록된 경품이 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
        {note && <div className="stamp-manage-note">{note}</div>}
      </div>
      {pickerOpen && (
        <div className="stamp-spot-picker-layer">
          <button type="button" className="stamp-spot-picker-backdrop" aria-label="닫기" onClick={() => setPickerOpen(false)} />
          <div className="stamp-spot-picker" role="dialog" aria-modal="true" aria-label="관광지 등록">
            <header>
              <h3>관광지 등록</h3>
              <button type="button" aria-label="닫기" onClick={() => setPickerOpen(false)}>
                ×
              </button>
            </header>
            <p>이 투어에 아직 연결되지 않은 관광지를 선택해 등록합니다.</p>
            <div className="stamp-spot-picker-list">
              {availableSpots.length ? (
                availableSpots.map((spot) => {
                  const checked = selectedCodes.includes(spot.id);
                  return (
                    <label key={spot.id} className={checked ? "is-checked" : ""}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setSelectedCodes((codes) => (codes.includes(spot.id) ? codes.filter((id) => id !== spot.id) : [...codes, spot.id]))
                        }
                      />
                      <span>
                        <b>{spot.name}</b>
                        {(spot.code || spot.address) && (
                          <small>
                            {spot.code}
                            {spot.code && spot.address ? " · " : ""}
                            {spot.address}
                          </small>
                        )}
                      </span>
                    </label>
                  );
                })
              ) : (
                <div className="stamp-spot-picker-empty">연결할 수 있는 관광지가 없습니다.</div>
              )}
            </div>
            <footer>
              {pickerNote && <span className="stamp-spot-picker-note">{pickerNote}</span>}
              <button type="button" className="stamp-spot-picker-cancel" onClick={() => setPickerOpen(false)}>
                취소
              </button>
              <button type="button" className="stamp-spot-picker-submit" onClick={registerSelected}>
                선택 등록
              </button>
            </footer>
          </div>
        </div>
      )}
      {prizePickerOpen && (
        <div className="stamp-spot-picker-layer">
          <button type="button" className="stamp-spot-picker-backdrop" aria-label="닫기" onClick={() => setPrizePickerOpen(false)} />
          <div className="stamp-spot-picker stamp-prize-picker" role="dialog" aria-modal="true" aria-label="경품 등록">
            <header>
              <h3>경품 등록</h3>
              <button type="button" aria-label="닫기" onClick={() => setPrizePickerOpen(false)}>
                ×
              </button>
            </header>
            <p>이 투어에 아직 연결되지 않은 경품을 선택해 등록합니다.</p>
            <div className="stamp-prize-picker-list">
              {availablePrizes.length ? (
                availablePrizes.map((prize) => {
                  const checked = selectedPrizeIds.includes(prize.id);
                  return (
                    <div key={prize.id} className={`stamp-prize-picker-card ${checked ? "is-checked" : ""}`}>
                      <input
                        type="checkbox"
                        aria-label={prize.name}
                        checked={checked}
                        onChange={() =>
                          setSelectedPrizeIds((ids) => (ids.includes(prize.id) ? ids.filter((id) => id !== prize.id) : [...ids, prize.id]))
                        }
                      />
                      <div>
                        {prize.image === "souvenir" ? (
                          <span className="stamp-prize-picker-icon">
                            <Gift size={22} />
                          </span>
                        ) : (
                          <img src={prizeThumb(prize.image)} alt="" />
                        )}
                        <b>{prize.name}</b>
                        <small>현장수령 · {prize.description}</small>
                        <em>수령 관광지</em>
                        <select
                          aria-label={`${prize.name} 수령 관광지`}
                          value={prizeSpotMap[prize.id] || ""}
                          onChange={(event) => setPrizeSpotMap((current) => ({ ...current, [prize.id]: event.target.value }))}
                        >
                          <option value="">수령 관광지 선택</option>
                          {spotNames.map((name, index) => (
                            <option key={`${prize.id}-${name}-${index}`}>{name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="stamp-spot-picker-empty">연결할 수 있는 경품이 없습니다.</div>
              )}
            </div>
            <footer>
              {prizePickerNote && <span className="stamp-spot-picker-note">{prizePickerNote}</span>}
              <button type="button" className="stamp-spot-picker-cancel" onClick={() => setPrizePickerOpen(false)}>
                취소
              </button>
              <button type="button" className="stamp-spot-picker-submit" onClick={registerPrizes}>
                선택 등록
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
