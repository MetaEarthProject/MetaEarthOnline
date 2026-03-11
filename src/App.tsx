import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { WorldMap } from "./components/WorldMap";
import {
  canAccessDepartments,
  canCoupRegion,
  getMaxWorkExperience,
  getPerkUpgradeCost,
  getStorageCapacity,
  getStorageUsage,
  getWarDamageEstimate,
  getWarDefenseEstimate,
  getWorkBonusPercent,
  useGameStore,
  translations,
  LAW_DEFINITIONS,
  ALL_LAW_TYPES
} from "./store/gameStore";
import type { FactoryId, Region, LawType, LawCategory, Bill } from "./types";
import type { Language } from "./store/gameStore";

type AppTab = "home" | "storage" | "map" | "parliament" | "work" | "wars" | "profile";
type IconName = Exclude<AppTab, "parliament"> | "search" | "mail" | "dots" | "fist" | "flame" | "back" | "gear" | "strength" | "stamina" | "intelligence" | "charisma" | "vault" | "fuel" | "bolt" | "chest" | "ore" | "uranium" | "infantry" | "tank" | "aircraft" | "ship";
type WorkResourceTone = "gold" | "oil" | "ore" | "uranium" | "diamond" | "liquid_oxygen" | "helium_3" | "rivalium";
type WorkFactoryTone = "gold" | "oil" | "ore" | "uranium" | "diamond" | "liquid_oxygen" | "helium_3" | "rivalium" | "energy";
type WarConflictTone = "danger" | "alert" | "friendly";
type StorageTone = "gold" | "blue" | "green" | "red";
type ParliamentSubPage = "overview" | "enact_law";

type TabItem = {
  key: Exclude<AppTab, "map" | "parliament">;
  label: string;
  icon: Exclude<AppTab, "map" | "parliament">;
};

type MapFocusState = {
  regionId: string | null;
  countryName: string | null;
};

type WorkResourceItem = {
  label: string;
  value: string;
  tone: WorkResourceTone;
  symbol: string;
};

type WorkFactory = {
  id: FactoryId;
  name: string;
  specialty: string;
  level: number;
  badge: string;
  tone: WorkFactoryTone;
  owner: string;
  founded: string;
};

type WarConflict = {
  id: string;
  icon: "fist" | "flame";
  tone: WarConflictTone;
  frontName: string;
  frontDamage: string;
  strikeDamage: string;
  targetName: string;
  targetRegion: string;
  targetDamage: string;
  endsIn: string;
  progress: number;
  emblem: string;
  rawAttackerDamage: number;
  rawDefenderDamage: number;
  active: boolean;
};

type ParliamentSeatTone = "red" | "blue" | "violet" | "gold" | "lime" | "empty";
type ParliamentBlocTone = Exclude<ParliamentSeatTone, "empty">;

type ParliamentBloc = {
  id: string;
  name: string;
  members: number;
  seats: number;
  share: number;
  location: string;
  tone: ParliamentBlocTone;
  emblem: string;
};

const getTabs = (t: any) => [
  { key: "home", label: t.tabs.home, icon: "home" },
  { key: "storage", label: t.tabs.storage, icon: "storage" },
  { key: "work", label: t.tabs.work, icon: "work" },
  { key: "wars", label: t.tabs.wars, icon: "wars" },
  { key: "profile", label: t.tabs.profile, icon: "profile" }
];

const getTabLabels = (t: any) => ({
  home: t.tabs.home,
  storage: t.tabs.storage,
  map: t.tabs.map,
  parliament: t.tabs.parliament,
  work: t.tabs.work,
  wars: t.tabs.wars,
  profile: t.tabs.profile
});

const REALTIME_TICK_SECONDS = 1;
const AUTO_WORK_INTERVAL_MS = 10 * 60 * 1000;
const FULL_FACTORY_ENERGY_COST = 300;
const WORK_REFILL_OPTIONS = Array.from({ length: FULL_FACTORY_ENERGY_COST / 10 }, (_, index) => (index + 1) * 10);
const PARLIAMENT_TOTAL_SEATS = 86;
const PARLIAMENT_SEAT_ROWS = [32, 30, 30] as const;
const PARLIAMENT_SEAT_CAPACITY = PARLIAMENT_SEAT_ROWS.reduce((total, row) => total + row, 0);

const formatNumber = (value: number) => new Intl.NumberFormat("en-US").format(value);
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const formatCountdown = (totalSeconds: number) => {
  if (totalSeconds <= 0) return "00:00:00";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
};
const formatRegionIndexes = (region: Region) =>
  `H ${region.healthIndex} | M ${region.militaryIndex} | E ${region.educationIndex} | D ${region.developmentIndex}`;

const allocateSeats = (weights: number[], total: number) => {
  const weightTotal = weights.reduce((sum, value) => sum + value, 0);
  if (weightTotal <= 0) {
    return weights.map((_, index) => (index === 0 ? total : 0));
  }

  const rawSeats = weights.map((value) => (value / weightTotal) * total);
  const seatCounts = rawSeats.map((value) => Math.floor(value));
  let seatsLeft = total - seatCounts.reduce((sum, value) => sum + value, 0);
  const order = rawSeats
    .map((value, index) => ({ index, fraction: value - seatCounts[index] }))
    .sort((left, right) => right.fraction - left.fraction);

  let orderIndex = 0;
  while (seatsLeft > 0) {
    seatCounts[order[orderIndex % order.length].index] += 1;
    seatsLeft -= 1;
    orderIndex += 1;
  }

  return seatCounts;
};

function Icon({ name, className }: { name: IconName; className?: string }) {
  switch (name) {
    case "back":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path d="M14.5 5L7.5 12l7 7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square" />
          <path d="M8.5 12H20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square" />
        </svg>
      );
    case "search":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <circle cx="10.5" cy="10.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M15 15l5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
        </svg>
      );
    case "mail":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <rect x="3" y="5" width="18" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M4 7l8 7 8-7" fill="none" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      );
    case "dots":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <circle cx="12" cy="5" r="1.8" fill="currentColor" />
          <circle cx="12" cy="12" r="1.8" fill="currentColor" />
          <circle cx="12" cy="19" r="1.8" fill="currentColor" />
        </svg>
      );
    case "gear":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <circle cx="12" cy="12" r="2.8" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M12 3.5v2.2M12 18.3v2.2M20.5 12h-2.2M5.7 12H3.5M17.8 6.2l-1.6 1.6M7.8 16.2l-1.6 1.6M17.8 17.8l-1.6-1.6M7.8 7.8L6.2 6.2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" />
        </svg>
      );
    case "fist":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path d="M7.2 11V7.7c0-.8.6-1.4 1.3-1.4.6 0 1.1.4 1.3 1V6.3c0-.8.6-1.4 1.4-1.4.7 0 1.3.5 1.4 1.2.2-.5.7-.9 1.3-.9.8 0 1.4.7 1.4 1.5v1.1c.2-.5.7-.8 1.3-.8.8 0 1.4.7 1.4 1.5v4.9c0 4.1-2.9 6.8-6.7 6.8-2.8 0-5.1-1.5-6.3-4.2L4.4 12c-.3-.6-.1-1.4.5-1.8.6-.4 1.4-.2 1.8.5l.5.8z" fill="currentColor" />
        </svg>
      );
    case "flame":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path d="M12.8 2.8c1.8 3.5-.3 5.3-1.8 7.1-1.5 1.7-2.7 3.2-2.7 5.5 0 3.2 2.3 5.7 5.6 5.7 3.1 0 5.8-2.4 5.8-6 0-3-1.8-5.2-4-7.6-.2 2-.9 3.3-2 4.3.1-2.7-.5-5.6-.9-8z" fill="currentColor" />
        </svg>
      );
    case "storage":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path d="M4 7h16v11H4z" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M7 7V5.5h10V7" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M9 12h6" fill="none" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      );
    case "home":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path d="M4 11l8-6 8 6" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M6 10.5V19h12v-8.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M10 19v-4.5h4V19" fill="none" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      );
    case "map":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path d="M4 6l5-2 6 2 5-2v14l-5 2-6-2-5 2V6z" fill="none" stroke="currentColor" strokeWidth="1.7" />
          <path d="M9 4v14" fill="none" stroke="currentColor" strokeWidth="1.7" />
          <path d="M15 6v14" fill="none" stroke="currentColor" strokeWidth="1.7" />
        </svg>
      );
    case "work":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path d="M19.7 7.6l-3.3 3.3-2.2-2.2-7 7 1.2 1.2-1.9 1.9-4-4L4.4 13l1.2 1.2 7-7-2.2-2.2 3.3-3.3 6 6.1z" fill="currentColor" />
        </svg>
      );
    case "wars":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path d="M12 3l2.1 5.1 5.4-1.2-3.1 4.5 4.2 2.7-5.3 1.1.6 5.5-3.9-3.5-3.9 3.5.6-5.5-5.3-1.1 4.2-2.7L4.5 6.9l5.4 1.2L12 3z" fill="currentColor" />
        </svg>
      );
    case "profile":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <circle cx="12" cy="8" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M5 20c.5-3.4 3.3-5.5 7-5.5s6.5 2.1 7 5.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      );
    case "strength":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path d="M7.2 11V7.7c0-.8.6-1.4 1.3-1.4.6 0 1.1.4 1.3 1V6.3c0-.8.6-1.4 1.4-1.4.7 0 1.3.5 1.4 1.2.2-.5.7-.9 1.3-.9.8 0 1.4.7 1.4 1.5v1.1c.2-.5.7-.8 1.3-.8.8 0 1.4.7 1.4 1.5v4.9c0 4.1-2.9 6.8-6.7 6.8-2.8 0-5.1-1.5-6.3-4.2L4.4 12c-.3-.6-.1-1.4.5-1.8.6-.4 1.4-.2 1.8.5l.5.8z" fill="currentColor" />
        </svg>
      );
    case "stamina":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path d="M12.8 2.8c1.8 3.5-.3 5.3-1.8 7.1-1.5 1.7-2.7 3.2-2.7 5.5 0 3.2 2.3 5.7 5.6 5.7 3.1 0 5.8-2.4 5.8-6 0-3-1.8-5.2-4-7.6-.2 2-.9 3.3-2 4.3.1-2.7-.5-5.6-.9-8z" fill="currentColor" />
        </svg>
      );
    case "intelligence":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <circle cx="12" cy="12" r="2.8" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M12 3.5v2.2M12 18.3v2.2M20.5 12h-2.2M5.7 12H3.5M17.8 6.2l-1.6 1.6M7.8 16.2l-1.6 1.6M17.8 17.8l-1.6-1.6M7.8 7.8L6.2 6.2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" />
        </svg>
      );
    case "charisma":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path d="M12 4.5l2.2 4.5 5 .7-3.6 3.5.8 5-4.4-2.3-4.4 2.3.8-5-3.6-3.5 5-.7L12 4.5z" fill="currentColor" />
        </svg>
      );
    case "vault":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <rect x="3" y="6" width="18" height="13" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="12" cy="12.5" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M12 10v1M12 14v1M9.5 12.5h1M13.5 12.5h1" fill="none" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      );
    case "fuel":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path d="M14 3v4M8 3v4" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M5 7h14v12a2 2 0 01-2 2H7a2 2 0 01-2-2V7z" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="12" cy="14" r="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      );
    case "bolt":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="currentColor" />
        </svg>
      );
    case "chest":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path d="M3 8h18v10a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M3 8V6a2 2 0 012-2h14a2 2 0 012 2v2" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M10 8v3h4V8" fill="none" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      );
    case "ore":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path d="M12 3l9 4-9 4-9-4 9-4zM3 7v10l9 4 9-4V7" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M12 11v10M3 12l9 4 9-4" fill="none" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      );
    case "uranium":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M12 12L7.5 4.5M12 12l4.5-7.5M12 12h9M12 12v9" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="12" cy="12" r="2.5" fill="currentColor" />
        </svg>
      );
    case "infantry":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <circle cx="12" cy="7" r="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M5 21v-3a4 4 0 014-4h6a4 4 0 014 4v3" fill="none" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      );
    case "tank":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path d="M4 14h16l1-3h-4l-1-3H8l-1 3H3l1 3z" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M2 14v4a2 2 0 002 2h16a2 2 0 002-2v-4" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="6" cy="17.5" r="1.5" fill="currentColor" />
          <circle cx="12" cy="17.5" r="1.5" fill="currentColor" />
          <circle cx="18" cy="17.5" r="1.5" fill="currentColor" />
        </svg>
      );
    case "aircraft":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path d="M21 16l-8-5V3.5a1.5 1.5 0 00-3 0V11l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-3.5l8 2.5v-2z" fill="currentColor" />
        </svg>
      );
    case "ship":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path d="M2 17l2 4h16l2-4H2z" fill="currentColor" />
          <path d="M12 17V4l7 3-7 3" fill="none" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      );
  }
}

function ProfileMetric({
  label,
  value,
  rating,
  description,
  upgradeCost,
  canUpgrade,
  onUpgrade
}: {
  label: string;
  value: string;
  rating: string;
  description: string;
  upgradeCost?: number;
  canUpgrade?: boolean;
  onUpgrade?: () => void;
}) {
  const { language } = useGameStore();
  const t = translations[language];
  const iconName = label.toLowerCase() as IconName;

  return (
    <div className="me-perk-row">
      <div className="me-perk-icon-shell">
        <Icon name={iconName} className="me-perk-icon" />
      </div>
      <div className="me-perk-info">
        <div className="me-perk-header">
          <span className="me-perk-name">{label}</span>
          <div className="me-perk-value-pill">
            <strong className="me-perk-lvl">{value}</strong>
            <span className="me-perk-rate">~{rating}</span>
          </div>
        </div>
        <p className="me-perk-bio">{description}</p>
        {upgradeCost && (
          <div className="me-perk-cost-row">
            <span className="me-perk-cost-label">Cost:</span>
            <strong className="me-perk-cost-val">{upgradeCost} points</strong>
          </div>
        )}
      </div>
      <div className="me-perk-cta-shell">
        {onUpgrade && (
          <button
            type="button"
            className="me-perk-btn"
            onClick={onUpgrade}
            disabled={!canUpgrade}
          >
            {t.ui.upgrade}
          </button>
        )}
      </div>
    </div>
  );
}

function HomeMetric({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="home-metric">
      <span>{label}</span>
      <strong className={accent ? "accent" : ""}>{value}</strong>
    </div>
  );
}

function WorkResourceMetric({ item }: { item: WorkResourceItem }) {
  return (
    <article className="work-resource-card">
      <span className="work-resource-name">{item.label}</span>
      <strong className={`work-resource-value ${item.tone}`}>{item.value}</strong>
      <small className={`work-resource-symbol ${item.tone}`}>{item.symbol}</small>
    </article>
  );
}

function StorageMetricCard({
  label,
  value,
  detail,
  tone,
  icon
}: {
  label: string;
  value: string;
  detail: string;
  tone: StorageTone;
  icon: IconName;
}) {
  return (
    <article className={`me-storage-card ${tone}`}>
      <div className="me-storage-card-header">
        <div className="me-storage-card-icon-frame">
          <Icon name={icon} className="me-storage-card-icon" />
        </div>
        <div className="me-storage-card-info">
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      </div>
      <small className="me-storage-card-detail">{detail}</small>
    </article>
  );
}

function WorkFactoryRow({
  factory,
  isSelected,
  onSelect,
  onWork
}: {
  factory: WorkFactory;
  isSelected: boolean;
  onSelect: () => void;
  onWork: () => void;
}) {
  const { language } = useGameStore();
  const t = translations[language];
  return (
    <article className={`work-factory-row${isSelected ? " selected" : ""}`}>
      <button type="button" className="work-factory-select" onClick={onSelect} aria-pressed={isSelected}>
        <div className={`work-factory-badge ${factory.tone}`} aria-hidden="true">
          {factory.badge}
        </div>
        <div className="work-factory-copy">
          <strong>{factory.name}</strong>
          <span>
            {factory.specialty}, {t.ui.level} {factory.level}
          </span>
        </div>
      </button>
      <button type="button" className="work-row-btn" onClick={onWork}>
        {t.ui.work}
      </button>
    </article>
  );
}

function WarPromptCard({
  icon,
  title,
  description,
  buttonLabel,
  accent,
  onAction
}: {
  icon: "fist" | "flame";
  title: string;
  description: string;
  buttonLabel: string;
  accent: "blue" | "red";
  onAction: () => void;
}) {
  return (
    <article className="wars-highlight-card">
      <div className="wars-highlight-head">
        <div className="wars-highlight-icon" aria-hidden="true">
          <Icon name={icon} className="wars-highlight-icon-svg" />
        </div>
        <div className="wars-highlight-copy">
          <strong>{title}</strong>
          <p>{description}</p>
        </div>
      </div>
      <button type="button" className={`wars-wide-btn ${accent}`} onClick={onAction}>
        {buttonLabel}
      </button>
    </article>
  );
}

function WarConflictRow({ conflict, onFight }: { conflict: WarConflict; onFight: () => void }) {
  const { language } = useGameStore();
  const t = translations[language];
  return (
    <article className="wars-conflict-row">
      <div className="wars-conflict-side">
        <div className={`wars-conflict-sigil ${conflict.tone}`} aria-hidden="true">
          {conflict.emblem}
        </div>
        <strong>{conflict.frontName}</strong>
        <span>{conflict.frontDamage}</span>
      </div>
      <div className="wars-conflict-center">
        <span className="wars-damage-label">{t.ui.fight}</span>
        <div className="wars-damage-value">{conflict.strikeDamage}</div>
        <div className="wars-damage-track">
          <span style={{ width: `${conflict.progress}%` }} />
        </div>
        <button type="button" className="wars-fight-btn" onClick={onFight}>
          {t.ui.fight}
        </button>
        <span className="wars-timer">{conflict.endsIn}</span>
      </div>
      <div className="wars-conflict-side align-right">
        <div className={`wars-conflict-icon ${conflict.tone}`} aria-hidden="true">
          <Icon name={conflict.icon} className="wars-conflict-icon-svg" />
        </div>
        <strong>{conflict.targetName}</strong>
        <small>{conflict.targetRegion}</small>
        <span>{conflict.targetDamage}</span>
      </div>
    </article>
  );
}

function ParliamentBlocRow({ bloc }: { bloc: ParliamentBloc }) {
  const { language } = useGameStore();
  const t = translations[language];
  return (
    <article className={`parliament-party-row ${bloc.tone}`}>
      <div className="parliament-party-copy">
        <strong>{bloc.name}</strong>
        <span>
          {t.ui.members}: {formatNumber(bloc.members)}
        </span>
        <span className="parliament-party-detail">
          {bloc.share.toFixed(1)}% · {bloc.location}
        </span>
        <span className="parliament-party-seats-badge">
          {bloc.seats} seats
        </span>
      </div>
      <div className="parliament-party-emblem-wrap">
        <div className={`parliament-party-emblem ${bloc.tone}`} aria-hidden="true">
          {bloc.emblem}
        </div>
      </div>
    </article>
  );
}

function BattleWindow({ war, onClose }: { war: WarConflict; onClose: () => void }) {
  const { military, player, action, sendTroops, language } = useGameStore();
  const t = translations[language];
  const [selectedSide, setSelectedSide] = useState<"attacker" | "defender">("attacker");
  const [ammoKits, setAmmoKits] = useState(0);
  const [ammoTanks, setAmmoTanks] = useState(0);
  const [ammoAir, setAmmoAir] = useState(0);
  const [ammoNavy, setAmmoNavy] = useState(0);
  const [energySpend, setEnergySpend] = useState(Math.floor(Math.min(player.energy, 300) / 10) * 10 || 10);

  const handleStrike = () => {
    sendTroops(war.id, selectedSide, {
      infantry: ammoKits,
      tank: ammoTanks,
      aircraft: ammoAir,
      navy: ammoNavy
    }, energySpend);
  };

  const handleAutoFull = () => {
    sendTroops(war.id, selectedSide, {
      infantry: military.infantry || 0,
      tank: military.tanks || 0,
      aircraft: military.aircraft || 0,
      navy: military.navy || 0
    }, 300);
  };

  const totalDamageRaw = war.rawDefenderDamage - war.rawAttackerDamage;
  const totalDamageColored = totalDamageRaw < 0 ? "rgba(220, 38, 38, 1)" : "#fca311";

  return (
    <div className="me-battle-overlay">
      <div className="me-battle-window">
        <header className="me-battle-header">
          <div className="me-battle-side attacker">
            <div className="me-battle-icon-shell">
              <Icon name={war.icon} className="me-battle-icon" />
            </div>
            <div className="me-battle-side-info">
              <span className="me-battle-side-label">Attacker</span>
              <strong className="me-battle-side-name">{war.frontName}</strong>
              <div className="me-battle-side-damage">{war.frontDamage}</div>
            </div>
          </div>

          <div className="me-battle-vs">
            <div className="me-battle-timer">{war.endsIn}</div>
            <div className="me-battle-total-label">Total Damage</div>
            <div className="me-battle-total-val" style={{ color: totalDamageColored }}>
              {formatNumber(totalDamageRaw)}
            </div>
          </div>

          <div className="me-battle-side defender">
            <div className="me-battle-emblem">{war.emblem}</div>
            <div className="me-battle-side-info align-right">
              <span className="me-battle-side-label">Defender</span>
              <strong className="me-battle-side-name">{war.targetName}</strong>
              <div className="me-battle-side-damage">{war.targetDamage}</div>
            </div>
          </div>
          <button type="button" className="me-battle-close" onClick={onClose}>×</button>
        </header>

        <main className="me-battle-main">
          <section className="me-battle-training-strip">
            <div className="me-battle-training-copy">
              <strong>Military Training</strong>
              <p>Boost your STR and STA stats for higher basic damage.</p>
            </div>
            <button type="button" className="me-battle-train-btn" onClick={() => action("train")}>
              Train Stats
            </button>
          </section>

          <section className="me-battle-deployment">
            <h3>Deploy units</h3>
            <div className="me-battle-side-selector">
              <button
                type="button"
                className={`side-btn attacker ${selectedSide === "attacker" ? "active" : ""}`}
                onClick={() => setSelectedSide("attacker")}
              >
                Help Attacker
              </button>
              <button
                type="button"
                className={`side-btn defender ${selectedSide === "defender" ? "active" : ""}`}
                onClick={() => setSelectedSide("defender")}
              >
                Help Defender
              </button>
            </div>

            <div className="me-battle-unit-grid">
              <div className="me-battle-unit-input">
                <div className="me-unit-label">
                  <Icon name="infantry" className="me-unit-icon" />
                  <span>Kits: {military.infantry}</span>
                </div>
                <input type="number" value={ammoKits} min={0} max={military.infantry} onChange={e => setAmmoKits(Number(e.target.value))} />
              </div>
              <div className="me-battle-unit-input">
                <div className="me-unit-label">
                  <Icon name="tank" className="me-unit-icon" />
                  <span>Tanks: {military.tanks}</span>
                </div>
                <input type="number" value={ammoTanks} min={0} max={military.tanks} onChange={e => setAmmoTanks(Number(e.target.value))} />
              </div>
              <div className="me-battle-unit-input">
                <div className="me-unit-label">
                  <Icon name="aircraft" className="me-unit-icon" />
                  <span>Air: {military.aircraft}</span>
                </div>
                <input type="number" value={ammoAir} min={0} max={military.aircraft} onChange={e => setAmmoAir(Number(e.target.value))} />
              </div>
              <div className="me-battle-unit-input">
                <div className="me-unit-label">
                  <Icon name="ship" className="me-unit-icon" />
                  <span>Navy: {military.navy}</span>
                </div>
                <input type="number" value={ammoNavy} min={0} max={military.navy} onChange={e => setAmmoNavy(Number(e.target.value))} />
              </div>
            </div>

            <div className="me-battle-energy-row">
              <div className="me-energy-label">
                <span>Energy to spend: {energySpend}</span>
                <small>Available: {player.energy}</small>
              </div>
              <input type="range" min={10} max={Math.min(player.energy, 300)} border-radius="2px" step={10} value={energySpend} onChange={e => setEnergySpend(Number(e.target.value))} />
            </div>

            <div className="me-battle-actions">
              <button
                type="button"
                className={`me-battle-strike-btn ${!war.active ? "inactive" : ""}`}
                onClick={handleStrike}
                disabled={!war.active}
              >
                {!war.active ? "Conflict Ended" : (selectedSide === "attacker" ? "Strike Defender" : "Strike Attacker")}
              </button>
              <div className="me-battle-auto-buttons">
                <button
                  type="button"
                  className={`me-battle-auto-btn drink ${!war.active ? "inactive" : ""}`}
                  onClick={handleAutoFull}
                  disabled={!war.active}
                >
                  Max Strike (300E)
                </button>
                <button
                  type="button"
                  className={`me-battle-auto-btn ${!war.active ? "inactive" : ""}`}
                  onClick={() => sendTroops(war.id, selectedSide, {}, 10)}
                  disabled={!war.active}
                >
                  Standard Strike (10E)
                </button>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function TrainingWindow({ onClose }: { onClose: () => void }) {
  const { player, action, language, regions, winPlayGame } = useGameStore();
  const t = translations[language];
  const region = regions.find(r => r.id === player.locationId)!;
  const [energySpend, setEnergySpend] = useState(Math.floor(Math.min(player.energy, 300) / 10) * 10 || 10);

  const handleTrain = () => {
    // Multi-strike training logic: simulate multiple training actions based on energy
    const strikes = Math.floor(energySpend / 14);
    for (let i = 0; i < strikes; i++) {
      action("train");
    }
  };

  const handleAutoFull = () => {
    const strikes = Math.floor(player.energy / 14);
    for (let i = 0; i < strikes; i++) {
      action("train");
    }
  };

  return (
    <div className="me-battle-overlay training-variant">
      <div className="me-battle-window training-theme">
        <header className="me-battle-header">
          <div className="me-battle-side attacker">
            <div className="me-battle-icon-shell training-blue">
              <Icon name="stamina" className="me-battle-icon" />
            </div>
            <div className="me-battle-side-info">
              <span className="me-battle-side-label">Primary Objective</span>
              <strong className="me-battle-side-name">Military Drills</strong>
              <div className="me-battle-side-damage">Region: {region.city}</div>
            </div>
          </div>

          <div className="me-battle-vs">
            <div className="me-battle-timer">∞</div>
            <div className="me-battle-total-label">Current Strength</div>
            <div className="me-battle-total-val">{player.strength}</div>
          </div>

          <div className="me-battle-side defender">
            <div className="me-battle-emblem training-blue">HQ</div>
            <div className="me-battle-side-info align-right">
              <span className="me-battle-side-label">Training Center</span>
              <strong className="me-battle-side-name">Global Academy</strong>
              <div className="me-battle-side-damage">XP Boost: +{18 + region.militaryIndex}</div>
            </div>
          </div>
          <button type="button" className="me-battle-close" onClick={onClose}>×</button>
        </header>

        <main className="me-battle-main">
          <section className="me-battle-training-strip blue-accent">
            <div className="me-battle-training-copy">
              <strong>Advanced Training</strong>
              <p>Maximize your endurance and tactical skill through high-intensity drills.</p>
            </div>
          </section>

          <section className="me-battle-deployment">
            <h3>Training parameters</h3>

            <div className="me-battle-energy-row">
              <div className="me-energy-label">
                <span>Energy for training: {energySpend}</span>
                <small>Available: {player.energy}</small>
              </div>
              <input type="range" min={10} max={Math.min(player.energy, 300)} step={10} value={energySpend} onChange={e => setEnergySpend(Number(e.target.value))} />
            </div>

            <div className="me-battle-actions">
              <button type="button" className="me-battle-strike-btn training-blue-btn" onClick={handleTrain}>
                Start Training
              </button>
              <div className="me-battle-auto-buttons">
                <button type="button" className="me-battle-auto-btn drink" onClick={handleAutoFull}>
                  Max Drills (with drinks)
                </button>
                <button type="button" className="me-battle-auto-btn" onClick={() => action("train")}>
                  Standard Drill (14E)
                </button>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const {
    day,
    nextElectionDay,
    player,
    parties,
    regions,
    resources,
    military,
    workExperience,
    laws,
    log,
    wars,
    language,
    setLanguage,
    action,
    buyFactoryEnergy,
    runFactoryCycle,
    travel,
    nextDay,
    setRole,
    upgradePerk,
    joinDominantParty,
    createParty,
    attackNeighbor,
    bills,
    proposeBill,
    voteOnBill,
    winPlayGame
  } = useGameStore();

  const rest = () => action("rest");
  const refillEnergy = () => buyFactoryEnergy();

  const t = translations[language];
  const TABS = getTabs(t);
  const TAB_LABELS = getTabLabels(t);
  const [activeTab, setActiveTab] = useState<AppTab>("home");
  const [isHomeMenuOpen, setIsHomeMenuOpen] = useState(false);
  const [profileCareerTrack, setProfileCareerTrack] = useState("Citizen track");
  const [workSearch, setWorkSearch] = useState("");
  const [isAutoMode, setIsAutoMode] = useState(false);
  const [refillEnergyCost, setRefillEnergyCost] = useState<number>(FULL_FACTORY_ENERGY_COST);
  const [selectedFactoryId, setSelectedFactoryId] = useState<FactoryId | null>(null);
  const [mapFocus, setMapFocus] = useState<MapFocusState>({ regionId: null, countryName: null });
  const [parliamentSubPage, setParliamentSubPage] = useState<ParliamentSubPage>("overview");
  const [lawCategoryFilter, setLawCategoryFilter] = useState<LawCategory | "all">("all");
  const [selectedLawType, setSelectedLawType] = useState<LawType | null>(null);
  const [billListFilter, setBillListFilter] = useState<"pending" | "accepted" | "rejected">("pending");
  const [selectedWar, setSelectedWar] = useState<WarConflict | null>(null);
  const [isTrainingOpen, setIsTrainingOpen] = useState(false);
  const [isQuizOpen, setIsQuizOpen] = useState(false);
  const workSearchRef = useRef<HTMLInputElement>(null);
  const deferredWorkSearch = useDeferredValue(workSearch);

  useEffect(() => {
    const timer = window.setInterval(() => {
      nextDay();
    }, REALTIME_TICK_SECONDS * 1000);
    return () => window.clearInterval(timer);
  }, [nextDay]);

  useEffect(() => {
    setIsHomeMenuOpen(false);
    if (activeTab !== "parliament") setParliamentSubPage("overview");
  }, [activeTab]);

  const openTab = (tab: AppTab) => {
    setActiveTab(tab);
    setIsHomeMenuOpen(false);
  };

  const isHomeTab = activeTab === "home";
  const isStorageTab = activeTab === "storage";
  const isMapTab = activeTab === "map";
  const isParliamentTab = activeTab === "parliament";
  const isProfileTab = activeTab === "profile";
  const isWorkTab = activeTab === "work";
  const isWarsTab = activeTab === "wars";
  const isGameChromeTab = isWorkTab || isWarsTab;
  const activeTabLabel = getTabLabels(t)[activeTab];

  const region = regions.find((entry) => entry.id === player.locationId)!;
  const dominantParty = [...parties].sort((a, b) => b.popularity - a.popularity)[0];
  const activeParty = parties.find((entry) => entry.id === player.partyId) ?? dominantParty;

  const neighbors = useMemo(
    () =>
      region.neighbors
        .map((id) => regions.find((entry) => entry.id === id))
        .filter((entry): entry is Region => Boolean(entry)),
    [region.neighbors, regions]
  );

  const profileWealth = Math.round(
    (player.money + resources.gold * 320 + resources.oil * 140 + military.tanks * 850 + player.level * 550) * 1400
  );
  const profileRankScore = 1000 + player.influence * 10 + player.level * 5;
  const xpPercent = clamp(Math.round((player.xp / player.xpToNext) * 100), 0, 100);
  const hpPercent = clamp(Math.round((player.hp / 120) * 100), 0, 100);
  const controlPercent = clamp(Math.round((region.economy + region.stability) / 2), 0, 100);
  const storageCapacity = getStorageCapacity(player);
  const storageUsage = getStorageUsage(resources);
  const storageFillPercent = clamp(Math.round((storageUsage / storageCapacity) * 100), 0, 100);
  const hasDepartmentAccess = canAccessDepartments(player);
  const activeWorkFactoryId = selectedFactoryId ?? "gold";
  const regionIndexSummary = formatRegionIndexes(region);

  const strengthScore = clamp(player.strength * 8 + player.level * 2, 1, 99);
  const educationScore = clamp(player.intelligence * 8 + player.level * 2, 1, 99);
  const enduranceScore = clamp(player.stamina * 8 + player.level * 2, 1, 99);
  const charismaScore = clamp(player.charisma * 8 + player.level * 2, 1, 99);

  const profileName = `${region.city} Commander`;
  const roleInitials = player.role
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const occupationCards = [
    {
      title: `${region.city} command region`,
      subtitle: `${region.country} (${region.governmentType || "Parliamentary Republic"}) | Residence zone ${region.name}`
    },
    {
      title: `Faction: ${activeParty?.name ?? "Unaffiliated"}`,
      subtitle: `Members ${formatNumber(activeParty?.members ?? 0)} | Popularity ${activeParty?.popularity ?? 0}%`
    },
    {
      title: `Region indexes`,
      subtitle: `${regionIndexSummary} | Election cycle day ${nextElectionDay}`
    }
  ];

  const profileCareerOptions = [
    { value: "government", label: `${player.role} track` },
    { value: "party", label: `${activeParty?.name ?? "State"} office` },
    { value: "industry", label: `${region.city} industry bureau` },
    { value: "military", label: "Military command" }
  ];

  const onlinePlayers = 540 + day * 2 + player.level * 3;
  const worldPlayers = 22000 + day * 18;
  const worldRegions = 900 + regions.length * 2;
  const worldStates = 83 + parties.length;
  const regionFactories = Math.max(1, Math.round((region.economy + resources.iron + region.developmentIndex * 12) / 20));
  const stateFactories = Math.max(3, regionFactories + Math.round((military.tanks + region.developmentIndex) / 2) + 1);
  const nearestWarTotal = neighbors.length * 6 + military.infantry + region.militaryIndex * 2;
  const offenseDamage = formatNumber(getWarDamageEstimate(player, region, military));
  const defenseDamage = formatNumber(getWarDefenseEstimate(region));

  const homeResources = [
    { label: "Energy drink", value: `${(resources.food * 0.1).toFixed(1)} K PCS` },
    { label: "Oil", value: `${(resources.oil * 6.72).toFixed(1)} KK BBL` },
    { label: "Ore", value: `${(resources.iron * 1.4).toFixed(1)} KK KG` },
    { label: "Uranium", value: `${resources.uranium * 20} K G` }
  ];

  const storageOverview = [
    {
      label: "Vault reserve",
      value: `${formatNumber(resources.gold * 1250)} kg`,
      detail: `${resources.gold} raw gold units secured | ${regionIndexSummary}`,
      tone: "gold" as const,
      icon: "vault" as const
    },
    {
      label: "Fuel stock",
      value: `${formatNumber(resources.oil * 6720)} bbl`,
      detail: `${resources.oil} oil shipments in storage`,
      tone: "blue" as const,
      icon: "fuel" as const
    },
    {
      label: t.ui.fieldEnergy,
      value: `${player.energy}/200`,
      detail: `${storageFillPercent}% full | ${formatNumber(storageUsage)} / ${formatNumber(storageCapacity)} cap`,
      tone: "green" as const,
      icon: "bolt" as const
    },
    {
      label: t.ui.warChest,
      value: `$${formatNumber(player.money)}`,
      detail: `Influence ${player.influence} | Level ${player.level}`,
      tone: "red" as const,
      icon: "chest" as const
    }
  ];

  const storageLogistics = [
    { label: "Ore cargo", value: `${formatNumber(resources.iron * 1400)} kg`, icon: "ore" as const },
    { label: "Uranium cores", value: `${formatNumber(resources.uranium * 20)} g`, icon: "uranium" as const },
    { label: "Storage cap", value: formatNumber(storageCapacity), icon: "storage" as const },
    { label: "Region indexes", value: regionIndexSummary, icon: "search" as const }
  ];

  const storageArsenal = [
    { label: "Infantry kits", value: formatNumber(military.infantry), detail: `Military index ${region.militaryIndex} war scaling`, icon: "infantry" as const },
    { label: "Tank columns", value: formatNumber(military.tanks), detail: "Heavy assault armor", icon: "tank" as const },
    { label: "Aircraft", value: formatNumber(military.aircraft), detail: "Air support hangars", icon: "aircraft" as const },
    { label: "Navy", value: formatNumber(military.navy), detail: "Sea control fleets", icon: "ship" as const }
  ];

  const workBrand = region.city.split(" ").slice(0, 2).join(" ");
  const workSpecialtyXp = formatNumber(workExperience[activeWorkFactoryId]);
  const workSpecialtyXpMax = formatNumber(getMaxWorkExperience(player, region));
  const workEnergyPercent = clamp(Math.round((player.energy / 300) * 100), 0, 100);
  const workBonus = getWorkBonusPercent(player, region, workExperience, activeWorkFactoryId).toFixed(1);

  const workResources: WorkResourceItem[] = [
    { label: t.resources.gold, value: (resources.gold * 11.52).toFixed(2), tone: "gold", symbol: "Au" },
    { label: t.resources.oil, value: (resources.oil * 24.56).toFixed(2), tone: "oil", symbol: "Br" },
    { label: t.resources.ore, value: (resources.iron * 13.06).toFixed(2), tone: "ore", symbol: "Fe" },
    { label: t.resources.uranium, value: (resources.uranium * 1.37).toFixed(2), tone: "uranium", symbol: "U" },
    { label: t.resources.diamond, value: ((resources.diamond || 0) * 14.12 + 0.84).toFixed(2), tone: "diamond", symbol: "D" }
  ];

  const workFactories = useMemo<WorkFactory[]>(
    () => [
      {
        id: "gold",
        name: `${workBrand} Bullion`,
        specialty: t.factories.gold,
        level: 130 + (resources.gold || 0) * 4 + player.level + region.developmentIndex * 2,
        badge: "AU",
        tone: "gold",
        owner: "Emilia Clarke",
        founded: `${t.ui.founded}: 14 February 2017 09:12`
      },
      {
        id: "oil",
        name: `${workBrand} Energy`,
        specialty: t.factories.oil,
        level: 112 + (resources.oil || 0) * 6 + player.level + region.militaryIndex * 4,
        badge: "OI",
        tone: "oil",
        owner: "Marcus Vane",
        founded: `${t.ui.founded}: 14 February 2017 09:12`
      },
      {
        id: "ore",
        name: `${workBrand} Extraction`,
        specialty: t.factories.ore,
        level: 94 + (resources.iron || 0) * 3 + player.level + region.developmentIndex * 2,
        badge: "FE",
        tone: "ore",
        owner: "Silas Thorne",
        founded: `${t.ui.founded}: 14 February 2017 09:12`
      },
      {
        id: "uranium",
        name: `${workBrand} Atomic`,
        specialty: t.factories.uranium,
        level: 116 + resources.uranium * 8 + player.level + region.educationIndex * 3,
        badge: "U",
        tone: "uranium",
        owner: "Amina Sato",
        founded: `${t.ui.founded}: 22 July 2019 06:18`
      },
      {
        id: "diamond",
        name: `${workBrand} Gemcorp`,
        specialty: t.factories.diamond,
        level: 80 + (resources.diamond || 0) * 2 + player.level + region.developmentIndex * 5,
        badge: "DI",
        tone: "diamond",
        owner: "Emir Hassan",
        founded: `${t.ui.founded}: 3 January 2021 14:00`
      },
      {
        id: "logistics",
        name: `${region.country.split(" ")[0]} Department`,
        specialty: hasDepartmentAccess ? t.factories.logistics : `${t.factories.logistics} Education ${player.intelligence}/100`,
        level: 142 + player.level + region.educationIndex * 8 + region.developmentIndex * 8,
        badge: "ST",
        tone: "energy",
        owner: activeParty?.name ?? "State administration",
        founded: hasDepartmentAccess ? "State departments unlocked" : "Education 100 required"
      }
    ],
    [
      activeParty?.name,
      hasDepartmentAccess,
      player.intelligence,
      player.level,
      region.country,
      region.developmentIndex,
      region.educationIndex,
      region.militaryIndex,
      resources.gold,
      resources.iron,
      resources.oil,
      resources.uranium,
      workBrand
    ]
  );

  useEffect(() => {
    setMapFocus({ regionId: player.locationId, countryName: region.country });
  }, [player.locationId, region.country]);

  useEffect(() => {
    setSelectedFactoryId((current) =>
      workFactories.some((factory) => factory.id === current) ? current : (workFactories[0]?.id ?? null)
    );
  }, [workFactories]);

  const selectedWorkFactory = workFactories.find((factory) => factory.id === selectedFactoryId) ?? workFactories[0]!;
  const canStartAutoWork = player.energyCredits >= FULL_FACTORY_ENERGY_COST;
  const featuredOwnerInitials = selectedWorkFactory.owner
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const filteredWorkFactories = useMemo(() => {
    const query = deferredWorkSearch.trim().toLowerCase();
    if (!query) return workFactories;
    return workFactories.filter((factory) =>
      `${factory.name} ${factory.specialty}`.toLowerCase().includes(query)
    );
  }, [deferredWorkSearch, workFactories]);

  const mapFocusRegion = mapFocus.regionId ? regions.find((entry) => entry.id === mapFocus.regionId) ?? null : null;
  const mapFocusCountryName = mapFocus.countryName ?? mapFocusRegion?.country ?? region.country;
  const mapFocusParty = mapFocusRegion ? parties.find((entry) => entry.id === mapFocusRegion.owner) ?? null : null;
  const mapStateLabel = mapFocusRegion 
    ? (mapFocusRegion.isIndependent ? "Independent Region" : (mapFocusParty?.name ?? mapFocusRegion.country))
    : "Independent Region";
  const mapRegionLabel = mapFocusRegion ? `${mapFocusRegion.city} / ${mapFocusRegion.name}` : mapFocusCountryName;
  const isCurrentMapRegion = mapFocusRegion?.id === region.id;
  const mapFocusCopy = mapFocusRegion
    ? isCurrentMapRegion
      ? `${mapFocusRegion.country} | ${formatRegionIndexes(mapFocusRegion)} | ${mapFocusRegion.isIndependent ? "Independent territory." : "Drag to navigate the world map."}`
      : `${mapFocusRegion.country} | Stability ${mapFocusRegion.stability}% | ${mapFocusRegion.isIndependent ? "Independent territory." : formatRegionIndexes(mapFocusRegion)}`
    : `${mapFocusCountryName} has no state. Drag to explore and select a highlighted territory.`;

  const revolutionaries = Math.max(0, Math.floor((player.influence + player.charisma + player.level + region.developmentIndex) / 6));
  const revolutionMissing = Math.max(0, 3 - revolutionaries);
  const coupTargets = regions.filter((entry) => entry.id !== region.id && entry.stability < 60 && canCoupRegion(entry)).length;

  const warsConflicts = useMemo<WarConflict[]>(() => {
    return wars.map((war) => {
      const targetRegion = regions.find((r) => r.id === war.targetRegion);
      if (!targetRegion) {
        // Fallback for safety
        return {
          id: war.id,
          icon: "fist",
          tone: "danger",
          frontName: war.attackerId,
          frontDamage: formatNumber(war.attackerDamage),
          strikeDamage: formatNumber(war.defenderDamage - war.attackerDamage),
          targetName: "Unknown Front",
          targetRegion: "unknown",
          targetDamage: formatNumber(war.defenderDamage),
          progress: 50,
          endsIn: "--:--:--",
          emblem: "?",
          rawAttackerDamage: war.attackerDamage,
          rawDefenderDamage: war.defenderDamage,
          active: true
        };
      }
      const secondsLeft = Math.max(0, Math.floor((war.expiresAt - Date.now()) / 1000));
      return {
        id: war.id,
        icon: "fist",
        tone: "danger",
        frontName: war.attackerId,
        frontDamage: formatNumber(war.attackerDamage),
        strikeDamage: formatNumber(war.defenderDamage - war.attackerDamage),
        targetName: targetRegion.city,
        targetRegion: targetRegion.id,
        targetDamage: formatNumber(war.defenderDamage),
        progress: clamp(Math.round((war.attackerDamage / (war.defenderDamage || 1)) * 100), 16, 96),
        endsIn: war.active && secondsLeft > 0 ? formatCountdown(secondsLeft) : "FINISHED",
        emblem: targetRegion.country.slice(0, 1).toUpperCase(),
        rawAttackerDamage: war.attackerDamage,
        rawDefenderDamage: war.defenderDamage,
        active: war.active
      };
    });
  }, [wars, regions, day]);

  const parliamentName = `${region.country} Parliament`;
  const parliamentConvocationDate = "12 March 2026 18:19";
  const parliamentNextVote = "18 March 2026 18:19";

  const parliamentBlocs = useMemo<ParliamentBloc[]>(() => {
    const secondaryParty = parties.find((entry) => entry.id !== dominantParty.id);
    const blocSeeds = [
      {
        id: dominantParty.id,
        name: dominantParty.name,
        members: dominantParty.members + region.population * 12,
        weight: dominantParty.popularity + 18,
        location: region.city,
        tone: "red" as const
      },
      {
        id: secondaryParty?.id ?? `${region.id}-coalition`,
        name: secondaryParty?.name ?? `${region.city} Coalition`,
        members: (secondaryParty?.members ?? 420) + region.population * 8,
        weight: secondaryParty?.popularity ?? Math.max(14, Math.round(region.economy / 4)),
        location: neighbors[0]?.city ?? region.country,
        tone: "blue" as const
      },
      {
        id: `${region.id}-academy`,
        name: `${region.country.split(" ")[0]} Academy`,
        members: 160 + region.economy * 3,
        weight: Math.max(10, Math.round(region.economy / 5)),
        location: neighbors[1]?.city ?? workBrand,
        tone: "violet" as const
      },
      {
        id: `${region.id}-industry`,
        name: "Industrial League",
        members: 120 + stateFactories * 14,
        weight: Math.max(8, Math.round((resources.iron + resources.oil) / 4)),
        location: region.name,
        tone: "gold" as const
      },
      {
        id: `${region.id}-independents`,
        name: "Independent Bloc",
        members: 70 + player.influence * 6,
        weight: Math.max(6, Math.round(player.influence / 2) + 4),
        location: player.role,
        tone: "lime" as const
      }
    ];

    const seatCounts = allocateSeats(
      blocSeeds.map((bloc) => bloc.weight),
      PARLIAMENT_TOTAL_SEATS
    );

    return blocSeeds.map((bloc, index) => ({
      id: bloc.id,
      name: bloc.name,
      members: bloc.members,
      seats: seatCounts[index],
      share: Number(((seatCounts[index] / PARLIAMENT_TOTAL_SEATS) * 100).toFixed(2)),
      location: bloc.location,
      tone: bloc.tone,
      emblem: bloc.name
        .split(/\s+/)
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    }));
  }, [
    dominantParty.id,
    dominantParty.members,
    dominantParty.name,
    dominantParty.popularity,
    neighbors,
    parties,
    player.influence,
    player.role,
    region.city,
    region.country,
    region.economy,
    region.id,
    region.name,
    region.population,
    resources.iron,
    resources.oil,
    stateFactories,
    workBrand
  ]);

  const parliamentLeadBloc = parliamentBlocs[0];
  const parliamentSeatRows = useMemo<ParliamentSeatTone[][]>(() => {
    const filledSeats = parliamentBlocs.flatMap((bloc) =>
      Array.from({ length: bloc.seats }, () => bloc.tone as ParliamentSeatTone)
    );
    const emptySeats: ParliamentSeatTone[] = Array.from(
      { length: Math.max(0, PARLIAMENT_SEAT_CAPACITY - filledSeats.length) },
      () => "empty"
    );
    const chamberSeats: ParliamentSeatTone[] = [...emptySeats, ...filledSeats];

    let cursor = 0;
    return PARLIAMENT_SEAT_ROWS.map((rowCount) => {
      const row = chamberSeats.slice(cursor, cursor + rowCount);
      cursor += rowCount;
      return row;
    });
  }, [parliamentBlocs]);

  const shellClassName = [
    "phone-screen",
    isWorkTab ? "work-shell" : "",
    isWarsTab ? "wars-shell" : "",
    isParliamentTab ? "parliament-shell" : ""
  ]
    .filter(Boolean)
    .join(" ");
  const topbarClassName = [
    "phone-topbar",
    isWorkTab ? "work-topbar" : "",
    isWarsTab ? "wars-topbar" : "",
    isParliamentTab ? "parliament-topbar" : ""
  ]
    .filter(Boolean)
    .join(" ");
  const phoneContentClassName = [
    "phone-content",
    isProfileTab ? "me-profile-mode" : "",
    isWorkTab ? "work-mode" : "",
    isWarsTab ? "wars-mode" : "",
    isMapTab ? "map-mode" : "",
    isStorageTab ? "storage-mode" : "",
    isParliamentTab ? "parliament-mode" : ""
  ]
    .filter(Boolean)
    .join(" ");
  const navClassName = ["bottom-nav", isWorkTab ? "work-nav" : "", isWarsTab ? "wars-nav" : ""]
    .filter(Boolean)
    .join(" ");

  const homeMenuItems = [
    {
      label: "World map",
      description: "Travel and inspect territories",
      action: () => openTab("map")
    },
    {
      label: "Storage",
      description: "Open inventory and reserves",
      action: () => openTab("storage")
    },
    {
      label: "Parliament",
      description: "Open the state chamber",
      action: () => openTab("parliament")
    },
    {
      label: "Profile",
      description: "Commander stats and office",
      action: () => openTab("profile")
    }
  ];

  useEffect(() => {
    if (!isAutoMode || !selectedWorkFactory) return;

    const timer = window.setInterval(() => {
      const success = runFactoryCycle(selectedWorkFactory.id, "auto");
      if (!success) {
        setIsAutoMode(false);
      }
    }, AUTO_WORK_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [isAutoMode, runFactoryCycle, selectedWorkFactory.id]);

  return (
    <div className="app-stage">
      <main className={shellClassName}>
        {isProfileTab ? (
          <header className="phone-topbar">
            <div className="topbar-icon-btn">
              <button
                type="button"
                className="me-lang-btn"
                onClick={() => setLanguage(language === 'en' ? 'ko' : 'en')}
              >
                {language.toUpperCase()}
              </button>
            </div>
            <h1>{activeTabLabel}</h1>
            <button type="button" className="topbar-icon-btn">
              <Icon name="search" className="topbar-icon" />
            </button>
          </header>
        ) : isParliamentTab ? (
          <header className={topbarClassName}>
            <button type="button" className="topbar-icon-btn" onClick={() => {
              if (parliamentSubPage === "enact_law") setParliamentSubPage("overview");
              else openTab("home");
            }} aria-label="Return">
              <Icon name="back" className="topbar-icon" />
            </button>
            <h1>{parliamentSubPage === "enact_law" ? t.ui.enactLaw : "Parliament"}</h1>
            <button type="button" className="topbar-icon-btn topbar-ghost" aria-hidden="true" tabIndex={-1}>
              Home
            </button>
          </header>
        ) : (
          <header className={topbarClassName}>
            <button
              type="button"
              className={isGameChromeTab ? "topbar-icon-btn" : "topbar-menu-btn"}
              onClick={isMapTab ? () => openTab("home") : () => openTab("map")}
              aria-label={isMapTab ? "Return home" : "Open map page"}
            >
              {isGameChromeTab ? <Icon name="search" className="topbar-icon" /> : isMapTab ? t.tabs.home : t.tabs.map}
            </button>
            <h1>{activeTab === "map" ? "Maps" : activeTabLabel}</h1>
            <button
              type="button"
              className={isGameChromeTab ? "topbar-icon-btn" : isHomeTab ? `topbar-menu-btn${isHomeMenuOpen ? " open" : ""}` : "topbar-menu-btn"}
              onClick={
                isWorkTab
                  ? () => openTab("profile")
                  : isWarsTab
                    ? () => openTab("home")
                    : isHomeTab
                      ? () => setIsHomeMenuOpen((value) => !value)
                      : () => openTab("home")
              }
              aria-label={
                isWorkTab
                  ? "Open profile page"
                  : isWarsTab
                    ? "Return home"
                    : isHomeTab
                      ? "Toggle home menu"
                      : "Return home"
              }
            >
              {isWorkTab ? <Icon name="mail" className="topbar-icon" /> : isWarsTab ? <Icon name="dots" className="topbar-icon" /> : isHomeTab ? t.ui.menu : t.tabs.home}
            </button>
          </header>
        )}

        {isHomeTab && isHomeMenuOpen && (
          <section className="home-menu-shell">
            <div className="home-menu-dropdown">
              {homeMenuItems.map((item) => (
                <button key={item.label} type="button" className="home-menu-item" onClick={item.action}>
                  <strong>{item.label}</strong>
                  <span>{item.description}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {activeTab === "map" && (
          <>
            <section className="info-strip map-info-strip">
              <div className="info-block">
                <span>State:</span>
                <strong>{mapStateLabel}</strong>
              </div>
              <div className="info-block">
                <span>Region:</span>
                <strong>{mapRegionLabel}</strong>
              </div>
            </section>

            <section className="border-strip map-focus-strip">
              {mapFocusRegion ? (
                <button
                  type="button"
                  className={`map-focus-btn${isCurrentMapRegion ? " current" : ""}`}
                  onClick={() => {
                    if (!isCurrentMapRegion) travel(mapFocusRegion.id);
                  }}
                  disabled={isCurrentMapRegion}
                >
                  {isCurrentMapRegion ? "Current location" : `Travel to ${mapFocusRegion.city}`}
                </button>
              ) : (
                <strong className="status-badge closed">No active region</strong>
              )}
              <p>{mapFocusCopy}</p>
            </section>
          </>
        )}

        <section className={phoneContentClassName}>
          {isHomeTab && (
            <div className="home-page">
              <section className="home-card home-overview">
                <div className="home-globe">ME</div>
                <div className="home-metrics-grid">
                  <HomeMetric label="World" value={`${Math.round(worldPlayers / 1000)}ZK`} />
                  <HomeMetric label="Online" value={String(onlinePlayers)} accent />
                  <HomeMetric label="Regions" value={String(worldRegions)} />
                  <HomeMetric label="States" value={String(worldStates)} />
                </div>
              </section>

              <section className="home-card">
                <div className="home-double-grid">
                  <div className="home-detail-col">
                    <h3>Your region</h3>
                    <strong>{region.population}</strong>
                    <span>
                      {region.city}, {region.country}
                    </span>
                  </div>
                  <div className="home-detail-col">
                    <h3>Region parties</h3>
                    <strong>{parties.length}</strong>
                    <span>Leader: {activeParty?.name ?? "None"}</span>
                  </div>
                  <div className="home-detail-col">
                    <h3>State</h3>
                    <strong>{Math.max(12, region.population + parties.length * 8)}</strong>
                    <span>Stability {region.stability}%</span>
                  </div>
                  <div className="home-detail-col">
                    <h3>Factories</h3>
                    <strong>{stateFactories}</strong>
                    <span>Region: {regionFactories}</span>
                  </div>
                </div>
                <button type="button" className="home-wide-btn" onClick={() => openTab("parliament")}>
                  State parliament
                </button>
              </section>

              <section className="home-card">
                <div className="home-war-row">
                  <p>Nearest war, total: {nearestWarTotal}</p>
                  <button type="button" className="fight-btn" onClick={() => action("fight")}>
                    Fight
                  </button>
                  <small>Damage: {offenseDamage} / {defenseDamage}</small>
                </div>
                <button type="button" className="home-wide-btn" onClick={() => action("train")}>
                  Military training
                </button>
              </section>

              <section className="home-card home-resource-row">
                {homeResources.map((item) => (
                  <div key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </section>

              <div className="feed-box">
                {log.slice(0, 2).map((entry, index) => (
                  <p key={`${entry}-${index}`}>{entry}</p>
                ))}
              </div>
            </div>
          )}

          {isStorageTab && (
            <div className="storage-page">
              <section className="me-storage-grid">
                {storageOverview.map((item) => (
                  <StorageMetricCard
                    key={item.label}
                    label={item.label}
                    value={item.value}
                    detail={item.detail}
                    tone={item.tone}
                    icon={item.icon}
                  />
                ))}
              </section>

              <section className="me-storage-panel">
                <div className="storage-panel-head">
                  <h2>Regional storage</h2>
                  <span>{region.city} logistics depot</span>
                </div>
                <div className="me-storage-list two-col">
                  {storageLogistics.map((item) => (
                    <article key={item.label} className="me-storage-list-item">
                      <div className="me-storage-list-icon">
                        <Icon name={item.icon} className="me-storage-mini-icon" />
                      </div>
                      <div className="me-storage-list-copy">
                        <span>{item.label}</span>
                        <strong>{item.value}</strong>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section className="me-storage-panel">
                <div className="storage-panel-head">
                  <h2>Military stock</h2>
                  <span>Ready for deployment</span>
                </div>
                <div className="me-storage-list">
                  {storageArsenal.map((item) => (
                    <article key={item.label} className="me-storage-list-item expanded">
                      <div className="me-storage-list-icon">
                        <Icon name={item.icon} className="me-storage-mini-icon" />
                      </div>
                      <div className="me-storage-list-copy">
                        <div className="me-storage-list-top">
                          <span>{item.label}</span>
                          <strong>{item.value}</strong>
                        </div>
                        <small>{item.detail}</small>
                      </div>
                    </article>
                  ))}
                </div>
                <div className="storage-actions">
                  <button type="button" className="home-wide-btn" onClick={() => action("trade")}>
                    Open market shipment
                  </button>
                  <button type="button" className="home-wide-btn" onClick={() => action("rest")}>
                    Refill energy reserves
                  </button>
                </div>
              </section>
            </div>
          )}

          {isMapTab && (
            <WorldMap focusedRegionId={mapFocus.regionId} focusedCountryName={mapFocusCountryName} onFocusChange={setMapFocus} />
          )}

          {isParliamentTab && parliamentSubPage === "overview" && (
            <div className="parliament-page">
              {/* Independent Region Banner */}
              {region.isIndependent && (
                <section className="parliament-independent-banner">
                  <div className="pi-banner-icon">🏴</div>
                  <div className="pi-banner-content">
                    <h3>Independent Region</h3>
                    <p>
                      <strong>{region.name}</strong> is not under any state's control.
                      Anyone can gain <strong>residency</strong> here. Residents can elect a local parliament
                      and vote to <strong>form a new state</strong>.
                    </p>
                    <div className="pi-banner-details">
                      <div className="pi-detail-item">
                        <span className="pi-detail-label">Residency</span>
                        <span className="pi-detail-value open">Open to all</span>
                      </div>
                      <div className="pi-detail-item">
                        <span className="pi-detail-label">Borders</span>
                        <span className="pi-detail-value open">Unrestricted</span>
                      </div>
                      <div className="pi-detail-item">
                        <span className="pi-detail-label">Elections</span>
                        <span className="pi-detail-value">24h after independence</span>
                      </div>
                      <div className="pi-detail-item">
                        <span className="pi-detail-label">State Formation</span>
                        <span className="pi-detail-value gold">By parliament vote</span>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {!region.isIndependent && (
                <section className="parliament-chamber-card">
                  <div className="parliament-seat-map" aria-label={`${parliamentName} seat map`}>
                    {parliamentSeatRows.map((row, rowIndex) => (
                      <div key={`parliament-row-${rowIndex + 1}`} className={`parliament-seat-row row-${rowIndex + 1}`}>
                        {row.map((tone, seatIndex) => (
                          <span key={`seat-${rowIndex + 1}-${seatIndex + 1}`} className={`parliament-seat ${tone}`} aria-hidden="true" />
                        ))}
                      </div>
                    ))}
                    <div className="parliament-dais" aria-hidden="true">
                      <span>LAW</span>
                      <span>VOTE</span>
                      <span>STATE</span>
                    </div>
                  </div>
                </section>
              )}

              <section className="parliament-panel">
                {!region.isIndependent && (
                  <>
                    <div className="parliament-panel-head">
                      <div>
                        <span className="parliament-kicker">{`Parliament: ${region.country}`}</span>
                        <h2>{region.name} Chamber</h2>
                      </div>
                      <small>{PARLIAMENT_TOTAL_SEATS} SEATS</small>
                    </div>

                    <div className="parliament-meta">
                      <span>Convocation date:</span>
                      <strong>{parliamentConvocationDate}</strong>
                      <span>Next vote:</span>
                      <strong>{parliamentNextVote}</strong>
                    </div>

                    {/* Election Info Grid */}
                    <div className="parliament-election-strip">
                      <h3>⏱ Election Cycle</h3>
                      <div className="parliament-election-grid">
                        <div className="parliament-election-card">
                          <span className="ec-label">Cycle</span>
                          <span className="ec-value">Every 5 days</span>
                        </div>
                        <div className="parliament-election-card">
                          <span className="ec-label">Voting Window</span>
                          <span className="ec-value green">24 hours</span>
                        </div>
                        <div className="parliament-election-card">
                          <span className="ec-label">Parliament Size</span>
                          <span className="ec-value gold">{PARLIAMENT_TOTAL_SEATS} seats</span>
                        </div>
                        <div className="parliament-election-card">
                          <span className="ec-label">1% Threshold</span>
                          <span className="ec-value">{Math.max(1, Math.ceil(PARLIAMENT_TOTAL_SEATS * 0.01))} votes min</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* State Info */}
                <div className="parliament-state-strip">
                  <div className="parliament-state-row">
                    <span className="ps-label">Government</span>
                    <span className={`ps-value ${region.isIndependent ? "" : "gold"}`}>{region.isIndependent ? "No Government (Independent)" : (region.governmentType ?? "Parliamentary Republic")}</span>
                  </div>
                  {!region.isIndependent && (
                    <div className="parliament-state-row">
                      <span className="ps-label">Majority Target</span>
                      <span className="ps-value">{Math.floor(PARLIAMENT_TOTAL_SEATS / 2) + 1} seats (50%+)</span>
                    </div>
                  )}
                  <div className="parliament-state-row">
                    <span className="ps-label">{region.isIndependent ? "Region Stability" : "State Stability"}</span>
                    <span className="ps-value">{region.stability}%</span>
                  </div>
                  {region.isIndependent && (
                    <>
                      <div className="parliament-state-row">
                        <span className="ps-label">Residency</span>
                        <span className="ps-value" style={{ color: "#7dd956" }}>Open — anyone can request</span>
                      </div>
                      <div className="parliament-state-row">
                        <span className="ps-label">Work Permits</span>
                        <span className="ps-value" style={{ color: "#7dd956" }}>No restrictions</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Majority Strip */}
                {!region.isIndependent && (
                  <>
                    <div className="parliament-majority-strip">
                      <div className="parliament-majority-copy">
                        <strong>{parliamentLeadBloc.name}</strong>
                        <span>
                          {parliamentLeadBloc.seats}/{PARLIAMENT_TOTAL_SEATS} seats · {parliamentLeadBloc.share.toFixed(1)}%
                        </span>
                      </div>
                      <div className="parliament-majority-track" aria-hidden="true">
                        <span style={{ width: `${parliamentLeadBloc.share}%` }} />
                      </div>
                    </div>

                    {/* Party List */}
                    <div className="parliament-party-list">
                      {parliamentBlocs.map((bloc) => (
                        <ParliamentBlocRow key={bloc.id} bloc={bloc} />
                      ))}
                    </div>
                  </>
                )}

                {/* State Officials */}
                {!region.isIndependent && (<div className="parliament-officials-strip">
                  <h3>👔 State Officials</h3>
                  <div className="parliament-official-card">
                    <div className="parliament-official-icon leader">👑</div>
                    <div className="parliament-official-info">
                      <strong>State Leader</strong>
                      <span>Accepts war-related laws ahead of time</span>
                    </div>
                    <span className="parliament-official-name">{parliamentLeadBloc.name}</span>
                  </div>
                  <div className="parliament-official-card">
                    <div className="parliament-official-icon minister">💰</div>
                    <div className="parliament-official-info">
                      <strong>Minister of Economics</strong>
                      <span>Accepts/cancels economic laws</span>
                    </div>
                    <span className="parliament-official-name">—</span>
                  </div>
                  <div className="parliament-official-card">
                    <div className="parliament-official-icon foreign">🌐</div>
                    <div className="parliament-official-info">
                      <strong>Foreign Minister</strong>
                      <span>Accepts/cancels international laws</span>
                    </div>
                    <span className="parliament-official-name">—</span>
                  </div>
                  <div className="parliament-official-card">
                    <div className="parliament-official-icon advisor">📊</div>
                    <div className="parliament-official-info">
                      <strong>Economic Advisor</strong>
                      <span>Authorized to issue economic laws</span>
                    </div>
                    <span className="parliament-official-name">—</span>
                  </div>
                </div>)}

                {/* Voting Rules */}
                <div className="parliament-rules-strip">
                  <h3>📜 Voting Thresholds</h3>
                  <div className="parliament-rule-item">
                    <div className="parliament-rule-badge">&gt;50%</div>
                    <div className="parliament-rule-copy">
                      <strong>Standard Laws</strong>
                      <span>Most laws require more than 50% "Pro" votes to pass</span>
                    </div>
                  </div>
                  <div className="parliament-rule-item">
                    <div className="parliament-rule-badge high">&gt;80%</div>
                    <div className="parliament-rule-copy">
                      <strong>Dictatorship / Dominant-Party</strong>
                      <span>Requires 80%+ "Pro" votes to change state type</span>
                    </div>
                  </div>
                  <div className="parliament-rule-item">
                    <div className="parliament-rule-badge">{Math.floor(PARLIAMENT_TOTAL_SEATS / 2) + 1}+</div>
                    <div className="parliament-rule-copy">
                      <strong>Instant Pass</strong>
                      <span>Laws pass instantly if "Pro" votes exceed half the total seats</span>
                    </div>
                  </div>
                </div>

                {/* Requirements Note */}
                <div className="parliament-requirements">
                  <span className="req-icon">ℹ️</span>
                  <p className="req-text">
                    {region.isIndependent ? (
                      <>
                        This is an <strong>independent region</strong>. Anyone can request <strong>residency</strong> here.
                        Once residents form political parties, the local parliament can vote to <strong>form a new state</strong>.
                        Elections begin <strong>24 hours</strong> after independence is gained.
                      </>
                    ) : (
                      <>
                        To vote or run for parliament, players must be at least <strong>Level 50</strong> and
                        have had <strong>residency</strong> in the state for at least <strong>24 hours</strong>.
                        Parties need at least <strong>1%</strong> of total votes to gain seats.
                      </>
                    )}
                  </p>
                </div>
              </section>

              <button
                type="button"
                className="parliament-enact-btn"
                onClick={() => setParliamentSubPage("enact_law")}
              >
                {region.isIndependent ? "🏛 Form a New State" : `⚖ ${t.ui.enactLaw}`}
              </button>
            </div>
          )}

          {isParliamentTab && parliamentSubPage === "enact_law" && (() => {
            const localBills = bills.filter((b) => !b.targetRegionId || b.targetRegionId === region.id);
            const pendingBills = localBills.filter((b) => b.status === "pending");
            const acceptedBills = localBills.filter((b) => b.status === "accepted");
            const rejectedBills = localBills.filter((b) => b.status === "rejected");
            const availableLaws = region.isIndependent ? (["form_state"] as LawType[]) : ALL_LAW_TYPES.filter((lt) => lt !== "form_state");
            const filteredLawTypes = lawCategoryFilter === "all"
              ? availableLaws
              : availableLaws.filter((lt) => LAW_DEFINITIONS[lt].category === lawCategoryFilter);
            const displayBills = billListFilter === "pending" ? pendingBills : billListFilter === "accepted" ? acceptedBills : rejectedBills;

            return (
              <div className="parliament-page enact-law-page">
                {/* Propose a new law */}
                {(!region.isIndependent && player.level < 10) ? (
                  <section className="law-propose-panel" style={{ padding: "16px", textAlign: "center", color: "#9aa3b0" }}>
                    <p>You must be at least <strong>Level 10</strong>, and have 100$ / 10 Influence to propose state laws.</p>
                  </section>
                ) : (
                  <section className="law-propose-panel">
                    <div className="law-propose-header">
                      <h2>{t.ui.proposeBill}</h2>
                      {!region.isIndependent && <small>-100$ -10 Inf</small>}
                    </div>

                  {!region.isIndependent && (
                    <div className="law-category-tabs">
                      {(["all", "economic", "political", "government"] as const).map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          className={`law-cat-tab${lawCategoryFilter === cat ? " active" : ""}`}
                          onClick={() => setLawCategoryFilter(cat)}
                        >
                          {cat === "all" ? "All" : (t.ui as any)[cat] ?? cat}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="law-type-list">
                    {filteredLawTypes.map((lt) => {
                      const def = LAW_DEFINITIONS[lt];
                      const lawName = (t.laws as any)?.[lt] ?? lt.replace(/_/g, " ");
                      const isSelected = selectedLawType === lt;
                      return (
                        <button
                          key={lt}
                          type="button"
                          className={`law-type-item${isSelected ? " selected" : ""}`}
                          onClick={() => setSelectedLawType(isSelected ? null : lt)}
                        >
                          <div className={`law-type-cat-badge ${def.category}`}>
                            {def.category === "economic" ? "💰" : def.category === "political" ? "🏛" : "⚙"}
                          </div>
                          <div className="law-type-copy">
                            <strong>{lawName}</strong>
                            <p>{def.description(region)}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {selectedLawType && (
                    <button
                      type="button"
                      className="law-submit-btn"
                      onClick={() => {
                        if (selectedLawType !== "form_state") {
                          if (player.money < 100 || player.influence < 10) {
                            alert("Need 100 money and 10 influence to propose a bill.");
                            return;
                          }
                          if (player.level < 10) {
                            alert("Must be at least level 10 to propose bills.");
                            return;
                          }
                        }
                        
                        proposeBill(selectedLawType);
                        setSelectedLawType(null);
                        alert(`Bill "${(t.laws as any)?.[selectedLawType] ?? selectedLawType}" successfully proposed! Check the Pending Bills tab to cast your vote.`);
                      }}
                    >
                      {t.ui.proposeBill}: {(t.laws as any)?.[selectedLawType] ?? selectedLawType}
                    </button>
                  )}
                </section>
                )}

                {/* Bill filter tabs */}
                <section className="law-bills-panel">
                  <div className="law-bills-tabs">
                    <button
                      type="button"
                      className={`law-bill-tab${billListFilter === "pending" ? " active" : ""}`}
                      onClick={() => setBillListFilter("pending")}
                    >
                      {t.ui.pendingBills} ({pendingBills.length})
                    </button>
                    <button
                      type="button"
                      className={`law-bill-tab${billListFilter === "accepted" ? " active" : ""}`}
                      onClick={() => setBillListFilter("accepted")}
                    >
                      {t.ui.acceptedLaws} ({acceptedBills.length})
                    </button>
                    <button
                      type="button"
                      className={`law-bill-tab${billListFilter === "rejected" ? " active" : ""}`}
                      onClick={() => setBillListFilter("rejected")}
                    >
                      {t.ui.rejectedLaws} ({rejectedBills.length})
                    </button>
                  </div>

                  <div className="law-bill-list">
                    {displayBills.length === 0 && (
                      <p className="law-empty-state">
                        {billListFilter === "pending"
                          ? "No pending bills at this time."
                          : billListFilter === "accepted"
                            ? "No accepted laws yet."
                            : "No rejected laws yet."}
                      </p>
                    )}
                    {displayBills.map((bill) => {
                      const totalVotes = bill.votesFor + bill.votesAgainst;
                      const proPercent = totalVotes > 0 ? Math.round((bill.votesFor / totalVotes) * 100) : 0;
                      const contraPercent = totalVotes > 0 ? Math.round((bill.votesAgainst / totalVotes) * 100) : 0;
                      const lawName = (t.laws as any)?.[bill.lawType] ?? bill.title;
                      const statusLabel = bill.status === "accepted" ? t.ui.passed : bill.status === "rejected" ? t.ui.rejected : t.ui.pending;

                      return (
                        <article key={bill.id} className={`law-bill-card ${bill.status}`}>
                          <div className="law-bill-head">
                            <div className={`law-bill-cat-dot ${bill.category}`} />
                            <div className="law-bill-title-wrap">
                              <strong>{lawName}</strong>
                              <span className={`law-bill-status ${bill.status}`}>{statusLabel}</span>
                            </div>
                          </div>
                          <p className="law-bill-desc">{bill.description}</p>
                          <div className="law-bill-meta">
                            <span>{t.ui.proposedBy}: {bill.proposedBy}</span>
                            <span>{t.ui.expiresDay}: {bill.expiresDay}</span>
                          </div>

                          <div className="law-bill-vote-bar">
                            <div className="law-vote-track">
                              <div className="law-vote-pro-fill" style={{ width: `${proPercent}%` }} />
                              <div className="law-vote-contra-fill" style={{ width: `${contraPercent}%` }} />
                            </div>
                            <div className="law-vote-labels">
                              <span className="law-vote-pro-label">{t.ui.votePro} {bill.votesFor} ({proPercent}%)</span>
                              <span className="law-vote-contra-label">{t.ui.voteContra} {bill.votesAgainst} ({contraPercent}%)</span>
                            </div>
                          </div>

                          {bill.status === "pending" && !bill.playerVoted && (
                            <div className="law-bill-actions">
                              <button
                                type="button"
                                className="law-vote-btn pro"
                                onClick={() => voteOnBill(bill.id, "pro")}
                              >
                                ✓ {t.ui.votePro}
                              </button>
                              <button
                                type="button"
                                className="law-vote-btn contra"
                                onClick={() => voteOnBill(bill.id, "contra")}
                              >
                                ✗ {t.ui.voteContra}
                              </button>
                            </div>
                          )}
                          {bill.status === "pending" && bill.playerVoted && (
                            <div className="law-bill-voted-badge">✓ Voted</div>
                          )}
                        </article>
                      );
                    })}
                  </div>
                </section>
              </div>
            );
          })()}

          {isWorkTab && (
            <div className="work-page">
              <section className="work-resource-panel">
                <p className="work-panel-label">Resources, region: {region.city}</p>
                <div className="work-resource-grid">
                  {workResources.map((item) => (
                    <WorkResourceMetric key={item.label} item={item} />
                  ))}
                </div>
              </section>

              <button type="button" className="work-manage-btn" onClick={() => workSearchRef.current?.focus()}>
                Manage factories
              </button>

              <section className="work-factory-panel">
                <p className="work-panel-label">Factory exp: {workSpecialtyXp} / {workSpecialtyXpMax}</p>

                <article className="featured-factory-card">
                  <div className={`featured-factory-logo ${selectedWorkFactory.tone}`} aria-hidden="true">
                    {selectedWorkFactory.badge}
                  </div>
                  <div className="featured-factory-copy">
                    <h2>{selectedWorkFactory.name}</h2>
                    <p>
                      {selectedWorkFactory.specialty}, level {selectedWorkFactory.level}
                    </p>
                  </div>
                </article>

                <article className="featured-owner-card">
                  <div className="featured-owner-avatar" aria-hidden="true">
                    {featuredOwnerInitials}
                  </div>
                  <div className="featured-owner-copy">
                    <strong>Owner: {selectedWorkFactory.owner}</strong>
                    <span>{selectedWorkFactory.founded}</span>
                  </div>
                </article>

                <div className="work-energy-row">
                  <button type="button" className="work-plus-btn" onClick={() => action("rest")} aria-label="Recover with rest">
                    +
                  </button>
                  <div className="work-energy-status">
                    <span>Energy: {isAutoMode ? 0 : player.energy}/300</span>
                    <div className="work-energy-track">
                      <div className="work-energy-fill" style={{ width: `${isAutoMode ? 0 : workEnergyPercent}%` }} />
                    </div>
                  </div>
                  <button type="button" className="work-refill-btn" onClick={() => buyFactoryEnergy(refillEnergyCost)}>
                    Refill
                  </button>
                  <div className="work-energy-select-wrap">
                    <label className="sr-only" htmlFor="work-energy-cost">
                      Reserve energy spend amount
                    </label>
                    <select
                      id="work-energy-cost"
                      className="work-energy-cost"
                      value={refillEnergyCost}
                      onChange={(event) => setRefillEnergyCost(Number(event.target.value))}
                    >
                      {WORK_REFILL_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option === FULL_FACTORY_ENERGY_COST ? `${option} E (Full)` : `${option} E`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button type="button" className="work-primary-btn" onClick={() => runFactoryCycle(selectedWorkFactory.id, "manual")}>
                  Work, +{workBonus}% output
                </button>

                <button
                  type="button"
                  className={`work-secondary-btn${isAutoMode ? " active" : ""}`}
                  aria-pressed={isAutoMode}
                  onClick={() => setIsAutoMode((value) => !value)}
                >
                  {isAutoMode
                    ? `Automatic mode on  full ${FULL_FACTORY_ENERGY_COST}E / 10m`
                    : `Automatic mode${canStartAutoWork ? `  full ${FULL_FACTORY_ENERGY_COST}E / 10m` : `  need ${FULL_FACTORY_ENERGY_COST}E`}`}
                </button>
              </section>

              <section className="work-search-panel">
                <label className="sr-only" htmlFor="work-search">
                  Search factory
                </label>
                <input
                  id="work-search"
                  ref={workSearchRef}
                  type="search"
                  className="work-search-input"
                  placeholder="Search factory"
                  value={workSearch}
                  onChange={(event) => setWorkSearch(event.target.value)}
                />

                <div className="work-factory-list">
                  {filteredWorkFactories.map((factory) => (
                    <WorkFactoryRow
                      key={factory.id}
                      factory={factory}
                      isSelected={factory.id === selectedWorkFactory.id}
                      onSelect={() => setSelectedFactoryId(factory.id)}
                      onWork={() => {
                        setSelectedFactoryId(factory.id);
                        runFactoryCycle(factory.id, "manual");
                      }}
                    />
                  ))}
                  {filteredWorkFactories.length === 0 && (
                    <p className="work-empty-state">No factories match that search right now.</p>
                  )}
                </div>
              </section>
            </div>
          )}

          {isWarsTab && (
            <div className="wars-page">
              <WarPromptCard
                icon="fist"
                title="Revolution"
                description={
                  revolutionMissing > 0
                    ? `You need ${revolutionMissing} more people to start a revolution in your region. Revolutionaries at the moment: ${revolutionaries}.`
                    : `You have enough supporters to start a revolution in ${region.city}. Revolutionaries at the moment: ${revolutionaries}.`
                }
                buttonLabel="Join, -75 G"
                accent="blue"
                onAction={() => action("campaign")}
              />

              <WarPromptCard
                icon="flame"
                title="Coup"
                description={`You can start a coup in ${coupTargets} weakened region${coupTargets === 1 ? "" : "s"}. Regions with development above level 2 are protected.`}
                buttonLabel="Coup regions"
                accent="red"
                onAction={attackNeighbor}
              />

              <button type="button" className="wars-wide-btn blue training" onClick={() => setIsTrainingOpen(true)}>
                Military training
              </button>

              <section className="wars-list-panel">
                <h2>All the wars of the world ({warsConflicts.length})</h2>
                <div className="wars-conflict-list">
                  {warsConflicts.map((conflict) => (
                    <WarConflictRow
                      key={conflict.id}
                      conflict={conflict}
                      onFight={() => setSelectedWar(conflict)}
                    />
                  ))}
                </div>
              </section>

              {selectedWar && (
                <BattleWindow
                  war={warsConflicts.find(w => w.id === selectedWar.id) || selectedWar}
                  onClose={() => setSelectedWar(null)}
                />
              )}

              {isTrainingOpen && (
                <TrainingWindow
                  onClose={() => setIsTrainingOpen(false)}
                />
              )}
            </div>
          )}

          {isProfileTab && (
            <div className="me-profile-page">
              <section className="me-profile-card">
                <div className="me-profile-header">
                  <div className="me-profile-avatar-frame">
                    <div className="profile-avatar me-profile-avatar">{roleInitials}</div>
                  </div>
                  <div className="me-profile-identity" style={{ flex: 1 }}>
                    <h2>{profileName}</h2>
                    <p style={{ color: "#8b949e", fontSize: "0.85rem", margin: "4px 0" }}>{player.role} of {region.city}</p>
                    <div className="me-profile-level-row" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span className="me-profile-rank" style={{ background: 'rgba(212, 175, 55, 0.2)', color: '#d4af37', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                        RANK #{formatNumber(profileRankScore)}
                      </span>
                      <span className="me-profile-level">{t.ui.level} {player.level}</span>
                      <div className="me-profile-level-track" aria-hidden="true" style={{ flex: 1, height: '6px' }}>
                        <span style={{ width: `${xpPercent}%` }} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="me-profile-money-row" style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.9rem', color: '#8b949e', textTransform: 'uppercase', letterSpacing: '1px' }}>Cash Balance</span>
                  <strong style={{ fontSize: '1.5rem', color: '#22c55e' }}>${formatNumber(player.money)}</strong>
                </div>

                <div className="me-profile-stats-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '20px' }}>
                  <div className="me-profile-stat-box" style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '12px', borderRadius: '6px' }}>
                    <span style={{ fontSize: '0.75rem', color: '#8b949e', textTransform: 'uppercase' }}>{t.tabs.storage} {t.resources.gold}</span>
                    <strong style={{ display: 'block', fontSize: '1.2rem', marginTop: '4px', color: '#ffcc00' }}>{formatNumber(resources.gold ?? 0)}G</strong>
                  </div>
                  <div className="me-profile-stat-box" style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '12px', borderRadius: '6px' }}>
                    <span style={{ fontSize: '0.75rem', color: '#8b949e', textTransform: 'uppercase' }}>Wealth Index</span>
                    <strong style={{ display: 'block', fontSize: '1.2rem', marginTop: '4px' }}>${formatNumber(profileWealth)}</strong>
                  </div>
                  <div className="me-profile-stat-box" style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '12px', borderRadius: '6px', gridColumn: 'span 2' }}>
                    <span style={{ fontSize: '0.75rem', color: '#8b949e', textTransform: 'uppercase' }}>{t.ui.residenceZone}</span>
                    <strong style={{ display: 'block', fontSize: '1.1rem', marginTop: '4px' }}>{region.city}, {region.country}</strong>
                  </div>
                </div>

                <div className="me-profile-meter-stack">
                  <div className="me-profile-meter wealth">
                    <div className="me-profile-meter-copy">
                      <span>Health power</span>
                      <strong>{player.hp}/120</strong>
                    </div>
                    <div className="me-profile-meter-track" aria-hidden="true">
                      <span style={{ width: `${hpPercent}%` }} />
                    </div>
                  </div>
                  <div className="me-profile-meter influence">
                    <div className="me-profile-meter-copy">
                      <span>Influence control</span>
                      <strong>{controlPercent}%</strong>
                    </div>
                    <div className="me-profile-meter-track" aria-hidden="true">
                      <span style={{ width: `${controlPercent}%` }} />
                    </div>
                  </div>
                </div>

                <button 
                  type="button" 
                  className="me-profile-cta" 
                  onClick={() => {
                    if (player.energy >= 10 && player.time >= 10) {
                      action("play_game");
                      setIsQuizOpen(true);
                    }
                  }} 
                  disabled={player.dailyGamePlays >= 5} 
                  style={{ opacity: player.dailyGamePlays >= 5 ? 0.5 : 1 }}
                >
                  {t.ui.solveQuiz || "Solve Daily Quiz"} ({player.dailyGamePlays || 0}/5)
                </button>
              </section>

              <section className="me-profile-panel">
                <div className="me-profile-select-head">
                  <span>Available careers</span>
                </div>
                <div className="me-profile-select-wrap">
                  <select
                    className="me-profile-select"
                    value={profileCareerTrack}
                    onChange={(event) => setProfileCareerTrack(event.target.value)}
                  >
                    {profileCareerOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="me-profile-activity-list">
                  {occupationCards.map((item, index) => (
                    <article key={item.title} className="me-profile-activity">
                      <div className={`me-profile-activity-icon icon-${index + 1}`} aria-hidden="true">
                        {index + 1}
                      </div>
                      <div>
                        <strong>{item.title}</strong>
                        <p>{item.subtitle}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section className="me-profile-stats">
                <div className="me-profile-stats-head">
                  <span>Perk upgrades</span>
                  <strong>
                    {formatNumber(player.perkPoints)} point{player.perkPoints === 1 ? "" : "s"} ready
                  </strong>
                </div>
                <ProfileMetric
                  label="STRENGTH"
                  value={player.strength.toString()}
                  rating={strengthScore.toString()}
                  description="Increases your damage in wars and work productivity."
                  upgradeCost={getPerkUpgradeCost(player, region, "strength")}
                  canUpgrade={player.perkPoints >= getPerkUpgradeCost(player, region, "strength")}
                  onUpgrade={() => upgradePerk("strength")}
                />
                <ProfileMetric
                  label="STAMINA"
                  value={player.stamina.toString()}
                  rating={enduranceScore.toString()}
                  description="Increases your maximum energy and regeneration speed."
                  upgradeCost={getPerkUpgradeCost(player, region, "stamina")}
                  canUpgrade={player.perkPoints >= getPerkUpgradeCost(player, region, "stamina")}
                  onUpgrade={() => upgradePerk("stamina")}
                />
                <ProfileMetric
                  label="INTELLIGENCE"
                  value={player.intelligence.toString()}
                  rating={educationScore.toString()}
                  description="Raises work exp cap and unlocks State Departments at 100."
                  upgradeCost={getPerkUpgradeCost(player, region, "intelligence")}
                  canUpgrade={player.perkPoints >= getPerkUpgradeCost(player, region, "intelligence")}
                  onUpgrade={() => upgradePerk("intelligence")}
                />
                <ProfileMetric
                  label="CHARISMA"
                  value={player.charisma.toString()}
                  rating={charismaScore.toString()}
                  description="Helps campaigns, publishing, and political pressure."
                  upgradeCost={getPerkUpgradeCost(player, region, "charisma")}
                  canUpgrade={player.perkPoints >= getPerkUpgradeCost(player, region, "charisma")}
                  onUpgrade={() => upgradePerk("charisma")}
                />
              </section>

              <section className="me-profile-action-row">
                <button type="button" className="me-profile-action-btn" onClick={joinDominantParty}>
                  Join Dominant Party
                </button>
                <button type="button" className="me-profile-action-btn secondary" onClick={createParty}>
                  Create Party
                </button>
              </section>

              <p className="me-profile-laws">Tax {laws.taxRate}% | Military {laws.militaryBudget}% | Tariff {laws.tradeTariff}%</p>
            </div>
          )}
        </section>

        <nav className={navClassName} aria-label="Game navigation tabs">
          {(getTabs(t) as any[]).map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={tab.key === activeTab ? "active" : ""}
              onClick={() => openTab(tab.key)}
              aria-current={tab.key === activeTab ? "true" : undefined}
            >
              <span className="tab-icon" aria-hidden="true">
                <Icon name={tab.icon} className="tab-icon-svg" />
              </span>
              <span className="tab-label">{tab.label}</span>
            </button>
          ))}
        </nav>
        {isQuizOpen && (
          <PlayGameQuiz 
            onClose={() => setIsQuizOpen(false)} 
            onWin={(xp, gold) => winPlayGame(xp, gold)} 
            action={(kind) => action(kind)}
          />
        )}
      </main>
    </div >
  );
}

function PlayGameQuiz({ onClose, onWin, action }: { onClose: () => void; onWin: (xp: number, gold: number) => void; action: (kind: "play_game") => void }) {
  const { language, player } = useGameStore();
  const t = translations[language];
  const quizData = t.quiz;
  const categories = Object.keys(quizData);

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [question, setQuestion] = useState<any>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isWrong, setIsWrong] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const XP_REWARD = 250;
  const GOLD_REWARD = 10;

  const handleSelectCategory = (cat: string) => {
    setSelectedCategory(cat);
    const categoryQuestions = quizData[cat];
    setQuestion(categoryQuestions[Math.floor(Math.random() * categoryQuestions.length)]);
  };

  const handleAnswer = (opt: string) => {
    setSelectedOption(opt);
    if (opt === question.a) {
      setIsWrong(false);
      setIsSuccess(true);
      onWin(XP_REWARD, GOLD_REWARD);
    } else {
      setIsWrong(true);
    }
  };

  const handleNext = (resetSubject: boolean = false) => {
    if (player.dailyGamePlays >= 5) {
      onClose();
      return;
    }
    if (player.energy < 10 || player.time < 10) {
      onClose();
      return;
    }
    
    // Perform cost action
    action("play_game");

    // Reset states
    setSelectedOption(null);
    setIsWrong(false);
    setIsSuccess(false);

    if (resetSubject) {
      setSelectedCategory(null);
      setQuestion(null);
    } else if (selectedCategory) {
      const categoryQuestions = quizData[selectedCategory];
      setQuestion(categoryQuestions[Math.floor(Math.random() * categoryQuestions.length)]);
    }
  };

  return (
    <div className="me-quiz-overlay" style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 10000, backdropFilter: 'blur(10px)'
    }}>
      <div className="me-quiz-card" style={{
        background: '#161b22', border: '1px solid #d4af37', borderRadius: '12px',
        padding: '30px', maxWidth: '450px', width: '90%', textAlign: 'center',
        boxShadow: '0 10px 40px rgba(0,0,0,0.8)', position: 'relative', overflow: 'hidden'
      }}>
        {isSuccess && (
          <div className="me-quiz-confetti" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '5px', background: 'linear-gradient(90deg, #d4af37, #fca311, #d4af37)', animation: 'quiz-beam 2s infinite' }} />
        )}
        
        <h2 style={{ color: '#d4af37', marginBottom: '10px', fontSize: '1.2rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
          {t.ui.quizTitle || "Meta Earth Daily Quest"}
        </h2>
        
        {!selectedCategory ? (
          <div>
            <p style={{ color: '#e6edf3', marginBottom: '20px' }}>{t.ui.selectCategory || "Select Subject"}</p>
            <div style={{ display: 'grid', gap: '10px' }}>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => handleSelectCategory(cat)}
                  style={{
                    background: 'rgba(212, 175, 55, 0.1)', border: '1px solid #d4af37',
                    padding: '12px', borderRadius: '8px', color: '#d4af37', cursor: 'pointer', fontWeight: 'bold'
                  }}
                >
                  {t.quiz_categories ? t.quiz_categories[cat] : cat}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div style={{ background: 'rgba(212, 175, 55, 0.1)', padding: '5px 12px', borderRadius: '20px', display: 'inline-block', fontSize: '0.8rem', color: '#d4af37', marginBottom: '20px' }}>
              {t.quiz_categories ? t.quiz_categories[selectedCategory] : selectedCategory}
            </div>

            <p style={{ color: '#e6edf3', fontSize: '1.1rem', lineHeight: '1.5', marginBottom: '30px', fontWeight: '500' }}>
              {question.q}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', marginBottom: '30px' }}>
              {question.options.map((opt: string) => (
                <button
                  key={opt}
                  disabled={isSuccess}
                  onClick={() => handleAnswer(opt)}
                  style={{
                    background: (selectedOption === opt && isWrong) ? 'rgba(220,38,38,0.2)' : (isSuccess && opt === question.a) ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${(selectedOption === opt && isWrong) ? '#dc2626' : (isSuccess && opt === question.a) ? '#22c55e' : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: '8px', padding: '16px', color: '#e6edf3', cursor: 'pointer', transition: '0.3s cubic-bezier(0.4, 0, 0.2, 1)', textAlign: 'left', fontSize: '1rem'
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>

            {isWrong && !isSuccess && (
              <p style={{ color: '#dc2626', fontSize: '0.9rem', marginBottom: '20px', animation: 'shake 0.5s' }}>
                {t.ui.quizWrong || "Incorrect! Try again!"}
              </p>
            )}

            {isSuccess && (
              <div style={{ 
                marginTop: '20px', 
                padding: '20px', 
                background: 'rgba(34, 197, 94, 0.1)', 
                borderRadius: '10px', 
                border: '1px solid rgba(34, 197, 94, 0.3)',
                animation: 'fadeInUp 0.5s'
              }}>
                <div style={{ color: '#22c55e', fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '10px' }}>
                  {t.ui.quizCorrect || "VICTORY!"}
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '15px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: '#8b949e', textTransform: 'uppercase' }}>XP Gained</div>
                    <div style={{ fontSize: '1.4rem', color: '#38bdf8', fontWeight: 'bold' }}>+{XP_REWARD}</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: '#8b949e', textTransform: 'uppercase' }}>Gold Gained</div>
                    <div style={{ fontSize: '1.4rem', color: '#fbbf24', fontWeight: 'bold' }}>+{GOLD_REWARD}G</div>
                  </div>
                </div>
                
                <div style={{ 
                  marginBottom: '20px', fontSize: '0.85rem', color: '#8b949e',
                  borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '10px'
                }}>
                  {t.ui.pendingBills ? `Remaining: ${5 - player.dailyGamePlays}/5` : `Daily Quiz Left: ${5 - player.dailyGamePlays}`}
                </div>
                
                <div style={{ display: 'grid', gap: '8px' }}>
                  <button
                    onClick={() => handleNext(false)}
                    disabled={player.dailyGamePlays >= 5 || player.energy < 10 || player.time < 10}
                    style={{
                      background: '#d4af37', border: 'none', color: '#161b22', fontWeight: 'bold',
                      padding: '12px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.95rem',
                      opacity: (player.dailyGamePlays >= 5 || player.energy < 10 || player.time < 10) ? 0.5 : 1
                    }}
                  >
                    {t.ui.nextQuiz || "Continue"} {selectedCategory ? ` (${t.quiz_categories[selectedCategory]})` : ""}
                  </button>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <button
                      onClick={() => handleNext(true)}
                      disabled={player.dailyGamePlays >= 5 || player.energy < 10 || player.time < 10}
                      style={{
                        background: 'rgba(212, 175, 55, 0.1)', border: '1px solid #d4af37',
                        color: '#d4af37', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem'
                      }}
                    >
                      {t.ui.changeSubject || "Change Subject"}
                    </button>
                    <button
                      onClick={onClose}
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.2)',
                        color: '#8b949e', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem'
                      }}
                    >
                      {t.ui.back || "Exit"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {(!isSuccess || (!selectedCategory && !isSuccess)) && (
          <button 
            onClick={onClose} 
            style={{ 
              background: 'none', border: 'none', color: '#8b949e', 
              cursor: 'pointer', fontSize: '0.85rem', marginTop: '10px',
              textDecoration: 'underline'
            }}
          >
            {t.ui.quizAbandon || "Abandon"}
          </button>
        )}
      </div>
      <style>{`
        @keyframes quiz-beam {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
      `}</style>
    </div>
  );
}
















