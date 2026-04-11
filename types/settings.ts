// types/settings.ts - All settings-related types in one place

export interface Setting {
  id?: string;
  key: string;
  value: string;
  default_value: string;
  data_type:
    | "string"
    | "number"
    | "boolean"
    | "json"
    | "email"
    | "url"
    | "color";
  category: string;
  subcategory?: string;
  display_name: string;
  description: string;
  validation_rules?: ValidationRules;
  access_level: "public" | "protected" | "sensitive";
  cache_strategy: "static" | "dynamic" | "realtime";
  cache_ttl_seconds: number;
  is_encrypted: boolean;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
}

export interface ValidationRules {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  step?: number;
  enum?: string[];
  regex?: string;
  required?: boolean;
}

export interface SettingCategory {
  category: string;
  subcategories: string[];
}

export interface SettingAuditLog {
  id: string;
  setting_key: string;
  old_value: string;
  new_value: string;
  changed_by: string;
  changed_at: string;
  change_reason?: string;
  ip_address?: string;
  user_agent?: string;
}

// Type-safe settings values
export interface AppSettings {
  // Platform
  platform_name: string;
  platform_tagline: string;
  platform_description: string;
  support_email: string;

  // Financial
  default_currency: string;
  minimum_pledge_amount: number;
  maximum_pledge_amount: number;
  platform_fee_percentage: number;
  payment_processing_fee: number;
  monthly_operational_costs: number;

  // Community
  max_projects_per_user: number;
  user_verification_required: boolean;
  min_pledge_amount_to_vote: number;
  voting_eligibility_criteria: string;

  // Display
  featured_projects_limit: number;
  projects_per_page: number;
  enable_dark_mode: boolean;
  show_funding_progress: boolean;
  marquee_featured_items: any[];

  // Metrics
  metrics_data_source: string;
  manual_active_villagers: number;
  manual_monthly_contributions: number;
  manual_cash_on_hand: number;
  manual_cash_deployed: number;

  // Social Proof
  trustpilot_enabled: boolean;
  trustpilot_review_count: number;
  trustpilot_rating: number;

  // Technical
  session_timeout_minutes: number;
  api_rate_limit_per_minute: number;
  enable_maintenance_mode: boolean;
  maintenance_end_time: string;
  maintenance_reason: string;
}

// Setting keys as const for type safety
export const SETTING_KEYS = {
  // Platform
  PLATFORM_NAME: "platform_name",
  PLATFORM_TAGLINE: "platform_tagline",
  PLATFORM_DESCRIPTION: "platform_description",
  SUPPORT_EMAIL: "support_email",

  // Financial
  DEFAULT_CURRENCY: "default_currency",
  MINIMUM_PLEDGE_AMOUNT: "minimum_pledge_amount",
  MAXIMUM_PLEDGE_AMOUNT: "maximum_pledge_amount",
  PLATFORM_FEE_PERCENTAGE: "platform_fee_percentage",
  PAYMENT_PROCESSING_FEE: "payment_processing_fee",
  MONTHLY_OPERATIONAL_COSTS: "monthly_operational_costs",

  // Community
  MAX_PROJECTS_PER_USER: "max_projects_per_user",
  USER_VERIFICATION_REQUIRED: "user_verification_required",
  MIN_PLEDGE_AMOUNT_TO_VOTE: "min_pledge_amount_to_vote",
  VOTING_ELIGIBILITY_CRITERIA: "voting_eligibility_criteria",

  // Display
  FEATURED_PROJECTS_LIMIT: "featured_projects_limit",
  PROJECTS_PER_PAGE: "projects_per_page",
  ENABLE_DARK_MODE: "enable_dark_mode",
  SHOW_FUNDING_PROGRESS: "show_funding_progress",
  MARQUEE_FEATURED_ITEMS: "marquee_featured_items",

  // Metrics
  METRICS_DATA_SOURCE: "metrics_data_source",
  MANUAL_ACTIVE_VILLAGERS: "manual_active_villagers",
  MANUAL_MONTHLY_CONTRIBUTIONS: "manual_monthly_contributions",
  MANUAL_CASH_ON_HAND: "manual_cash_on_hand",
  MANUAL_CASH_DEPLOYED: "manual_cash_deployed",

  // Social Proof
  TRUSTPILOT_ENABLED: "trustpilot_enabled",
  TRUSTPILOT_REVIEW_COUNT: "trustpilot_review_count",
  TRUSTPILOT_RATING: "trustpilot_rating",

  // Technical
  SESSION_TIMEOUT_MINUTES: "session_timeout_minutes",
  API_RATE_LIMIT_PER_MINUTE: "api_rate_limit_per_minute",
  ENABLE_MAINTENANCE_MODE: "enable_maintenance_mode",
  MAINTENANCE_END_TIME: "maintenance_end_time",
  MAINTENANCE_REASON:"maintenance_reason"
} as const;

export type SettingKey = keyof AppSettings;

// Default values
export const DEFAULT_SETTINGS: AppSettings = {
  platform_name: "MORRIS MONYE",
  platform_tagline: "Diasporans funding sustainable development across Africa.",
  platform_description:
    "Empowering African communities through diaspora-driven sustainable development funding.",
  support_email: "support@seei.org",
  default_currency: "NGN",
  minimum_pledge_amount: 5.0,
  maximum_pledge_amount: 10000.0,
  platform_fee_percentage: 5.0,
  payment_processing_fee: 2.9,
  monthly_operational_costs: 12102.0,
  max_projects_per_user: 3,
  user_verification_required: false,
  min_pledge_amount_to_vote: 10.0,
  voting_eligibility_criteria: "last_3_months",
  featured_projects_limit: 3,
  projects_per_page: 12,
  enable_dark_mode: true,
  show_funding_progress: true,
  marquee_featured_items: [],
  metrics_data_source: "calculated",
  manual_active_villagers: 2006,
  manual_monthly_contributions: 23590.0,
  manual_cash_on_hand: 7351.0,
  manual_cash_deployed: 221803.0,
  trustpilot_enabled: true,
  trustpilot_review_count: 71,
  trustpilot_rating: 4.5,
  session_timeout_minutes: 1440,
  api_rate_limit_per_minute: 100,
  enable_maintenance_mode: false,
  maintenance_end_time: '',
  maintenance_reason: ''
};

// Cache interface
export interface CachedSetting {
  value: any;
  cachedAt: number;
  ttl: number;
}

// API Response types
export interface SettingsApiResponse {
  success: boolean;
  message?: string;
  data?: Setting[];
  error?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}
