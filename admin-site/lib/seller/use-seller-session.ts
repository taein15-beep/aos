"use client";

import { useMemo, useSyncExternalStore } from "react";
import { parseSellerSession, SELLER_SESSION_COOKIE, type SellerSession } from "@/lib/seller/auth";

const subscribe = () => () => {};
const getCookieSnapshot = () => document.cookie;
const getServerCookieSnapshot = () => "";

/** Mock 세션 쿠키를 렌더 시점마다 읽음 (Storage·Session API 미사용) */
export function useSellerSession(): SellerSession | null {
  const cookie = useSyncExternalStore(subscribe, getCookieSnapshot, getServerCookieSnapshot);
  return useMemo(() => {
    const raw = cookie
      .split("; ")
      .find((entry) => entry.startsWith(`${SELLER_SESSION_COOKIE}=`))
      ?.slice(SELLER_SESSION_COOKIE.length + 1);
    return parseSellerSession(raw);
  }, [cookie]);
}
