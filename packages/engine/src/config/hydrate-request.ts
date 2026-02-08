import type { ComputeChipsRequest } from "@smartchip/types";
import {
  applyEngineConfigOverride,
  resolveMerchantConfig,
  toEngineConfig,
} from "./merchant-config.js";

type HydrateResult =
  | { ok: true; request: unknown }
  | { ok: false; error: string };

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null;
}

export function hydrateRequestWithMerchantConfig(input: unknown): HydrateResult {
  if (!isRecord(input)) {
    return { ok: true, request: input };
  }

  // Existing mode: caller already supplies full engine config.
  if ("config" in input && input.config != null) {
    return { ok: true, request: input };
  }

  // New mode: caller sends merchant_id and optional config_overrides.
  const merchantId = input.merchant_id;
  if (typeof merchantId !== "string" || merchantId.trim() === "") {
    return { ok: true, request: input };
  }

  const merchantConfig = resolveMerchantConfig(merchantId);
  if (!merchantConfig) {
    return { ok: false, error: `Unknown merchant_id: ${merchantId}` };
  }

  const baseConfig = toEngineConfig(merchantConfig);
  const merged = applyEngineConfigOverride(baseConfig, input.config_overrides);
  if (!merged.ok) {
    return { ok: false, error: merged.error };
  }

  const request: ComputeChipsRequest = {
    intent: typeof input.intent === "string" ? input.intent : "",
    channel: input.channel as ComputeChipsRequest["channel"],
    stats: input.stats as ComputeChipsRequest["stats"],
    context: input.context as ComputeChipsRequest["context"],
    config: merged.config,
  };

  return { ok: true, request };
}
