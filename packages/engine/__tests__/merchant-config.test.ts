import { describe, it, expect } from "vitest";
import {
  resolveMerchantConfig,
  toEngineConfig,
  applyEngineConfigOverride,
} from "../src/config/merchant-config.js";

describe("merchant config resolver", () => {
  it("resolves known merchant config and maps to engine config", () => {
    const merchant = resolveMerchantConfig("demo-electronics");
    expect(merchant).toBeDefined();

    const config = toEngineConfig(merchant!);
    expect(config.config_version).toBe(1);
    expect(config.modules.budget).toBe(true);
    expect(config.thresholds.variance).toBe(2.0);
    expect(config.store?.support_phone).toBe("+1-800-555-0199");
  });

  it("returns undefined for unknown merchant", () => {
    expect(resolveMerchantConfig("missing-merchant")).toBeUndefined();
  });
});

describe("engine config overrides", () => {
  it("applies safe overrides on top of base config", () => {
    const base = toEngineConfig(resolveMerchantConfig("demo-electronics")!);
    const result = applyEngineConfigOverride(base, {
      modules: { budget: false },
      thresholds: { variance: 4.5 },
      store: { support_phone: "+1-999-555-0100" },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.config.modules.budget).toBe(false);
      expect(result.config.thresholds.variance).toBe(4.5);
      expect(result.config.store?.support_phone).toBe("+1-999-555-0100");
    }
  });

  it("rejects invalid overrides", () => {
    const base = toEngineConfig(resolveMerchantConfig("demo-electronics")!);
    const result = applyEngineConfigOverride(base, {
      thresholds: { variance: 0 },
    });

    expect(result.ok).toBe(false);
  });
});
