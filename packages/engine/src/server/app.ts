import express, { type Express } from "express";
import cors from "cors";
import { computeChips } from "../core/compute-chips.js";
import { hydrateRequestWithMerchantConfig } from "../config/hydrate-request.js";

export function createApp(): Express {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.post("/v1/compute_chips", (req, res) => {
    const start = performance.now();
    const hydrated = hydrateRequestWithMerchantConfig(req.body);
    const result = hydrated.ok
      ? computeChips(hydrated.request)
      : { option: "error", chips: [], trace: [], error: hydrated.error };
    const latency = performance.now() - start;
    res.set("X-Latency-Ms", latency.toFixed(2));
    res.json(result);
  });

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  return app;
}
