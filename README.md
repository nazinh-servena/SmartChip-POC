# Smart Chips Engine POC

A deterministic navigation chip generator for conversational commerce. The engine accepts search statistics or session context and returns ranked UI buttons ("chips") that guide users through product discovery, order tracking, checkout, and policy inquiries.

<div align="center">

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/tests-55%20passing-success.svg)](./packages/engine/__tests__)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

[Demo Guide](./DEMO_GUIDE.md) • [Architecture](./packages/engine/ARCHITECTURE.md) • [API Reference](./packages/engine/API.md)

</div>

---

## What is Smart Chips?

Traditional chatbots force users to type every query. Smart Chips surfaces **contextual buttons** that anticipate the next logical step, removing friction from the conversation.

**Example:** User searches for "running shoes"
- **Without Smart Chips:** User must type "show me cheap ones" or "filter by brand"
- **With Smart Chips:** Bot displays `[Under $100]` `[Nike]` `[Adidas]` `[Best Rated]` buttons

The engine is:
- ✅ **Deterministic** — no LLM hallucinations, 100% predictable
- ✅ **Fast** — <50ms response time, pure function execution
- ✅ **Configurable** — change behavior via JSON config, zero code changes
- ✅ **Modular** — intent-based routing to specialized logic modules

---

## Quick Start

```bash
# Prerequisites: Node.js 22+
corepack enable && corepack prepare pnpm@latest --activate

# Install dependencies
pnpm install

# Run tests (55 tests across 9 files)
pnpm test

# Start both dev servers
pnpm dev
```

Then open:
- **Workbench UI:** [http://localhost:5173](http://localhost:5173)
- **Engine API** runs on `http://localhost:3001` (no browser UI — use the Workbench or call the API directly)
- **Architecture Overview:** open [`architecture-overview.html`](./architecture-overview.html) in your browser
- **Product Discovery Flow:** open [`architecture-productDiscoveryFlow.html`](./architecture-productDiscoveryFlow.html) in your browser

---

## Project Structure

```
SmartChip-POC/
├── packages/
│   ├── types/           # Shared TypeScript interfaces
│   ├── engine/          # Node.js API + logic modules (55 tests)
│   └── workbench/       # React testing UI
├── DEMO_GUIDE.md        # Interactive demo scenarios
└── README.md            # You are here
```

---

## The 3-Layer Architecture

The engine separates **what comes in**, **what's coded**, and **what's configured**:

| Layer | Description | Example | Control |
|-------|-------------|---------|---------|
| **INPUT** (Dynamic) | Data sent per request from the chatbot session | `auth_state: "known"`, `cart_value: 45.00` | Changes with every user interaction |
| **CODED** (Logic) | Hard-coded rules in engine modules | "If max/min > variance → generate [Under $Median]" | Requires code deployment |
| **CONFIGURED** (Static) | Store-level settings that change behavior | `enable_cod: true`, `free_shipping_threshold: 50` | Edit JSON config, no redeploy |

This separation allows non-technical teams to tune chip behavior without touching code.

---

## Supported Intents

The engine routes requests based on **intent** and activates the appropriate modules:

| Intent | Module(s) | Use Case | Example Chips |
|--------|-----------|----------|---------------|
| `product_discovery` | Budget + Facet + Sort | Help users narrow search results | `[Under $450]` `[Men's]` `[Best Rated]` |
| `track_order` | Order | Post-purchase support | `[Track #1001]` `[Talk to Agent]` |
| `checkout_help` | Cart | Cart abandonment recovery | `[Checkout ($45)]` `[Add $5 for Free Ship]` |
| `check_policy` | Policy | Answer FAQs + pivot to shopping | `[Start a Return]` `[Back to Shopping]` |

See [DEMO_GUIDE.md](./DEMO_GUIDE.md) for detailed scenarios and interactive demos.

---

## API Usage

**POST** `/v1/compute_chips`

```json
{
  "intent": "product_discovery",
  "channel": "web",
  "stats": {
    "price_min": 25,
    "price_max": 1200,
    "price_median": 450,
    "rating_coverage": 0.72,
    "facets": [
      {
        "name": "gender",
        "values": [
          { "value": "Men's", "share": 0.45 },
          { "value": "Women's", "share": 0.40 }
        ]
      }
    ]
  },
  "config": {
    "modules": {
      "budget": true,
      "facet": true,
      "sort": true,
      "order": false,
      "cart": false,
      "policy": false
    },
    "thresholds": {
      "variance": 2.0,
      "facet_threshold": 0.2,
      "rating_threshold": 0.5
    }
  }
}
```

**Response:**

```json
{
  "option": "success",
  "chips": [
    { "label": "Under $450", "action": "filter_price_max:450", "priority": 90 },
    { "label": "Men's", "action": "filter_facet:gender:Men's", "priority": 75 },
    { "label": "Women's", "action": "filter_facet:gender:Women's", "priority": 74 },
    { "label": "Best Rated", "action": "sort:rating_desc", "priority": 80 }
  ],
  "trace": [
    { "module": "BudgetModule", "fired": true, "reason": "Variance ratio 48.0x exceeds threshold 2x" },
    { "module": "FacetModule", "fired": true, "reason": "Generated 2 chips from facets exceeding 20% share" },
    { "module": "SortModule", "fired": true, "reason": "Rating coverage 72% exceeds threshold 50%" }
  ]
}
```

Full API reference: [packages/engine/API.md](./packages/engine/API.md)

---

## Key Features

### 1. Intent-Based Module Routing

Each intent activates specific modules. No need to run all logic for every request:

```typescript
// Product Discovery → BudgetModule + FacetModule + SortModule
// Track Order → OrderModule only
// Checkout Help → CartModule only
// Check Policy → PolicyModule only
```

### 2. Priority-Based Ranking

Chips are ranked by priority (descending). When channel limits apply (WhatsApp = 3, Web = 6), lower-priority chips are dropped:

```typescript
Priority 90: Budget chips (price is the most impactful filter)
Priority 80: Sort chips
Priority 70-80: Facet chips (higher share = higher priority)
```

### 3. Configurable Thresholds

Change module behavior without code changes:

```json
{
  "thresholds": {
    "variance": 2.0,          // Budget module: max/min must exceed 2x
    "facet_threshold": 0.2,   // Facet module: 20% share minimum
    "rating_threshold": 0.5   // Sort module: 50% coverage minimum
  }
}
```

### 4. Store-Specific Configuration

Each store can have unique settings:

```json
{
  "store": {
    "enable_cod": true,
    "free_shipping_threshold": 50,
    "support_phone": "+1-800-555-0199",
    "refund_window": "30 days"
  }
}
```

### 5. Trace/Debug Output

Every response includes a trace showing which modules fired and why:

```json
{
  "trace": [
    { "module": "BudgetModule", "fired": true, "reason": "Variance ratio 48.0x exceeds threshold 2x" },
    { "module": "FacetModule", "fired": false, "reason": "No facet had 2+ values exceeding 20% share" }
  ]
}
```

---

## Testing

The engine has **55 tests** across 9 files with 100% coverage of module logic:

```bash
# Run all tests
pnpm --filter @smartchip/engine test

# Test coverage breakdown:
# - BudgetModule: 6 tests (variance edge cases, price formatting)
# - FacetModule: 6 tests (multi-facet, priority sorting)
# - SortModule: 4 tests (coverage thresholds)
# - OrderModule: 6 tests (auth states, delivered orders)
# - CartModule: 8 tests (empty cart, COD toggle, upsell)
# - PolicyModule: 7 tests (returns, shipping, warranty)
# - Pipeline: 7 tests (ranking, truncation, all modules disabled)
# - Validation: 6 tests (Zod schema edge cases)
# - Server: 5 tests (HTTP endpoints, CORS, latency)
```

---

## Architecture Highlights

### Pure Function Core

The engine's core is a **pure function** — no database, no side effects, fully testable:

```typescript
function computeChips(request: ComputeChipsRequest): ComputeChipsResponse {
  // 1. Validate input
  // 2. Execute enabled modules
  // 3. Rank by priority (descending)
  // 4. Truncate to channel limit
  return { option: "success", chips, trace };
}
```

### Dual-Mode Deployment

The engine runs in two modes:

1. **HTTP Server** (production) — Express wrapper at `localhost:3001`
2. **In-Browser** (workbench) — Direct import for instant feedback, zero latency

The workbench uses Vite aliases to import only the core function, avoiding Node.js modules in the browser bundle (281KB vs 861KB).

### Module Interface

All modules follow a consistent interface:

```typescript
interface ChipModule {
  name: string;
  configKey: "budget" | "facet" | "sort" | "order" | "cart" | "policy";
  execute(request: ComputeChipsRequest): ModuleResult;
}

interface ModuleResult {
  chips: Chip[];
  trace: TraceEntry;
}
```

Adding a new module requires:
1. Implement the `ChipModule` interface
2. Add to `ALL_MODULES` registry
3. Add config toggle to `ModuleConfig`
4. Write tests

---

## Workbench Features

The workbench (`localhost:5173`) is a visual testing tool for PMs and developers:

### Intent Picker
Click between 4 intent cards to switch the entire UI configuration.

### Configurator Panel
- **Channel selector** — Web (max 6 chips) vs WhatsApp (max 3)
- **Dynamic Input** display — shows what's sent per request (cyan badge)
- **Module toggles** — enable/disable logic modules (gray badge)
- **Store config** — live-editable settings with instant feedback (amber badge)

### Scenario Builder
- 3 preset scenarios per intent
- Full Request JSON editor for custom scenarios
- Real-time validation

### Chat Simulator
- Simulated chat window with bot message + chip buttons
- Debug trace console showing module decisions
- Hover over chips to see action + priority

---

## Performance

- **Latency:** <50ms response time (check `X-Latency-Ms` header)
- **Bundle size:** 281KB workbench bundle (no Node.js modules)
- **Test suite:** 55 tests run in ~1.5 seconds

---

## Use Cases

### 1. E-Commerce Product Discovery
Help users narrow down large catalogs without typing:
- `[Under $100]` — budget filter
- `[Men's]` `[Women's]` — facet split
- `[Best Rated]` — sort option

### 2. Order Tracking
Reduce support tickets with self-service tracking:
- `[Track #1001]` — dynamic chip per order
- `[Login with Phone]` — for unknown users
- `[Talk to Agent]` — fallback to human

### 3. Checkout Optimization
Recover abandoned carts and remove friction:
- `[Checkout ($45.00)]` — proceed to payment
- `[Add $5 for Free Ship]` — upsell to threshold
- `[Pay with Cash (COD)]` — alternative payment

### 4. Policy FAQ + Session Recovery
Answer questions and pivot back to shopping:
- `[Read Full Policy]` — link to policy page
- `[Start a Return (30 days)]` — action with configured window
- `[Back to Shopping]` — keep session alive

---

## Configuration Examples

### Store A: Premium Electronics
```json
{
  "thresholds": {
    "variance": 3.0,
    "rating_threshold": 0.7
  },
  "store": {
    "enable_cod": false,
    "free_shipping_threshold": 100,
    "refund_window": "14 days"
  }
}
```

### Store B: Budget Fashion
```json
{
  "thresholds": {
    "variance": 1.5,
    "facet_threshold": 0.15
  },
  "store": {
    "enable_cod": true,
    "free_shipping_threshold": 35,
    "refund_window": "30 days"
  }
}
```

### Store C: B2B Marketplace
```json
{
  "thresholds": {
    "variance": 5.0,
    "facet_threshold": 0.3
  },
  "store": {
    "enable_cod": false,
    "support_phone": "+1-800-BUSINESS",
    "integration_type": "manual"
  }
}
```

---

## Tech Stack

- **Monorepo:** pnpm workspaces
- **Engine:** Node.js 22 + TypeScript 5.9 + Express 4 + Zod 3
- **Workbench:** React 19 + Vite 6 + Tailwind CSS 3
- **Testing:** Vitest 3 + supertest 7

---

## Contributing

Contributions welcome! Please:
1. Read [DEMO_GUIDE.md](./DEMO_GUIDE.md) to understand the system
2. Run `pnpm test` before submitting PRs
3. Add tests for new modules (see `__tests__/` for examples)
4. Follow the existing module interface pattern

---

## License

MIT

---

## Roadmap

- [ ] Additional modules: DealsModule, InventoryModule, PersonalizationModule
- [ ] Multi-language support for chip labels
- [ ] A/B testing framework for chip variations
- [ ] Analytics integration (click-through tracking)
- [ ] Chatbot Maker integration guide

---

## Credits

Built as a POC for demonstrating the **Input/Coded/Configured** architecture pattern in conversational commerce systems.
