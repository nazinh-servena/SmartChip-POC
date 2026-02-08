import type { Chip } from "@smartchip/types";

export function truncateChips(chips: Chip[], limit: number): Chip[] {
  return chips.slice(0, limit);
}
