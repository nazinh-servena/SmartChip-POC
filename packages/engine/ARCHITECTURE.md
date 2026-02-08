# Smart Chips Engine Architecture

This document describes how the Smart Chips Engine is structured, how a request flows through the system, and where to extend behavior safely.

For endpoint-level details, see `packages/engine/API.md`.

## Scope

- Package: `packages/engine`
- Public API: `POST /v1/compute_chips`
- Runtime model: stateless, synchronous, in-memory rule evaluation

## High-Level Design

The engine follows an orchestrator + modules pattern:

1. Validate the request.
2. Execute enabled modules.
3. Merge and rank generated chips.
4. Truncate chips to channel limits.
5. Return chips plus execution trace.

Core orchestrator:
- `packages/engine/src/core/compute-chips.ts`

## Component Map

- HTTP server
  - `packages/engine/src/server/app.ts`
  - Express app with CORS + JSON middleware
  - Endpoints:
    - `POST /v1/compute_chips`
    - `GET /health`
- Config hydration layer
  - `packages/engine/src/config/hydrate-request.ts`
  - Supports merchant-based config injection before compute.
- Merchant config schema and resolver
  - `packages/engine/src/config/merchant-config.ts`
  - Versioned config schema with explicit per-module parameter blocks.
- Validation
  - `packages/engine/src/core/validate.ts`
  - Zod schema validation with flattened error messages
- Pipeline helpers
  - `packages/engine/src/core/rank.ts`
  - `packages/engine/src/core/truncate.ts`
- Module registry
  - `packages/engine/src/modules/index.ts`
  - Ordered list: Budget, Facet, Sort, Order, Cart, Policy
- Module contract
  - `packages/engine/src/modules/types.ts`
  - `ChipModule` + `ModuleResult`
- Shared type contracts
  - `packages/types/src/request.ts`
  - `packages/types/src/response.ts`
  - `packages/types/src/channels.ts`

## Request Lifecycle

### 1) Ingress

`POST /v1/compute_chips` accepts JSON request body and starts latency timing.

### 2) Config Hydration (Hardening Layer)

Before validation/compute, the API can resolve config in two modes:
- Direct mode: caller sends full `config` in request.
- Merchant mode: caller sends `merchant_id`; server resolves versioned merchant config and maps it to engine config.

Merchant mode supports `config_overrides` (validated partial override), allowing per-request experiments without editing source merchant config.

### 3) Validation

`validateRequest(input)` enforces:
- channel is one of `web | whatsapp`
- stats and thresholds are present and in valid ranges
- module toggle object includes all module keys
- optional context/store structures are shape-checked
- optional `config.config_version` is a positive integer when present

If validation fails:
- response is `option: "error"`
- `chips: []`
- `trace: []`
- `error` contains joined issue messages

### 4) Module Execution

`computeChips` loops through `ALL_MODULES` in fixed order.

- If a module is enabled (`config.modules[configKey] === true`):
  - call `module.execute(request)`
  - append module chips
  - append module trace
- If disabled:
  - append a synthetic trace entry (`fired: false`, reason: disabled)

This guarantees one trace entry per module on every successful request.

### 5) Ranking and Channel Budget

- All chips are sorted by descending numeric `priority`.
- Chip list is truncated using `CHANNEL_LIMITS`:
  - `web`: 6
  - `whatsapp`: 3

### 6) Response

Successful response:
- `option: "success"`
- `chips`: ranked + truncated list
- `trace`: per-module execution details

## Module Reference

This section explains what each module does, which request fields it reads, and what each configuration parameter means.

### `BudgetModule` (`packages/engine/src/modules/budget-module.ts`)

Purpose:
- Detect wide price spread and suggest a budget-narrowing chip.

Reads from request:
- `stats.price_min`: lowest visible product price.
- `stats.price_max`: highest visible product price.
- `stats.price_median`: midpoint-like anchor used in generated chip label/action.
- `config.thresholds.variance`: trigger threshold for price spread.

Decision rule:
- Compute `ratio = price_max / price_min`.
- Fire only when `ratio > variance`.
- Generate one chip: `Under $<price_median>`.

Configuration parameter meaning:
- `variance`:
  - Meaning: minimum spread multiplier required before budget chip appears.
  - Example: `variance = 2.0` means "show chip only if max price is more than 2x min price".
  - Effect of raising value: module fires less often.
  - Effect of lowering value: module fires more often.

### `FacetModule` (`packages/engine/src/modules/facet-module.ts`)

Purpose:
- Suggest high-signal facet filters (brand, gender, color, etc.).

Reads from request:
- `stats.facets[]`: list of facets and value share distribution.
- `config.thresholds.facet_threshold`: minimum share per value to qualify.

Facet input semantics:
- Facet values are provided by the caller in `stats.facets`; the engine does not derive or infer them.
- `facet.name` is the filter group (for example: `brand`, `gender`, `color`).
- `values[].value` is a selectable option inside that group (for example: `Nike`, `Women's`, `Black`).
- `values[].share` is the fraction of current results matching that option (0 to 1).

Decision rule:
- For each facet, keep values where `share > facet_threshold`.
- Module emits chips only if at least 2 values in that facet qualify.
- One chip per qualifying value.

Configuration parameter meaning:
- `facet_threshold`:
  - Meaning: minimum proportion (0 to 1) a facet value must have to be shown.
  - Example: `0.2` means "value must represent more than 20% of results".
  - Effect of raising value: fewer facet chips (stricter).
  - Effect of lowering value: more facet chips (broader).

### `SortModule` (`packages/engine/src/modules/sort-module.ts`)

Purpose:
- Offer rating-based sorting only when rating data quality is sufficient.

Reads from request:
- `stats.rating_coverage`: fraction of results that have ratings (0 to 1).
- `config.thresholds.rating_threshold`: required minimum coverage.

Decision rule:
- Fire only when `rating_coverage > rating_threshold`.
- Generate one chip: `Best Rated` (`sort:rating_desc`).

Configuration parameter meaning:
- `rating_threshold`:
  - Meaning: minimum rating coverage required before offering "Best Rated".
  - Example: `0.5` means at least more than 50% of items should have ratings.
  - Effect of raising value: sort chip appears less often.
  - Effect of lowering value: sort chip appears more often.

Note on "rating coverage":
- This is runtime input (`stats.rating_coverage`), not static config.
- Config (`rating_threshold`) decides how much coverage is "good enough".

### `OrderModule` (`packages/engine/src/modules/order-module.ts`)

Purpose:
- Support track-order journeys (authentication, per-order tracking, issue/return fallback).

Reads from request:
- `context.auth_state`: `known | unknown`.
- `context.recent_orders[]`: order ids and statuses.
- `config.store.support_phone` (optional): enables handoff chip.
- `config.store.integration_type` (currently informational in logic).

Decision rule:
- Unknown user: offer login/manual entry.
- Known user: generate `Track #<id>` chips for non-returned orders.
- Delivered orders present: add issue/return chips.
- If `support_phone` exists: add `Talk to Agent`.

Configuration parameter meaning:
- `support_phone`:
  - Meaning: enables human handoff chip and sets target number.
- `integration_type`:
  - Meaning: declared tracking backend type; currently not branching rules in this module.

### `CartModule` (`packages/engine/src/modules/cart-module.ts`)

Purpose:
- Drive checkout completion and basket recovery.

Reads from request:
- `context.cart_count`, `context.cart_value`, `context.currency`, `context.payment_methods[]`.
- `config.store.free_shipping_threshold` (optional).
- `config.store.enable_cod` (optional).

Decision rule:
- Empty cart: emit browse/deals chips.
- Non-empty cart: emit checkout chip.
- If cart below free shipping threshold: emit upsell chip.
- If COD enabled and available in payment methods: emit COD chip.
- Always add `View Cart` for non-empty cart.

Configuration parameter meaning:
- `free_shipping_threshold`:
  - Meaning: minimum cart value for free shipping eligibility.
  - If cart is below it, module emits "Add $X for Free Ship".
- `enable_cod`:
  - Meaning: store policy switch for cash-on-delivery option.
  - COD chip appears only when this is true and `"cod"` exists in runtime payment methods.

### `PolicyModule` (`packages/engine/src/modules/policy-module.ts`)

Purpose:
- Answer policy intent and keep user in-session with shopping pivots.

Reads from request:
- `context.policy_type`: `returns | shipping | warranty | general`.
- `context.current_product` (optional).
- `config.store.policy_links` (optional map).
- `config.store.refund_window` (optional label helper).

Decision rule:
- If policy link exists for current policy type: emit `Read Full Policy`.
- Returns: emit `Start a Return` (includes refund window if set).
- Shipping: emit `Track My Order`.
- Warranty: emit `Check Warranty Status`.
- If product provided: emit product pivot chip.
- Always emit shopping pivots.

Configuration parameter meaning:
- `policy_links`:
  - Meaning: map from policy type to URL used in `Read Full Policy` action.
- `refund_window`:
  - Meaning: display text appended in return chip label (for example "30 days").

### Shared Module Toggles

`config.modules` controls whether each module executes at all:
- `budget`
- `facet`
- `sort`
- `order`
- `cart`
- `policy`

If a toggle is `false`, module logic is skipped and trace records "Module disabled by config".

## Data Contracts

Request contract (`ComputeChipsRequest`) includes:
- `intent` (informational string)
- `channel`
- `stats`
- optional `context` (union of order/cart/policy context)
- `config`:
  - optional `config_version` (for schema evolution)
  - `modules` (toggle map)
  - `thresholds`
  - optional `store`

API contract also supports merchant-hydrated mode:
- `merchant_id` (string): resolve config from server-side config source.
- optional `config_overrides`: validated partial override of modules/thresholds/store.

Response contract (`ComputeChipsResponse`) includes:
- `option: "success" | "error"`
- `chips: Chip[]`
- `trace: TraceEntry[]`
- optional `error`

## Important Design Notes

- Intent is not the router:
  - Module toggles control execution.
  - `intent` is currently metadata and can be inconsistent with toggles if caller misconfigures.
- Merchant config is now an explicit boundary:
  - Module code stays stable.
  - Store behavior changes through versioned config records.
- Modules are synchronous and deterministic:
  - No DB calls
  - No external API calls
  - Behavior depends only on input payload
- Trace is first-class:
  - Intended for explainability and debugging in the workbench

## Hardening Changes Implemented

1. Server-side merchant config source and hydration:
- Added `merchant_id` request support in API route.
- Added resolver that maps merchant config to runtime engine config.
- This enables a "logic once, configure per store" operating model.

2. Config schema versioning:
- Added `config.config_version` to engine request contract.
- Added merchant config schema with `config_version`.
- This supports controlled evolution/migration of configuration format.

3. Explicit per-module config blocks (merchant schema):
- Merchant config uses module-owned parameter blocks:
  - `budget.variance_threshold`
  - `facet.facet_share_threshold`
  - `sort.rating_coverage_threshold`
  - module-level `enabled` flags
- Mapping layer converts these blocks into engine runtime config.

4. Stable output interface preserved:
- Chip response shape remains `label/action/priority`.
- Trace contract is unchanged.
- Frontend/chatbot integrations are preserved while internal logic evolves.

## Evolution Path (Without Breaking API)

As long as request/response contracts are preserved, module internals can evolve:

1. Phase 1: Rules
- Module logic uses deterministic rules and static priority values.
- Current implementation.

2. Phase 2: Stats-Augmented Scoring
- Keep the same module interface and output.
- Replace static priority with score adjusted by aggregate metrics (for example CTR by chip/action).
- No frontend contract changes required.

3. Phase 3: Model-Based Scoring
- Keep the same module interface and output fields.
- Replace scoring/decision internals with model inference.
- Continue returning same chip object and trace structure.

## Creating a New Module

When adding a module, split the work into two tracks:
- Inside Smart Chips Engine (code + contracts)
- Outside Smart Chips Engine (callers, data sources, and action execution)

### A) What must be coded inside Smart Chips Engine

1. Create the module implementation.
- Add `packages/engine/src/modules/<new>-module.ts`.
- Implement `ChipModule` with:
  - `name`
  - `configKey`
  - `execute(request): ModuleResult`
- Return deterministic chips + a clear trace reason.

2. Register the module in the execution pipeline.
- Update `packages/engine/src/modules/index.ts`:
  - import the module
  - add it to `ALL_MODULES` in desired order
  - export it

3. Add a module toggle and type updates.
- Update `packages/types/src/request.ts`:
  - add a boolean flag in `ModuleConfig`
- If new input shape is needed, add/update request types:
  - context type
  - store config fields
  - threshold fields (if required)

4. Update request validation.
- Update `packages/engine/src/core/validate.ts`:
  - include the new module toggle in `config.modules`
  - validate any new context/store/threshold fields

5. Add tests.
- Add unit tests for module logic in `packages/engine/__tests__/`.
- Update pipeline tests to confirm:
  - module runs when enabled
  - module contributes trace entries
  - module is skipped when disabled
- Add validation tests for new request fields.

6. Optional workbench wiring (if using local demo UI).
- Update workbench controls/presets so users can send the new fields and toggle.
- This is outside engine runtime, but inside this monorepo.

### B) What must be done outside Smart Chips Engine

1. Provide the required dynamic input at runtime.
- The caller (chatbot/orchestrator/backend) must populate new request fields.
- Engine will not fetch external data itself.

2. Maintain store configuration for the new behavior.
- Persist and serve config values used by the module (for example per-merchant settings).
- Ensure config is injected into `request.config.store`/`thresholds`.

3. Execute chip actions in the consuming product.
- Engine returns `action` strings only.
- Your chatbot/app must map those actions to real operations:
  - navigation
  - API calls
  - handoff flows
  - checkout/order/policy workflows

4. Add guardrails and observability in the caller.
- Log request/response and trace for debugging.
- Monitor action success/failure after chip click.
- Enforce intent-level policy if needed (because engine execution is toggle-driven).

5. Rollout and versioning.
- Deploy engine changes and caller changes together or behind feature flags.
- Ensure older clients can still send valid payloads during rollout.

### Quick Checklist

- Engine module file added
- Module registered in `ALL_MODULES`
- `ModuleConfig` and request types updated
- Validation schema updated
- Tests added/updated
- Caller sends required input fields
- Store config pipeline updated
- Action handler added in chatbot/frontend
- Metrics and rollout plan ready

## Test Coverage Areas

Current tests validate:
- module behavior and edge cases
- pipeline behavior (sorting, truncation, disabled traces)
- schema validation failures
- HTTP behavior and latency header presence

See `packages/engine/__tests__/`.
