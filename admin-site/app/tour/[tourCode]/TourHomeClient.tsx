"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Award,
  CalendarDays,
  ChevronRight,
  CircleUserRound,
  Gift,
  HelpCircle,
  Home,
  Info,
  MapPinned,
  Medal,
  Phone,
  QrCode,
  RefreshCw,
  Stamp,
  Trophy,
} from "lucide-react";
import styles from "./tour-home.module.css";

type TourStatus = "DRAFT" | "SCHEDULED" | "ACTIVE" | "PAUSED" | "ENDED";
type Tour = {
  tourCode: string;
  name: string;
  description: string;
  status: TourStatus;
  startsAt: string;
  endsAt: string;
  spotCount: number;
};
type Spot = {
  spotCode: string;
  name: string;
  description: string;
  address: string;
  sortOrder: number;
};
type Progress = {
  verifiedSpotCount: number;
  achievedRewardThreshold: number;
  spots: Array<Spot & { verified: number; verifiedAt: string | null }>;
};
type Reward = {
  id: string;
  name: string;
  description: string;
  requiredSpotCount: number;
  stockRemaining: number;
  canApply: number;
};
type ApiResult<T> = { data?: T; error?: { message: string } };
type ScreenState = {
  tour: Tour;
  spots: Spot[];
  progress: Progress | null;
  rewards: Reward[];
};
type Preview =
  | "guest"
  | "progress"
  | "achieved"
  | "paused"
  | "scheduled"
  | "ended"
  | "empty"
  | "error"
  | null;

const heroImage =
  "https://ojsfile.ohmynews.com/STD_IMG_FILE/2022/0930/IE003057414_STD.jpg";
const baseTour: Tour = {
  tourCode: "CHEORWON-DMZ-2026",
  name: "철원 DMZ 평화관광 스탬프투어",
  description:
    "평화와 자연이 함께 숨 쉬는 철원의 명소를 여행하고, 방문의 순간을 스탬프로 간직해 보세요.",
  status: "ACTIVE",
  startsAt: "2026-01-01T00:00:00+09:00",
  endsAt: "2027-12-31T23:59:59+09:00",
  spotCount: 5,
};
const baseSpots: Spot[] = [
  {
    spotCode: "CHW-SPOT-001",
    name: "고석정",
    description: "한탄강 협곡과 고석바위를 만나는 철원 대표 관광지",
    address: "강원특별자치도 철원군 동송읍 태봉로 1825",
    sortOrder: 1,
  },
  {
    spotCode: "CHW-SPOT-002",
    name: "철원역사문화공원",
    description: "근대 철원의 시간 속을 걷는 역사 여행",
    address: "강원특별자치도 철원군 철원읍 금강산로 262",
    sortOrder: 2,
  },
  {
    spotCode: "CHW-SPOT-003",
    name: "소이산 모노레일",
    description: "철원평야와 DMZ를 한눈에 조망하는 곳",
    address: "강원특별자치도 철원군 철원읍 금강산로 262",
    sortOrder: 3,
  },
  {
    spotCode: "CHW-SPOT-004",
    name: "직탕폭포",
    description: "현무암 절벽을 따라 흐르는 철원의 작은 나이아가라",
    address: "강원특별자치도 철원군 동송읍 직탕길 94",
    sortOrder: 4,
  },
  {
    spotCode: "CHW-SPOT-005",
    name: "은하수교",
    description: "한탄강 주상절리 풍경을 건너는 보행교",
    address: "강원특별자치도 철원군 동송읍 장흥리",
    sortOrder: 5,
  },
];
const baseRewards: Reward[] = [
  {
    id: "reward_cheorwon_03",
    name: "관광 기념 스티커",
    description: "3곳 달성",
    requiredSpotCount: 3,
    stockRemaining: 500,
    canApply: 0,
  },
  {
    id: "reward_cheorwon_04",
    name: "평화관광 에코백",
    description: "4곳 달성",
    requiredSpotCount: 4,
    stockRemaining: 300,
    canApply: 0,
  },
  {
    id: "reward_cheorwon_05",
    name: "철원 오대쌀 기념 세트",
    description: "5곳 달성",
    requiredSpotCount: 5,
    stockRemaining: 100,
    canApply: 0,
  },
];

function progressFixture(count: number): Progress {
  return {
    verifiedSpotCount: count,
    achievedRewardThreshold:
      count >= 5 ? 5 : count >= 4 ? 4 : count >= 3 ? 3 : 0,
    spots: baseSpots.map((spot, index) => ({
      ...spot,
      verified: index < count ? 1 : 0,
      verifiedAt:
        index < count
          ? `2026-08-${String(20 - index).padStart(2, "0")}T14:20:00+09:00`
          : null,
    })),
  };
}
function previewData(preview: Preview): ScreenState | null {
  if (preview === "empty") return null;
  const count = preview === "achieved" ? 5 : preview === "progress" ? 2 : 0;
  return {
    tour: {
      ...baseTour,
      status:
        preview === "paused"
          ? "PAUSED"
          : preview === "scheduled"
            ? "SCHEDULED"
            : preview === "ended"
              ? "ENDED"
              : "ACTIVE",
    },
    spots: baseSpots,
    progress:
      preview === "guest" ||
      ["paused", "scheduled", "ended"].includes(preview ?? "")
        ? null
        : progressFixture(count),
    rewards: baseRewards.map((reward) => ({
      ...reward,
      canApply: count >= reward.requiredSpotCount ? 1 : 0,
    })),
  };
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}
function statusCopy(status: TourStatus) {
  return status === "ACTIVE"
    ? ["운영 중", "지금 참여할 수 있어요"]
    : status === "PAUSED"
      ? ["일시중지", "잠시 쉬어가는 중이에요"]
      : status === "SCHEDULED" || status === "DRAFT"
        ? ["운영 예정", "곧 여행이 시작돼요"]
        : ["운영 종료", "다음 여행을 기다려 주세요"];
}

export default function TourHomeClient({ tourCode }: { tourCode: string }) {
  const [screen, setScreen] = useState<ScreenState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const preview = useMemo<Preview>(() => {
    if (typeof window === "undefined") return null;
    const value = new URLSearchParams(window.location.search).get("preview");
    return [
      "guest",
      "progress",
      "achieved",
      "paused",
      "scheduled",
      "ended",
      "empty",
      "error",
    ].includes(value ?? "")
      ? (value as Preview)
      : null;
  }, []);
  const load = useCallback(async () => {
    await Promise.resolve();
    setLoading(true);
    setError("");
    if (preview) {
      await new Promise((resolve) => window.setTimeout(resolve, 220));
      if (preview === "error") {
        setError("투어 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
        setLoading(false);
        return;
      }
      setScreen(previewData(preview));
      setLoading(false);
      return;
    }
    try {
      const [tourResponse, spotsResponse, rewardsResponse, progressResponse] =
        await Promise.all([
          fetch(`/api/tour/${tourCode}`),
          fetch(`/api/tour/${tourCode}/spots`),
          fetch(`/api/tour/${tourCode}/me/rewards`),
          fetch(`/api/tour/${tourCode}/me/progress`),
        ]);
      const tourJson = (await tourResponse.json()) as ApiResult<Tour>;
      const spotsJson = (await spotsResponse.json()) as ApiResult<Spot[]>;
      if (!tourResponse.ok || !spotsResponse.ok)
        throw new Error(tourJson.error?.message ?? spotsJson.error?.message);
      const rewardsJson = (await rewardsResponse.json()) as ApiResult<{
        rewards: Reward[];
      }>;
      const progressJson =
        (await progressResponse.json()) as ApiResult<Progress>;
      setScreen({
        tour: tourJson.data!,
        spots: spotsJson.data!,
        rewards: rewardsResponse.ok
          ? (rewardsJson.data?.rewards ?? baseRewards)
          : baseRewards,
        progress: progressResponse.ok ? (progressJson.data ?? null) : null,
      });
    } catch (cause) {
      setError(
        cause instanceof Error && cause.message
          ? cause.message
          : "투어 정보를 불러오지 못했어요.",
      );
    } finally {
      setLoading(false);
    }
  }, [preview, tourCode]);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  if (loading)
    return (
      <Shell tourCode={tourCode}>
        <div className={styles.stateCard} role="status">
          <span className={styles.loader} />
          <strong>여행 정보를 준비하고 있어요</strong>
          <p>잠시만 기다려 주세요.</p>
        </div>
      </Shell>
    );
  if (error)
    return (
      <Shell tourCode={tourCode}>
        <div className={styles.stateCard} role="alert">
          <span className={styles.stateIcon}>
            <Info />
          </span>
          <strong>잠시 연결이 어렵습니다</strong>
          <p>{error}</p>
          <button type="button" onClick={() => void load()}>
            <RefreshCw size={18} />
            다시 불러오기
          </button>
        </div>
      </Shell>
    );
  if (!screen)
    return (
      <Shell tourCode={tourCode}>
        <div className={styles.stateCard}>
          <span className={styles.stateIcon}>
            <MapPinned />
          </span>
          <strong>공개된 투어가 아직 없어요</strong>
          <p>새로운 여행이 준비되면 이곳에서 알려드릴게요.</p>
        </div>
      </Shell>
    );
  const { tour, spots, progress, rewards } = screen;
  const verified = progress?.verifiedSpotCount ?? 0;
  const total = Number(tour.spotCount) || spots.length;
  const percent = total ? Math.round((verified / total) * 100) : 0;
  const achieved = [...rewards]
    .reverse()
    .find((r) => verified >= r.requiredSpotCount);
  const next = rewards.find((r) => r.requiredSpotCount > verified);
  const recent = progress?.spots
    .filter((s) => s.verified)
    .sort((a, b) =>
      String(b.verifiedAt).localeCompare(String(a.verifiedAt)),
    )[0];
  const recommendation = progress?.spots.find((s) => !s.verified) ?? spots[0];
  const [statusLabel, statusDescription] = statusCopy(tour.status);
  const active = tour.status === "ACTIVE";
  return (
    <Shell tourCode={tourCode}>
      <header className={styles.hero}>
        <Image
          src={heroImage}
          alt="한탄강 협곡과 고석정의 푸른 풍경"
          fill
          priority
          sizes="(max-width: 480px) 100vw, 480px"
          className={styles.heroImage}
        />
        <div className={styles.heroShade} />
        <div className={styles.heroTop}>
          <span className={styles.brand}>
            <Stamp size={18} />
            철원 스탬프투어
          </span>
          <button type="button" aria-label="투어 이용 안내">
            <HelpCircle size={22} />
          </button>
        </div>
        <div className={styles.heroCopy}>
          <span
            className={`${styles.status} ${styles[tour.status.toLowerCase()]}`}
          >
            <i aria-hidden="true" />
            {statusLabel}
            <small>{statusDescription}</small>
          </span>
          <h1>{tour.name}</h1>
          <p>
            <CalendarDays size={15} />
            {formatDate(tour.startsAt)} – {formatDate(tour.endsAt)}
          </p>
        </div>
      </header>
      <main className={styles.main}>
        <section className={styles.intro}>
          <p>{tour.description || baseTour.description}</p>
          <div className={styles.notice}>
            <span>
              <Info size={17} />
              <b>여행 전 확인해 주세요</b>
            </span>
            <p>현장 QR과 위치 확인을 켜고, 운영시간 안에 방문해 주세요.</p>
          </div>
        </section>
        {!active ? (
          <section className={styles.operationCard}>
            <span>
              <CalendarDays />
            </span>
            <div>
              <strong>{statusLabel}</strong>
              <p>
                {tour.status === "PAUSED"
                  ? "운영이 재개되면 다시 스탬프를 모을 수 있어요."
                  : tour.status === "ENDED"
                    ? "참여해 주셔서 감사합니다. 경품 신청 현황은 내 정보에서 확인해 주세요."
                    : `${formatDate(tour.startsAt)}에 투어가 시작됩니다.`}
              </p>
            </div>
          </section>
        ) : (
          <section
            className={styles.progressCard}
            aria-labelledby="progress-title"
          >
            <div className={styles.progressTop}>
              <div>
                <span id="progress-title">나의 여행 진행</span>
                <strong>
                  {progress
                    ? `${verified}곳을 방문했어요`
                    : "첫 스탬프를 만나보세요"}
                </strong>
              </div>
              <div
                className={styles.ring}
                style={
                  { "--progress": `${percent * 3.6}deg` } as React.CSSProperties
                }
              >
                <span>
                  <b>{percent}</b>%
                </span>
              </div>
            </div>
            <div className={styles.progressNumbers}>
              <span>
                <b>{verified}</b> 인증
              </span>
              <span>
                <b>{total}</b> 전체 관광지
              </span>
            </div>
            <div
              className={styles.progressBar}
              role="progressbar"
              aria-valuenow={percent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`스탬프 진행률 ${percent}%`}
            >
              <i style={{ width: `${percent}%` }} />
            </div>
            <div className={styles.rewardMessage}>
              <Trophy size={19} />
              <span>
                <b>
                  {achieved
                    ? `${achieved.name} 달성!`
                    : next
                      ? `${next.requiredSpotCount - verified}곳 더 방문하면 ${next.name}`
                      : "모든 단계 달성!"}
                </b>
                <small>
                  {achieved && next
                    ? `다음 경품까지 ${next.requiredSpotCount - verified}곳 남았어요`
                    : achieved && !next
                      ? "최종 경품을 신청할 수 있어요"
                      : "천천히 철원의 매력을 발견해 보세요"}
                </small>
              </span>
            </div>
            <a
              className={styles.primaryAction}
              href={progress ? `#spots` : `/tour/${tourCode}/join`}
            >
              {progress ? "내 스탬프 계속 모으기" : "스탬프투어 참여하기"}
              <ChevronRight size={20} />
            </a>
          </section>
        )}
        {active && (
          <section className={styles.section} id="spots">
            <div className={styles.sectionHead}>
              <div>
                <span>여행 이어가기</span>
                <h2>
                  {recent ? "최근 여행과 다음 추천" : "첫 관광지를 골라보세요"}
                </h2>
              </div>
              <a href="#all-spots">
                전체보기 <ChevronRight size={16} />
              </a>
            </div>
            <div className={styles.spotGrid}>
              {recent && (
                <article className={styles.spotCard}>
                  <span className={styles.cardBadge}>
                    <QrCode size={13} />
                    최근 인증
                  </span>
                  <div className={styles.spotVisual}>✓</div>
                  <div>
                    <strong>{recent.name}</strong>
                    <p>{recent.description}</p>
                  </div>
                </article>
              )}
              {recommendation && (
                <article className={styles.spotCard}>
                  <span className={`${styles.cardBadge} ${styles.recommend}`}>
                    <MapPinned size={13} />
                    다음 추천
                  </span>
                  <div className={`${styles.spotVisual} ${styles.nextVisual}`}>
                    <MapPinned />
                  </div>
                  <div>
                    <strong>{recommendation.name}</strong>
                    <p>{recommendation.description}</p>
                  </div>
                </article>
              )}
            </div>
          </section>
        )}
        <section className={styles.section} id="rewards">
          <div className={styles.sectionHead}>
            <div>
              <span>단계별 혜택</span>
              <h2>모을수록 커지는 여행 선물</h2>
            </div>
          </div>
          <div className={styles.rewardList}>
            {rewards.map((reward, index) => {
              const reached = verified >= reward.requiredSpotCount;
              return (
                <article
                  key={reward.id}
                  className={reached ? styles.reached : ""}
                >
                  <span className={styles.rewardIcon}>
                    {index === 2 ? (
                      <Trophy />
                    ) : index === 1 ? (
                      <Gift />
                    ) : (
                      <Medal />
                    )}
                  </span>
                  <div>
                    <small>{reward.requiredSpotCount}곳 달성</small>
                    <strong>{reward.name}</strong>
                    <p>
                      {reached
                        ? "달성 완료 · 신청 가능"
                        : "스탬프를 더 모으면 열려요"}
                    </p>
                  </div>
                  <span className={styles.rewardState}>
                    {reached ? "달성" : "미달성"}
                  </span>
                </article>
              );
            })}
          </div>
        </section>
        <section className={styles.support} id="support">
          <div>
            <Phone size={19} />
            <span>
              <small>운영 문의</small>
              <a href="tel:033-450-5559">철원군 관광안내 033-450-5559</a>
            </span>
          </div>
          <p>운영시간 09:00–18:00 · 현장 상황에 따라 달라질 수 있어요.</p>
        </section>
      </main>
    </Shell>
  );
}

function Shell({
  tourCode,
  children,
}: {
  tourCode: string;
  children: React.ReactNode;
}) {
  const menus = [
    { label: "투어 홈", icon: Home, href: `/tour/${tourCode}`, active: true },
    { label: "관광지", icon: MapPinned, href: `/tour/${tourCode}/spots` },
    { label: "스탬프북", icon: Stamp, href: `/tour/${tourCode}/stampbook` },
    { label: "경품", icon: Award, href: `/tour/${tourCode}/rewards` },
    {
      label: "내 정보",
      icon: CircleUserRound,
      href: `/tour/${tourCode}#support`,
    },
  ];
  return (
    <div className={styles.page}>
      <div className={styles.phone}>
        {children}
        <nav className={styles.bottomNav} aria-label="투어 주요 메뉴">
          {menus.map(({ label, icon: Icon, href, active }) => (
            <a
              key={label}
              href={href}
              className={active ? styles.active : ""}
              aria-current={active ? "page" : undefined}
              aria-label={label}
            >
              <Icon size={21} />
              <span>{label}</span>
            </a>
          ))}
        </nav>
      </div>
    </div>
  );
}
