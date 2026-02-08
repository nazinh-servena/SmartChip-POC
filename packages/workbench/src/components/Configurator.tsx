import type { Channel, ComputeChipsRequest, StoreConfig } from "@smartchip/types";

interface Props {
  request: ComputeChipsRequest;
  onChannelChange: (c: Channel) => void;
  onRequestChange: (r: ComputeChipsRequest) => void;
}

function SectionBadge({ type }: { type: "input" | "coded" | "configured" }) {
  const styles = {
    input: "bg-cyan-900/50 text-cyan-300 border-cyan-700",
    coded: "bg-slate-700/50 text-slate-400 border-slate-600",
    configured: "bg-amber-900/50 text-amber-300 border-amber-700",
  };
  const labels = {
    input: "INPUT (Dynamic)",
    coded: "CODED (Logic)",
    configured: "CONFIGURED (Static)",
  };
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${styles[type]}`}>
      {labels[type]}
    </span>
  );
}

function Slider({ label, min, max, step, value, format, onChange }: {
  label: string; min: number; max: number; step: number; value: number;
  format: (v: number) => string; onChange: (v: number) => void;
}) {
  return (
    <div className="py-1.5">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-slate-400">{label}</span>
        <span className="text-xs font-mono text-blue-400">{format(value)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))} className="w-full accent-blue-600" />
    </div>
  );
}

function Toggle({ label, enabled, onChange }: { label: string; enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between py-1.5">
      <span className="text-xs text-slate-400">{label}</span>
      <button type="button" role="switch" aria-checked={enabled} onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${enabled ? "bg-blue-600" : "bg-slate-600"}`}>
        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${enabled ? "translate-x-[18px]" : "translate-x-[3px]"}`} />
      </button>
    </label>
  );
}

// ─── Per-intent config panels ─────────────────────────────────

function DiscoveryConfig({ request, onChange }: { request: ComputeChipsRequest; onChange: (r: ComputeChipsRequest) => void }) {
  const { thresholds, modules } = request.config;
  return (
    <>
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Modules</h3>
          <SectionBadge type="coded" />
        </div>
        <p className="text-[11px] text-slate-600 mb-2">These rules are <b className="text-slate-400">hard-coded</b> in the engine. Toggle to see their effect.</p>
        <Toggle label="BudgetModule — price variance filter" enabled={modules.budget}
          onChange={(v) => onChange({ ...request, config: { ...request.config, modules: { ...modules, budget: v } } })} />
        <Toggle label="FacetModule — facet split chips" enabled={modules.facet}
          onChange={(v) => onChange({ ...request, config: { ...request.config, modules: { ...modules, facet: v } } })} />
        <Toggle label="SortModule — rating sort chip" enabled={modules.sort}
          onChange={(v) => onChange({ ...request, config: { ...request.config, modules: { ...modules, sort: v } } })} />
      </div>
      <div>
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Thresholds</h3>
          <SectionBadge type="configured" />
        </div>
        <p className="text-[11px] text-slate-600 mb-2"><b className="text-slate-400">Configurable per store</b> — no code changes needed.</p>
        <Slider label="Price Variance" min={1.5} max={5.0} step={0.1} value={thresholds.variance}
          format={(v) => `${v.toFixed(1)}x`}
          onChange={(v) => onChange({ ...request, config: { ...request.config, thresholds: { ...thresholds, variance: v } } })} />
        <Slider label="Facet Share" min={0.1} max={0.5} step={0.05} value={thresholds.facet_threshold}
          format={(v) => `${(v * 100).toFixed(0)}%`}
          onChange={(v) => onChange({ ...request, config: { ...request.config, thresholds: { ...thresholds, facet_threshold: v } } })} />
        <p className="text-[11px] text-slate-600 mb-2">
          Facet values come from <span className="font-mono text-slate-400">stats.facets</span> in the request.
          <span className="text-slate-400"> share </span>
          means the fraction of results matching a value (for example, <span className="font-mono text-slate-400">0.35 = 35%</span>).
          This threshold keeps only values with <span className="font-mono text-slate-400">share &gt; threshold</span>, and a facet needs at least 2 qualifying values to show chips.
        </p>
        <Slider label="Rating Coverage" min={0.1} max={0.9} step={0.05} value={thresholds.rating_threshold}
          format={(v) => `${(v * 100).toFixed(0)}%`}
          onChange={(v) => onChange({ ...request, config: { ...request.config, thresholds: { ...thresholds, rating_threshold: v } } })} />
      </div>
    </>
  );
}

function OrderConfig({ request, onChange }: { request: ComputeChipsRequest; onChange: (r: ComputeChipsRequest) => void }) {
  const store = request.config.store ?? {};
  const ctx = (request.context ?? {}) as Record<string, unknown>;
  return (
    <>
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Dynamic Input</h3>
          <SectionBadge type="input" />
        </div>
        <p className="text-[11px] text-slate-600 mb-2">Sent per request from the chatbot session.</p>
        <div className="bg-slate-900 rounded-lg p-3 text-[11px] font-mono space-y-1">
          <div><span className="text-cyan-400">auth_state</span>: <span className="text-green-400">{String(ctx.auth_state ?? "—")}</span></div>
          <div><span className="text-cyan-400">recent_orders</span>: <span className="text-green-400">{JSON.stringify(ctx.recent_orders ?? [])}</span></div>
        </div>
      </div>
      <div>
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Store Config</h3>
          <SectionBadge type="configured" />
        </div>
        <p className="text-[11px] text-slate-600 mb-2">Set once per store. Try clearing the phone to remove the agent chip.</p>
        <div className="space-y-2">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Support Phone</label>
            <input type="text" value={store.support_phone ?? ""} placeholder="e.g. +1-800-555-0199"
              className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1.5 text-xs text-slate-300 font-mono focus:outline-none focus:border-amber-500"
              onChange={(e) => onChange({ ...request, config: { ...request.config, store: { ...store, support_phone: e.target.value || undefined } } })} />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Integration Type</label>
            <select value={store.integration_type ?? "shopify"}
              className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
              onChange={(e) => onChange({ ...request, config: { ...request.config, store: { ...store, integration_type: e.target.value as StoreConfig["integration_type"] } } })}>
              <option value="shopify">Shopify</option>
              <option value="courier_api">Courier API</option>
              <option value="manual">Manual</option>
            </select>
          </div>
        </div>
      </div>
    </>
  );
}

function CartConfig({ request, onChange }: { request: ComputeChipsRequest; onChange: (r: ComputeChipsRequest) => void }) {
  const store = request.config.store ?? {};
  const ctx = (request.context ?? {}) as Record<string, unknown>;
  return (
    <>
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Dynamic Input</h3>
          <SectionBadge type="input" />
        </div>
        <p className="text-[11px] text-slate-600 mb-2">Cart state from the user's current session.</p>
        <div className="bg-slate-900 rounded-lg p-3 text-[11px] font-mono space-y-1">
          <div><span className="text-cyan-400">cart_count</span>: <span className="text-green-400">{String(ctx.cart_count ?? 0)}</span></div>
          <div><span className="text-cyan-400">cart_value</span>: <span className="text-green-400">{String(ctx.cart_value ?? 0)}</span></div>
          <div><span className="text-cyan-400">currency</span>: <span className="text-green-400">{String(ctx.currency ?? "USD")}</span></div>
          <div><span className="text-cyan-400">payment_methods</span>: <span className="text-green-400">{JSON.stringify(ctx.payment_methods ?? [])}</span></div>
        </div>
      </div>
      <div>
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Store Config</h3>
          <SectionBadge type="configured" />
        </div>
        <p className="text-[11px] text-slate-600 mb-2">Try toggling COD or changing the shipping threshold.</p>
        <Toggle label="Enable Cash on Delivery (COD)" enabled={store.enable_cod ?? false}
          onChange={(v) => onChange({ ...request, config: { ...request.config, store: { ...store, enable_cod: v } } })} />
        <Slider label="Free Shipping Threshold" min={0} max={200} step={5} value={store.free_shipping_threshold ?? 50}
          format={(v) => `$${v}`}
          onChange={(v) => onChange({ ...request, config: { ...request.config, store: { ...store, free_shipping_threshold: v } } })} />
      </div>
    </>
  );
}

function PolicyConfig({ request, onChange }: { request: ComputeChipsRequest; onChange: (r: ComputeChipsRequest) => void }) {
  const store = request.config.store ?? {};
  const ctx = (request.context ?? {}) as Record<string, unknown>;
  return (
    <>
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Dynamic Input</h3>
          <SectionBadge type="input" />
        </div>
        <p className="text-[11px] text-slate-600 mb-2">Context from the user's current session.</p>
        <div className="bg-slate-900 rounded-lg p-3 text-[11px] font-mono space-y-1">
          <div><span className="text-cyan-400">policy_type</span>: <span className="text-green-400">{String(ctx.policy_type ?? "—")}</span></div>
          <div><span className="text-cyan-400">current_product</span>: <span className="text-green-400">{String(ctx.current_product ?? "none")}</span></div>
        </div>
      </div>
      <div>
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Store Config</h3>
          <SectionBadge type="configured" />
        </div>
        <p className="text-[11px] text-slate-600 mb-2">Try changing the refund window — the chip label updates instantly.</p>
        <div>
          <label className="text-xs text-slate-400 block mb-1">Refund Window</label>
          <input type="text" value={store.refund_window ?? ""} placeholder="e.g. 30 days"
            className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1.5 text-xs text-slate-300 font-mono focus:outline-none focus:border-amber-500"
            onChange={(e) => onChange({ ...request, config: { ...request.config, store: { ...store, refund_window: e.target.value || undefined } } })} />
        </div>
      </div>
    </>
  );
}

// ─── Main Configurator ──────────────────────────────────────────

export function Configurator({ request, onChannelChange, onRequestChange }: Props) {
  const intent = request.intent;
  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
      <h2 className="text-lg font-semibold text-slate-100 mb-4">Configurator</h2>

      {/* Channel selector */}
      <div className="mb-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Channel</h3>
        <div className="flex gap-2">
          {(["web", "whatsapp"] as const).map((ch) => (
            <button key={ch} onClick={() => onChannelChange(ch)}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-colors ${
                request.channel === ch ? "bg-blue-600 text-white" : "bg-slate-700 text-slate-400 hover:bg-slate-600"
              }`}>
              {ch === "web" ? "Web (max 6)" : "WhatsApp (max 3)"}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-700 pt-4">
        {intent === "product_discovery" && <DiscoveryConfig request={request} onChange={onRequestChange} />}
        {intent === "track_order" && <OrderConfig request={request} onChange={onRequestChange} />}
        {intent === "checkout_help" && <CartConfig request={request} onChange={onRequestChange} />}
        {intent === "check_policy" && <PolicyConfig request={request} onChange={onRequestChange} />}
      </div>
    </div>
  );
}
