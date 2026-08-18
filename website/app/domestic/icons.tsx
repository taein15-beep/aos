type IconName =
  | "search" | "heart" | "calendar" | "chat" | "menu" | "close"
  | "chevron" | "user" | "headset" | "map" | "users" | "arrow"
  | "train" | "bus" | "ship" | "mountain" | "tag" | "suitcase" | "shield" | "meal";

const paths: Record<IconName, React.ReactNode> = {
  search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
  heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5a5.5 5.5 0 0 0 1-8.9Z"/>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/></>,
  chat: <><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/><path d="M8 9h8M8 13h5"/></>,
  menu: <path d="M4 7h16M4 12h16M4 17h16"/>,
  close: <path d="m6 6 12 12M18 6 6 18"/>,
  chevron: <path d="m9 18 6-6-6-6"/>,
  user: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
  headset: <><path d="M4 14v-2a8 8 0 0 1 16 0v2"/><path d="M18 19c0 1.1-.9 2-2 2h-3M4 14h3v6H5a2 2 0 0 1-2-2v-2a2 2 0 0 1 1-2ZM20 14h-3v6h2a2 2 0 0 0 2-2v-2a2 2 0 0 0-1-2Z"/></>,
  map: <><path d="m9 18-6 3V6l6-3 6 3 6-3v15l-6 3-6-3Z"/><path d="M9 3v15M15 6v15"/></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
  arrow: <path d="M5 12h14M13 6l6 6-6 6"/>,
  train: <><rect x="5" y="3" width="14" height="15" rx="3"/><path d="M8 21l2-3M16 21l-2-3M8 8h8M8 13h.01M16 13h.01"/></>,
  bus: <><rect x="4" y="3" width="16" height="16" rx="3"/><path d="M4 9h16M8 19v2M16 19v2M8 14h.01M16 14h.01"/></>,
  ship: <><path d="m3 15 2-7h14l2 7-4 4H7l-4-4Z"/><path d="M9 8V4h6v4M3 21c2 0 2-1 4-1s2 1 4 1 2-1 4-1 2 1 4 1"/></>,
  mountain: <><path d="m3 20 7-12 4 7 2-3 5 8H3Z"/><path d="m8.5 11 1.5 1 1.5-1"/></>,
  tag: <><path d="M20.6 13.6 11 4H4v7l9.6 9.6a2 2 0 0 0 2.8 0l4.2-4.2a2 2 0 0 0 0-2.8Z"/><circle cx="7.5" cy="7.5" r=".7"/></>,
  suitcase: <><rect x="4" y="7" width="16" height="13" rx="2"/><path d="M9 7V4h6v3M4 12h16M9 11v3M15 11v3"/></>,
  shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></>,
  meal: <><path d="M7 3v7M4 3v4a3 3 0 0 0 6 0V3M7 10v11M17 3v18M17 3c-3 2-3 7 0 9"/></>,
};

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
