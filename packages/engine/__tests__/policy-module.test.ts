import { describe, it, expect } from "vitest";
import { PolicyModule } from "../src/modules/policy-module.js";
import type { ComputeChipsRequest, PolicyContext } from "@smartchip/types";

function makeRequest(
  context: PolicyContext,
  store: ComputeChipsRequest["config"]["store"] = {},
): ComputeChipsRequest {
  return {
    intent: "check_policy",
    channel: "web",
    stats: { price_min: 0, price_max: 0, price_median: 0, rating_coverage: 0, facets: [] },
    context,
    config: {
      modules: { budget: false, facet: false, sort: false, order: false, cart: false, policy: true },
      thresholds: { variance: 2.0, facet_threshold: 0.2, rating_threshold: 0.5 },
      store,
    },
  };
}

describe("PolicyModule", () => {
  it("generates Read Full Policy link when policy URL exists", () => {
    const result = PolicyModule.execute(
      makeRequest(
        { policy_type: "returns" },
        { policy_links: { returns: "https://store.com/returns" } },
      ),
    );
    expect(result.trace.fired).toBe(true);
    const policyChip = result.chips.find((c) => c.label === "Read Full Policy");
    expect(policyChip).toBeDefined();
    expect(policyChip!.action).toContain("https://store.com/returns");
  });

  it("offers Start a Return with refund window for returns policy", () => {
    const result = PolicyModule.execute(
      makeRequest(
        { policy_type: "returns" },
        { refund_window: "30 days" },
      ),
    );
    const returnChip = result.chips.find((c) => c.action === "flow:start_return");
    expect(returnChip).toBeDefined();
    expect(returnChip!.label).toBe("Start a Return (30 days)");
  });

  it("offers Track My Order pivot for shipping policy", () => {
    const result = PolicyModule.execute(
      makeRequest({ policy_type: "shipping" }),
    );
    expect(result.chips.map((c) => c.label)).toContain("Track My Order");
  });

  it("offers warranty check for warranty policy", () => {
    const result = PolicyModule.execute(
      makeRequest({ policy_type: "warranty" }),
    );
    expect(result.chips.map((c) => c.label)).toContain("Check Warranty Status");
  });

  it("always includes Back to Shopping pivot", () => {
    const result = PolicyModule.execute(
      makeRequest({ policy_type: "general" }),
    );
    expect(result.chips.map((c) => c.label)).toContain("Back to Shopping");
    expect(result.chips.map((c) => c.label)).toContain("View Best Sellers");
  });

  it("includes product link when current_product is set", () => {
    const result = PolicyModule.execute(
      makeRequest(
        { policy_type: "returns", current_product: "Nike Air Max 90" },
      ),
    );
    const productChip = result.chips.find((c) => c.label === "View Nike Air Max 90");
    expect(productChip).toBeDefined();
    expect(productChip!.action).toContain("Nike Air Max 90");
  });

  it("does not fire without context", () => {
    const req: ComputeChipsRequest = {
      intent: "check_policy",
      channel: "web",
      stats: { price_min: 0, price_max: 0, price_median: 0, rating_coverage: 0, facets: [] },
      config: {
        modules: { budget: false, facet: false, sort: false, order: false, cart: false, policy: true },
        thresholds: { variance: 2.0, facet_threshold: 0.2, rating_threshold: 0.5 },
      },
    };
    const result = PolicyModule.execute(req);
    expect(result.trace.fired).toBe(false);
  });
});
