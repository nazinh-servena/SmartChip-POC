import { describe, it, expect } from "vitest";
import { OrderModule } from "../src/modules/order-module.js";
import type { ComputeChipsRequest, OrderContext } from "@smartchip/types";

function makeRequest(
  context: OrderContext,
  store: ComputeChipsRequest["config"]["store"] = {},
): ComputeChipsRequest {
  return {
    intent: "track_order",
    channel: "whatsapp",
    stats: { price_min: 0, price_max: 0, price_median: 0, rating_coverage: 0, facets: [] },
    context,
    config: {
      modules: { budget: false, facet: false, sort: false, order: true, cart: false, policy: false },
      thresholds: { variance: 2.0, facet_threshold: 0.2, rating_threshold: 0.5 },
      store,
    },
  };
}

describe("OrderModule", () => {
  it("offers login + manual entry for unknown users", () => {
    const result = OrderModule.execute(
      makeRequest({ auth_state: "unknown", recent_orders: [] }),
    );
    expect(result.trace.fired).toBe(true);
    expect(result.chips.map((c) => c.label)).toContain("Login with Phone");
    expect(result.chips.map((c) => c.label)).toContain("Enter Order ID");
  });

  it("generates dynamic Track chips for known users with orders", () => {
    const result = OrderModule.execute(
      makeRequest({
        auth_state: "known",
        recent_orders: [
          { id: "1001", status: "shipped" },
          { id: "1002", status: "processing" },
        ],
      }),
    );
    expect(result.trace.fired).toBe(true);
    expect(result.chips.map((c) => c.label)).toContain("Track #1001");
    expect(result.chips.map((c) => c.label)).toContain("Track #1002");
  });

  it("offers Report Issue and Return Item for delivered orders", () => {
    const result = OrderModule.execute(
      makeRequest({
        auth_state: "known",
        recent_orders: [{ id: "999", status: "delivered" }],
      }),
    );
    expect(result.chips.map((c) => c.label)).toContain("Report Issue");
    expect(result.chips.map((c) => c.label)).toContain("Return Item");
  });

  it("adds Talk to Agent when support_phone is configured", () => {
    const result = OrderModule.execute(
      makeRequest(
        { auth_state: "known", recent_orders: [{ id: "1001", status: "shipped" }] },
        { support_phone: "+1-800-555-0199" },
      ),
    );
    const agentChip = result.chips.find((c) => c.label === "Talk to Agent");
    expect(agentChip).toBeDefined();
    expect(agentChip!.action).toContain("+1-800-555-0199");
  });

  it("omits Talk to Agent when support_phone is NOT configured", () => {
    const result = OrderModule.execute(
      makeRequest(
        { auth_state: "known", recent_orders: [{ id: "1001", status: "shipped" }] },
        {},
      ),
    );
    expect(result.chips.map((c) => c.label)).not.toContain("Talk to Agent");
  });

  it("does not fire without context", () => {
    const req: ComputeChipsRequest = {
      intent: "track_order",
      channel: "whatsapp",
      stats: { price_min: 0, price_max: 0, price_median: 0, rating_coverage: 0, facets: [] },
      config: {
        modules: { budget: false, facet: false, sort: false, order: true, cart: false, policy: false },
        thresholds: { variance: 2.0, facet_threshold: 0.2, rating_threshold: 0.5 },
      },
    };
    const result = OrderModule.execute(req);
    expect(result.trace.fired).toBe(false);
  });
});
