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
type IconName = Exclude<AppTab, "parliament"> | "search" | "mail" | "dots" | "fist" | "flame" | "back" | "gear";
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

const REALTIME_TICK_SECONDS = 5;
const AUTO_WORK_INTERVAL_MS = 10 * 60 * 1000;
const FULL_FACTORY_ENERGY_COST = 300;
const WORK_REFILL_OPTIONS = Array.from({ length: FULL_FACTORY_ENERGY_COST / 10 }, (_, index) => (index + 1) * 10);
const PARLIAMENT_TOTAL_SEATS = 86;
const PARLIAMENT_SEAT_ROWS = [32, 30, 30] as const;
const PARLIAMENT_SEAT_CAPACITY = PARLIAMENT_SEAT_ROWS.reduce((total, row) => total + row, 0);

const formatNumber = (value: number) => new Intl.NumberFormat("en-US").format(value);
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const formatCountdown = (totalSeconds: number) => {
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
  return (
    <div className="profile-metric-row">
      <div className="profile-metric-copy">
        <div className="profile-metric-stat">
          <span>{label}</span>
          <div>
            <strong>{value}</strong>
            <small>Rating {rating}</small>
          </div>
        </div>
        <p>{description}</p>
        {upgradeCost && <small>{upgradeCost} {t.ui.pointsReady}</small>}
      </div>
      {onUpgrade && (
        <button type="button" className="rr-profile-upgrade-btn" onClick={onUpgrade} disabled={!canUpgrade}>
          {t.ui.upgrade}
        </button>
      )}
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
  tone
}: {
  label: string;
  value: string;
  detail: string;
  tone: StorageTone;
}) {
  return (
    <article className={`storage-card ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
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
    <article className="parliament-party-row">
      <div className="parliament-party-copy">
        <strong>{bloc.name}</strong>
        <span>
          {t.ui.members}: {formatNumber(bloc.members)}
        </span>
        <span className="parliament-party-detail">
          {t.ui.level} {bloc.members.toString().slice(0, 2)} ({bloc.share.toFixed(2)}%), {bloc.location}
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
  } = useGameStore();

  const rest = () => action("rest");
  const refillEnergy = () => buyFactoryEnergy();

  const t = translations[language];
  const TABS = getTabs(t);
  const TAB_LABELS = getTabLabels(t);
  const [activeTab, setActiveTab] = useState<AppTab>("home");
  const [isHomeMenuOpen, setIsHomeMenuOpen] = useState(false);
  const [profileCareerTrack, setProfileCareerTrack] = useState("government");
  const [workSearch, setWorkSearch] = useState("");
  const [isAutoMode, setIsAutoMode] = useState(false);
  const [refillEnergyCost, setRefillEnergyCost] = useState<number>(FULL_FACTORY_ENERGY_COST);
  const [selectedFactoryId, setSelectedFactoryId] = useState<FactoryId | null>(null);
  const [mapFocus, setMapFocus] = useState<MapFocusState>({ regionId: null, countryName: null });
  const [parliamentSubPage, setParliamentSubPage] = useState<ParliamentSubPage>("overview");
  const [lawCategoryFilter, setLawCategoryFilter] = useState<LawCategory | "all">("all");
  const [selectedLawType, setSelectedLawType] = useState<LawType | null>(null);
  const [billListFilter, setBillListFilter] = useState<"pending" | "accepted" | "rejected">("pending");
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
      tone: "gold" as const
    },
    {
      label: "Fuel stock",
      value: `${formatNumber(resources.oil * 6720)} bbl`,
      detail: `${resources.oil} oil shipments in storage`,
      tone: "blue" as const
    },
    {
      label: t.ui.fieldEnergy,
      value: `${player.energy}/200`,
      detail: `${storageFillPercent}% full | ${formatNumber(storageUsage)} / ${formatNumber(storageCapacity)} cap`,
      tone: "green" as const
    },
    {
      label: t.ui.warChest,
      value: `$${formatNumber(player.money)}`,
      detail: `Influence ${player.influence} | Level ${player.level}`,
      tone: "red" as const
    }
  ];

  const storageLogistics = [
    { label: "Ore cargo", value: `${formatNumber(resources.iron * 1400)} kg` },
    { label: "Uranium cores", value: `${formatNumber(resources.uranium * 20)} g` },
    { label: "Storage cap", value: formatNumber(storageCapacity) },
    { label: "Region indexes", value: regionIndexSummary }
  ];

  const storageArsenal = [
    { label: "Infantry kits", value: formatNumber(military.infantry), detail: `Military index ${region.militaryIndex} war scaling` },
    { label: "Tank columns", value: formatNumber(military.tanks), detail: "Heavy assault armor" },
    { label: "Aircraft", value: formatNumber(military.aircraft), detail: "Air support hangars" },
    { label: "Navy", value: formatNumber(military.navy), detail: "Sea control fleets" }
  ];

  const workBrand = region.city.split(" ").slice(0, 2).join(" ");
  const workSpecialtyXp = formatNumber(workExperience[activeWorkFactoryId]);
  const workSpecialtyXpMax = formatNumber(getMaxWorkExperience(player, region));
  const workEnergyPercent = clamp(Math.round((player.energy / 200) * 100), 0, 100);
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
        id: "liquid_oxygen",
        name: `${workBrand} Aero`,
        specialty: t.factories.liquid_oxygen,
        level: 60 + (resources.liquid_oxygen || 0) * 3 + player.level + region.developmentIndex * 2,
        badge: "O2",
        tone: "liquid_oxygen",
        owner: "Elena Rostova",
        founded: `${t.ui.founded}: 11 May 2022 09:30`
      },
      {
        id: "helium_3",
        name: `${workBrand} Lunar`,
        specialty: t.factories.helium_3,
        level: 40 + (resources.helium_3 || 0) * 4 + player.level + region.educationIndex * 6,
        badge: "HE",
        tone: "helium_3",
        owner: "Sato Jin",
        founded: `${t.ui.founded}: 25 August 2023 11:15`
      },
      {
        id: "rivalium",
        name: `State Rivalium`,
        specialty: t.factories.rivalium,
        level: 20 + (resources.rivalium || 0) * 5 + player.level + region.militaryIndex * 8,
        badge: "RV",
        tone: "rivalium",
        owner: activeParty?.name ?? "State Command",
        founded: `${t.ui.founded}: 12 December 2024 16:45`
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
  const mapStateLabel = mapFocusRegion ? mapFocusParty?.name ?? mapFocusRegion.country : "Unmapped territory";
  const mapRegionLabel = mapFocusRegion ? `${mapFocusRegion.city} / ${mapFocusRegion.name}` : mapFocusCountryName;
  const isCurrentMapRegion = mapFocusRegion?.id === region.id;
  const mapFocusCopy = mapFocusRegion
    ? isCurrentMapRegion
      ? `${mapFocusRegion.country} | ${formatRegionIndexes(mapFocusRegion)} | Drag to navigate the world map.`
      : `${mapFocusRegion.country} | Stability ${mapFocusRegion.stability}% | ${formatRegionIndexes(mapFocusRegion)}`
    : `${mapFocusCountryName} has no active playable region yet. Drag to explore and select a highlighted territory.`;

  const revolutionaries = Math.max(0, Math.floor((player.influence + player.charisma + player.level + region.developmentIndex) / 6));
  const revolutionMissing = Math.max(0, 3 - revolutionaries);
  const coupTargets = regions.filter((entry) => entry.id !== region.id && entry.stability < 60 && canCoupRegion(entry)).length;

  const warsConflicts = useMemo<WarConflict[]>(() => {
    const playerStrikeDamage = getWarDamageEstimate(player, region, military);

    return [...regions]
      .filter((entry) => entry.id !== region.id)
      .sort((left, right) => right.defense + right.economy + right.militaryIndex * 5 - (left.defense + left.economy + left.militaryIndex * 5))
      .map((entry, index) => {
        const ownerParty = parties.find((party) => party.id === entry.owner);
        const frontName = canCoupRegion(entry) ? "Coup powers" : `${ownerParty?.name ?? entry.country} shielded front`;
        const frontDamage = formatNumber(getWarDefenseEstimate(entry) + index * 58000);
        const strikeDamage = formatNumber(playerStrikeDamage + index * 84000);
        const targetDamage = formatNumber(getWarDefenseEstimate(entry) + entry.developmentIndex * 180000);
        const countdown = formatCountdown(7200 + index * 1460 + day * 37);
        const progress = clamp(28 + player.level * 4 + military.infantry + region.militaryIndex * 2 - entry.stability - entry.militaryIndex, 16, 96);
        const emblem = entry.country
          .split(/\s+/)
          .map((part) => part[0])
          .join("")
          .slice(0, 3)
          .toUpperCase();
        const tone: WarConflictTone =
          entry.owner === activeParty?.id ? "friendly" : entry.owner === dominantParty.id ? "alert" : "danger";

        return {
          id: entry.id,
          icon: index % 2 === 0 ? "flame" : "fist",
          tone,
          frontName,
          frontDamage,
          strikeDamage,
          targetName: entry.city,
          targetRegion: entry.country,
          targetDamage,
          endsIn: countdown,
          progress,
          emblem
        };
      });
  }, [activeParty?.id, day, dominantParty.id, military, parties, player, region, regions]);

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
    isProfileTab ? "profile-mode" : "",
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
              <button type="button" onClick={() => setLanguage(language === 'en' ? 'ko' : 'en')}>
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
              <section className="storage-grid">
                {storageOverview.map((item) => (
                  <StorageMetricCard
                    key={item.label}
                    label={item.label}
                    value={item.value}
                    detail={item.detail}
                    tone={item.tone}
                  />
                ))}
              </section>

              <section className="storage-panel">
                <div className="storage-panel-head">
                  <h2>Regional storage</h2>
                  <span>{region.city} depot</span>
                </div>
                <div className="storage-list two-col">
                  {storageLogistics.map((item) => (
                    <article key={item.label} className="storage-list-item">
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </article>
                  ))}
                </div>
              </section>

              <section className="storage-panel">
                <div className="storage-panel-head">
                  <h2>Military stock</h2>
                  <span>Ready for deployment</span>
                </div>
                <div className="storage-list">
                  {storageArsenal.map((item) => (
                    <article key={item.label} className="storage-list-item expanded">
                      <div>
                        <span>{item.label}</span>
                        <small>{item.detail}</small>
                      </div>
                      <strong>{item.value}</strong>
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

              <section className="parliament-panel">
                <div className="parliament-panel-head">
                  <div>
                    <span className="parliament-kicker">Parliament: {region.country}</span>
                    <h2>{region.name} Chamber</h2>
                  </div>
                  <small>{PARLIAMENT_TOTAL_SEATS} seats</small>
                </div>

                <div className="parliament-meta">
                  <span>Convocation date:</span>
                  <strong>{parliamentConvocationDate}</strong>
                  <span>Next vote:</span>
                  <strong>{parliamentNextVote}</strong>
                </div>

                <div className="parliament-majority-strip">
                  <div className="parliament-majority-copy">
                    <strong>{parliamentLeadBloc.name}</strong>
                    <span>
                      {parliamentLeadBloc.seats} seats held | Majority target {Math.floor(PARLIAMENT_TOTAL_SEATS / 2) + 1}
                    </span>
                  </div>
                  <div className="parliament-majority-track" aria-hidden="true">
                    <span style={{ width: `${parliamentLeadBloc.share}%` }} />
                  </div>
                </div>

                <div className="parliament-party-list">
                  {parliamentBlocs.map((bloc) => (
                    <ParliamentBlocRow key={bloc.id} bloc={bloc} />
                  ))}
                </div>
              </section>

              <button
                type="button"
                className="parliament-enact-btn"
                onClick={() => setParliamentSubPage("enact_law")}
              >
                ⚖ {t.ui.enactLaw}
              </button>
            </div>
          )}

          {isParliamentTab && parliamentSubPage === "enact_law" && (() => {
            const pendingBills = bills.filter((b) => b.status === "pending");
            const acceptedBills = bills.filter((b) => b.status === "accepted");
            const rejectedBills = bills.filter((b) => b.status === "rejected");
            const filteredLawTypes = lawCategoryFilter === "all"
              ? ALL_LAW_TYPES
              : ALL_LAW_TYPES.filter((lt) => LAW_DEFINITIONS[lt].category === lawCategoryFilter);
            const displayBills = billListFilter === "pending" ? pendingBills : billListFilter === "accepted" ? acceptedBills : rejectedBills;

            return (
              <div className="parliament-page enact-law-page">
                {/* Propose a new law */}
                <section className="law-propose-panel">
                  <div className="law-propose-header">
                    <h2>{t.ui.proposeBill}</h2>
                    <small>-100$ -10 Inf</small>
                  </div>

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
                        proposeBill(selectedLawType);
                        setSelectedLawType(null);
                      }}
                    >
                      {t.ui.proposeBill}: {(t.laws as any)?.[selectedLawType] ?? selectedLawType}
                    </button>
                  )}
                </section>

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
                    <span>Energy: {isAutoMode ? 0 : player.energy}/200</span>
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

              <button type="button" className="wars-wide-btn blue training" onClick={() => action("train")}>
                Military training
              </button>

              <section className="wars-list-panel">
                <h2>All the wars of the world ({warsConflicts.length})</h2>
                <div className="wars-conflict-list">
                  {warsConflicts.map((conflict) => (
                    <WarConflictRow
                      key={conflict.id}
                      conflict={conflict}
                      onFight={() => {
                        if (conflict.id !== region.id) {
                          travel(conflict.id);
                        }
                        action("fight");
                      }}
                    />
                  ))}
                </div>
              </section>
            </div>
          )}

          {isProfileTab && (
            <div className="profile-page rr-profile-page">
              <section className="rr-profile-card">
                <div className="rr-profile-header">
                  <div className="rr-profile-avatar-frame">
                    <div className="profile-avatar rr-profile-avatar">{roleInitials}</div>
                  </div>
                  <div className="rr-profile-identity">
                    <h2>{profileName}</h2>
                    <p>{player.role} of {region.city}</p>
                    <div className="rr-profile-level-row">
                      <span className="rr-profile-level">Level {player.level}</span>
                      <div className="rr-profile-level-track" aria-hidden="true">
                        <span style={{ width: `${xpPercent}%` }} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rr-profile-money-row">
                  <strong>${formatNumber(profileWealth)}</strong>
                  <span>Rank {formatNumber(profileRankScore)}</span>
                </div>

                <div className="rr-profile-meter-stack">
                  <div className="rr-profile-meter wealth">
                    <div className="rr-profile-meter-copy">
                      <span>Health power</span>
                      <strong>{player.hp}/120</strong>
                    </div>
                    <div className="rr-profile-meter-track" aria-hidden="true">
                      <span style={{ width: `${hpPercent}%` }} />
                    </div>
                  </div>
                  <div className="rr-profile-meter influence">
                    <div className="rr-profile-meter-copy">
                      <span>Influence control</span>
                      <strong>{controlPercent}%</strong>
                    </div>
                    <div className="rr-profile-meter-track" aria-hidden="true">
                      <span style={{ width: `${controlPercent}%` }} />
                    </div>
                  </div>
                </div>

                <button type="button" className="rr-profile-cta" onClick={() => action("campaign")}>
                  Play God
                </button>
              </section>

              <section className="rr-profile-panel">
                <div className="rr-profile-select-head">
                  <span>Available careers</span>
                </div>
                <div className="rr-profile-select-wrap">
                  <select
                    className="rr-profile-select"
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

                <div className="rr-profile-activity-list">
                  {occupationCards.map((item, index) => (
                    <article key={item.title} className="rr-profile-activity">
                      <div className={`rr-profile-activity-icon icon-${index + 1}`} aria-hidden="true">
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

              <section className="rr-profile-stats">
                <div className="rr-profile-stats-head">
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

              <section className="rr-profile-action-row">
                <button type="button" className="rr-profile-action-btn" onClick={joinDominantParty}>
                  Join Dominant Party
                </button>
                <button type="button" className="rr-profile-action-btn secondary" onClick={createParty}>
                  Create Party
                </button>
              </section>

              <p className="rr-profile-laws">Tax {laws.taxRate}% | Military {laws.militaryBudget}% | Tariff {laws.tradeTariff}%</p>
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
      </main>
    </div>
  );
}



















