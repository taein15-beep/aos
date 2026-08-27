"use client";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  LocateFixed,
  MapPin,
  Navigation,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import TourShell from "../_components/TourShell";
import styles from "../tour-mobile.module.css";
import {
  dateTime,
  distance,
  fixtureSpots,
  spotExtras,
  type Spot,
} from "../tour-data";
type Filter =
  | "all"
  | "unverified"
  | "verified"
  | "required"
  | "near"
  | "recommend";
type Progress = {
  spots: Array<{
    spotCode: string;
    verified: number;
    verifiedAt: string | null;
  }>;
};
type Api<T> = { data?: T; error?: { message: string } };
export default function SpotsClient({ tourCode }: { tourCode: string }) {
  const [spots, setSpots] = useState<Spot[]>([]),
    [filter, setFilter] = useState<Filter>("all"),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [position, setPosition] = useState<{ lat: number; lng: number } | null>(
      null,
    );
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const preview = new URLSearchParams(location.search).get("preview");
      if (preview) {
        const count = preview === "complete" ? 5 : 2;
        setSpots(
          fixtureSpots.map((s, i) => ({
            ...s,
            verified: i < count ? 1 : 0,
            verifiedAt: i < count ? `2026-08-${20 - i}T14:20:00+09:00` : null,
          })),
        );
        return;
      }
      const [sr, pr] = await Promise.all([
        fetch(`/api/tour/${tourCode}/spots`),
        fetch(`/api/tour/${tourCode}/me/progress`),
      ]);
      const sj = (await sr.json()) as Api<Spot[]>;
      if (!sr.ok) throw new Error(sj.error?.message);
      const pj = pr.ok ? ((await pr.json()) as Api<Progress>) : null;
      const map = new Map(pj?.data?.spots.map((s) => [s.spotCode, s]));
      setSpots((sj.data ?? []).map((s) => ({ ...s, ...map.get(s.spotCode) })));
    } catch (e) {
      setError(e instanceof Error ? e.message : "관광지를 불러오지 못했어요.");
    } finally {
      setLoading(false);
    }
  }, [tourCode]);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  const sorted = useMemo(() => {
    const list = spots.filter((s) =>
      filter === "unverified"
        ? !s.verified
        : filter === "verified"
          ? !!s.verified
          : filter === "required"
            ? spotExtras[s.spotCode]?.required
            : true,
    );
    if (filter === "recommend")
      list.sort(
        (a, b) =>
          (spotExtras[b.spotCode]?.recommend ?? 0) -
          (spotExtras[a.spotCode]?.recommend ?? 0),
      );
    if (filter === "near" && position)
      list.sort(
        (a, b) =>
          distance(position.lat, position.lng, a.latitude, a.longitude) -
          distance(position.lat, position.lng, b.latitude, b.longitude),
      );
    return list;
  }, [spots, filter, position]);
  const select = (value: Filter) => {
    if (value === "near" && !position) {
      navigator.geolocation?.getCurrentPosition(
        (p) => {
          setPosition({ lat: p.coords.latitude, lng: p.coords.longitude });
          setFilter("near");
        },
        () => setError("위치 권한을 허용하면 가까운 순으로 볼 수 있어요."),
        { enableHighAccuracy: false, timeout: 8000 },
      );
      return;
    }
    setFilter(value);
  };
  return (
    <TourShell tourCode={tourCode} active="spots">
      <header className={styles.top}>
        <div className={styles.topRow}>
          <a
            className={styles.back}
            href={`/tour/${tourCode}`}
            aria-label="투어 홈으로"
          >
            <ArrowLeft />
          </a>
          <div className={styles.title}>
            <small>철원 여행 탐색</small>
            <h1>관광지</h1>
          </div>
        </div>
      </header>
      <main className={styles.content}>
        <section className={styles.summary}>
          <h2>어디부터 둘러볼까요?</h2>
          <p>
            인증 상태와 현재 위치를 기준으로 다음 여행지를 빠르게 찾아보세요.
          </p>
        </section>
        <div className={styles.chips} aria-label="관광지 필터">
          {[
            ["all", "전체"],
            ["unverified", "미인증"],
            ["verified", "인증 완료"],
            ["required", "필수 관광지"],
            ["near", "가까운 순"],
            ["recommend", "추천 순"],
          ].map(([v, l]) => (
            <button
              key={v}
              type="button"
              className={filter === v ? styles.selected : ""}
              aria-pressed={filter === v}
              onClick={() => select(v as Filter)}
            >
              {l}
            </button>
          ))}
        </div>
        {loading ? (
          <State text="관광지를 불러오고 있어요" />
        ) : error && !spots.length ? (
          <State text={error} retry={load} />
        ) : (
          <div className={styles.spotList}>
            {sorted.map((s, index) => {
              const ex = spotExtras[s.spotCode];
              const d = position
                ? distance(position.lat, position.lng, s.latitude, s.longitude)
                : null;
              return (
                <article className={styles.spotCard} key={s.spotCode}>
                  <div className={styles.spotImage}>
                    <Image
                      src={
                        ex?.image ??
                        "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80"
                      }
                      alt={`${s.name} 대표 풍경`}
                      fill
                      priority={index === 0}
                      sizes="(max-width: 480px) 100vw, 480px"
                    />
                    <span
                      className={`${styles.badge} ${!s.verified ? styles.pending : ""}`}
                    >
                      {s.verified ? (
                        <>
                          <CheckCircle2 size={14} />
                          인증 완료
                        </>
                      ) : (
                        <>
                          <Sparkles size={14} />
                          미인증
                        </>
                      )}
                    </span>
                  </div>
                  <div className={styles.spotBody}>
                    <div className={styles.spotHead}>
                      <h2>{s.name}</h2>
                      <span>
                        {d === null
                          ? ex?.required
                            ? "필수 코스"
                            : "추천 코스"
                          : d < 1000
                            ? `${Math.round(d)}m`
                            : `${(d / 1000).toFixed(1)}km`}
                      </span>
                    </div>
                    <div className={styles.meta}>
                      <span>
                        <MapPin size={14} />
                        {s.address}
                      </span>
                      <span>
                        <Clock3 size={14} />
                        {s.opensAt}–{s.closesAt}
                        {s.verifiedAt && ` · ${dateTime(s.verifiedAt)} 인증`}
                      </span>
                    </div>
                    <div className={styles.cardActions}>
                      <a
                        className={styles.secondary}
                        href={`https://map.kakao.com/link/to/${encodeURIComponent(s.name)},${s.latitude},${s.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Navigation size={16} />
                        길찾기
                      </a>
                      <a
                        className={styles.primary}
                        href={`/tour/${tourCode}/spots/${s.spotCode}`}
                      >
                        <LocateFixed size={16} />
                        상세 보기
                      </a>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </TourShell>
  );
}
function State({ text, retry }: { text: string; retry?: () => void }) {
  return (
    <div className={styles.state} role="status">
      <strong>{text}</strong>
      {retry && (
        <button onClick={retry}>
          <RefreshCw size={17} />
          다시 불러오기
        </button>
      )}
    </div>
  );
}
