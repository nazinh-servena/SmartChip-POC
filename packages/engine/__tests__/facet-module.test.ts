import { describe, it, expect } from "vitest";
import { FacetModule } from "../src/modules/facet-module.js";
import type { ComputeChipsRequest } from "@smartchip/types";

function makeRequest(
  facets: ComputeChipsRequest["stats"]["facets"] = [],
  facet_threshold = 0.2,
): ComputeChipsRequest {
  return {
    intent: "product_discovery",
    channel: "web",
    stats: {
      price_min: 100,
      price_max: 500,
      price_median: 300,
      rating_coverage: 0.7,
      facets,
    },
    config: {
      modules: { budget: true, facet: true, sort: true },
      thresholds: { variance: 2.0, facet_threshold, rating_threshold: 0.5 },
    },
  };
}

describe("FacetModule", () => {
  it("fires when 2+ values exceed threshold in a facet", () => {
    const result = FacetModule.execute(
      makeRequest([
        {
          name: "gender",
          values: [
            { value: "Men's", share: 0.5 },
            { value: "Women's", share: 0.4 },
          ],
        },
      ]),
    );
    expect(result.trace.fired).toBe(true);
    expect(result.chips).toHaveLength(2);
    expect(result.chips.map((c) => c.label)).toContain("Men's");
    expect(result.chips.map((c) => c.label)).toContain("Women's");
  });

  it("does not fire when only 1 value exceeds threshold", () => {
    const result = FacetModule.execute(
      makeRequest([
        {
          name: "color",
          values: [
            { value: "Black", share: 0.8 },
            { value: "White", share: 0.1 },
          ],
        },
      ]),
    );
    expect(result.trace.fired).toBe(false);
    expect(result.chips).toHaveLength(0);
  });

  it("handles multiple facets each contributing chips", () => {
    const result = FacetModule.execute(
      makeRequest([
        {
          name: "gender",
          values: [
            { value: "Men's", share: 0.5 },
            { value: "Women's", share: 0.4 },
          ],
        },
        {
          name: "brand",
          values: [
            { value: "Nike", share: 0.35 },
            { value: "Adidas", share: 0.30 },
          ],
        },
      ]),
    );
    expect(result.trace.fired).toBe(true);
    expect(result.chips).toHaveLength(4);
  });

  it("produces no chips for empty facets", () => {
    const result = FacetModule.execute(makeRequest([]));
    expect(result.trace.fired).toBe(false);
    expect(result.chips).toHaveLength(0);
  });

  it("generates correct action strings", () => {
    const result = FacetModule.execute(
      makeRequest([
        {
          name: "gender",
          values: [
            { value: "Men's", share: 0.5 },
            { value: "Women's", share: 0.4 },
          ],
        },
      ]),
    );
    expect(result.chips[0].action).toMatch(/^filter_facet:gender:/);
  });

  it("assigns higher priority to higher-share values", () => {
    const result = FacetModule.execute(
      makeRequest([
        {
          name: "gender",
          values: [
            { value: "Men's", share: 0.5 },
            { value: "Women's", share: 0.3 },
          ],
        },
      ]),
    );
    const menChip = result.chips.find((c) => c.label === "Men's")!;
    const womenChip = result.chips.find((c) => c.label === "Women's")!;
    expect(menChip.priority).toBeGreaterThan(womenChip.priority);
  });
});
