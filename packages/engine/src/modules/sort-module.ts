import type { ComputeChipsRequest } from "@smartchip/types";
import type { ChipModule, ModuleResult } from "./types.js";

export const SortModule: ChipModule = {
  name: "SortModule",
  configKey: "sort",

  execute(request: ComputeChipsRequest): ModuleResult {
    const coverage = request.stats.rating_coverage;
    const threshold = request.config.thresholds.rating_threshold;

    if (coverage > threshold) {
      return {
        chips: [
          {
            label: "Best Rated",
            action: "sort:rating_desc",
            priority: 80,
          },
        ],
        trace: {
          module: "SortModule",
          fired: true,
          reason: `Rating coverage ${(coverage * 100).toFixed(0)}% exceeds threshold ${(threshold * 100).toFixed(0)}%`,
        },
      };
    }

    return {
      chips: [],
      trace: {
        module: "SortModule",
        fired: false,
        reason: `Rating coverage ${(coverage * 100).toFixed(0)}% below threshold ${(threshold * 100).toFixed(0)}%`,
      },
    };
  },
};
