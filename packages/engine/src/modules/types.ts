import type { ComputeChipsRequest, Chip, TraceEntry } from "@smartchip/types";

export interface ModuleResult {
  chips: Chip[];
  trace: TraceEntry;
}

export interface ChipModule {
  name: string;
  configKey: "budget" | "facet" | "sort" | "order" | "cart" | "policy";
  execute(request: ComputeChipsRequest): ModuleResult;
}
