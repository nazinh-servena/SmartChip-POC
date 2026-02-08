export interface Chip {
  label: string;
  action: string;
  priority: number;
}

export interface TraceEntry {
  module: string;
  fired: boolean;
  reason: string;
}

export interface ComputeChipsResponse {
  option: "success" | "error";
  chips: Chip[];
  trace: TraceEntry[];
  error?: string;
}
