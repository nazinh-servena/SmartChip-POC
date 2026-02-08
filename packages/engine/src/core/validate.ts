import { z } from "zod";

const FacetValueSchema = z.object({
  value: z.string(),
  share: z.number().min(0).max(1),
});

const FacetDataSchema = z.object({
  name: z.string(),
  values: z.array(FacetValueSchema),
});

const SearchStatsSchema = z.object({
  price_min: z.number().min(0),
  price_max: z.number().min(0),
  price_median: z.number().min(0),
  rating_coverage: z.number().min(0).max(1),
  facets: z.array(FacetDataSchema),
});

// Intent-specific context schemas (validated loosely — each module checks its own fields)
const OrderContextSchema = z.object({
  auth_state: z.enum(["known", "unknown"]),
  recent_orders: z.array(
    z.object({
      id: z.string(),
      status: z.enum(["processing", "shipped", "delivered", "returned"]),
    }),
  ),
});

const CartContextSchema = z.object({
  cart_count: z.number().min(0),
  cart_value: z.number().min(0),
  currency: z.string(),
  payment_methods: z.array(z.string()),
});

const PolicyContextSchema = z.object({
  policy_type: z.enum(["returns", "shipping", "warranty", "general"]),
  current_product: z.string().optional(),
});

const IntentContextSchema = z
  .union([OrderContextSchema, CartContextSchema, PolicyContextSchema])
  .optional();

const StoreConfigSchema = z
  .object({
    integration_type: z.enum(["shopify", "courier_api", "manual"]).optional(),
    support_phone: z.string().optional(),
    enable_cod: z.boolean().optional(),
    free_shipping_threshold: z.number().optional(),
    policy_links: z.record(z.string()).optional(),
    refund_window: z.string().optional(),
  })
  .optional();

const ComputeChipsRequestSchema = z.object({
  intent: z.string(),
  channel: z.enum(["web", "whatsapp"]),
  stats: SearchStatsSchema,
  context: IntentContextSchema,
  config: z.object({
    config_version: z.number().int().positive().optional(),
    modules: z.object({
      budget: z.boolean(),
      facet: z.boolean(),
      sort: z.boolean(),
      order: z.boolean(),
      cart: z.boolean(),
      policy: z.boolean(),
    }),
    thresholds: z.object({
      variance: z.number().positive(),
      facet_threshold: z.number().min(0).max(1),
      rating_threshold: z.number().min(0).max(1),
    }),
    store: StoreConfigSchema,
  }),
});

export type ValidationResult =
  | { ok: true }
  | { ok: false; error: string };

export function validateRequest(input: unknown): ValidationResult {
  const result = ComputeChipsRequestSchema.safeParse(input);
  if (result.success) {
    return { ok: true };
  }
  const messages = result.error.issues
    .map((i) => `${i.path.join(".")}: ${i.message}`)
    .join("; ");
  return { ok: false, error: messages };
}
