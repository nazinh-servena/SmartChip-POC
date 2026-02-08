import type { ComputeChipsRequest } from "@smartchip/types";
import type { ChipModule, ModuleResult } from "./types.js";

export const FacetModule: ChipModule = {
  name: "FacetModule",
  configKey: "facet",

  execute(request: ComputeChipsRequest): ModuleResult {
    const threshold = request.config.thresholds.facet_threshold;
    const chips: ModuleResult["chips"] = [];

    for (const facet of request.stats.facets) {
      const qualifying = facet.values.filter((v) => v.share > threshold);

      if (qualifying.length >= 2) {
        for (const val of qualifying) {
          chips.push({
            label: val.value,
            action: `filter_facet:${facet.name}:${val.value}`,
            priority: 70 + Math.round(val.share * 10),
          });
        }
      }
    }

    if (chips.length > 0) {
      return {
        chips,
        trace: {
          module: "FacetModule",
          fired: true,
          reason: `Generated ${chips.length} chips from facets exceeding ${(threshold * 100).toFixed(0)}% share`,
        },
      };
    }

    return {
      chips: [],
      trace: {
        module: "FacetModule",
        fired: false,
        reason: `No facet had 2+ values exceeding ${(threshold * 100).toFixed(0)}% share threshold`,
      },
    };
  },
};
