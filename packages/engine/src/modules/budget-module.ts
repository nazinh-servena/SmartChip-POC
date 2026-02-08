import type { ComputeChipsRequest } from "@smartchip/types";
import type { ChipModule, ModuleResult } from "./types.js";

function formatPrice(n: number): string {
  return Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`;
}

export const BudgetModule: ChipModule = {
  name: "BudgetModule",
  configKey: "budget",

  execute(request: ComputeChipsRequest): ModuleResult {
    const { price_min, price_max, price_median } = request.stats;
    const threshold = request.config.thresholds.variance;

    if (price_min <= 0) {
      return {
        chips: [],
        trace: {
          module: "BudgetModule",
          fired: false,
          reason: `price_min is ${price_min}, cannot compute variance ratio`,
        },
      };
    }

    const ratio = price_max / price_min;

    if (ratio > threshold) {
      return {
        chips: [
          {
            label: `Under ${formatPrice(price_median)}`,
            action: `filter_price_max:${price_median}`,
            priority: 90,
          },
        ],
        trace: {
          module: "BudgetModule",
          fired: true,
          reason: `Variance ratio ${ratio.toFixed(1)}x exceeds threshold ${threshold}x`,
        },
      };
    }

    return {
      chips: [],
      trace: {
        module: "BudgetModule",
        fired: false,
        reason: `Variance ratio ${ratio.toFixed(1)}x below threshold ${threshold}x`,
      },
    };
  },
};
