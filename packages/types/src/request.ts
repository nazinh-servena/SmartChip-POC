import type { Channel } from "./channels.js";

// ─── Product Discovery (existing) ───────────────────────────────

export interface FacetValue {
  value: string;
  share: number; // 0.0 to 1.0
}

export interface FacetData {
  name: string;
  values: FacetValue[];
}

export interface SearchStats {
  price_min: number;
  price_max: number;
  price_median: number;
  rating_coverage: number; // 0.0 to 1.0
  facets: FacetData[];
}

// ─── Intent-Specific Context (dynamic input per request) ────────

export interface OrderContext {
  auth_state: "known" | "unknown";
  recent_orders: Array<{
    id: string;
    status: "processing" | "shipped" | "delivered" | "returned";
  }>;
}

export interface CartContext {
  cart_count: number;
  cart_value: number;
  currency: string;
  payment_methods: string[];
}

export interface PolicyContext {
  policy_type: "returns" | "shipping" | "warranty" | "general";
  current_product?: string;
}

export type IntentContext = OrderContext | CartContext | PolicyContext;

// ─── Store Config (static, configured per store — no code change) ─

export interface StoreConfig {
  // Order tracking
  integration_type?: "shopify" | "courier_api" | "manual";
  support_phone?: string;
  // Cart / checkout
  enable_cod?: boolean;
  free_shipping_threshold?: number;
  // Policies
  policy_links?: Record<string, string>;
  refund_window?: string;
}

// ─── Module Toggles ─────────────────────────────────────────────

export interface ModuleConfig {
  // Product Discovery modules
  budget: boolean;
  facet: boolean;
  sort: boolean;
  // Intent-specific modules
  order: boolean;
  cart: boolean;
  policy: boolean;
}

export interface ThresholdConfig {
  variance: number;         // e.g. 2.0 — max/min ratio trigger
  facet_threshold: number;  // e.g. 0.2 — 20% share minimum
  rating_threshold: number; // e.g. 0.5 — 50% coverage minimum
}

// ─── The Request ────────────────────────────────────────────────

export interface ComputeChipsRequest {
  intent: string;
  channel: Channel;
  stats: SearchStats;
  context?: IntentContext;
  config: {
    config_version?: number;
    modules: ModuleConfig;
    thresholds: ThresholdConfig;
    store?: StoreConfig;
  };
}
