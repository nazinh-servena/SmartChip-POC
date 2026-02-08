import { z } from "zod";
import type { ComputeChipsRequest, StoreConfig } from "@smartchip/types";

const MerchantStoreSchema = z.object({
  integration_type: z.enum(["shopify", "courier_api", "manual"]).optional(),
  support_phone: z.string().optional(),
});

const BudgetSettingsSchema = z.object({
  enabled: z.boolean(),
  variance_threshold: z.number().positive(),
});

const FacetSettingsSchema = z.object({
  enabled: z.boolean(),
  facet_share_threshold: z.number().min(0).max(1),
});

const SortSettingsSchema = z.object({
  enabled: z.boolean(),
  rating_coverage_threshold: z.number().min(0).max(1),
});

const OrderSettingsSchema = z.object({
  enabled: z.boolean(),
});

const CartSettingsSchema = z.object({
  enabled: z.boolean(),
  enable_cod: z.boolean().optional(),
  free_shipping_threshold: z.number().min(0).optional(),
});

const PolicySettingsSchema = z.object({
  enabled: z.boolean(),
  policy_links: z.record(z.string()).optional(),
  refund_window: z.string().optional(),
});

const MerchantConfigV1Schema = z.object({
  config_version: z.literal(1),
  modules: z.object({
    budget: BudgetSettingsSchema,
    facet: FacetSettingsSchema,
    sort: SortSettingsSchema,
    order: OrderSettingsSchema,
    cart: CartSettingsSchema,
    policy: PolicySettingsSchema,
  }),
  store: MerchantStoreSchema.optional(),
});

export type MerchantConfigV1 = z.infer<typeof MerchantConfigV1Schema>;

const MERCHANT_CONFIGS: Record<string, MerchantConfigV1> = {
  "demo-electronics": {
    config_version: 1,
    modules: {
      budget: { enabled: true, variance_threshold: 2.0 },
      facet: { enabled: true, facet_share_threshold: 0.2 },
      sort: { enabled: true, rating_coverage_threshold: 0.5 },
      order: { enabled: true },
      cart: { enabled: true, enable_cod: true, free_shipping_threshold: 50 },
      policy: {
        enabled: true,
        refund_window: "30 days",
        policy_links: {
          returns: "https://store.example.com/policies/returns",
          shipping: "https://store.example.com/policies/shipping",
          warranty: "https://store.example.com/policies/warranty",
        },
      },
    },
    store: {
      integration_type: "shopify",
      support_phone: "+1-800-555-0199",
    },
  },
  "demo-dollar-store": {
    config_version: 1,
    modules: {
      budget: { enabled: false, variance_threshold: 2.0 },
      facet: { enabled: true, facet_share_threshold: 0.3 },
      sort: { enabled: false, rating_coverage_threshold: 0.6 },
      order: { enabled: true },
      cart: { enabled: true, enable_cod: false, free_shipping_threshold: 20 },
      policy: { enabled: true },
    },
    store: {
      integration_type: "manual",
    },
  },
};

function mergeStoreConfig(base?: StoreConfig, override?: StoreConfig): StoreConfig | undefined {
  if (!base && !override) {
    return undefined;
  }
  return {
    ...base,
    ...override,
    policy_links: {
      ...(base?.policy_links ?? {}),
      ...(override?.policy_links ?? {}),
    },
  };
}

export type EngineConfig = ComputeChipsRequest["config"];

const EngineConfigOverrideSchema = z
  .object({
    modules: z
      .object({
        budget: z.boolean().optional(),
        facet: z.boolean().optional(),
        sort: z.boolean().optional(),
        order: z.boolean().optional(),
        cart: z.boolean().optional(),
        policy: z.boolean().optional(),
      })
      .optional(),
    thresholds: z
      .object({
        variance: z.number().positive().optional(),
        facet_threshold: z.number().min(0).max(1).optional(),
        rating_threshold: z.number().min(0).max(1).optional(),
      })
      .optional(),
    store: z
      .object({
        integration_type: z.enum(["shopify", "courier_api", "manual"]).optional(),
        support_phone: z.string().optional(),
        enable_cod: z.boolean().optional(),
        free_shipping_threshold: z.number().optional(),
        policy_links: z.record(z.string()).optional(),
        refund_window: z.string().optional(),
      })
      .optional(),
  })
  .strict();

export type EngineConfigOverride = z.infer<typeof EngineConfigOverrideSchema>;

export function resolveMerchantConfig(merchantId: string): MerchantConfigV1 | undefined {
  return MERCHANT_CONFIGS[merchantId];
}

export function toEngineConfig(config: MerchantConfigV1): EngineConfig {
  return {
    config_version: config.config_version,
    modules: {
      budget: config.modules.budget.enabled,
      facet: config.modules.facet.enabled,
      sort: config.modules.sort.enabled,
      order: config.modules.order.enabled,
      cart: config.modules.cart.enabled,
      policy: config.modules.policy.enabled,
    },
    thresholds: {
      variance: config.modules.budget.variance_threshold,
      facet_threshold: config.modules.facet.facet_share_threshold,
      rating_threshold: config.modules.sort.rating_coverage_threshold,
    },
    store: mergeStoreConfig(config.store, {
      enable_cod: config.modules.cart.enable_cod,
      free_shipping_threshold: config.modules.cart.free_shipping_threshold,
      policy_links: config.modules.policy.policy_links,
      refund_window: config.modules.policy.refund_window,
    }),
  };
}

export function applyEngineConfigOverride(
  base: EngineConfig,
  overrideInput: unknown,
): { ok: true; config: EngineConfig } | { ok: false; error: string } {
  if (overrideInput == null) {
    return { ok: true, config: base };
  }

  const parsed = EngineConfigOverrideSchema.safeParse(overrideInput);
  if (!parsed.success) {
    const error = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    return { ok: false, error: `config_overrides invalid: ${error}` };
  }

  const override = parsed.data;

  return {
    ok: true,
    config: {
      ...base,
      modules: { ...base.modules, ...override.modules },
      thresholds: { ...base.thresholds, ...override.thresholds },
      store: mergeStoreConfig(base.store, override.store),
    },
  };
}

export function validateMerchantConfig(config: unknown): { ok: true } | { ok: false; error: string } {
  const parsed = MerchantConfigV1Schema.safeParse(config);
  if (parsed.success) {
    return { ok: true };
  }
  const error = parsed.error.issues
    .map((i) => `${i.path.join(".")}: ${i.message}`)
    .join("; ");
  return { ok: false, error };
}
