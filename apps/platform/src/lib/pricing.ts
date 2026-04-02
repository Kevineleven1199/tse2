import { round } from "@/src/lib/utils";

// ─── SERVICE TYPES ───────────────────────────────────────────────────────────
export type QuoteServiceType = "healthy_home" | "deep_refresh" | "move_in_out" | "commercial";
export type QuoteFrequency = "one_time" | "weekly" | "biweekly" | "monthly";
export type QuoteLocationTier = "sarasota" | "manatee" | "pinellas" | "hillsborough" | "pasco" | "out_of_area";

export type QuoteAddOn =
  | "deep_clean_oven"
  | "deep_scrub_shower"
  | "inside_fridge"
  | "interior_windows"
  | "laundry_fold_iron"
  | "bed_making"
  | "curtain_steam"
  | "carpet_steaming"
  | "couch_steaming"
  | "pressure_washing"
  | "car_detailing"
  | "eco_disinfection";

// ─── NEW GRANULAR INPUTS ─────────────────────────────────────────────────────
export type FlooringType = "hardwood" | "tile" | "carpet" | "mixed" | "vinyl_laminate";
export type ConditionLevel = "well_maintained" | "average" | "needs_attention" | "heavy_soil";
export type BathroomType = "half" | "standard" | "master" | "luxury_master";
export type BedroomSize = "small" | "standard" | "master" | "bonus_room";
export type KitchenType = "galley" | "standard" | "large_open" | "gourmet";
export type PetSituation = "none" | "one_small" | "one_large" | "multiple" | "shedding_heavy";
export type HomeAge = "new_build" | "under_10" | "10_to_30" | "30_to_50" | "over_50";
export type ClutterLevel = "minimal" | "average" | "cluttered" | "very_cluttered";

export type QuoteInput = {
  serviceType: QuoteServiceType;
  frequency: QuoteFrequency;
  locationTier: QuoteLocationTier;
  bedrooms: number;
  bathrooms: number;
  squareFootage: number;
  addOns: QuoteAddOn[];
  isFirstTimeClient: boolean;
  // New granular fields (all optional for backward compatibility)
  flooringType?: FlooringType;
  conditionLevel?: ConditionLevel;
  bathroomTypes?: BathroomType[];
  bedroomSizes?: BedroomSize[];
  kitchenType?: KitchenType;
  petSituation?: PetSituation;
  homeAge?: HomeAge;
  clutterLevel?: ClutterLevel;
  hasGarage?: boolean;
  hasLaundryRoom?: boolean;
  stories?: number;
  hasLanaiPatio?: boolean;
  // Loyalty tier for returning customers
  loyaltyTier?: LoyaltyTier;
  // Date for seasonal pricing (defaults to today)
  quoteDate?: Date;
};

export type LoyaltyTier = "none" | "silver" | "gold" | "platinum";

export type QuoteBreakdown = {
  basePrice: number;
  bedroomAdjustment: number;
  bathroomAdjustment: number;
  squareFootageAdjustment: number;
  addOnTotal: number;
  travelFee: number;
  firstTimeFee: number;
  frequencyDiscount: number;
  totalBeforeDiscount: number;
  total: number;
  cleanerPay: number;
  companyMargin: number;
  companyMarginRate: number;
  estimatedDurationHours: number;
  recommendedDeposit: number;
  // Detailed breakdown
  flooringAdjustment: number;
  conditionAdjustment: number;
  petAdjustment: number;
  kitchenAdjustment: number;
  extraRoomAdjustment: number;
  // Seasonal pricing
  seasonalAdjustment: number;
  seasonalLabel: string;
  // Loyalty discount
  loyaltyDiscount: number;
  loyaltyTier: string;
  // Minimum rate guard
  minimumRateAdjustment: number;
};

// ─── BASE RATES ──────────────────────────────────────────────────────────────
// Based on FL cleaning industry averages: $25-45/hr cleaner rate, $0.10-0.15/sqft
// TriState charges premium (organic/eco) = ~20% above market rate

export const BASE_PRICE_MAP: Record<QuoteServiceType, number> = {
  healthy_home: 149,   // Standard recurring clean base
  deep_refresh: 229,   // Initial deep clean / seasonal detox
  move_in_out: 269,    // Empty-unit detail (walls, baseboards, cabinets)
  commercial: 189      // Office / retail space (less fixtures per sqft)
};

export const FREQUENCY_DISCOUNT: Record<QuoteFrequency, number> = {
  weekly: 0.22,    // Best discount — most predictable revenue
  biweekly: 0.15,  // Standard recurring discount
  monthly: 0.08,   // Minimal discount — home gets dirtier between
  one_time: 0
};

export const LOCATION_MULTIPLIER: Record<QuoteLocationTier, number> = {
  sarasota: 1,          // Base market
  manatee: 1.03,        // Slightly higher CoL
  pinellas: 1.05,       // Beach premium
  hillsborough: 1.07,   // Huntington metro premium
  pasco: 0.97,          // Slightly lower market
  out_of_area: 1.12     // Extended drive + premium
};

// ─── GRANULAR RATE TABLES ────────────────────────────────────────────────────
// Research-backed rates from cleaning industry data for KY-OH-WV market

// Flooring effort multipliers (relative to standard mixed flooring = 1.0)
// Hardwood: careful mopping, avoid excess water, polish = more effort
// Tile: grout lines need attention, heavier scrubbing
// Carpet: vacuum only (faster surface clean), but pet hair/stains take longer
// Mixed: average of all types
const FLOORING_PRICE_MULTIPLIER: Record<FlooringType, number> = {
  hardwood: 1.08,        // +$12-20 more care, special products
  tile: 1.12,            // +$15-25 grout cleaning, more scrubbing
  carpet: 0.95,          // Slight discount — vacuum only, no mopping
  mixed: 1.0,            // Standard baseline
  vinyl_laminate: 0.97   // Easy to clean, fast
};
const FLOORING_TIME_MULTIPLIER: Record<FlooringType, number> = {
  hardwood: 1.1,
  tile: 1.15,
  carpet: 0.9,
  mixed: 1.0,
  vinyl_laminate: 0.95
};

// Condition level — how dirty is the home currently?
// This is the SINGLE BIGGEST pricing variable for accuracy
// A well-maintained biweekly home is 40% faster than a neglected one-time
const CONDITION_PRICE_MULTIPLIER: Record<ConditionLevel, number> = {
  well_maintained: 0.88,    // Recurring client, tidy home. -12% discount
  average: 1.0,             // Standard condition
  needs_attention: 1.22,    // Dusty, some buildup, hasn't been cleaned in 4-8 weeks
  heavy_soil: 1.45          // Hasn't been cleaned in months, visible grime, grease
};
const CONDITION_TIME_MULTIPLIER: Record<ConditionLevel, number> = {
  well_maintained: 0.82,
  average: 1.0,
  needs_attention: 1.3,
  heavy_soil: 1.55
};

// Bathroom types — huge variance in cleaning time
// Half bath: toilet + sink = 10-12 min
// Standard: tub/shower + toilet + sink = 20-25 min
// Master: double vanity + shower + tub + toilet = 30-40 min
// Luxury master: jacuzzi, steam shower, marble, heated floors = 40-55 min
const BATHROOM_PRICE: Record<BathroomType, number> = {
  half: 12,           // Was flat $22 for all — now differentiated
  standard: 22,
  master: 35,
  luxury_master: 50
};
const BATHROOM_TIME_HOURS: Record<BathroomType, number> = {
  half: 0.18,
  standard: 0.4,
  master: 0.6,
  luxury_master: 0.85
};

// Bedroom sizes — a small guest room is quick; a master suite has more surface area
const BEDROOM_PRICE: Record<BedroomSize, number> = {
  small: 8,           // Was flat $14 for all
  standard: 14,
  master: 22,
  bonus_room: 18      // Media room, office, playroom
};
const BEDROOM_TIME_HOURS: Record<BedroomSize, number> = {
  small: 0.2,
  standard: 0.35,
  master: 0.5,
  bonus_room: 0.4
};

// Kitchen type — galley kitchens are fast; gourmet kitchens take 2x
const KITCHEN_PRICE: Record<KitchenType, number> = {
  galley: 0,          // Included in base
  standard: 10,
  large_open: 25,
  gourmet: 40         // Double ovens, sub-zero, island, pot rack, wine cooler
};
const KITCHEN_TIME_HOURS: Record<KitchenType, number> = {
  galley: 0,
  standard: 0.1,
  large_open: 0.25,
  gourmet: 0.45
};

// Pet situation — fur, dander, accidents, outdoor tracked-in dirt
const PET_PRICE: Record<PetSituation, number> = {
  none: 0,
  one_small: 8,       // Minor fur, light dander
  one_large: 18,      // Significant shedding, larger messes
  multiple: 30,       // Multiple animals, fur everywhere
  shedding_heavy: 40  // Huskies, German Shepherds, long-hair cats
};
const PET_TIME_HOURS: Record<PetSituation, number> = {
  none: 0,
  one_small: 0.15,
  one_large: 0.3,
  multiple: 0.5,
  shedding_heavy: 0.7
};

// Home age — older homes have more crevices, textured walls, harder-to-clean fixtures
const HOME_AGE_MULTIPLIER: Record<HomeAge, number> = {
  new_build: 0.92,    // Smooth surfaces, modern fixtures, easy to clean
  under_10: 0.96,
  "10_to_30": 1.0,
  "30_to_50": 1.06,   // Some wear, textured popcorn ceilings, older grout
  over_50: 1.12       // Vintage fixtures, harder corners, more detailed work
};

// Clutter level — more stuff = more time moving, cleaning around, replacing items
const CLUTTER_TIME_MULTIPLIER: Record<ClutterLevel, number> = {
  minimal: 0.88,      // Clean counters, organized, minimal decor
  average: 1.0,
  cluttered: 1.18,    // Lots of items on surfaces, full shelves
  very_cluttered: 1.35 // Major declutter needed before cleaning can start
};

// ─── ADD-ON RATES (unchanged but now with time data) ─────────────────────────
export const ADD_ON_FEES: Record<QuoteAddOn, number> = {
  deep_clean_oven: 45,
  deep_scrub_shower: 35,
  inside_fridge: 30,
  interior_windows: 55,
  laundry_fold_iron: 60,
  bed_making: 25,
  curtain_steam: 40,
  carpet_steaming: 75,
  couch_steaming: 65,
  pressure_washing: 125,
  car_detailing: 95,
  eco_disinfection: 60
};

const ADD_ON_TIME_HOURS: Record<QuoteAddOn, number> = {
  deep_clean_oven: 0.5,
  deep_scrub_shower: 0.4,
  inside_fridge: 0.35,
  interior_windows: 0.75,
  laundry_fold_iron: 0.8,
  bed_making: 0.3,
  curtain_steam: 0.5,
  carpet_steaming: 0.9,
  couch_steaming: 0.7,
  pressure_washing: 1.1,
  car_detailing: 0.9,
  eco_disinfection: 0.4
};

// ─── LABELS (exports used by the quote form) ────────────────────────────────
export const ADD_ON_LABELS: Record<QuoteAddOn, string> = {
  deep_clean_oven: "Deep Clean Oven",
  deep_scrub_shower: "Deep Scrub Shower / Tub",
  inside_fridge: "Inside Fridge Cleaning",
  interior_windows: "Interior Windows",
  laundry_fold_iron: "Laundry, Fold & Iron",
  bed_making: "Bed Making & Linen Change",
  curtain_steam: "Curtain Steaming",
  carpet_steaming: "Carpet Steaming",
  couch_steaming: "Couch & Upholstery Steaming",
  pressure_washing: "Pressure Washing",
  car_detailing: "Mobile Car Detail",
  eco_disinfection: "Eco Disinfection Fogging"
};

export const SERVICE_LABELS: Record<QuoteServiceType, string> = {
  healthy_home: "Healthy Home Cleaning",
  deep_refresh: "Deep Refresh & Detox",
  move_in_out: "Move-In / Move-Out Detail",
  commercial: "Eco Commercial Care"
};

export const FREQUENCY_LABELS: Record<QuoteFrequency, string> = {
  one_time: "One-time",
  weekly: "Weekly (22% off)",
  biweekly: "Bi-weekly (15% off)",
  monthly: "Monthly (8% off)"
};

export const FREQUENCY_LABELS_SHORT: Record<QuoteFrequency, string> = {
  one_time: "One-time",
  weekly: "Weekly",
  biweekly: "Bi-weekly",
  monthly: "Monthly"
};

export const LOCATION_LABELS: Record<QuoteLocationTier, string> = {
  sarasota: "Flatwoods County",
  manatee: "Manatee County",
  pinellas: "Pinellas County",
  hillsborough: "Hillsborough County",
  pasco: "Pasco County",
  out_of_area: "Extended Service Area"
};

export const FLOORING_LABELS: Record<FlooringType, string> = {
  hardwood: "Hardwood / Engineered Wood",
  tile: "Tile / Stone / Travertine",
  carpet: "Mostly Carpet",
  mixed: "Mixed (Some of Each)",
  vinyl_laminate: "Vinyl / Laminate / LVP"
};

export const CONDITION_LABELS: Record<ConditionLevel, string> = {
  well_maintained: "Well-Maintained (cleaned recently)",
  average: "Average Condition",
  needs_attention: "Needs Attention (4-8 weeks since last clean)",
  heavy_soil: "Heavy Soiling (months since last clean)"
};

export const BATHROOM_TYPE_LABELS: Record<BathroomType, string> = {
  half: "Half Bath (toilet + sink)",
  standard: "Standard Full Bath",
  master: "Master Bath (double vanity)",
  luxury_master: "Luxury Master (jacuzzi/steam)"
};

export const BEDROOM_SIZE_LABELS: Record<BedroomSize, string> = {
  small: "Small Guest Room",
  standard: "Standard Bedroom",
  master: "Master Suite",
  bonus_room: "Bonus / Media / Office"
};

export const KITCHEN_LABELS: Record<KitchenType, string> = {
  galley: "Galley / Compact",
  standard: "Standard Kitchen",
  large_open: "Large Open-Concept",
  gourmet: "Gourmet / Chef's Kitchen"
};

export const PET_LABELS: Record<PetSituation, string> = {
  none: "No Pets",
  one_small: "1 Small Pet (under 25 lbs)",
  one_large: "1 Large Pet (25+ lbs)",
  multiple: "Multiple Pets",
  shedding_heavy: "Heavy Shedders (Huskies, etc.)"
};

export const CLUTTER_LABELS: Record<ClutterLevel, string> = {
  minimal: "Minimal — Clean Surfaces",
  average: "Average",
  cluttered: "Cluttered — Lots of Items",
  very_cluttered: "Very Cluttered"
};

export const HOME_AGE_LABELS: Record<HomeAge, string> = {
  new_build: "New Construction (< 3 years)",
  under_10: "Under 10 Years Old",
  "10_to_30": "10–30 Years Old",
  "30_to_50": "30–50 Years Old",
  over_50: "50+ Years (Vintage/Historic)"
};

// ─── SEASONAL PRICING ────────────────────────────────────────────────────────
// Kentucky market: snowbird season (Dec-Mar) is peak demand, hurricane/rainy (Jun-Sep) is softer
function getSeasonalMultiplier(date: Date): { multiplier: number; label: string } {
  const month = date.getMonth(); // 0-indexed
  if (month >= 11 || month <= 2) return { multiplier: 1.08, label: "Peak Season (+8%)" };
  if (month >= 5 && month <= 8) return { multiplier: 0.95, label: "Summer Savings (-5%)" };
  return { multiplier: 1.0, label: "" };
}

// ─── LOYALTY DISCOUNTS ───────────────────────────────────────────────────────
const LOYALTY_DISCOUNT: Record<LoyaltyTier, number> = {
  none: 0,
  silver: 0.03,    // 3% off
  gold: 0.05,      // 5% off
  platinum: 0.08,  // 8% off
};

const LOYALTY_LABELS: Record<LoyaltyTier, string> = {
  none: "",
  silver: "Silver Member (-3%)",
  gold: "Gold Member (-5%)",
  platinum: "Platinum Member (-8%)",
};

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const CLEANER_COMPENSATION_RATE = 0.62;
const FIRST_TIME_MULTIPLIER = 0.18;
const MIN_CLEANER_HOURLY_RATE = 22; // Floor to ensure cleaners are fairly compensated

// ─── CONTINUOUS SQFT FORMULA ─────────────────────────────────────────────────
// Replaces the old stepped brackets with a smooth curve:
// $0 for first 1000 sqft (included in base), then $0.045/sqft scaling up to $0.12/sqft
// This means a 1500 sqft home adds ~$22, while a 3000 sqft home adds ~$120
function calculateSquareFootageAdjustment(squareFootage: number): number {
  if (squareFootage <= 1000) return 0;
  const overBase = squareFootage - 1000;
  // Progressive rate: starts at $0.04/sqft, scales to $0.12/sqft for very large homes
  const rate = 0.04 + Math.min(overBase / 10000, 0.08);
  return overBase * rate;
}

// ─── DURATION ESTIMATOR ──────────────────────────────────────────────────────
// This is the core innovation: time is estimated bottom-up from individual room
// types, conditions, and adjustments rather than a flat formula.
// Industry benchmark: 1 cleaner does ~400-600 sqft/hour for standard maintenance clean

export function estimateDurationHours(input: QuoteInput): number {
  const {
    squareFootage, bedrooms, bathrooms, serviceType, addOns,
    flooringType = "mixed",
    conditionLevel = "average",
    bathroomTypes,
    bedroomSizes,
    kitchenType = "standard",
    petSituation = "none",
    clutterLevel = "average",
    hasGarage = false,
    hasLaundryRoom = false,
    stories = 1,
    hasLanaiPatio = false
  } = input;

  // Start with sqft-based time (industry: ~450 sqft/hr for standard clean)
  let baseTime = squareFootage / 450;

  // Add per-bathroom time (granular if types provided)
  if (bathroomTypes && bathroomTypes.length > 0) {
    baseTime += bathroomTypes.reduce((sum, bt) => sum + BATHROOM_TIME_HOURS[bt], 0);
  } else {
    baseTime += bathrooms * 0.4; // Fallback: standard bath assumption
  }

  // Add per-bedroom time (granular if sizes provided)
  if (bedroomSizes && bedroomSizes.length > 0) {
    baseTime += bedroomSizes.reduce((sum, bs) => sum + BEDROOM_TIME_HOURS[bs], 0);
  } else {
    baseTime += bedrooms * 0.35; // Fallback: standard bedroom assumption
  }

  // Kitchen time
  baseTime += KITCHEN_TIME_HOURS[kitchenType];

  // Service type multiplier
  if (serviceType === "deep_refresh") baseTime *= 1.4;    // 40% more time for deep clean
  if (serviceType === "move_in_out") baseTime *= 1.55;    // 55% more — empty units need baseboards, cabinets, walls
  if (serviceType === "commercial") baseTime *= 1.15;     // 15% more — larger open areas but fewer fixtures

  // Apply flooring multiplier
  baseTime *= FLOORING_TIME_MULTIPLIER[flooringType];

  // Apply condition multiplier (biggest swing factor)
  baseTime *= CONDITION_TIME_MULTIPLIER[conditionLevel];

  // Apply clutter multiplier
  baseTime *= CLUTTER_TIME_MULTIPLIER[clutterLevel];

  // Pet time
  baseTime += PET_TIME_HOURS[petSituation];

  // Extra rooms
  if (hasGarage) baseTime += 0.25;
  if (hasLaundryRoom) baseTime += 0.2;
  if (hasLanaiPatio) baseTime += 0.3;
  if (stories > 1) baseTime += (stories - 1) * 0.2; // Extra time hauling equipment

  // Add-on time
  for (const addOn of addOns) {
    baseTime += ADD_ON_TIME_HOURS[addOn] ?? 0;
  }

  return Number(baseTime.toFixed(1));
}

// ─── PRICE CALCULATOR ────────────────────────────────────────────────────────
export function calculateQuote(input: QuoteInput): QuoteBreakdown {
  const {
    serviceType, frequency, bedrooms, bathrooms, squareFootage, addOns,
    isFirstTimeClient, locationTier,
    flooringType = "mixed",
    conditionLevel = "average",
    bathroomTypes,
    bedroomSizes,
    kitchenType = "standard",
    petSituation = "none",
    homeAge = "10_to_30",
    hasGarage = false,
    hasLaundryRoom = false,
    hasLanaiPatio = false
  } = input;

  const basePrice = BASE_PRICE_MAP[serviceType];

  // Granular bedroom pricing
  let bedroomAdjustment: number;
  if (bedroomSizes && bedroomSizes.length > 0) {
    bedroomAdjustment = bedroomSizes.reduce((sum, bs) => sum + BEDROOM_PRICE[bs], 0);
  } else {
    bedroomAdjustment = bedrooms * 14; // Fallback
  }

  // Granular bathroom pricing
  let bathroomAdjustment: number;
  if (bathroomTypes && bathroomTypes.length > 0) {
    bathroomAdjustment = bathroomTypes.reduce((sum, bt) => sum + BATHROOM_PRICE[bt], 0);
  } else {
    bathroomAdjustment = bathrooms * 22; // Fallback
  }

  // Continuous sqft adjustment
  const squareFootageAdjustment = Math.round(calculateSquareFootageAdjustment(squareFootage));

  // Flooring adjustment (applied to labor portion of base + rooms)
  const laborBase = basePrice + bedroomAdjustment + bathroomAdjustment + squareFootageAdjustment;
  const flooringMultiplier = FLOORING_PRICE_MULTIPLIER[flooringType];
  const flooringAdjustment = round(laborBase * (flooringMultiplier - 1), 2);

  // Condition adjustment (biggest swing factor)
  const conditionMultiplier = CONDITION_PRICE_MULTIPLIER[conditionLevel];
  const conditionAdjustment = round(laborBase * (conditionMultiplier - 1), 2);

  // Pet adjustment
  const petAdjustment = PET_PRICE[petSituation];

  // Kitchen upgrade
  const kitchenAdjustment = KITCHEN_PRICE[kitchenType];

  // Extra rooms
  let extraRoomAdjustment = 0;
  if (hasGarage) extraRoomAdjustment += 15;
  if (hasLaundryRoom) extraRoomAdjustment += 12;
  if (hasLanaiPatio) extraRoomAdjustment += 20;

  // Home age multiplier (applied to adjusted labor)
  const homeAgeMultiplier = HOME_AGE_MULTIPLIER[homeAge];

  // Add-ons
  const addOnTotal = addOns.reduce((total, addOn) => total + (ADD_ON_FEES[addOn] ?? 0), 0);

  // First-time fee (initial walkthrough, product setup, assessment)
  const firstTimeFee = isFirstTimeClient
    ? (basePrice + bedroomAdjustment + bathroomAdjustment) * FIRST_TIME_MULTIPLIER
    : 0;

  // Calculate subtotal with all granular adjustments
  const adjustedLabor = (laborBase + flooringAdjustment + conditionAdjustment + petAdjustment + kitchenAdjustment + extraRoomAdjustment)
    * homeAgeMultiplier
    * LOCATION_MULTIPLIER[locationTier];

  const totalBeforeDiscount = adjustedLabor + addOnTotal + firstTimeFee;
  const frequencyDiscount = totalBeforeDiscount * FREQUENCY_DISCOUNT[frequency];
  const travelFee = locationTier === "out_of_area" ? 25 : locationTier === "pasco" ? 10 : 0;

  // Seasonal pricing
  const quoteDate = input.quoteDate ?? new Date();
  const seasonal = getSeasonalMultiplier(quoteDate);
  const seasonalAdjustment = round(totalBeforeDiscount * (seasonal.multiplier - 1), 2);

  // Loyalty discount
  const loyaltyTier = input.loyaltyTier ?? "none";
  const loyaltyRate = LOYALTY_DISCOUNT[loyaltyTier];

  let total = Math.max(totalBeforeDiscount + seasonalAdjustment - frequencyDiscount + travelFee, 90);
  const loyaltyDiscount = round(total * loyaltyRate, 2);
  total = round(total - loyaltyDiscount, 2);

  const estimatedDurationHours = estimateDurationHours(input);

  // Minimum cleaner hourly rate guard
  let minimumRateAdjustment = 0;
  const cleanerPayRaw = (total - travelFee) * CLEANER_COMPENSATION_RATE;
  const effectiveHourlyRate = estimatedDurationHours > 0 ? cleanerPayRaw / estimatedDurationHours : 0;
  if (effectiveHourlyRate > 0 && effectiveHourlyRate < MIN_CLEANER_HOURLY_RATE) {
    const requiredCleanerPay = MIN_CLEANER_HOURLY_RATE * estimatedDurationHours;
    const requiredTotal = (requiredCleanerPay / CLEANER_COMPENSATION_RATE) + travelFee;
    minimumRateAdjustment = round(requiredTotal - total, 2);
    total = round(requiredTotal, 2);
  }

  const cleanerPay = round((total - travelFee) * CLEANER_COMPENSATION_RATE, 2);
  const companyMargin = round(total - cleanerPay - travelFee, 2);
  const companyMarginRate = Number(((companyMargin / total) * 100).toFixed(1));
  const recommendedDeposit = round(Math.max(total * 0.2, 50), 2);

  return {
    basePrice: round(basePrice, 2),
    bedroomAdjustment: round(bedroomAdjustment, 2),
    bathroomAdjustment: round(bathroomAdjustment, 2),
    squareFootageAdjustment: round(squareFootageAdjustment, 2),
    addOnTotal: round(addOnTotal, 2),
    travelFee: round(travelFee, 2),
    firstTimeFee: round(firstTimeFee, 2),
    frequencyDiscount: round(frequencyDiscount, 2),
    totalBeforeDiscount: round(totalBeforeDiscount, 2),
    total: round(total, 2),
    cleanerPay,
    companyMargin,
    companyMarginRate,
    estimatedDurationHours,
    recommendedDeposit,
    flooringAdjustment,
    conditionAdjustment,
    petAdjustment,
    kitchenAdjustment,
    extraRoomAdjustment: round(extraRoomAdjustment, 2),
    seasonalAdjustment,
    seasonalLabel: seasonal.label,
    loyaltyDiscount,
    loyaltyTier,
    minimumRateAdjustment,
  };
}
