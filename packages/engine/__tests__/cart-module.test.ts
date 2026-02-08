import { describe, it, expect } from "vitest";
import { CartModule } from "../src/modules/cart-module.js";
import type { ComputeChipsRequest, CartContext } from "@smartchip/types";

function makeRequest(
  context: CartContext,
  store: ComputeChipsRequest["config"]["store"] = {},
): ComputeChipsRequest {
  return {
    intent: "checkout_help",
    channel: "web",
    stats: { price_min: 0, price_max: 0, price_median: 0, rating_coverage: 0, facets: [] },
    context,
    config: {
      modules: { budget: false, facet: false, sort: false, order: false, cart: true, policy: false },
      thresholds: { variance: 2.0, facet_threshold: 0.2, rating_threshold: 0.5 },
      store,
    },
  };
}

describe("CartModule", () => {
  it("offers Browse + Deals when cart is empty", () => {
    const result = CartModule.execute(
      makeRequest({ cart_count: 0, cart_value: 0, currency: "USD", payment_methods: ["stripe"] }),
    );
    expect(result.trace.fired).toBe(true);
    expect(result.chips.map((c) => c.label)).toContain("Browse Products");
    expect(result.chips.map((c) => c.label)).toContain("View Deals");
  });

  it("offers Checkout with value when cart has items", () => {
    const result = CartModule.execute(
      makeRequest(
        { cart_count: 3, cart_value: 45.0, currency: "USD", payment_methods: ["stripe"] },
        { free_shipping_threshold: 50 },
      ),
    );
    expect(result.trace.fired).toBe(true);
    const checkoutChip = result.chips.find((c) => c.action === "checkout:proceed");
    expect(checkoutChip).toBeDefined();
    expect(checkoutChip!.label).toBe("Checkout ($45.00)");
  });

  it("generates free shipping upsell chip when below threshold", () => {
    const result = CartModule.execute(
      makeRequest(
        { cart_count: 2, cart_value: 45.0, currency: "USD", payment_methods: ["stripe"] },
        { free_shipping_threshold: 50 },
      ),
    );
    const upsellChip = result.chips.find((c) => c.action.startsWith("navigate:upsell"));
    expect(upsellChip).toBeDefined();
    expect(upsellChip!.label).toBe("Add $5.00 for Free Ship");
  });

  it("does NOT generate upsell when above threshold", () => {
    const result = CartModule.execute(
      makeRequest(
        { cart_count: 5, cart_value: 75.0, currency: "USD", payment_methods: ["stripe"] },
        { free_shipping_threshold: 50 },
      ),
    );
    const upsellChip = result.chips.find((c) => c.action.startsWith("navigate:upsell"));
    expect(upsellChip).toBeUndefined();
  });

  it("offers COD when enabled in store config AND in payment methods", () => {
    const result = CartModule.execute(
      makeRequest(
        { cart_count: 1, cart_value: 30.0, currency: "USD", payment_methods: ["stripe", "cod"] },
        { enable_cod: true },
      ),
    );
    expect(result.chips.map((c) => c.label)).toContain("Pay with Cash (COD)");
  });

  it("omits COD when store config disables it", () => {
    const result = CartModule.execute(
      makeRequest(
        { cart_count: 1, cart_value: 30.0, currency: "USD", payment_methods: ["stripe", "cod"] },
        { enable_cod: false },
      ),
    );
    expect(result.chips.map((c) => c.label)).not.toContain("Pay with Cash (COD)");
  });

  it("always includes View Cart chip when cart has items", () => {
    const result = CartModule.execute(
      makeRequest(
        { cart_count: 2, cart_value: 45.0, currency: "USD", payment_methods: ["stripe"] },
      ),
    );
    expect(result.chips.map((c) => c.label)).toContain("View Cart");
  });

  it("does not fire without context", () => {
    const req: ComputeChipsRequest = {
      intent: "checkout_help",
      channel: "web",
      stats: { price_min: 0, price_max: 0, price_median: 0, rating_coverage: 0, facets: [] },
      config: {
        modules: { budget: false, facet: false, sort: false, order: false, cart: true, policy: false },
        thresholds: { variance: 2.0, facet_threshold: 0.2, rating_threshold: 0.5 },
      },
    };
    const result = CartModule.execute(req);
    expect(result.trace.fired).toBe(false);
  });
});
