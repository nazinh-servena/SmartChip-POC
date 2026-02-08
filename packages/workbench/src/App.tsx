import { useState, useEffect } from "react";
import type {
  Channel,
  ComputeChipsRequest,
  ComputeChipsResponse,
} from "@smartchip/types";
import {
  PRESET_MIXED_BAG,
  PRESET_TRACK_ORDER_KNOWN,
  PRESET_TRACK_ORDER_UNKNOWN,
  PRESET_CHECKOUT_WITH_CART,
  PRESET_CHECKOUT_EMPTY,
  PRESET_POLICY_RETURNS,
  PRESET_POLICY_SHIPPING,
  PRESET_CHEAP_SIMPLE,
  PRESET_NO_RATINGS,
} from "@smartchip/types";
import { useEngine } from "./hooks/useEngine.js";
import { IntentPicker } from "./components/IntentPicker.js";
import { Configurator } from "./components/Configurator.js";
import { ScenarioBuilder } from "./components/ScenarioBuilder.js";
import { ChatSimulator } from "./components/ChatSimulator.js";

// ─── Intent definitions with their scenario presets ─────────────

export type IntentId = "product_discovery" | "track_order" | "checkout_help" | "check_policy";

export interface ScenarioPreset {
  name: string;
  description: string;
  request: ComputeChipsRequest;
}

export interface IntentDef {
  id: IntentId;
  label: string;
  description: string;
  module: string;
  presets: ScenarioPreset[];
}

const DISCOVERY_BASE_CONFIG = {
  modules: { budget: true, facet: true, sort: true, order: false, cart: false, policy: false } as const,
  thresholds: { variance: 2.0, facet_threshold: 0.2, rating_threshold: 0.5 },
};

export const INTENTS: IntentDef[] = [
  {
    id: "product_discovery",
    label: "Product Discovery",
    description: "Search → Chips → Refine loop",
    module: "BudgetModule + FacetModule + SortModule",
    presets: [
      {
        name: "Mixed Bag",
        description: "High price spread, mixed genders, good ratings",
        request: {
          intent: "product_discovery",
          channel: "web",
          stats: PRESET_MIXED_BAG,
          config: DISCOVERY_BASE_CONFIG,
        },
      },
      {
        name: "Cheap & Simple",
        description: "Low price spread — Budget module won't fire",
        request: {
          intent: "product_discovery",
          channel: "web",
          stats: PRESET_CHEAP_SIMPLE,
          config: DISCOVERY_BASE_CONFIG,
        },
      },
      {
        name: "No Ratings",
        description: "No rating data — Sort module won't fire",
        request: {
          intent: "product_discovery",
          channel: "web",
          stats: PRESET_NO_RATINGS,
          config: DISCOVERY_BASE_CONFIG,
        },
      },
    ],
  },
  {
    id: "track_order",
    label: "Track Order",
    description: "Post-purchase support",
    module: "OrderModule",
    presets: [
      {
        name: "Known User + Orders",
        description: "Phone matched, 2 active orders (1 shipped, 1 processing)",
        request: PRESET_TRACK_ORDER_KNOWN,
      },
      {
        name: "Unknown User",
        description: "Unidentified — must login or enter order ID",
        request: PRESET_TRACK_ORDER_UNKNOWN,
      },
      {
        name: "Delivered Order",
        description: "Known user, order already delivered",
        request: {
          intent: "track_order",
          channel: "whatsapp",
          stats: { price_min: 0, price_max: 0, price_median: 0, rating_coverage: 0, facets: [] },
          context: {
            auth_state: "known" as const,
            recent_orders: [{ id: "888", status: "delivered" as const }],
          },
          config: {
            modules: { budget: false, facet: false, sort: false, order: true, cart: false, policy: false },
            thresholds: { variance: 2.0, facet_threshold: 0.2, rating_threshold: 0.5 },
            store: { support_phone: "+1-800-555-0199" },
          },
        },
      },
    ],
  },
  {
    id: "checkout_help",
    label: "Checkout Help",
    description: "Cart abandonment / closing",
    module: "CartModule",
    presets: [
      {
        name: "Cart with Items",
        description: "$45 cart, $50 free shipping threshold, COD enabled",
        request: PRESET_CHECKOUT_WITH_CART,
      },
      {
        name: "Empty Cart",
        description: "Nothing in cart — push to browse",
        request: PRESET_CHECKOUT_EMPTY,
      },
      {
        name: "Above Free Ship",
        description: "$75 cart exceeds $50 threshold — no upsell",
        request: {
          intent: "checkout_help",
          channel: "web",
          stats: { price_min: 0, price_max: 0, price_median: 0, rating_coverage: 0, facets: [] },
          context: {
            cart_count: 5,
            cart_value: 75.0,
            currency: "USD",
            payment_methods: ["stripe", "cod"],
          },
          config: {
            modules: { budget: false, facet: false, sort: false, order: false, cart: true, policy: false },
            thresholds: { variance: 2.0, facet_threshold: 0.2, rating_threshold: 0.5 },
            store: { enable_cod: true, free_shipping_threshold: 50 },
          },
        },
      },
    ],
  },
  {
    id: "check_policy",
    label: "Check Policy",
    description: "Info request + shopping pivot",
    module: "PolicyModule",
    presets: [
      {
        name: "Returns Policy",
        description: "User viewing Nike Air Max asks about returns",
        request: PRESET_POLICY_RETURNS,
      },
      {
        name: "Shipping Policy",
        description: '"Do you ship to Canada?"',
        request: PRESET_POLICY_SHIPPING,
      },
      {
        name: "Warranty Check",
        description: "User asks about warranty on a specific product",
        request: {
          intent: "check_policy",
          channel: "web",
          stats: { price_min: 0, price_max: 0, price_median: 0, rating_coverage: 0, facets: [] },
          context: {
            policy_type: "warranty" as const,
            current_product: "MacBook Pro 16\"",
          },
          config: {
            modules: { budget: false, facet: false, sort: false, order: false, cart: false, policy: true },
            thresholds: { variance: 2.0, facet_threshold: 0.2, rating_threshold: 0.5 },
            store: {
              policy_links: { warranty: "https://store.example.com/warranty" },
              refund_window: "1 year",
            },
          },
        },
      },
    ],
  },
];

// ─── Bot messages per intent ────────────────────────────────────

const BOT_MESSAGES: Record<IntentId, { withChips: string; noChips: string }> = {
  product_discovery: {
    withChips: "I found some results! You can narrow your search:",
    noChips: "Here are your results. The search was already specific enough!",
  },
  track_order: {
    withChips: "I can help with your order. Here are your options:",
    noChips: "I couldn't find any order info. Please try again.",
  },
  checkout_help: {
    withChips: "Let me help you check out:",
    noChips: "Looks like there's nothing in your cart yet.",
  },
  check_policy: {
    withChips: "Here's what I found about our policy:",
    noChips: "I couldn't find that specific policy. Let me connect you with support.",
  },
};

export function App() {
  const [selectedIntent, setSelectedIntent] = useState<IntentId>("product_discovery");
  const [request, setRequest] = useState<ComputeChipsRequest>(INTENTS[0].presets[0].request);
  const [result, setResult] = useState<ComputeChipsResponse | null>(null);

  const { execute } = useEngine();
  const intentDef = INTENTS.find((i) => i.id === selectedIntent)!;

  // Auto-run engine whenever request changes
  useEffect(() => {
    const response = execute(request);
    setResult(response);
  }, [request, execute]);

  function handleIntentChange(id: IntentId) {
    setSelectedIntent(id);
    const intent = INTENTS.find((i) => i.id === id)!;
    setRequest(intent.presets[0].request);
  }

  function handlePresetSelect(preset: ScenarioPreset) {
    setRequest(preset.request);
  }

  function handleChannelChange(channel: Channel) {
    setRequest((prev) => ({ ...prev, channel }));
  }

  function handleRequestChange(req: ComputeChipsRequest) {
    setRequest(req);
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-100">Smart Chips Workbench</h1>
          <p className="text-sm text-slate-500 mt-1">
            Pick an intent, configure it, and see which chips the engine generates
          </p>
        </div>

        {/* Intent Picker */}
        <IntentPicker
          intents={INTENTS}
          selected={selectedIntent}
          onSelect={handleIntentChange}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-5">
          <Configurator
            request={request}
            onChannelChange={handleChannelChange}
            onRequestChange={handleRequestChange}
          />
          <ScenarioBuilder
            intentDef={intentDef}
            request={request}
            onPresetSelect={handlePresetSelect}
            onRequestChange={handleRequestChange}
          />
          <ChatSimulator
            result={result}
            botMessages={BOT_MESSAGES[selectedIntent]}
          />
        </div>
      </div>
    </div>
  );
}
