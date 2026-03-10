import { create } from "zustand";
import type { FactoryId, Party, Player, Region, Role, UpgradeablePerk, WorkExperience, War, WarType, ResourceStorage, StateType, Bill, LawType, LawCategory } from "../types";

export type Language = 'en' | 'ko';

export const translations: Record<Language, any> = {
  en: {
    tabs: { home: "Home", storage: "Storage", map: "Map", parliament: "Parliament", work: "Work", wars: "Wars", profile: "Profile" },
    resources: { gold: "Gold", oil: "Oil", ore: "Ore", uranium: "Uranium", diamond: "Diamonds", liquid_oxygen: "Oxygen", helium_3: "Helium-3", rivalium: "Rivalium", energy: "Energy" },
    actions: { work: "Work", fight: "Fight", refill: "Refill", travel: "Travel", buy: "Buy" },
    ui: {
      fieldEnergy: "Field energy",
      vaultReserve: "Vault reserve",
      careerChoices: "Career choices",
      stateParliament: "State parliament",
      residenceZone: "Residence zone",
      founded: "Founded",
      owner: "Owner",
      level: "Level",
      pointsReady: "points ready",
      upgrade: "Upgrade",
      work: "Work",
      fight: "Fight",
      refill: "Refill",
      members: "Members",
      warChest: "War chest",
      enactLaw: "Enact Law",
      pendingBills: "Pending Bills",
      acceptedLaws: "Accepted Laws",
      rejectedLaws: "Rejected Laws",
      proposeBill: "Propose Bill",
      votePro: "PRO",
      voteContra: "CONTRA",
      passed: "PASSED",
      rejected: "REJECTED",
      pending: "PENDING",
      expiresDay: "Expires day",
      proposedBy: "Proposed by",
      selectLawType: "Select law type",
      government: "Government",
      back: "Back",
      menu: "Menu"
    },
    laws: {
      change_tax: "Change tax rate",
      new_building: "New building",
      sell_resources: "Sell resources",
      budget_transfer: "Budget transfer",
      market_taxes: "Market taxes",
      resource_exploration: "Resource exploration",
      war_declaration: "War declaration",
      military_agreement: "Military agreement",
      change_state_title: "Change state title",
      change_coat_of_arms: "Change coat of arms",
      new_parliament_election: "New parliament election",
      leader_impeachment: "Leader impeachment",
      proclamation_dictatorship: "Proclamation of dictatorship",
      dominant_party_system: "Dominant-party system",
      independence_declaration: "Independence declaration",
      region_consolidation: "Region consolidation",
      close_open_borders: "Close/Open borders",
      working_without_residency: "Working without residency"
    },
    factories: {
      gold: "gold mine",
      oil: "oil field",
      ore: "ore quarry",
      uranium: "uranium lab",
      diamond: "diamond mine",
      liquid_oxygen: "oxygen plant",
      helium_3: "helium extractor",
      rivalium: "rivalium synth",
      logistics: "state department"
    }
  },
  ko: {
    tabs: { home: "홈", storage: "창고", map: "지도", parliament: "의회", work: "공장", wars: "전쟁", profile: "프로필" },
    resources: { gold: "골드", oil: "오일", ore: "광석", uranium: "우라늄", diamond: "다이아몬드", liquid_oxygen: "산소", helium_3: "헬륨-3", rivalium: "리발륨", energy: "에너지" },
    actions: { work: "노동", fight: "전투", refill: "보충", travel: "여행", buy: "구매" },
    ui: {
      fieldEnergy: "현장 에너지",
      vaultReserve: "금고 비축량",
      careerChoices: "직업 선택",
      stateParliament: "국가 의회",
      residenceZone: "거주 구역",
      founded: "설립일",
      owner: "소유주",
      level: "레벨",
      pointsReady: "포인트 준비됨",
      upgrade: "업그레이드",
      work: "노동",
      fight: "전투",
      refill: "보충",
      members: "구성원",
      warChest: "전쟁 자금",
      enactLaw: "법률 제정",
      pendingBills: "대기 중인 법안",
      acceptedLaws: "통과된 법안",
      rejectedLaws: "거부된 법안",
      proposeBill: "법안 제안",
      votePro: "찬성",
      voteContra: "반대",
      passed: "통과",
      rejected: "거부",
      pending: "대기",
      expiresDay: "만료일",
      proposedBy: "제안자",
      selectLawType: "법률 유형 선택",
      government: "정부",
      back: "뒤로",
      menu: "메뉴"
    },
    laws: {
      change_tax: "세율 변경",
      new_building: "신규 건물",
      sell_resources: "자원 판매",
      budget_transfer: "예산 이전",
      market_taxes: "시장 세금",
      resource_exploration: "자원 탐사",
      war_declaration: "전쟁 선포",
      military_agreement: "군사 협정",
      change_state_title: "국가명 변경",
      change_coat_of_arms: "국장 변경",
      new_parliament_election: "신규 의회 선거",
      leader_impeachment: "지도자 탄핵",
      proclamation_dictatorship: "독재 선언",
      dominant_party_system: "일당지배체제",
      independence_declaration: "독립 선언",
      region_consolidation: "지역 통합",
      close_open_borders: "국경 개폐",
      working_without_residency: "비거주 노동 허가"
    },
    factories: {
      gold: "골드 광산",
      oil: "유전",
      ore: "채석장",
      uranium: "우라늄 연구소",
      diamond: "다이아몬드 광산",
      liquid_oxygen: "산소 플랜트",
      helium_3: "헬륨 추출기",
      rivalium: "리발륨 합성기",
      logistics: "정부 부처"
    }
  }
};

type GameState = {
  day: number;
  totalTicks: number;
  nextElectionDay: number;
  player: Player;
  parties: Party[];
  regions: Region[];
  resources: Record<string, number>;
  military: Record<string, number>;
  workExperience: WorkExperience;
  laws: { taxRate: number; militaryBudget: number; tradeTariff: number };
  bills: Bill[];
  wars: War[];
  language: Language;
  setLanguage: (lang: Language) => void;
  log: string[];
  setRole: (role: Role) => void;
  travel: (regionId: string) => void;
  nextDay: () => void;
  action: (kind: "work" | "train" | "campaign" | "trade" | "fight" | "vote" | "publish" | "rest") => void;
  runFactoryCycle: (factoryId: FactoryId, mode?: "manual" | "auto") => boolean;
  buyFactoryEnergy: (amount?: number) => boolean;
  upgradePerk: (perk: UpgradeablePerk) => boolean;
  joinDominantParty: () => void;
  createParty: () => void;
  attackNeighbor: () => void;
  sendTroops: (warId: string, side: "attacker" | "defender", weapons: Record<string, number>, energy: number) => void;
  proposeBill: (lawType: LawType) => void;
  voteOnBill: (billId: string, vote: "pro" | "contra") => void;
};

type IndexedRegionKey = "healthIndex" | "militaryIndex" | "educationIndex" | "developmentIndex";

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const formatNumber = (value: number) => new Intl.NumberFormat("en-US").format(value);
const FACTORY_ENERGY_COST = 300;
const FACTORY_WORK_COST: [number, number] = [300, 16];
const BASE_STORAGE_CAPACITY = 200000;

const ownerColor: Record<string, string> = {
  civic: "#22c55e",
  defense: "#f97316"
};

const factoryLabels: Record<FactoryId, string> = {
  gold: "gold mine",
  oil: "oil field",
  ore: "ore quarry",
  uranium: "uranium lab",
  diamond: "diamond mine",
  liquid_oxygen: "oxygen plant",
  helium_3: "helium extractor",
  rivalium: "rivalium synth",
  logistics: "state department"
};

const perkLabels: Record<UpgradeablePerk, string> = {
  strength: "Strength",
  stamina: "Endurance",
  intelligence: "Education",
  charisma: "Charisma"
};

const resourceStorageWeights = {
  gold: 1250,
  oil: 6720,
  iron: 1400,
  uranium: 20,
  diamond: 50,
  liquid_oxygen: 80,
  helium_3: 15,
  rivalium: 5,
  food: 18
} as const;

const departmentPlans: Record<
  Role,
  { indexKey: IndexedRegionKey; label: string; economyBoost: number; defenseBoost: number; stabilityBoost: number; influenceBoost: number }
> = {
  Citizen: { indexKey: "healthIndex", label: "Health index", economyBoost: 1, defenseBoost: 0, stabilityBoost: 2, influenceBoost: 1 },
  Soldier: { indexKey: "militaryIndex", label: "Military index", economyBoost: 0, defenseBoost: 3, stabilityBoost: 1, influenceBoost: 1 },
  Politician: { indexKey: "developmentIndex", label: "Development index", economyBoost: 2, defenseBoost: 1, stabilityBoost: 2, influenceBoost: 2 },
  "Business Owner": { indexKey: "developmentIndex", label: "Development index", economyBoost: 3, defenseBoost: 0, stabilityBoost: 1, influenceBoost: 1 },
  Journalist: { indexKey: "educationIndex", label: "Education index", economyBoost: 1, defenseBoost: 0, stabilityBoost: 2, influenceBoost: 2 }
};

const initialPlayer: Player = {
  role: "Citizen",
  level: 1,
  xp: 0,
  xpToNext: 100,
  perkPoints: 4,
  hp: 100,
  energy: 300,
  energyCredits: 6000,
  time: 100,
  money: 1000,
  influence: 10,
  strength: 5,
  intelligence: 5,
  charisma: 5,
  stamina: 5,
  locationId: "us-east",
  partyId: null
};

const initialRegions: Region[] = [
  {
    id: "us-east",
    name: "Atlantic Corridor",
    country: "United States",
    city: "New York",
    lat: 40.7128,
    lng: -74.006,
    owner: "civic",
    stability: 63,
    economy: 75,
    defense: 50,
    population: 20,
    healthIndex: 5,
    militaryIndex: 4,
    educationIndex: 6,
    developmentIndex: 4,
    neighbors: ["eu-west", "sa-east"],
    governmentType: "Presidential Republic"
  },
  {
    id: "eu-west",
    name: "Western Union Belt",
    country: "France",
    city: "Paris",
    lat: 48.8566,
    lng: 2.3522,
    owner: "civic",
    stability: 66,
    economy: 72,
    defense: 48,
    population: 18,
    healthIndex: 5,
    militaryIndex: 4,
    educationIndex: 6,
    developmentIndex: 5,
    neighbors: ["us-east", "mena"],
    governmentType: "Parliamentary Republic"
  },
  {
    id: "mena",
    name: "Levantine Frontier",
    country: "Turkey",
    city: "Istanbul",
    lat: 41.0082,
    lng: 28.9784,
    owner: "defense",
    stability: 52,
    economy: 58,
    defense: 56,
    population: 16,
    healthIndex: 4,
    militaryIndex: 6,
    educationIndex: 4,
    developmentIndex: 2,
    neighbors: ["eu-west", "india"],
    governmentType: "Dictatorship"
  },
  {
    id: "india",
    name: "Subcontinent Core",
    country: "India",
    city: "Delhi",
    lat: 28.6139,
    lng: 77.209,
    owner: "defense",
    stability: 58,
    economy: 62,
    defense: 54,
    population: 26,
    healthIndex: 4,
    militaryIndex: 5,
    educationIndex: 5,
    developmentIndex: 3,
    neighbors: ["mena", "sea"],
    governmentType: "Dominant-Party"
  },
  {
    id: "sea",
    name: "Maritime ASEAN Arc",
    country: "Singapore",
    city: "Singapore",
    lat: 1.3521,
    lng: 103.8198,
    owner: "civic",
    stability: 61,
    economy: 70,
    defense: 46,
    population: 14,
    healthIndex: 5,
    militaryIndex: 4,
    educationIndex: 7,
    developmentIndex: 5,
    neighbors: ["india", "oceania"],
    governmentType: "Parliamentary Republic"
  },
  {
    id: "oceania",
    name: "Pacific Dominion",
    country: "Australia",
    city: "Sydney",
    lat: -33.8688,
    lng: 151.2093,
    owner: "defense",
    stability: 57,
    economy: 64,
    defense: 52,
    population: 12,
    healthIndex: 5,
    militaryIndex: 5,
    educationIndex: 5,
    developmentIndex: 4,
    neighbors: ["sea"],
    governmentType: "Parliamentary Republic"
  },
  {
    id: "sa-east",
    name: "South Atlantic Bloc",
    country: "Brazil",
    city: "Sao Paulo",
    lat: -23.5505,
    lng: -46.6333,
    owner: "defense",
    stability: 50,
    economy: 55,
    defense: 47,
    population: 17,
    healthIndex: 4,
    militaryIndex: 5,
    educationIndex: 4,
    developmentIndex: 2,
    neighbors: ["us-east"],
    governmentType: "Dictatorship"
  }
];

const initialParties: Party[] = [
  { id: "civic", name: "Civic Front", popularity: 44, members: 1200 },
  { id: "defense", name: "Defense Bloc", popularity: 39, members: 980 }
];

const initialWorkExperience: WorkExperience = {
  gold: 2400,
  oil: 1800,
  ore: 2200,
  uranium: 600,
  diamond: 0,
  liquid_oxygen: 0,
  helium_3: 0,
  rivalium: 0,
  logistics: 0
};

function withLog(log: string[], day: number, message: string) {
  return [`[Day ${day}] ${message}`, ...log].slice(0, 60);
}

export const canAccessDepartments = (player: Player) => player.intelligence >= 100;
export const canCoupRegion = (region: Region) => region.developmentIndex <= 2;

export const getPerkUpgradeCost = (player: Player, region: Region, perk: UpgradeablePerk) => {
  const baseCost = Math.max(1, Math.floor((player[perk] - 1) / 5));
  const educationDiscount = Math.floor(region.educationIndex / 5);
  return Math.max(1, baseCost - educationDiscount);
};

export const getStorageCapacity = (player: Player) => Math.round(BASE_STORAGE_CAPACITY * (1 + player.stamina / 100));

export const getStorageUsage = (resources: Record<string, number>) =>
  (Object.keys(resourceStorageWeights) as Array<keyof typeof resourceStorageWeights>).reduce(
    (total, resource) => total + (resources[resource] ?? 0) * resourceStorageWeights[resource],
    0
  );

export const getMaxWorkExperience = (player: Player, region: Region) =>
  80000 + player.intelligence * 200 + region.educationIndex * 2000;

const getWorkExperienceRatio = (player: Player, region: Region, workExperience: WorkExperience, factoryId: FactoryId) =>
  clamp(workExperience[factoryId] / getMaxWorkExperience(player, region), 0, 1);

export const getWorkOutputMultiplier = (
  player: Player,
  region: Region,
  workExperience: WorkExperience,
  factoryId: FactoryId
) => {
  const experienceBonus = getWorkExperienceRatio(player, region, workExperience, factoryId) * 0.9;
  const regionalBonus = region.educationIndex * 0.02 + region.developmentIndex * 0.015;

  let perkBonus = player.intelligence * 0.005;
  if (factoryId === "gold" || factoryId === "oil" || factoryId === "ore" || factoryId === "diamond") {
    perkBonus += player.strength * 0.01;
  }
  if (factoryId === "uranium" || factoryId === "liquid_oxygen" || factoryId === "helium_3" || factoryId === "rivalium") {
    perkBonus += player.intelligence * 0.007;
  }
  if (factoryId === "logistics") {
    perkBonus += player.charisma * 0.004;
  }

  return 1 + experienceBonus + regionalBonus + perkBonus;
};

export const getWorkBonusPercent = (
  player: Player,
  region: Region,
  workExperience: WorkExperience,
  factoryId: FactoryId
) => Number(((getWorkOutputMultiplier(player, region, workExperience, factoryId) - 1) * 100).toFixed(1));

const getAlphaDamageBonus = (player: Player) => {
  if (player.stamina >= 100) return 0.5;
  if (player.stamina >= 75) return 0.35;
  if (player.stamina >= 50) return 0.2;
  return 0;
};

export const getWarDamageEstimate = (player: Player, region: Region, military: Record<string, number>) => {
  const infantry = military.infantry ?? 0;
  const tanks = military.tanks ?? 0;
  const baseDamage = infantry * 4200 + tanks * 12000 + player.level * 1600 + player.influence * 180;
  const perkMultiplier =
    1 + player.strength * 0.01 + player.intelligence * 0.005 + player.stamina * 0.005 + getAlphaDamageBonus(player);
  const regionMultiplier = 1 + region.militaryIndex * 0.01 + region.developmentIndex * 0.005;
  return Math.round(baseDamage * perkMultiplier * regionMultiplier);
};

export const getWarDefenseEstimate = (region: Region) => {
  const baseDefense = region.defense * 4700 + region.stability * 1100;
  const regionMultiplier = 1 + region.militaryIndex * 0.01 + region.developmentIndex * 0.015;
  return Math.round(baseDefense * regionMultiplier);
};

function grantXp(player: Player, amount: number) {
  player.xp += amount;
  while (player.xp >= player.xpToNext) {
    player.xp -= player.xpToNext;
    player.level += 1;
    player.xpToNext = Math.floor(player.xpToNext * 1.28);
    player.influence += 2;
    player.perkPoints += 2;
  }
}

function spendAction(player: Player, energy: number, time: number) {
  if (player.energy < energy || player.time < time) return false;
  player.energy -= energy;
  player.time -= time;
  return true;
}

function getFactoryEnergyCost(player: Player) {
  const multiplier = player.stamina >= 50 ? 0.5 : 1 - player.stamina * 0.01;
  return clamp(Math.round(FACTORY_WORK_COST[0] * multiplier), 150, FACTORY_WORK_COST[0]);
}

function getFactoryTimeCost(player: Player) {
  const multiplier = player.stamina >= 50 ? 0.65 : 1 - player.stamina * 0.007;
  return clamp(Math.round(FACTORY_WORK_COST[1] * multiplier), 10, FACTORY_WORK_COST[1]);
}

function getWarEnergyCost(player: Player, base: number) {
  if (player.stamina >= 100) return clamp(Math.round(base * 0.55), 8, base);
  if (player.stamina >= 75) return clamp(Math.round(base * 0.7), 10, base);
  if (player.stamina >= 50) return clamp(Math.round(base * 0.85), 12, base);
  return clamp(Math.round(base * (1 - player.stamina * 0.003)), 12, base);
}

function getWarTimeCost(player: Player, base: number) {
  if (player.stamina >= 100) return clamp(Math.round(base * 0.65), 12, base);
  if (player.stamina >= 75) return clamp(Math.round(base * 0.78), 14, base);
  if (player.stamina >= 50) return clamp(Math.round(base * 0.88), 16, base);
  return clamp(Math.round(base * (1 - player.stamina * 0.0025)), 16, base);
}

function addResource(resources: Record<string, number>, player: Player, resource: keyof typeof resourceStorageWeights, amount: number) {
  const availableStorage = Math.max(0, getStorageCapacity(player) - getStorageUsage(resources));
  const storableAmount = Math.max(0, Math.min(amount, Math.floor(availableStorage / resourceStorageWeights[resource])));
  resources[resource] = (resources[resource] ?? 0) + storableAmount;
  return storableAmount;
}

function gainFactoryExperience(player: Player, region: Region, workExperience: WorkExperience, factoryId: FactoryId) {
  const maxWorkExperience = getMaxWorkExperience(player, region);
  const experienceGain = 65 + region.educationIndex * 12 + Math.floor(player.intelligence / 2);
  workExperience[factoryId] = clamp(workExperience[factoryId] + experienceGain, 0, maxWorkExperience);
}

function runFactoryOutput(
  player: Player,
  region: Region,
  resources: Record<string, number>,
  workExperience: WorkExperience,
  factoryId: FactoryId,
  energySpent: number
) {
  gainFactoryExperience(player, region, workExperience, factoryId);
  const multiplier = getWorkOutputMultiplier(player, region, workExperience, factoryId);
  const scale = energySpent / 10; // Scaling based on 10E as a base unit of production

  switch (factoryId) {
    case "gold": {
      const goldGain = Math.max(1, Math.round((1 + Math.floor(player.level / 10)) * multiplier * scale));
      const storedGold = addResource(resources, player, "gold", goldGain);
      const moneyGain = Math.round((90 + region.economy * 2 + player.intelligence * 4) * multiplier * scale) + rand(15, 45);
      player.money = clamp(player.money + moneyGain, 0, 999999999);
      grantXp(player, Math.round((18 + region.educationIndex) * scale));
      return `Gold +${storedGold} | Money +${moneyGain}${storedGold < goldGain ? " | Storage full" : ""}`;
    }
    case "oil": {
      const oilGain = Math.max(1, Math.round((2 + Math.floor(player.level / 12)) * multiplier * scale));
      const storedOil = addResource(resources, player, "oil", oilGain);
      const moneyGain = Math.round((75 + region.economy * 2 + player.intelligence * 3) * multiplier * scale) + rand(10, 35);
      player.money = clamp(player.money + moneyGain, 0, 999999999);
      grantXp(player, Math.round((16 + region.educationIndex) * scale));
      return `Oil +${storedOil} | Money +${moneyGain}${storedOil < oilGain ? " | Storage full" : ""}`;
    }
    case "ore": {
      const oreGain = Math.max(1, Math.round((2 + Math.floor(player.level / 9)) * multiplier * scale));
      const storedOre = addResource(resources, player, "iron", oreGain);
      const moneyGain = Math.round((70 + region.economy * 1.5 + player.strength * 4) * multiplier * scale) + rand(8, 30);
      player.money = clamp(player.money + moneyGain, 0, 999999999);
      grantXp(player, Math.round((18 + region.educationIndex) * scale));
      return `Ore +${storedOre} | Money +${moneyGain}${storedOre < oreGain ? " | Storage full" : ""}`;
    }
    case "uranium": {
      const uraniumGain = Math.max(1, Math.round((1 + Math.floor(player.level / 16)) * multiplier * scale));
      const storedUranium = addResource(resources, player, "uranium", uraniumGain);
      const moneyGain = Math.round((120 + region.economy * 2.5 + player.intelligence * 6) * multiplier * scale) + rand(20, 60);
      player.money = clamp(player.money + moneyGain, 0, 999999999);
      grantXp(player, Math.round((24 + region.educationIndex) * scale));
      return `Uranium +${storedUranium} | Money +${moneyGain}${storedUranium < uraniumGain ? " | Storage full" : ""}`;
    }
    case "diamond": {
      const diamondGain = Math.max(1, Math.round((1 + Math.floor(player.level / 15)) * multiplier));
      const storedDiamond = addResource(resources, player, "diamond", diamondGain);
      const moneyGain = Math.round((100 + region.economy * 2.2 + player.strength * 5) * multiplier) + rand(15, 35);
      player.money = clamp(player.money + moneyGain, 0, 999999999);
      grantXp(player, 20 + region.educationIndex);
      return `Diamond +${storedDiamond} | Money +${moneyGain}${storedDiamond < diamondGain ? " | Storage full" : ""}`;
    }
    case "liquid_oxygen": {
      const oxygenGain = Math.max(1, Math.round((2 + Math.floor(player.level / 10)) * multiplier));
      const storedOxygen = addResource(resources, player, "liquid_oxygen", oxygenGain);
      const moneyGain = Math.round((85 + region.economy * 1.8 + player.intelligence * 4) * multiplier) + rand(10, 30);
      player.money = clamp(player.money + moneyGain, 0, 999999999);
      grantXp(player, 18 + region.educationIndex);
      return `Liquid Oxygen +${storedOxygen} | Money +${moneyGain}${storedOxygen < oxygenGain ? " | Storage full" : ""}`;
    }
    case "helium_3": {
      const heliumGain = Math.max(1, Math.round((1 + Math.floor(player.level / 18)) * multiplier));
      const storedHelium = addResource(resources, player, "helium_3", heliumGain);
      const moneyGain = Math.round((150 + region.economy * 3 + player.intelligence * 6) * multiplier) + rand(30, 80);
      player.money = clamp(player.money + moneyGain, 0, 999999999);
      grantXp(player, 25 + region.educationIndex);
      return `Helium-3 +${storedHelium} | Money +${moneyGain}${storedHelium < heliumGain ? " | Storage full" : ""}`;
    }
    case "rivalium": {
      const rivaliumGain = Math.max(1, Math.round((1 + Math.floor(player.level / 20)) * multiplier));
      const storedRivalium = addResource(resources, player, "rivalium", rivaliumGain);
      const moneyGain = Math.round((200 + region.economy * 4 + player.intelligence * 8) * multiplier) + rand(50, 100);
      player.money = clamp(player.money + moneyGain, 0, 999999999);
      grantXp(player, 30 + region.educationIndex);
      return `Rivalium +${storedRivalium} | Money +${moneyGain}${storedRivalium < rivaliumGain ? " | Storage full" : ""}`;
    }
    case "logistics": {
      const plan = departmentPlans[player.role];
      const beforeIndex = region[plan.indexKey];
      const gainIndex = Math.round(1 * scale / 10);
      region[plan.indexKey] = clamp(region[plan.indexKey] + Math.max(1, gainIndex), 1, 10);
      region.economy = clamp(region.economy + (plan.economyBoost + Math.floor(region.developmentIndex / 5)) * scale / 10, 0, 100);
      region.defense = clamp(region.defense + plan.defenseBoost * scale / 10, 20, 100);
      region.stability = clamp(region.stability + plan.stabilityBoost * scale / 10, 0, 100);
      player.influence = clamp(player.influence + (plan.influenceBoost + Math.floor(region.educationIndex / 4)) * scale / 10, 0, 999999999);
      grantXp(player, Math.round((22 + region.educationIndex) * scale));
      return `${plan.label} +${region[plan.indexKey] - beforeIndex} | Economy upgraded | Influence expanded`;
    }
    default:
      return "No output";
  }
}

export const partyColors = ownerColor;

const LAW_DEFINITIONS: Record<LawType, { category: LawCategory; description: (region: Region, value?: number) => string }> = {
  change_tax: { category: "economic", description: (r, v) => `Change wage tax rate to ${v ?? 15}% for all citizens in ${r.country}.` },
  new_building: { category: "economic", description: (r) => `Upgrade a building in ${r.city} region to boost development.` },
  sell_resources: { category: "economic", description: (r) => `Place state budget resources on the special market for 7 days.` },
  budget_transfer: { category: "economic", description: (r) => `Transfer funds from the state treasury to ${r.city} region.` },
  market_taxes: { category: "economic", description: (r, v) => `Set market transaction tax to ${v ?? 5}% in ${r.country}.` },
  resource_exploration: { category: "economic", description: (r) => `Launch resource exploration in ${r.city} to discover new deposits.` },
  war_declaration: { category: "political", description: (r) => `Declare ground war on a neighboring region from ${r.country}.` },
  military_agreement: { category: "political", description: (r) => `Establish or cancel a military pact with another state.` },
  change_state_title: { category: "political", description: (r) => `Change the official name of ${r.country}.` },
  change_coat_of_arms: { category: "political", description: (r) => `Change the coat of arms of ${r.country}.` },
  new_parliament_election: { category: "political", description: (r) => `Dissolve parliament and initiate new elections in ${r.country}.` },
  leader_impeachment: { category: "political", description: (r) => `Initiate impeachment proceedings against the current state leader.` },
  proclamation_dictatorship: { category: "government", description: (r) => `Transform ${r.country} into a dictatorship. Requires 80% PRO votes.` },
  dominant_party_system: { category: "government", description: (r) => `Establish a dominant-party system in ${r.country}. Requires 80% PRO votes.` },
  independence_declaration: { category: "government", description: (r) => `Grant full independence to a region of ${r.country}.` },
  region_consolidation: { category: "government", description: (r) => `Transfer a region to another state from ${r.country}.` },
  close_open_borders: { category: "government", description: (r) => `Toggle border control policy for ${r.country}.` },
  working_without_residency: { category: "government", description: (r) => `Allow or disallow non-residents to work in ${r.country}.` }
};

const ALL_LAW_TYPES: LawType[] = Object.keys(LAW_DEFINITIONS) as LawType[];

function generateInitialBills(day: number, region: Region, parties: Party[]): Bill[] {
  const dominantParty = [...parties].sort((a, b) => b.popularity - a.popularity)[0];
  const sampleLaws: { type: LawType; value?: number }[] = [
    { type: "change_tax", value: 15 },
    { type: "new_building" },
    { type: "war_declaration" },
    { type: "military_agreement" }
  ];
  return sampleLaws.map((law, i) => {
    const def = LAW_DEFINITIONS[law.type];
    const totalVoters = 40 + region.population * 3;
    return {
      id: `bill-init-${i}`,
      lawType: law.type,
      category: def.category,
      title: law.type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
      description: def.description(region, law.value),
      proposedBy: dominantParty.name,
      proposedDay: day,
      expiresDay: day + 6,
      votesFor: rand(4, 18),
      votesAgainst: rand(2, 10),
      totalEligibleVoters: totalVoters,
      status: "pending" as const,
      playerVoted: false,
      effectValue: law.value,
    };
  });
}

export { LAW_DEFINITIONS, ALL_LAW_TYPES };

export const useGameStore = create<GameState>((set) => ({
  day: 1,
  totalTicks: 0,
  nextElectionDay: 10,
  player: initialPlayer,
  parties: initialParties,
  regions: initialRegions,
  resources: { oil: 10, gold: 8, iron: 22, uranium: 1, food: 25 },
  military: { infantry: 18, tanks: 2, aircraft: 0, navy: 0 },
  workExperience: initialWorkExperience,
  laws: { taxRate: 12, militaryBudget: 15, tradeTariff: 8 },
  bills: generateInitialBills(1, initialRegions[0], initialParties),
  wars: [
    { id: "war-1", type: "Ground", targetRegion: "mena", attackerId: "Istanbul Command", attackerDamage: 471643, defenderDamage: 831643, active: true, expiresAt: Date.now() + 3600 * 5 * 1000 },
    { id: "war-2", type: "Revolution", targetRegion: "us-east", attackerId: "Atlantic Front", attackerDamage: 120500, defenderDamage: 450000, active: true, expiresAt: Date.now() + 3600 * 8 * 1000 },
    { id: "war-3", type: "Coup", targetRegion: "eu-west", attackerId: "Resistance", attackerDamage: 88000, defenderDamage: 32000, active: true, expiresAt: Date.now() + 3600 * 12 * 1000 }
  ],
  log: ["[Day 1] Meta Earth Online initialized on real-world map."],

  setRole: (role) =>
    set((state) => {
      const player = { ...state.player, role };
      const buff = {
        Citizen: [1, 1, 1, 1],
        Soldier: [5, 0, 0, 3],
        Politician: [0, 2, 5, 1],
        "Business Owner": [0, 4, 3, 0],
        Journalist: [0, 3, 4, 0]
      }[role];
      player.strength = Math.max(player.strength, 5 + buff[0]);
      player.intelligence = Math.max(player.intelligence, 5 + buff[1]);
      player.charisma = Math.max(player.charisma, 5 + buff[2]);
      player.stamina = Math.max(player.stamina, 5 + buff[3]);
      return { player, log: withLog(state.log, state.day, `Role changed to ${role}.`) };
    }),

  travel: (regionId) =>
    set((state) => {
      const player = { ...state.player };
      if (!spendAction(player, 8, 8)) return { log: withLog(state.log, state.day, "Not enough energy/time to travel.") };
      player.locationId = regionId;
      grantXp(player, 8);
      return { player, log: withLog(state.log, state.day, `Traveled to ${state.regions.find((region) => region.id === regionId)?.name}.`) };
    }),

  action: (kind) =>
    set((state) => {
      const player = { ...state.player };
      const resources = { ...state.resources };
      const parties = state.parties.map((party) => ({ ...party }));
      const regions = state.regions.map((region) => ({ ...region }));
      const workExperience = { ...state.workExperience };
      let log = state.log;
      const region = regions.find((entry) => entry.id === player.locationId)!;

      if (kind === "rest") {
        player.energy = clamp(player.energy + 30 + region.healthIndex * 2, 0, 300);
        player.time = clamp(player.time + 28 + region.healthIndex, 0, 120);
        player.hp = clamp(player.hp + 12 + region.healthIndex, 0, 120);
        return { player, log: withLog(log, state.day, "Rested and recovered.") };
      }

      const cost: Record<string, [number, number]> = {
        work: [getFactoryEnergyCost(player), getFactoryTimeCost(player)],
        train: [14, 14],
        campaign: [16, 20],
        trade: [10, 14],
        fight: [getWarEnergyCost(player, 18), getWarTimeCost(player, 20)],
        vote: [6, 8],
        publish: [12, 18]
      };
      if (!spendAction(player, cost[kind][0], cost[kind][1])) {
        return { log: withLog(log, state.day, `Not enough energy/time for ${kind}.`) };
      }

      if (kind === "work") {
        gainFactoryExperience(player, region, workExperience, "gold");
        const multiplier = getWorkOutputMultiplier(player, region, workExperience, "gold");
        const pay = Math.round((45 + region.economy * 1.5 + player.intelligence * 2) * multiplier) + rand(0, 25);
        const foodGain = addResource(resources, player, "food", 1 + Math.floor(region.healthIndex / 4));
        player.money = clamp(player.money + pay, 0, 999999999);
        grantXp(player, 15 + region.educationIndex);
        log = withLog(log, state.day, `Worked locally and earned ${pay}. Food +${foodGain}.`);
      }
      if (kind === "train") {
        player.strength += 1;
        player.stamina += 1;
        player.hp = clamp(player.hp + Math.floor(region.healthIndex / 2), 0, 120);
        grantXp(player, 18 + region.militaryIndex);
        log = withLog(log, state.day, "Training improved STR and STA.");
      }
      if (kind === "campaign") {
        if (player.partyId) {
          const party = parties.find((entry) => entry.id === player.partyId);
          if (party) party.popularity = clamp(party.popularity + 2 + Math.floor(player.charisma / 3) + Math.floor(region.developmentIndex / 3), 1, 99);
        }
        player.influence += 3 + Math.floor(region.developmentIndex / 3);
        grantXp(player, 20 + region.developmentIndex);
        log = withLog(log, state.day, "Campaign shifted public opinion.");
      }
      if (kind === "trade") {
        const delta = rand(-20, 35) + region.developmentIndex * 2;
        player.money = clamp(player.money + delta, 0, 999999999);
        player.energyCredits = clamp(player.energyCredits + rand(60, 180) + region.developmentIndex * 10, 0, 999999999);
        const oilGain = addResource(resources, player, "oil", rand(0, 1));
        const ironGain = addResource(resources, player, "iron", rand(0, 2));
        grantXp(player, 14 + region.developmentIndex);
        log = withLog(log, state.day, `Trade result: ${delta >= 0 ? "+" : ""}${delta} money | Oil +${oilGain} | Ore +${ironGain}.`);
      }
      if (kind === "fight") {
        const attack = getWarDamageEstimate(player, region, state.military) + rand(12000, 60000);
        const defense = getWarDefenseEstimate(region) + rand(10000, 50000);
        if (attack > defense) {
          region.stability = clamp(region.stability + 4, 0, 100);
          player.money = clamp(player.money + 120 + region.militaryIndex * 15, 0, 999999999);
          player.influence += 4 + Math.floor(region.militaryIndex / 2);
          log = withLog(log, state.day, `Skirmish won in ${region.name}.`);
          grantXp(player, 30 + region.militaryIndex);
        } else {
          player.hp = clamp(player.hp - rand(8, 18), 0, 120);
          region.stability = clamp(region.stability - 5, 0, 100);
          log = withLog(log, state.day, `Skirmish lost in ${region.name}.`);
          grantXp(player, 12 + Math.floor(region.militaryIndex / 2));
        }
      }
      if (kind === "vote") {
        if (!player.partyId) {
          log = withLog(log, state.day, "Join a party before voting.");
        } else {
          const party = parties.find((entry) => entry.id === player.partyId);
          if (party) party.popularity = clamp(party.popularity + 1 + Math.floor(region.developmentIndex / 4), 1, 99);
          player.influence += 1;
          grantXp(player, 10 + region.developmentIndex);
          log = withLog(log, state.day, "Your vote was counted.");
        }
      }
      if (kind === "publish") {
        const impact =
          Math.floor(player.charisma / 2) + Math.floor(player.intelligence / 2) + Math.floor(region.educationIndex / 2) + rand(1, 4);
        player.influence += impact;
        if (player.partyId) {
          const party = parties.find((entry) => entry.id === player.partyId);
          if (party) party.popularity = clamp(party.popularity + Math.floor(impact / 2), 1, 99);
        }
        grantXp(player, 18 + region.educationIndex);
        log = withLog(log, state.day, `Published article. Influence +${impact}.`);
      }

      return { player, resources, parties, regions, workExperience, log };
    }),

  upgradePerk: (perk) => {
    let success = false;
    set((state) => {
      const player = { ...state.player };
      const region = state.regions.find((entry) => entry.id === player.locationId) ?? state.regions[0];
      const cost = getPerkUpgradeCost(player, region, perk);
      if (player.perkPoints < cost) {
        return {
          log: withLog(state.log, state.day, `Need ${cost} perk point${cost === 1 ? "" : "s"} to upgrade ${perkLabels[perk]}.`)
        };
      }
      player.perkPoints -= cost;
      player[perk] = player[perk] + 1;
      success = true;
      return {
        player,
        log: withLog(
          state.log,
          state.day,
          `${perkLabels[perk]} upgraded to ${player[perk]} in ${region.city}. Education index ${region.educationIndex} reduced the study cost.`
        )
      };
    });
    return success;
  },

  runFactoryCycle: (factoryId, mode = "manual") => {
    let success = false;
    set((state) => {
      const player = { ...state.player };
      const resources = { ...state.resources };
      const regions = state.regions.map((region) => ({ ...region }));
      const workExperience = { ...state.workExperience };
      let log = state.log;
      const region = regions.find((entry) => entry.id === player.locationId)!;
      const label = factoryLabels[factoryId];

      if (factoryId === "logistics" && !canAccessDepartments(player)) {
        log = withLog(log, state.day, "Education 100 is required to work in State Departments.");
        return { log };
      }

      let actualEnergySpent = 0;
      if (mode === "auto") {
        if (player.energyCredits < FACTORY_ENERGY_COST) {
          log = withLog(log, state.day, `Auto work stopped at ${label}: need ${FACTORY_ENERGY_COST} E.`);
          return { log };
        }
        player.energyCredits -= FACTORY_ENERGY_COST;
        actualEnergySpent = 300; // Auto work acts as a full 300E cycle
      } else {
        actualEnergySpent = player.energy; // Manual work spends EVERYTHING available
        if (actualEnergySpent < 10) {
          log = withLog(log, state.day, `Not enough energy to work at ${label}. Need at least 10E.`);
          return { log };
        }
        const timeNeeded = getFactoryTimeCost(player);
        if (player.time < timeNeeded) {
          log = withLog(log, state.day, `Not enough time to work at ${label}.`);
          return { log };
        }
        player.energy = 0;
        player.time -= timeNeeded;
      }

      const outputMessage = runFactoryOutput(player, region, resources, workExperience, factoryId, actualEnergySpent);
      log = withLog(log, state.day, `${mode === "auto" ? "Auto cycle" : "Full work burst"} at ${label}. ${outputMessage}.`);
      success = true;
      return { player, resources, regions, workExperience, log };
    });
    return success;
  },

  buyFactoryEnergy: (amount = FACTORY_ENERGY_COST) => {
    let success = false;
    set((state) => {
      const player = { ...state.player };
      const spendAmount = amount >= 10 && amount <= FACTORY_ENERGY_COST && amount % 10 === 0 ? amount : FACTORY_ENERGY_COST;
      if (player.energyCredits < spendAmount) {
        return { log: withLog(state.log, state.day, `Need ${spendAmount} E to recharge your worker energy.`) };
      }
      const refillRatio = spendAmount / FACTORY_ENERGY_COST;
      player.energyCredits -= spendAmount;
      player.energy = clamp(player.energy + Math.round(60 * refillRatio), 0, 200);
      player.time = clamp(player.time + Math.round(20 * refillRatio), 0, 120);
      success = true;
      return { player, log: withLog(state.log, state.day, `Spent ${spendAmount} E to recharge worker energy.`) };
    });
    return success;
  },

  joinDominantParty: () =>
    set((state) => {
      const dominant = [...state.parties].sort((left, right) => right.popularity - left.popularity)[0];
      const parties = state.parties.map((party) => ({ ...party }));
      const party = parties.find((entry) => entry.id === dominant.id)!;
      party.members += 1;
      const player = { ...state.player, partyId: dominant.id };
      return { parties, player, log: withLog(state.log, state.day, `Joined ${dominant.name}.`) };
    }),

  createParty: () =>
    set((state) => {
      const player = { ...state.player };
      if (player.money < 500 || player.influence < 20) {
        return { log: withLog(state.log, state.day, "Need 500 money and 20 influence to create a party.") };
      }
      player.money -= 500;
      const id = `party-${Date.now().toString().slice(-6)}`;
      const newParty = { id, name: `New Vision ${state.parties.length + 1}`, popularity: 8, members: 60 };
      player.partyId = id;
      return { player, parties: [...state.parties, newParty], log: withLog(state.log, state.day, `Created party ${newParty.name}.`) };
    }),

  attackNeighbor: () =>
    set((state) => {
      const player = { ...state.player };
      const regions = state.regions.map((region) => ({ ...region }));
      const from = regions.find((region) => region.id === player.locationId)!;
      const targets = from.neighbors
        .map((id) => regions.find((region) => region.id === id))
        .filter((region): region is Region => region !== undefined)
        .filter((region) => canCoupRegion(region));

      if (targets.length === 0) {
        return { log: withLog(state.log, state.day, "No neighboring region can be couped while its development index is above level 2.") };
      }

      if (!spendAction(player, getWarEnergyCost(player, 22), getWarTimeCost(player, 26))) {
        return { log: withLog(state.log, state.day, "Not enough energy/time to attack.") };
      }

      const target = targets[rand(0, targets.length - 1)];
      const attack = getWarDamageEstimate(player, from, state.military) + rand(15000, 70000);
      const defense = getWarDefenseEstimate(target) + rand(10000, 50000);

      if (attack > defense) {
        target.owner = player.partyId ?? from.owner;
        target.stability = clamp(target.stability - 10, 10, 100);
        player.influence += 9;
        grantXp(player, 50 + target.militaryIndex);
        return { player, regions, log: withLog(state.log, state.day, `Territory won: ${target.name}.`) };
      }

      player.hp = clamp(player.hp - rand(10, 20), 0, 120);
      grantXp(player, 18 + target.militaryIndex);
      return { player, log: withLog(state.log, state.day, `Attack failed on ${target.name}.`) };
    }),

  proposeBill: (lawType) =>
    set((state) => {
      const player = { ...state.player };
      const region = state.regions.find((r) => r.id === player.locationId)!;
      if (player.money < 100 || player.influence < 10) {
        return { log: withLog(state.log, state.day, "Need 100 money and 10 influence to propose a bill.") };
      }
      if (player.level < 10) {
        return { log: withLog(state.log, state.day, "Must be at least level 10 to propose bills.") };
      }
      player.money -= 100;
      player.influence = Math.max(0, player.influence - 10);
      const def = LAW_DEFINITIONS[lawType];
      const activeParty = state.parties.find((p) => p.id === player.partyId);
      const effectValue = lawType === "change_tax" ? rand(5, 25) : lawType === "market_taxes" ? rand(2, 12) : undefined;
      const totalVoters = 40 + region.population * 3;
      const newBill: Bill = {
        id: `bill-${Date.now().toString().slice(-8)}`,
        lawType,
        category: def.category,
        title: lawType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        description: def.description(region, effectValue),
        proposedBy: activeParty?.name ?? `${region.city} Commander`,
        proposedDay: state.day,
        expiresDay: state.day + 6,
        votesFor: 1,
        votesAgainst: 0,
        totalEligibleVoters: totalVoters,
        status: "pending",
        playerVoted: true,
        effectValue,
      };
      grantXp(player, 15);
      return {
        player,
        bills: [...state.bills, newBill],
        log: withLog(state.log, state.day, `Proposed bill: ${newBill.title}. Voting open for 6 days.`)
      };
    }),

  voteOnBill: (billId, vote) =>
    set((state) => {
      const player = { ...state.player };
      const bills = state.bills.map((b) => ({ ...b }));
      const bill = bills.find((b) => b.id === billId);
      if (!bill || bill.status !== "pending") {
        return { log: withLog(state.log, state.day, "This bill is no longer open for voting.") };
      }
      if (bill.playerVoted) {
        return { log: withLog(state.log, state.day, "You have already voted on this bill.") };
      }
      bill.playerVoted = true;
      if (vote === "pro") {
        bill.votesFor += 1;
      } else {
        bill.votesAgainst += 1;
      }
      // Also simulate NPC votes
      const npcVotes = rand(2, 6);
      for (let i = 0; i < npcVotes; i++) {
        if (Math.random() > 0.45) {
          bill.votesFor += 1;
        } else {
          bill.votesAgainst += 1;
        }
      }
      // Check immediate passage (50%+1 in Presidential Republic)
      const totalCast = bill.votesFor + bill.votesAgainst;
      const threshold = (bill.lawType === "proclamation_dictatorship" || bill.lawType === "dominant_party_system") ? 0.8 : 0.5;
      if (bill.votesFor / Math.max(1, totalCast) > threshold) {
        bill.status = "accepted";
        // Apply law effects
        const region = state.regions.find((r) => r.id === player.locationId)!;
        const regions = state.regions.map((r) => ({ ...r }));
        const laws = { ...state.laws };
        if (bill.lawType === "change_tax" && bill.effectValue) {
          laws.taxRate = bill.effectValue;
        } else if (bill.lawType === "market_taxes" && bill.effectValue) {
          laws.tradeTariff = bill.effectValue;
        } else if (bill.lawType === "new_building") {
          const locRegion = regions.find((r) => r.id === player.locationId);
          if (locRegion) locRegion.developmentIndex = clamp(locRegion.developmentIndex + 1, 1, 10);
        } else if (bill.lawType === "resource_exploration") {
          const locRegion = regions.find((r) => r.id === player.locationId);
          if (locRegion) locRegion.economy = clamp(locRegion.economy + 3, 0, 100);
        }
        grantXp(player, 20);
        return { player, bills, laws, regions, log: withLog(state.log, state.day, `Bill "${bill.title}" PASSED with ${bill.votesFor} PRO votes.`) };
      }
      if (bill.votesAgainst / Math.max(1, totalCast) > (1 - threshold)) {
        bill.status = "rejected";
      }
      grantXp(player, 8);
      return { player, bills, log: withLog(state.log, state.day, `Voted ${vote.toUpperCase()} on "${bill.title}". For: ${bill.votesFor}, Against: ${bill.votesAgainst}.`) };
    }),

  nextDay: () =>
    set((state) => {
      const totalTicks = state.totalTicks + 1;
      const dayStarted = totalTicks % 600 === 0;
      const day = dayStarted ? state.day + 1 : state.day;
      const player = { ...state.player };
      const regions = state.regions.map((region) => ({ ...region }));

      // Energy: Discrete +10E refill every 10min (600 ticks).
      if (dayStarted) {
        player.energy = clamp(player.energy + 10, 0, 300);
      }
      player.time = clamp(player.time + 0.1, 0, 120);

      const parties = dayStarted
        ? state.parties.map(p => ({ ...p, popularity: clamp(p.popularity + rand(-1, 1), 1, 99) }))
        : state.parties;

      if (dayStarted) {
        state.regions.forEach((region, i) => {
          regions[i].stability = clamp(region.stability + rand(-1, 1), 0, 100);
          regions[i].economy = clamp(region.economy + rand(0, 1), 0, 100);
        });
      }

      const bills = state.bills.map((bill) => {
        if (bill.status !== "pending") return bill;
        const b = { ...bill };
        if (day >= b.expiresDay) {
          const totalCast = b.votesFor + b.votesAgainst;
          const threshold = (b.lawType === "proclamation_dictatorship" || b.lawType === "dominant_party_system") ? 0.8 : 0.5;
          b.status = b.votesFor / Math.max(1, totalCast) > threshold ? "accepted" : "rejected";
        } else if (dayStarted) {
          b.votesFor += rand(1, 4);
          b.votesAgainst += rand(1, 3);
        }
        return b;
      });

      const now = Date.now();
      const wars = state.wars.map(w => {
        if (!w.active) return w;
        if (now >= w.expiresAt) return { ...w, active: false };
        return {
          ...w,
          attackerDamage: w.attackerDamage + rand(100, 500),
          defenderDamage: w.defenderDamage + rand(100, 500)
        };
      });

      return { totalTicks, day, player, parties, regions, bills, wars };
    }),
  sendTroops: (warId, side, weapons, energy) =>
    set((state) => {
      const player = { ...state.player };
      const military = { ...state.military };
      const wars = state.wars.map(w => ({ ...w }));
      const war = wars.find(w => w.id === warId);

      if (!war || !war.active) {
        return { log: withLog(state.log, state.day, "Conflict has ended or is invalid.") };
      }

      const regions = state.regions.map((r) => ({ ...r }));

      if (!spendAction(player, energy, Math.floor(energy * 0.8))) {
        return { log: withLog(state.log, state.day, "Exhausted. Need more energy/time.") };
      }

      let totalWeaponDamage = 0;
      for (const [key, val] of Object.entries(weapons)) {
        const militaryKey = key === "infantry" ? "infantry" : key === "tank" ? "tanks" : key === "aircraft" ? "aircraft" : key === "navy" ? "navy" : key;
        const available = military[militaryKey] ?? 0;
        const actualSpend = Math.min(val, available);
        military[militaryKey] -= actualSpend;
        const weaponWeight = key === "tank" ? 12000 : key === "aircraft" ? 25000 : key === "navy" ? 45000 : 4200;
        totalWeaponDamage += actualSpend * weaponWeight;
      }

      const playerBase = getWarDamageEstimate(player, regions[0], military);
      const contribution = Math.round((playerBase + totalWeaponDamage) * (energy / 20) * (1 + rand(1, 15) / 100));

      if (side === "attacker") {
        war.attackerDamage += contribution;
      } else {
        war.defenderDamage += contribution;
      }

      grantXp(player, Math.floor(energy * 1.5));
      player.influence += Math.floor(energy / 25);

      return {
        player,
        military,
        wars,
        log: withLog(state.log, state.day, `Deployed to help ${side}. Damage added: ${formatNumber(contribution)}.`)
      };
    }),

  language: 'en',
  setLanguage: (language) => set({ language }),
}));
