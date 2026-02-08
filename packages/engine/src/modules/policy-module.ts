import type { ComputeChipsRequest, PolicyContext } from "@smartchip/types";
import type { ChipModule, ModuleResult } from "./types.js";

/**
 * PolicyModule — Intent: check_policy
 *
 * CODED (logic rules):
 *   - Always generate "Read Full Policy" link if policy_links configured
 *   - If policy_type is "returns" → offer "Start a Return" action
 *   - If policy_type is "shipping" → offer "Track My Order" pivot
 *   - Always generate "Back to Shopping" pivot chip (keeps session alive)
 *   - Include refund_window in label when available
 *
 * INPUT (dynamic per request):
 *   context.policy_type, context.current_product
 *
 * CONFIGURED (static per store):
 *   store.policy_links, store.refund_window
 */
export const PolicyModule: ChipModule = {
  name: "PolicyModule",
  configKey: "policy",

  execute(request: ComputeChipsRequest): ModuleResult {
    const ctx = request.context as PolicyContext | undefined;

    if (!ctx || !("policy_type" in ctx)) {
      return {
        chips: [],
        trace: {
          module: "PolicyModule",
          fired: false,
          reason: "No policy context provided in request",
        },
      };
    }

    const store = request.config.store;
    const chips: ModuleResult["chips"] = [];
    const reasons: string[] = [];

    // Rule 1: Link to full policy page
    const policyUrl = store?.policy_links?.[ctx.policy_type];
    if (policyUrl) {
      chips.push({
        label: "Read Full Policy",
        action: `link:${policyUrl}`,
        priority: 90,
      });
      reasons.push("linked full policy");
    }

    // Rule 2: Intent-specific actions
    if (ctx.policy_type === "returns") {
      const window = store?.refund_window;
      chips.push({
        label: window ? `Start a Return (${window})` : "Start a Return",
        action: "flow:start_return",
        priority: 85,
      });
      reasons.push("offered return flow");
    }

    if (ctx.policy_type === "shipping") {
      chips.push({
        label: "Track My Order",
        action: "navigate:track_order",
        priority: 85,
      });
      reasons.push("pivoted to order tracking");
    }

    if (ctx.policy_type === "warranty") {
      chips.push({
        label: "Check Warranty Status",
        action: "flow:warranty_check",
        priority: 85,
      });
      reasons.push("offered warranty check");
    }

    // Rule 3: Product-specific context
    if (ctx.current_product) {
      chips.push({
        label: `View ${ctx.current_product}`,
        action: `navigate:product:${ctx.current_product}`,
        priority: 75,
      });
      reasons.push(`linked back to ${ctx.current_product}`);
    }

    // Rule 4: The Pivot — always keep session alive
    chips.push({
      label: "Back to Shopping",
      action: "navigate:shop",
      priority: 60,
    });
    chips.push({
      label: "View Best Sellers",
      action: "navigate:best_sellers",
      priority: 55,
    });
    reasons.push("added shopping pivot");

    return {
      chips,
      trace: {
        module: "PolicyModule",
        fired: true,
        reason: `Policy type "${ctx.policy_type}" — ${reasons.join(", ")}`,
      },
    };
  },
};
