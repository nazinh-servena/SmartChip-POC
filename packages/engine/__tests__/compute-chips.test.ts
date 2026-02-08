import { describe, it, expect } from "vitest";
import { computeChips } from "../src/core/compute-chips.js";
import { PRESET_MIXED_BAG, PRESET_CHEAP_SIMPLE, PRESET_NO_RATINGS } from "@smartchip/types";

const DEFAULT_CONFIG = {
  modules: { budget: true, facet: true, sort: true, order: false, cart: false, policy: false },
  thresholds: { variance: 2.0, facet_threshold: 0.2, rating_threshold: 0.5 },
};

describe("computeChips pipeline", () => {
  it("returns chips from all modules when all are enabled and fire", () => {
    const result = computeChips({
      intent: "product_discovery",
      channel: "web",
      stats: PRESET_MIXED_BAG,
      config: DEFAULT_CONFIG,
    });

    expect(result.option).toBe("success");
    expect(result.chips.length).toBeGreaterThanOrEqual(3);
    expect(result.trace).toHaveLength(6);
    // Discovery modules fire, intent modules show "disabled"
    const discoveryTrace = result.trace.filter((t) =>
      ["BudgetModule", "FacetModule", "SortModule"].includes(t.module),
    );
    expect(discoveryTrace.every((t) => t.fired)).toBe(true);
  });

  it("returns empty chips with disabled trace when all modules disabled", () => {
    const result = computeChips({
      intent: "product_discovery",
      channel: "web",
      stats: PRESET_MIXED_BAG,
      config: {
        modules: { budget: false, facet: false, sort: false, order: false, cart: false, policy: false },
        thresholds: DEFAULT_CONFIG.thresholds,
      },
    });

    expect(result.option).toBe("success");
    expect(result.chips).toHaveLength(0);
    expect(result.trace).toHaveLength(6);
    result.trace.forEach((t) => {
      expect(t.fired).toBe(false);
      expect(t.reason).toContain("disabled");
    });
  });

  it("chips are sorted by priority descending", () => {
    const result = computeChips({
      intent: "product_discovery",
      channel: "web",
      stats: PRESET_MIXED_BAG,
      config: DEFAULT_CONFIG,
    });

    for (let i = 1; i < result.chips.length; i++) {
      expect(result.chips[i - 1].priority).toBeGreaterThanOrEqual(result.chips[i].priority);
    }
  });

  it("truncates to 3 chips for whatsapp channel", () => {
    const result = computeChips({
      intent: "product_discovery",
      channel: "whatsapp",
      stats: PRESET_MIXED_BAG,
      config: DEFAULT_CONFIG,
    });

    expect(result.chips.length).toBeLessThanOrEqual(3);
  });

  it("returns error for invalid input", () => {
    const result = computeChips({ garbage: true });
    expect(result.option).toBe("error");
    expect(result.error).toBeDefined();
    expect(result.chips).toHaveLength(0);
  });

  it("budget does NOT fire for Cheap & Simple preset (low variance)", () => {
    const result = computeChips({
      intent: "product_discovery",
      channel: "web",
      stats: PRESET_CHEAP_SIMPLE,
      config: DEFAULT_CONFIG,
    });

    const budgetTrace = result.trace.find((t) => t.module === "BudgetModule")!;
    expect(budgetTrace.fired).toBe(false);
  });

  it("sort does NOT fire for No Ratings preset", () => {
    const result = computeChips({
      intent: "product_discovery",
      channel: "web",
      stats: PRESET_NO_RATINGS,
      config: DEFAULT_CONFIG,
    });

    const sortTrace = result.trace.find((t) => t.module === "SortModule")!;
    expect(sortTrace.fired).toBe(false);
  });
});
