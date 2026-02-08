import { useCallback } from "react";
import { computeChips } from "@smartchip/engine/core";
import type { ComputeChipsRequest, ComputeChipsResponse } from "@smartchip/types";

export function useEngine() {
  const execute = useCallback(
    (request: ComputeChipsRequest): ComputeChipsResponse => {
      return computeChips(request);
    },
    [],
  );

  return { execute };
}
