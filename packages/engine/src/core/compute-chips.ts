import {
  CHANNEL_LIMITS,
  type ComputeChipsRequest,
  type ComputeChipsResponse,
  type Chip,
  type TraceEntry,
} from "@smartchip/types";
import { ALL_MODULES } from "../modules/index.js";
import { validateRequest } from "./validate.js";
import { rankChips } from "./rank.js";
import { truncateChips } from "./truncate.js";

export function computeChips(input: unknown): ComputeChipsResponse {
  // Step 1: Validate
  const validation = validateRequest(input);
  if (!validation.ok) {
    return { option: "error", chips: [], trace: [], error: validation.error };
  }

  const request = input as ComputeChipsRequest;

  // Step 2: Execute enabled modules
  const allChips: Chip[] = [];
  const allTrace: TraceEntry[] = [];

  for (const mod of ALL_MODULES) {
    if (request.config.modules[mod.configKey]) {
      const result = mod.execute(request);
      allChips.push(...result.chips);
      allTrace.push(result.trace);
    } else {
      allTrace.push({
        module: mod.name,
        fired: false,
        reason: "Module disabled by config",
      });
    }
  }

  // Step 3: Rank by priority (descending)
  const ranked = rankChips(allChips);

  // Step 4: Truncate to channel limit
  const limit = CHANNEL_LIMITS[request.channel];
  const chips = truncateChips(ranked, limit);

  return { option: "success", chips, trace: allTrace };
}
