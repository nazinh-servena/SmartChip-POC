import { describe, it, expect } from "vitest";
import { validateRequest } from "../src/core/validate.js";

const VALID_INPUT = {
  intent: "product_discovery",
  channel: "web",
  stats: {
    price_min: 100,
    price_max: 500,
    price_median: 300,
    rating_coverage: 0.7,
    facets: [],
  },
  config: {
    modules: { budget: true, facet: true, sort: true, order: false, cart: false, policy: false },
    thresholds: { variance: 2.0, facet_threshold: 0.2, rating_threshold: 0.5 },
  },
};

describe("validateRequest", () => {
  it("passes for valid input", () => {
    expect(validateRequest(VALID_INPUT)).toEqual({ ok: true });
  });

  it("rejects missing fields", () => {
    const result = validateRequest({});
    expect(result.ok).toBe(false);
  });

  it("rejects invalid channel", () => {
    const result = validateRequest({ ...VALID_INPUT, channel: "sms" });
    expect(result.ok).toBe(false);
  });

  it("rejects negative prices", () => {
    const result = validateRequest({
      ...VALID_INPUT,
      stats: { ...VALID_INPUT.stats, price_min: -10 },
    });
    expect(result.ok).toBe(false);
  });

  it("rejects facet share outside 0-1 range", () => {
    const result = validateRequest({
      ...VALID_INPUT,
      stats: {
        ...VALID_INPUT.stats,
        facets: [{ name: "x", values: [{ value: "a", share: 1.5 }] }],
      },
    });
    expect(result.ok).toBe(false);
  });

  it("rejects non-positive variance threshold", () => {
    const result = validateRequest({
      ...VALID_INPUT,
      config: {
        ...VALID_INPUT.config,
        thresholds: { ...VALID_INPUT.config.thresholds, variance: 0 },
      },
    });
    expect(result.ok).toBe(false);
  });
});
