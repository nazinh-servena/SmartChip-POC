import type { ComputeChipsRequest, OrderContext } from "@smartchip/types";
import type { ChipModule, ModuleResult } from "./types.js";

/**
 * OrderModule — Intent: track_order
 *
 * CODED (logic rules):
 *   - If auth unknown → offer login/manual entry chips
 *   - If auth known + active orders → dynamic chip per order
 *   - If any order is "delivered" → offer issue/return chips
 *   - Always offer agent handoff if support_phone configured
 *
 * INPUT (dynamic per request):
 *   context.auth_state, context.recent_orders
 *
 * CONFIGURED (static per store):
 *   store.integration_type, store.support_phone
 */
export const OrderModule: ChipModule = {
  name: "OrderModule",
  configKey: "order",

  execute(request: ComputeChipsRequest): ModuleResult {
    const ctx = request.context as OrderContext | undefined;

    if (!ctx || !("auth_state" in ctx)) {
      return {
        chips: [],
        trace: {
          module: "OrderModule",
          fired: false,
          reason: "No order context provided in request",
        },
      };
    }

    const store = request.config.store;
    const chips: ModuleResult["chips"] = [];

    // Rule 1: Unknown user → login/manual entry
    if (ctx.auth_state === "unknown") {
      chips.push({
        label: "Login with Phone",
        action: "auth:phone_login",
        priority: 95,
      });
      chips.push({
        label: "Enter Order ID",
        action: "auth:manual_order_id",
        priority: 90,
      });

      // Agent fallback if configured
      if (store?.support_phone) {
        chips.push({
          label: "Talk to Agent",
          action: `handoff:phone:${store.support_phone}`,
          priority: 60,
        });
      }

      return {
        chips,
        trace: {
          module: "OrderModule",
          fired: true,
          reason: `User unknown — offered login + manual entry${store?.support_phone ? " + agent handoff" : ""}`,
        },
      };
    }

    // Rule 2: Known user with orders → dynamic chips per order
    const activeOrders = ctx.recent_orders.filter(
      (o) => o.status !== "returned",
    );
    const deliveredOrders = ctx.recent_orders.filter(
      (o) => o.status === "delivered",
    );

    for (const order of activeOrders) {
      chips.push({
        label: `Track #${order.id}`,
        action: `track_specific_order:${order.id}`,
        priority: 85 - activeOrders.indexOf(order), // newest first
      });
    }

    // Rule 3: Delivered orders → offer issue/return
    if (deliveredOrders.length > 0) {
      chips.push({
        label: "Report Issue",
        action: `report_issue:${deliveredOrders[0].id}`,
        priority: 75,
      });
      chips.push({
        label: "Return Item",
        action: `start_return:${deliveredOrders[0].id}`,
        priority: 70,
      });
    }

    // Agent fallback
    if (store?.support_phone) {
      chips.push({
        label: "Talk to Agent",
        action: `handoff:phone:${store.support_phone}`,
        priority: 60,
      });
    }

    return {
      chips,
      trace: {
        module: "OrderModule",
        fired: true,
        reason: `User known — ${activeOrders.length} active order(s), ${deliveredOrders.length} delivered`,
      },
    };
  },
};
