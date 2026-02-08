export type { Channel } from "./channels.js";
export { CHANNEL_LIMITS } from "./channels.js";

export type {
  FacetValue,
  FacetData,
  SearchStats,
  OrderContext,
  CartContext,
  PolicyContext,
  IntentContext,
  StoreConfig,
  ModuleConfig,
  ThresholdConfig,
  ComputeChipsRequest,
} from "./request.js";

export type {
  Chip,
  TraceEntry,
  ComputeChipsResponse,
} from "./response.js";

export {
  PRESET_MIXED_BAG,
  PRESET_CHEAP_SIMPLE,
  PRESET_NO_RATINGS,
} from "./presets.js";

export {
  PRESET_TRACK_ORDER_KNOWN,
  PRESET_TRACK_ORDER_UNKNOWN,
  PRESET_CHECKOUT_WITH_CART,
  PRESET_CHECKOUT_EMPTY,
  PRESET_POLICY_RETURNS,
  PRESET_POLICY_SHIPPING,
} from "./presets.js";
