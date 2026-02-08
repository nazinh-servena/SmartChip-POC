import type { ComputeChipsRequest, CartContext } from "@smartchip/types";
import type { ChipModule, ModuleResult } from "./types.js";

/**
 * CartModule — Intent: checkout_help
 *
 * CODED (logic rules):
 *   - If cart empty → offer "Browse Products" / "View Deals"
 *   - If cart has items → offer "Checkout Now" with value
 *   - If cart_value < free_shipping_threshold → upsell chip
 *   - If COD enabled in store config → offer COD option
 *
 * INPUT (dynamic per request):
 *   context.cart_count, context.cart_value, context.currency, context.payment_methods
 *
 * CONFIGURED (static per store):
 *   store.enable_cod, store.free_shipping_threshold
 */
export const CartModule: ChipModule = {
  name: "CartModule",
  configKey: "cart",

  execute(request: ComputeChipsRequest): ModuleResult {
    const ctx = request.context as CartContext | undefined;

    if (!ctx || !("cart_count" in ctx)) {
      return {
        chips: [],
        trace: {
          module: "CartModule",
          fired: false,
          reason: "No cart context provided in request",
        },
      };
    }

    const store = request.config.store;
    const chips: ModuleResult["chips"] = [];
    const sym = ctx.currency === "USD" ? "$" : ctx.currency;

    // Rule 1: Empty cart → push to shop
    if (ctx.cart_count === 0) {
      chips.push({
        label: "Browse Products",
        action: "navigate:shop",
        priority: 90,
      });
      chips.push({
        label: "View Deals",
        action: "navigate:deals",
        priority: 85,
      });

      return {
        chips,
        trace: {
          module: "CartModule",
          fired: true,
          reason: "Cart empty — offered browse + deals to recover session",
        },
      };
    }

    // Rule 2: Cart has items → checkout
    chips.push({
      label: `Checkout (${sym}${ctx.cart_value.toFixed(2)})`,
      action: "checkout:proceed",
      priority: 95,
    });

    // Rule 3: Upsell for free shipping
    const threshold = store?.free_shipping_threshold;
    if (threshold && ctx.cart_value < threshold) {
      const diff = (threshold - ctx.cart_value).toFixed(2);
      chips.push({
        label: `Add ${sym}${diff} for Free Ship`,
        action: `navigate:upsell:${diff}`,
        priority: 85,
      });
    }

    // Rule 4: COD option if enabled
    if (store?.enable_cod && ctx.payment_methods.includes("cod")) {
      chips.push({
        label: "Pay with Cash (COD)",
        action: "checkout:cod",
        priority: 80,
      });
    }

    // Always offer view cart
    chips.push({
      label: "View Cart",
      action: "navigate:cart",
      priority: 70,
    });

    return {
      chips,
      trace: {
        module: "CartModule",
        fired: true,
        reason: `Cart has ${ctx.cart_count} item(s) worth ${sym}${ctx.cart_value.toFixed(2)}${threshold ? ` (free shipping at ${sym}${threshold})` : ""}`,
      },
    };
  },
};
