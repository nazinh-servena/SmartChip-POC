import { describe, it, expect } from "vitest";
import { BudgetModule } from "../src/modules/budget-module.js";
import type { ComputeChipsRequest } from "@smartchip/types";

function makeRequest(overrides: Partial<ComputeChipsRequest["stats"]> = {}): ComputeChipsRequest {
  return {
    intent: "product_discovery",
    channel: "web",
    stats: {
      price_min: 100,
      price_max: 1000,
      price_median: 450,
      rating_coverage: 0.7,
      facets: [],
      ...overrides,
    },
    config: {
      modules: { budget: true, facet: true, sort: true },
      thresholds: { variance: 2.0, facet_threshold: 0.2, rating_threshold: 0.5 },
    },
  };
}

describe("BudgetModule", () => {
  it("fires when variance ratio exceeds threshold", () => {
    const result = BudgetModule.execute(makeRequest({ price_min: 100, price_max: 1000 }));
    expect(result.trace.fired).toBe(true);
    expect(result.chips).toHaveLength(1);
    expect(result.chips[0].label).toBe("Under $450");
    expect(result.chips[0].action).toBe("filter_price_max:450");
    expect(result.chips[0].priority).toBe(90);
  });

  it("does not fire when variance ratio is below threshold", () => {
    const result = BudgetModule.execute(makeRequest({ price_min: 100, price_max: 150 }));
    expect(result.trace.fired).toBe(false);
    expect(result.chips).toHaveLength(0);
  });

  it("does not fire when ratio exactly equals threshold", () => {
    // 200/100 = 2.0 exactly, threshold is 2.0 — should NOT fire (strictly greater)
    const result = BudgetModule.execute(makeRequest({ price_min: 100, price_max: 200 }));
    expect(result.trace.fired).toBe(false);
  });

  it("handles price_min of 0 gracefully", () => {
    const result = BudgetModule.execute(makeRequest({ price_min: 0 }));
    expect(result.trace.fired).toBe(false);
    expect(result.chips).toHaveLength(0);
    expect(result.trace.reason).toContain("0");
  });

  it("handles negative price_min", () => {
    const result = BudgetModule.execute(makeRequest({ price_min: -5 }));
    expect(result.trace.fired).toBe(false);
  });

  it("includes ratio in trace reason", () => {
    const result = BudgetModule.execute(makeRequest({ price_min: 100, price_max: 1000 }));
    expect(result.trace.reason).toContain("10.0");
  });
});
