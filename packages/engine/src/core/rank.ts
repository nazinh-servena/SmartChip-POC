import type { Chip } from "@smartchip/types";

export function rankChips(chips: Chip[]): Chip[] {
  return [...chips].sort((a, b) => b.priority - a.priority);
}
