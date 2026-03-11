export type Role = "Citizen" | "Soldier" | "Politician" | "Business Owner" | "Journalist";
export type UpgradeablePerk = "strength" | "stamina" | "intelligence" | "charisma";
export type FactoryId = "gold" | "oil" | "ore" | "uranium" | "diamond" | "liquid_oxygen" | "helium_3" | "rivalium" | "logistics";

export type StateType = "Parliamentary Republic" | "Presidential Republic" | "Dictatorship" | "One-Party System" | "Dominant-Party";
export type WarType = "Ground" | "Revolution" | "Coup";

export type Region = {
  id: string;
  name: string;
  country: string;
  city: string;
  lat: number;
  lng: number;
  owner: string;
  stability: number;
  economy: number;
  defense: number;
  population: number;
  healthIndex: number;
  militaryIndex: number;
  educationIndex: number;
  developmentIndex: number;
  neighbors: string[];
  governmentType?: StateType;
  isIndependent?: boolean;
};

export type Party = {
  id: string;
  name: string;
  popularity: number;
  members: number;
};

export type WorkExperience = Record<FactoryId, number>;

export type War = {
  id: string;
  type: WarType;
  targetRegion: string;
  attackerId: string; // party id or region id
  attackerDamage: number;
  defenderDamage: number;
  active: boolean;
  expiresAt: number;
};

export type Player = {
  role: Role;
  level: number;
  xp: number;
  xpToNext: number;
  perkPoints: number;
  hp: number;
  energy: number;
  energyCredits: number;
  time: number;
  money: number;
  influence: number;
  strength: number;
  intelligence: number;
  charisma: number;
  stamina: number;
  locationId: string;
  partyId: string | null;
  dailyGamePlays: number;
};

export type LawCategory = "economic" | "political" | "government";

export type LawType =
  | "change_tax"
  | "new_building"
  | "sell_resources"
  | "budget_transfer"
  | "market_taxes"
  | "resource_exploration"
  | "war_declaration"
  | "military_agreement"
  | "change_state_title"
  | "change_coat_of_arms"
  | "new_parliament_election"
  | "leader_impeachment"
  | "proclamation_dictatorship"
  | "dominant_party_system"
  | "independence_declaration"
  | "region_consolidation"
  | "close_open_borders"
  | "working_without_residency"
  | "form_state";

export type Bill = {
  id: string;
  lawType: LawType;
  category: LawCategory;
  title: string;
  description: string;
  proposedBy: string;
  proposedDay: number;
  expiresDay: number;
  votesFor: number;
  votesAgainst: number;
  totalEligibleVoters: number;
  status: "pending" | "accepted" | "rejected";
  playerVoted: boolean;
  effectValue?: number;
  targetRegionId?: string;
};

export type ResourceStorage = {
  gold: number;
  oil: number;
  iron: number;
  uranium: number;
  diamond?: number;
  liquid_oxygen?: number;
  helium_3?: number;
  rivalium?: number;
};
