"use client";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  CalendarOff,
  CheckCircle2,
  Clock3,
  Info,
  Map,
  MapPin,
  Navigation,
  Phone,
  QrCode,
  RefreshCw,
  ScanLine,
} from "lucide-react";
import TourShell from "../../_components/TourShell";
import styles from "../../tour-mobile.module.css";
import { dateTime, fixtureSpots, spotExtras, type Spot } from "../../tour-data";
type Api<T> = { data?: T; error?: { message: string } };
export default function SpotDetailClient({
  tourCode,
  spotCode,
}: {
  tourCode: string;
  spotCode: string;
}) {
  const [spot, setSpot] = useState<Spot | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const preview = new URLSearchParams(location.search).get("preview");
      if (preview) {
        const found =
          fixtureSpots.find((s) => s.spotCode === spotCode) ?? fixtureSpots[0];
        setSpot({
          ...found,
          verified: preview === "verified" ? 1 : 0,
          verifiedAt:
            preview === "verified" ? "2026-08-20T14:20:00+09:00" : null,
        });
        return;
      }
      const [sr, pr] = await Promise.all([
        fetch(`/api/tour/${tourCode}/spots/${spotCode}`),
        fetch(`/api/tour/${tourCode}/me/progress`),
      ]);
      const sj = (await sr.json()) as Api<Spot>;
      if (!sr.ok) throw new Error(sj.error?.message);
      const pj = pr.ok ? ((await pr.json()) as Api<{ spots: Spot[] }>) : null;
      const status = pj?.data?.spots.find((s) => s.spotCode === spotCode);
      setSpot({ ...sj.data!, ...status });
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "관광지 정보를 불러오지 못했어요.",
      );
    } finally {
      setLoading(false);
    }
  }, [tourCode, spotCode]);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  if (loading || error || !spot)
    return (
      <TourShell tourCode={tourCode} active="spots">
        <div className={styles.state}>
          <strong>
            {loading
              ? "관광지 정보를 준비하고 있어요"
              : error || "관광지를 찾을 수 없어요"}
          </strong>
          {!loading && (
            <button onClick={load}>
              <RefreshCw size={17} />
              다시 불러오기
            </button>
          )}
        </div>
      </TourShell>
    );
  const ex = spotExtras[spot.spotCode];
  return (
    <TourShell tourCode={tourCode} active="spots">
      <div className={styles.hero}>
        <Image
          src={
            ex?.image ??
            "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80"
          }
          alt={`${spot.name} 대표 풍경`}
          fill
          priority
          sizes="(max-width: 480px) 100vw, 480px"
        />
        <div className={styles.heroShade} />
        <a
          className={styles.back}
          style={{
            position: "absolute",
            top: "calc(12px + env(safe-area-inset-top))",
            left: 12,
            background: "rgba(255,255,255,.9)",
          }}
          href={`/tour/${tourCode}/spots`}
          aria-label="관광지 목록으로"
        >
          <ArrowLeft />
        </a>
        <div className={styles.heroCopy}>
          <span>
            {spot.verified
              ? `✓ ${dateTime(spot.verifiedAt)} 인증 완료`
              : "현장 방문 전 정보"}
          </span>
          <h1>{spot.name}</h1>
        </div>
      </div>
      <main className={styles.content}>
        <section className={styles.section}>
          <h2>관광지 소개</h2>
          <p>{spot.description}</p>
        </section>
        <section className={styles.section}>
          <h2>이용 정보</h2>
          <div className={styles.infoGrid}>
            <Row icon={<MapPin />} label="주소" value={spot.address} />
            <Row
              icon={<Clock3 />}
              label="운영시간"
              value={`${spot.opensAt}–${spot.closesAt}`}
            />
            <Row icon={<CalendarOff />} label="휴무일" value={ex?.closed} />
            <Row icon={<Phone />} label="문의" value={ex?.contact} />
            <Row
              icon={<ScanLine />}
              label="인증 가능 시간"
              value={`${spot.opensAt}–${spot.closesAt} · 운영시간 내`}
            />
            <Row
              icon={<Map />}
              label="인증 허용 위치"
              value={`관광지 QR 주변 ${spot.allowedRadiusMeters}m 이내`}
            />
          </div>
          <div className={styles.cardActions}>
            <a
              className={styles.secondary}
              target="_blank"
              rel="noreferrer"
              href={`https://map.kakao.com/link/map/${encodeURIComponent(spot.name)},${spot.latitude},${spot.longitude}`}
            >
              <Map size={16} />
              지도 보기
            </a>
            <a
              className={styles.primary}
              target="_blank"
              rel="noreferrer"
              href={`https://map.kakao.com/link/to/${encodeURIComponent(spot.name)},${spot.latitude},${spot.longitude}`}
            >
              <Navigation size={16} />
              길찾기
            </a>
          </div>
        </section>
        <section className={`${styles.section} ${styles.notice}`}>
          <div className={styles.qrGuide}>
            <span>
              <QrCode />
            </span>
            <div>
              <h2>현장 QR을 촬영해 주세요</h2>
              <p>
                {ex?.qrGuide}. 관광지 상세 화면의 버튼만으로는 인증되지 않아요.
              </p>
            </div>
          </div>
        </section>
        <section className={styles.section}>
          <h2>방문 유의사항</h2>
          <p>
            <Info
              size={14}
              style={{ verticalAlign: "middle", marginRight: 6 }}
            />
            {ex?.caution}
            <br />
            GPS 정확도를 높이기 위해 야외에서 위치 서비스를 켜 주세요.
          </p>
        </section>
        {spot.verified && (
          <section className={styles.section}>
            <h2>
              <CheckCircle2
                size={18}
                style={{ verticalAlign: "middle", marginRight: 7 }}
              />
              인증 완료
            </h2>
            <p>{dateTime(spot.verifiedAt)}에 이 관광지의 스탬프를 받았어요.</p>
          </section>
        )}
      </main>
    </TourShell>
  );
}
function Row({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
}) {
  return (
    <div className={styles.infoRow}>
      <span>{icon}</span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </div>
  );
}
