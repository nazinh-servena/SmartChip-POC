import type {
  SearchStats,
  ComputeChipsRequest,
  OrderContext,
  CartContext,
  PolicyContext,
} from "./request.js";

// ─── Product Discovery Presets (SearchStats only — backward compat) ─

const EMPTY_STATS: SearchStats = {
  price_min: 0,
  price_max: 0,
  price_median: 0,
  rating_coverage: 0,
  facets: [],
};

export const PRESET_MIXED_BAG: SearchStats = {
  price_min: 25,
  price_max: 1200,
  price_median: 450,
  rating_coverage: 0.72,
  facets: [
    {
      name: "gender",
      values: [
        { value: "Men's", share: 0.45 },
        { value: "Women's", share: 0.40 },
        { value: "Unisex", share: 0.15 },
      ],
    },
    {
      name: "brand",
      values: [
        { value: "Nike", share: 0.35 },
        { value: "Adidas", share: 0.30 },
        { value: "Puma", share: 0.20 },
        { value: "Other", share: 0.15 },
      ],
    },
  ],
};

export const PRESET_CHEAP_SIMPLE: SearchStats = {
  price_min: 10,
  price_max: 18,
  price_median: 14,
  rating_coverage: 0.6,
  facets: [
    {
      name: "color",
      values: [
        { value: "Black", share: 0.8 },
        { value: "White", share: 0.12 },
        { value: "Other", share: 0.08 },
      ],
    },
  ],
};

export const PRESET_NO_RATINGS: SearchStats = {
  price_min: 50,
  price_max: 3000,
  price_median: 800,
  rating_coverage: 0.05,
  facets: [
    {
      name: "category",
      values: [
        { value: "Laptops", share: 0.4 },
        { value: "Tablets", share: 0.35 },
        { value: "Accessories", share: 0.25 },
      ],
    },
  ],
};

// ─── Track Order Presets (full request) ──────────────────────────
// INPUT (dynamic):  auth_state, recent_orders
// CONFIGURED (static): integration_type, support_phone

export const PRESET_TRACK_ORDER_KNOWN: ComputeChipsRequest = {
  intent: "track_order",
  channel: "whatsapp",
  stats: EMPTY_STATS,
  context: {
    auth_state: "known",
    recent_orders: [
      { id: "1001", status: "shipped" },
      { id: "1002", status: "processing" },
    ],
  } satisfies OrderContext,
  config: {
    modules: { budget: false, facet: false, sort: false, order: true, cart: false, policy: false },
    thresholds: { variance: 2.0, facet_threshold: 0.2, rating_threshold: 0.5 },
    store: {
      integration_type: "shopify",
      support_phone: "+1-800-555-0199",
    },
  },
};

export const PRESET_TRACK_ORDER_UNKNOWN: ComputeChipsRequest = {
  intent: "track_order",
  channel: "whatsapp",
  stats: EMPTY_STATS,
  context: {
    auth_state: "unknown",
    recent_orders: [],
  } satisfies OrderContext,
  config: {
    modules: { budget: false, facet: false, sort: false, order: true, cart: false, policy: false },
    thresholds: { variance: 2.0, facet_threshold: 0.2, rating_threshold: 0.5 },
    store: {
      integration_type: "shopify",
      support_phone: "+1-800-555-0199",
    },
  },
};

// ─── Checkout Help Presets (full request) ─────────────────────────
// INPUT (dynamic):  cart_count, cart_value, payment_methods
// CONFIGURED (static): enable_cod, free_shipping_threshold

export const PRESET_CHECKOUT_WITH_CART: ComputeChipsRequest = {
  intent: "checkout_help",
  channel: "web",
  stats: EMPTY_STATS,
  context: {
    cart_count: 3,
    cart_value: 45.0,
    currency: "USD",
    payment_methods: ["stripe", "cod"],
  } satisfies CartContext,
  config: {
    modules: { budget: false, facet: false, sort: false, order: false, cart: true, policy: false },
    thresholds: { variance: 2.0, facet_threshold: 0.2, rating_threshold: 0.5 },
    store: {
      enable_cod: true,
      free_shipping_threshold: 50,
    },
  },
};

export const PRESET_CHECKOUT_EMPTY: ComputeChipsRequest = {
  intent: "checkout_help",
  channel: "web",
  stats: EMPTY_STATS,
  context: {
    cart_count: 0,
    cart_value: 0,
    currency: "USD",
    payment_methods: ["stripe"],
  } satisfies CartContext,
  config: {
    modules: { budget: false, facet: false, sort: false, order: false, cart: true, policy: false },
    thresholds: { variance: 2.0, facet_threshold: 0.2, rating_threshold: 0.5 },
    store: {
      enable_cod: false,
      free_shipping_threshold: 50,
    },
  },
};

// ─── Check Policy Presets (full request) ──────────────────────────
// INPUT (dynamic):  policy_type, current_product
// CONFIGURED (static): policy_links, refund_window

export const PRESET_POLICY_RETURNS: ComputeChipsRequest = {
  intent: "check_policy",
  channel: "web",
  stats: EMPTY_STATS,
  context: {
    policy_type: "returns",
    current_product: "Nike Air Max 90",
  } satisfies PolicyContext,
  config: {
    modules: { budget: false, facet: false, sort: false, order: false, cart: false, policy: true },
    thresholds: { variance: 2.0, facet_threshold: 0.2, rating_threshold: 0.5 },
    store: {
      policy_links: {
        returns: "https://store.example.com/policies/returns",
        shipping: "https://store.example.com/policies/shipping",
      },
      refund_window: "30 days",
    },
  },
};

export const PRESET_POLICY_SHIPPING: ComputeChipsRequest = {
  intent: "check_policy",
  channel: "whatsapp",
  stats: EMPTY_STATS,
  context: {
    policy_type: "shipping",
  } satisfies PolicyContext,
  config: {
    modules: { budget: false, facet: false, sort: false, order: false, cart: false, policy: true },
    thresholds: { variance: 2.0, facet_threshold: 0.2, rating_threshold: 0.5 },
    store: {
      policy_links: {
        shipping: "https://store.example.com/policies/shipping",
      },
      refund_window: "30 days",
    },
  },
};
