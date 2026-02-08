import { BudgetModule } from "./budget-module.js";
import { FacetModule } from "./facet-module.js";
import { SortModule } from "./sort-module.js";
import { OrderModule } from "./order-module.js";
import { CartModule } from "./cart-module.js";
import { PolicyModule } from "./policy-module.js";
import type { ChipModule } from "./types.js";

export const ALL_MODULES: ChipModule[] = [
  BudgetModule,
  FacetModule,
  SortModule,
  OrderModule,
  CartModule,
  PolicyModule,
];

export { BudgetModule, FacetModule, SortModule, OrderModule, CartModule, PolicyModule };
export type { ChipModule, ModuleResult } from "./types.js";
