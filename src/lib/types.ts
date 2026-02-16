/**
 * Pokemon TCG API v2 response types
 * @see https://docs.pokemontcg.io/api-reference/cards/card-object
 */

export interface SetRef {
  id: string;
  name: string;
  series: string;
  printedTotal: number;
  total: number;
  legalities?: Legalities;
  ptcgoCode?: string;
  releaseDate: string;
  updatedAt: string;
  images?: {
    symbol: string;
    logo: string;
  };
}

export interface Legalities {
  unlimited?: string;
  standard?: string;
  expanded?: string;
}

export interface AncientTrait {
  name: string;
  text: string;
}

export interface Ability {
  name: string;
  text: string;
  type: string;
}

export interface Attack {
  name: string;
  cost?: string[];
  convertedEnergyCost?: number;
  damage?: string;
  text?: string;
}

export interface WeaknessResistance {
  type: string;
  value: string;
}

export interface CardImages {
  small: string;
  large: string;
  back?: string;
}

export interface TcgPlayerPrices {
  low?: number;
  mid?: number;
  high?: number;
  market?: number;
  directLow?: number;
}

export interface TcgPlayer {
  url: string;
  updatedAt: string;
  prices?: {
    normal?: TcgPlayerPrices;
    holofoil?: TcgPlayerPrices;
    reverseHolofoil?: TcgPlayerPrices;
    "1stEditionHolofoil"?: TcgPlayerPrices;
    "1stEditionNormal"?: TcgPlayerPrices;
  };
}

export interface CardMarket {
  url: string;
  updatedAt: string;
  prices?: Record<string, number>;
}

export interface Card {
  id: string;
  name: string;
  supertype: string;
  subtypes?: string[];
  level?: string;
  hp?: string;
  types?: string[];
  evolvesFrom?: string;
  evolvesTo?: string[];
  rules?: string[];
  ancientTrait?: AncientTrait;
  abilities?: Ability[];
  attacks?: Attack[];
  weaknesses?: WeaknessResistance[];
  resistances?: WeaknessResistance[];
  retreatCost?: string[];
  convertedRetreatCost?: number;
  set: SetRef;
  number: string;
  artist?: string;
  rarity?: string;
  flavorText?: string;
  nationalPokedexNumbers?: number[];
  legalities?: Legalities;
  regulationMark?: string;
  images: CardImages;
  tcgplayer?: TcgPlayer;
  cardmarket?: CardMarket;
}

export interface CardSearchResponse {
  data: Card[];
  page: number;
  pageSize: number;
  count: number;
  totalCount: number;
}

export interface Set {
  id: string;
  name: string;
  series: string;
  printedTotal: number;
  total: number;
  legalities?: Legalities;
  ptcgoCode?: string;
  releaseDate: string;
  updatedAt: string;
  images?: {
    symbol: string;
    logo: string;
  };
}

export interface SetListResponse {
  data: Set[];
}

export interface RaritiesResponse {
  data: string[];
}

export interface TypesResponse {
  data: string[];
}

/* ───────────────────── Slab Cash API types ───────────────────── */

export interface SlabMachineRef {
  id: string;
  slabId: string;
  machineId: string;
  chainId: number;
  rarity: string;
}

export interface Slab {
  id: string;
  tokenId: string;
  chainId: number;
  machines: SlabMachineRef[];
  value: string;
  owner: string;
  state: string;
  external?: { tokenId: string; chainId: number } | null;
  imageUrl?: string;
  description?: string;
  attributes?: Record<string, unknown> | null;
  imageUrls?: string[] | null;
}

export interface SlabListResponse {
  slabs: Slab[];
}
