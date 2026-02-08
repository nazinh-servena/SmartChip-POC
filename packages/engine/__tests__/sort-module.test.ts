import { describe, it, expect } from "vitest";
import { SortModule } from "../src/modules/sort-module.js";
import type { ComputeChipsRequest } from "@smartchip/types";

function makeRequest(rating_coverage = 0.7): ComputeChipsRequest {
  return {
    intent: "product_discovery",
    channel: "web",
    stats: {
      price_min: 100,
      price_max: 500,
      price_median: 300,
      rating_coverage,
      facets: [],
    },
    config: {
      modules: { budget: true, facet: true, sort: true },
      thresholds: { variance: 2.0, facet_threshold: 0.2, rating_threshold: 0.5 },
    },
  };
}

describe("SortModule", () => {
  it("fires when rating coverage exceeds threshold", () => {
    const result = SortModule.execute(makeRequest(0.72));
    expect(result.trace.fired).toBe(true);
    expect(result.chips).toHaveLength(1);
    expect(result.chips[0].label).toBe("Best Rated");
    expect(result.chips[0].action).toBe("sort:rating_desc");
    expect(result.chips[0].priority).toBe(80);
  });

  it("does not fire when coverage is below threshold", () => {
    const result = SortModule.execute(makeRequest(0.3));
    expect(result.trace.fired).toBe(false);
    expect(result.chips).toHaveLength(0);
  });

  it("does not fire when coverage exactly equals threshold", () => {
    const result = SortModule.execute(makeRequest(0.5));
    expect(result.trace.fired).toBe(false);
  });

  it("includes coverage percentage in trace", () => {
    const result = SortModule.execute(makeRequest(0.72));
    expect(result.trace.reason).toContain("72%");
  });
});
