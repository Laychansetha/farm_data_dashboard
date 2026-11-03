/**
 * Farm Data Dashboard — Type Definitions & Data Contract
 * ========================================================
 * Formal interfaces defining both the normalized backend database models
 * and the compiled frontend data contracts consumed by the dashboard components.
 */

// ── 1. Relational Dimension Models ──────────────────────────────────────────

export interface DimSite {
  site_id: number;
  site_name: 'Preah Vihear' | 'Prey Lang' | 'Siem Pang' | 'Ratanakiri' | 'Mondolkiri' | string;
  lat: number;
  lng: number;
}

export interface DimIrpg {
  irpg_id: number;
  irpg_name: string;
}

export interface DimVillage {
  village_id: number;
  village_name: string;
  site_id: number;
  irpg_id?: number | null;
}

export interface DimFarmer {
  farmer_uid: string;
  family_id: string;
  village_id: number;
  farmer_name?: string;
  husband_name?: string;
  wife_name?: string;
  gender: 'Female' | 'Male' | 'Unknown' | string;
}

export interface DimCropVariety {
  variety_id: number;
  variety_name: string;
  category: 'Rice' | string;
}

// ── 2. Relational Fact & Survey Models ──────────────────────────────────────

export interface FactPlotInspection {
  inspection_id: number;
  farmer_uid: string;
  data_year: number; // e.g., 2019 - 2025
  inspection_date?: string; // YYYY-MM-DD
  parcel_id?: string;
  plot_code?: string;
  variety?: string;
  planting_method?: 'Broadcast' | 'Transplanting' | string;
  status_harvest: 'Organic' | 'New Organic' | 'Ibis I' | 'Ibis II' | 'WF' | string;
  planted_area_ha: number;
  fallow_area_ha: number;
  other_area_ha: number;
  expected_production_kg?: number;
  expected_sell_kg?: number;
  land_situation: 'Lowland' | 'Highland' | 'Flooded land' | string;
  land_ownership: 'Own' | 'Land Loan' | 'Land Transfer' | 'Land Sale' | 'Land Purchase' | string;
  irrigation_system: 'None' | 'Canal' | 'Rainfed' | 'Yes' | 'No' | string;
  compliant: boolean | string;
  farmer_status?: 'New' | 'Existing' | 'Rejoin' | string;
}

export interface FactPurchase {
  purchase_id: number;
  farmer_uid: string;
  data_year: number;
  purchase_date?: string; // YYYY-MM-DD
  variety: string;
  status: string; // Certification status
  unit_price_riel: number; // KHR / Kg
  quantity_kg: number;
  number_of_sacks?: number;
  total_amount_riel: number; // Gross payout before seed deductions
  total_payment_riel: number; // Net payout received by farmer
  borrowed_seed_kg?: number;
  returned_seed_kg?: number;
}

export interface FactThreshing {
  threshing_id: number;
  farmer_uid: string;
  data_year: number;
  threshing_date?: string;
  planting_method?: string;
  rice_type?: string;
  threshing_method: 'Machine' | 'Hand' | 'Unknown' | string;
  actual_total_rice_production_kg: number;
  paddy_prepare_for_sell_kg: number;
  paddy_keep_for_consumption_kg: number;
  paddy_keep_for_seeds_kg: number;
}

export interface FactQualitySpec {
  spec_id: number;
  farmer_uid: string;
  data_year: number;
  moisture?: number; // % moisture content (typically 11% - 15%)
  color?: string; // e.g. Good, Medium, Slightly Dull
  rice_impurity?: number; // % foreign matter
  rice_husk?: number; // % husk
  good_grain_pct?: number; // % premium grain
  broken_grain_pct?: number; // % broken grain
  grade: 'A1' | 'A' | 'A2' | 'B1' | 'B2' | 'B' | string;
  variety?: string;
  status?: string;
  price_riel?: number; // KHR / Kg offered
}

export interface FactFarmerAnnualSurvey {
  survey_id: number;
  farmer_uid: string;
  data_year: number;
  age?: number;
  education?: string;
  household_member?: number;
  women?: number;
  total_income_riel?: number;
  spend_riel?: number;
  homestead?: boolean;
  cattle?: number;
  buffalo?: number;
}

// ── 3. Frontend Dashboard Compiled Data Structures ─────────────────────────

export interface YearlyTrendRecord {
  year: string;
  unique_farmers: number;
  new: number;
  existing: number;
  rejoin: number;
  total_inspections: number;
  compliant_count: number;
  compliance_rate: number; // e.g. 100.0%
  total_area_ha: number;
  planted_area_ha: number;
  fallow_area_ha: number;
  other_area_ha: number;
  prod_kg: number;
  sell_kg: number;
  consume_kg: number;
  seed_kg: number;
  avg_yield_kg_ha: number;
  thr_machine: number;
  thr_hand: number;
  thr_unknown: number;
  purch_kg: number;
  purch_riel: number;
  purch_amount_riel: number;
  purch_n: number;
  avg_price_riel_kg: number;
  cert: Record<string, number>;
  land_sit: Record<string, number>;
  land_own: Record<string, number>;
  irrigation: Record<string, number>;
}

export interface SiteYearRecord {
  unique_farmers: number;
  new: number;
  existing: number;
  rejoin: number;
  compliance_rate: number;
  compliant_count: number;
  inspection_count: number;
  total_area_ha: number;
  planted_area_ha: number;
  fallow_area_ha: number;
  other_area_ha: number;
  prod_kg: number;
  sell_kg: number;
  consume_kg: number;
  seed_kg: number;
  thr_machine: number;
  thr_hand: number;
  thr_unknown: number;
  purch_kg: number;
  purch_riel: number;
  purch_amount_riel: number;
  avg_yield_kg_ha: number;
  cert: Record<string, number>;
  land_sit: Record<string, number>;
  land_own: Record<string, number>;
  irrigation: Record<string, number>;
}

export interface VillageStatRecord {
  village: string;
  site: string;
  total_farmers: number;
  prod_kg: number;
  area_ha: number;
  planted_area_ha?: number;
  avg_yield_kg_ha: number;
  purch_kg: number;
  purch_riel: number;
  purch_amount_riel?: number;
  years_active?: string[];
}

export interface VillageYearData {
  farmers: number;
  prod_kg: number;
  area_ha: number;
  avg_yield_kg_ha: number;
  purch_kg: number;
  purch_riel: number;
}

export interface QualityRecord {
  grades: Record<string, number>;
  colors: Record<string, number>;
  cert: Record<string, number>;
  avg_moisture: number | null;
  avg_good_grain: number | null;
  avg_broken_grain: number | null;
  avg_impurity: number | null;
  avg_husk: number | null;
  avg_price_by_grade: Record<string, number>;
  total_records: number;
}

export interface FarmerYearlyHistory {
  cert: string;
  area_ha: number;
  planted_ha: number;
  compliant: boolean;
  prod_kg: number;
  purch_riel: number;
}

export interface FarmerProfileRecord {
  uid: string;
  family_id: string;
  site: string;
  village: string;
  gender: string;
  first_year: string;
  last_year: string;
  active: 'Yes' | 'No';
  insp_total: number;
  compliance: number | null;
  area_ha: number;
  planted_area_ha: number;
  fallow_area_ha: number;
  other_area_ha: number;
  prod_kg: number;
  purch_riel: number;
  purch_kg: number;
  avg_yield: number | null;
  varieties: string[];
  certs: string[];
  latest_cert: string;
  years: string[];
  years_count: number;
  quality_n: number;
  history: Record<string, FarmerYearlyHistory>;
}

export interface SiteSummaryRecord {
  site_id: string;
  site_name: string;
  lat: number;
  lng: number;
  total_farmers: number;
  total_villages: number;
  prod_kg: number;
  purch_riel: number;
  purch_amount_riel: number;
  area_ha: number;
  planted_area_ha: number;
  fallow_area_ha: number;
  other_area_ha: number;
  avg_yield: number;
  compliance_rate: number;
}

export interface DashboardState {
  currentTab: 'overview' | 'farmers' | 'production' | 'market' | 'quality' | 'geography' | 'land' | 'records';
  years: Set<string>;
  sites: Set<string>;
  certs: Set<string>;
}

export interface DashboardData {
  meta: {
    generated_at: string;
    years: string[];
    latest_year: string;
    record_counts: Record<string, number>;
  };
  overall_kpis: Record<string, number>;
  yearly_trend: YearlyTrendRecord[];
  site_year: Record<string, Record<string, SiteYearRecord>>;
  village_stats: VillageStatRecord[];
  village_by_year: Record<string, Record<string, VillageYearData>>;
  quality_by_year: Record<string, QualityRecord>;
  quality_by_site_year: Record<string, Record<string, QualityRecord>>;
  farmer_cohort: Record<string, Record<string, number>>;
  variety_year: Record<string, Record<string, { kg: number; riel: number; n: number; avg_price: number }>>;
  variety_site_year: Record<string, Record<string, Record<string, { kg: number; riel: number; n: number; avg_price: number }>>>;
  farmer_records: FarmerProfileRecord[];
  site_summary: Record<string, SiteSummaryRecord>;
  dimensions: {
    sites: DimSite[];
    villages: DimVillage[];
    varieties: DimCropVariety[];
    irpgs: DimIrpg[];
  };
}
