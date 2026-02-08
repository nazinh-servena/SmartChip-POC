import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/server/app.js";

const app = createApp();

const VALID_BODY = {
  intent: "product_discovery",
  channel: "web",
  stats: {
    price_min: 25,
    price_max: 1200,
    price_median: 450,
    rating_coverage: 0.72,
    facets: [
      {
        name: "gender",
        values: [
          { value: "Men's", share: 0.45 },
          { value: "Women's", share: 0.40 },
        ],
      },
    ],
  },
  config: {
    modules: { budget: true, facet: true, sort: true, order: false, cart: false, policy: false },
    thresholds: { variance: 2.0, facet_threshold: 0.2, rating_threshold: 0.5 },
  },
};

describe("POST /v1/compute_chips", () => {
  it("returns 200 with chips for valid request", async () => {
    const res = await request(app).post("/v1/compute_chips").send(VALID_BODY);

    expect(res.status).toBe(200);
    expect(res.body.option).toBe("success");
    expect(res.body.chips.length).toBeGreaterThan(0);
    expect(res.body.trace).toBeInstanceOf(Array);
  });

  it("includes X-Latency-Ms header", async () => {
    const res = await request(app).post("/v1/compute_chips").send(VALID_BODY);
    expect(res.headers["x-latency-ms"]).toBeDefined();
    expect(parseFloat(res.headers["x-latency-ms"])).toBeLessThan(50);
  });

  it("returns error response for invalid body", async () => {
    const res = await request(app).post("/v1/compute_chips").send({ garbage: true });

    expect(res.status).toBe(200);
    expect(res.body.option).toBe("error");
    expect(res.body.error).toBeDefined();
  });

  it("includes CORS headers", async () => {
    const res = await request(app).post("/v1/compute_chips").send(VALID_BODY);
    expect(res.headers["access-control-allow-origin"]).toBe("*");
  });

  it("hydrates config from merchant_id when config is omitted", async () => {
    const res = await request(app).post("/v1/compute_chips").send({
      intent: "product_discovery",
      channel: "web",
      merchant_id: "demo-electronics",
      stats: VALID_BODY.stats,
    });

    expect(res.status).toBe(200);
    expect(res.body.option).toBe("success");
    expect(res.body.chips.length).toBeGreaterThan(0);
  });

  it("returns error for unknown merchant_id", async () => {
    const res = await request(app).post("/v1/compute_chips").send({
      intent: "product_discovery",
      channel: "web",
      merchant_id: "does-not-exist",
      stats: VALID_BODY.stats,
    });

    expect(res.status).toBe(200);
    expect(res.body.option).toBe("error");
    expect(res.body.error).toContain("Unknown merchant_id");
  });

  it("returns error for invalid config_overrides", async () => {
    const res = await request(app).post("/v1/compute_chips").send({
      intent: "product_discovery",
      channel: "web",
      merchant_id: "demo-electronics",
      stats: VALID_BODY.stats,
      config_overrides: {
        thresholds: { variance: 0 },
      },
    });

    expect(res.status).toBe(200);
    expect(res.body.option).toBe("error");
    expect(res.body.error).toContain("config_overrides invalid");
  });
});

describe("GET /health", () => {
  it("returns ok status", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });
});
