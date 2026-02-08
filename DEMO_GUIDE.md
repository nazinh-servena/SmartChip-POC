# Smart Chips Engine — Demo Guide

This guide demonstrates how the Smart Chips Engine clearly separates **INPUT** (dynamic data), **CODED** (logic rules), and **CONFIGURED** (static settings).

---

## Quick Start

```bash
# Start both servers (from project root)
pnpm dev:engine      # Engine API at http://localhost:3001
pnpm dev:workbench   # Workbench UI at http://localhost:5173
```

Then open [http://localhost:5173](http://localhost:5173) in your browser.

For an implementation-level architecture reference, see:
- `packages/engine/ARCHITECTURE.md`
- `packages/engine/API.md`

---

## The 3-Layer Architecture

| Layer | What It Is | Example | How to Change |
|-------|------------|---------|---------------|
| **INPUT** (Dynamic) | Data sent per request from the chatbot session | `auth_state: "known"`, `cart_value: 45.00` | Changes with every user interaction |
| **CODED** (Logic) | Hard-coded rules in the engine modules | "If max/min > variance → generate [Under $Median]" | Requires code deployment |
| **CONFIGURED** (Static) | Store-level settings that change behavior | `enable_cod: true`, `free_shipping_threshold: 50` | Edit JSON config, no code changes |

---

## Intent Overview

The Smart Chips Engine supports 4 intents. Each intent activates different modules:

| Intent | Module(s) | Purpose |
|--------|-----------|---------|
| `product_discovery` | BudgetModule + FacetModule + SortModule | Search → Chips → Refine loop |
| `track_order` | OrderModule | Post-purchase support |
| `checkout_help` | CartModule | Cart abandonment / closing |
| `check_policy` | PolicyModule | Information requests + shopping pivot |

---

## Demo Scenarios

### 1. Intent: `product_discovery`

**Goal:** Help users narrow down a large product catalog.

#### Preset: "Mixed Bag"
- **INPUT:** Price range $25–$1200, mixed genders (45% Men's, 40% Women's), 72% items have ratings
- **CODED:** BudgetModule checks if max/min > 2.0x → generates "Under $Median" chip
- **CONFIGURED:** Variance threshold = 2.0x, Facet share = 20%, Rating coverage = 50%
- **Output:** 4+ chips — `[Under $450]`, `[Men's]`, `[Women's]`, `[Best Rated]`

**Try This:**
1. Select "Product Discovery" intent
2. Pick "Mixed Bag" preset
3. In Configurator, adjust **Price Variance** slider to 5.0x → "Under $450" chip disappears (ratio 48x still exceeds threshold, but changing to 50x would remove it)
4. Toggle **BudgetModule** off → "Under $450" disappears instantly
5. Switch to **WhatsApp** channel → chips truncate to max 3 (highest priority wins)

#### Preset: "Cheap & Simple"
- Price range $10–$18 (ratio 1.8x)
- **Expected:** BudgetModule does NOT fire (below 2.0x threshold)
- **Output:** Only `[Best Rated]` (if ratings > 60%)

---

### 2. Intent: `track_order`

**Goal:** Help users track orders without typing long order IDs.

#### Preset: "Known User + Orders"
- **INPUT:** `auth_state: "known"`, 2 active orders (#1001 shipped, #1002 processing)
- **CODED:** If known + orders exist → generate dynamic Track chips per order
- **CONFIGURED:** `support_phone: "+1-800-555-0199"`
- **Output:** `[Track #1001]`, `[Track #1002]`, `[Talk to Agent]`

**Try This:**
1. Select "Track Order" intent
2. Pick "Known User + Orders" preset
3. In Configurator → **Store Config** section → clear the **Support Phone** field
4. **Result:** "Talk to Agent" chip disappears (config controls whether agent handoff is offered)

#### Preset: "Unknown User"
- **INPUT:** `auth_state: "unknown"`, no orders
- **CODED:** If unknown → offer login/manual entry
- **Output:** `[Login with Phone]`, `[Enter Order ID]`, `[Talk to Agent]`

#### Preset: "Delivered Order"
- **INPUT:** Order #888 status = "delivered"
- **CODED:** If delivered → offer Report Issue + Return
- **Output:** `[Track #888]`, `[Report Issue]`, `[Return Item]`, `[Talk to Agent]`

---

### 3. Intent: `checkout_help`

**Goal:** Push users to complete checkout or recover abandoned carts.

#### Preset: "Cart with Items"
- **INPUT:** 3 items, $45 cart value, COD available
- **CODED:** If cart_value < free_shipping_threshold → generate upsell chip
- **CONFIGURED:** `enable_cod: true`, `free_shipping_threshold: 50`
- **Output:** `[Checkout ($45.00)]`, `[Add $5.00 for Free Ship]`, `[Pay with Cash (COD)]`, `[View Cart]`

**Try This:**
1. Select "Checkout Help" intent
2. Pick "Cart with Items" preset
3. In Configurator → **Store Config** → toggle **Enable Cash on Delivery (COD)** OFF
4. **Result:** "Pay with Cash (COD)" chip disappears
5. Adjust **Free Shipping Threshold** slider to $40 → upsell chip disappears (cart already exceeds threshold)

#### Preset: "Empty Cart"
- **INPUT:** `cart_count: 0`
- **CODED:** If empty → push to browse
- **Output:** `[Browse Products]`, `[View Deals]`

#### Preset: "Above Free Ship"
- **INPUT:** $75 cart value (exceeds $50 threshold)
- **CODED:** No upsell chip generated
- **Output:** `[Checkout ($75.00)]`, `[Pay with Cash (COD)]`, `[View Cart]` (no upsell)

---

### 4. Intent: `check_policy`

**Goal:** Answer policy questions and pivot back to shopping (prevent session death).

#### Preset: "Returns Policy"
- **INPUT:** `policy_type: "returns"`, user viewing "Nike Air Max 90"
- **CODED:** If returns → offer "Start a Return" + include refund window in label
- **CONFIGURED:** `refund_window: "30 days"`, policy links
- **Output:** `[Read Full Policy]`, `[Start a Return (30 days)]`, `[View Nike Air Max 90]`, `[Back to Shopping]`, `[View Best Sellers]`

**Try This:**
1. Select "Check Policy" intent
2. Pick "Returns Policy" preset
3. In Configurator → **Store Config** → change **Refund Window** to `"14 days"`
4. **Result:** Chip label updates instantly to `[Start a Return (14 days)]`

#### Preset: "Shipping Policy"
- **INPUT:** `policy_type: "shipping"`
- **CODED:** If shipping → pivot to order tracking
- **Output:** `[Read Full Policy]`, `[Track My Order]`, `[Back to Shopping]`, `[View Best Sellers]`

#### Preset: "Warranty Check"
- **INPUT:** `policy_type: "warranty"`, product = "MacBook Pro 16\""
- **CONFIGURED:** `refund_window: "1 year"`
- **Output:** `[Read Full Policy]`, `[Check Warranty Status]`, `[View MacBook Pro 16"]`, `[Back to Shopping]`, `[View Best Sellers]`

---

## Key Workbench Features

### Intent Picker (Top Row)
- 4 intent cards with color-coded icons
- Click to switch between intents — entire UI reconfigures

### Configurator (Left Column)
- **Channel** selector (Web vs WhatsApp) — affects max chip count
- **Dynamic Input** section (cyan badge) — shows what's sent per request
- **Coded Logic** section (gray badge) — toggle modules on/off
- **Store Config** section (amber badge) — live editable store settings

### Scenario Builder (Middle Column)
- 3 preset buttons per intent
- Full Request JSON editor for custom scenarios
- JSON validation with red border on errors

### Chat Simulator (Right Column)
- Simulated chat window with bot message + chip buttons
- **Debug Trace** console showing which modules fired and why
- Hover over chips to see action + priority

---

## How Modules Make Decisions

### BudgetModule (Product Discovery)
```typescript
CODED: If (price_max / price_min) > variance_threshold → Generate "Under $Median"
```
- **INPUT:** `price_min`, `price_max`, `price_median`
- **CONFIGURED:** `variance_threshold` (default 2.0x)
- **Priority:** 90 (highest — price is the most impactful filter)

### FacetModule (Product Discovery)
```typescript
CODED: If 2+ facet values exceed facet_threshold → Generate chip per value
```
- **INPUT:** `facets` array with name + values (share %)
- **CONFIGURED:** `facet_threshold` (default 20%)
- **Priority:** 70–80 (based on share — higher share = higher priority)

### SortModule (Product Discovery)
```typescript
CODED: If rating_coverage > rating_threshold → Generate "Best Rated"
```
- **INPUT:** `rating_coverage` (0.0 to 1.0)
- **CONFIGURED:** `rating_threshold` (default 50%)
- **Priority:** 80

### OrderModule (Track Order)
```typescript
CODED:
  - If auth_state = "unknown" → Login + Manual Entry
  - If auth_state = "known" + orders exist → Track #ID per order
  - If order status = "delivered" → Report Issue + Return
  - Always → Talk to Agent (if support_phone configured)
```
- **INPUT:** `auth_state`, `recent_orders[]`
- **CONFIGURED:** `support_phone`, `integration_type`
- **Priority:** 95 (login), 85–84 (track), 75–70 (issue/return), 60 (agent)

### CartModule (Checkout Help)
```typescript
CODED:
  - If cart_count = 0 → Browse + Deals
  - If cart_count > 0 → Checkout with value
  - If cart_value < free_shipping_threshold → Upsell chip
  - If enable_cod = true + "cod" in payment_methods → COD chip
```
- **INPUT:** `cart_count`, `cart_value`, `currency`, `payment_methods[]`
- **CONFIGURED:** `enable_cod`, `free_shipping_threshold`
- **Priority:** 95 (checkout), 85 (upsell), 80 (COD), 70 (view cart)

### PolicyModule (Check Policy)
```typescript
CODED:
  - Always → Read Full Policy (if link configured)
  - If policy_type = "returns" → Start a Return (with refund window)
  - If policy_type = "shipping" → Track My Order pivot
  - Always → Back to Shopping + View Best Sellers (session recovery)
```
- **INPUT:** `policy_type`, `current_product`
- **CONFIGURED:** `policy_links{}`, `refund_window`
- **Priority:** 90 (policy link), 85 (action), 75 (product), 60–55 (pivots)

---

## The Switchboard Concept

The Smart Chips Engine acts as a **configurable switchboard**:

```
User Intent → Module Selection → Dynamic Input + Static Config → Chip Output
```

**Example:** A store doesn't offer COD.
- **Without Smart Chips:** You'd need to modify chatbot code to remove COD logic.
- **With Smart Chips:** Set `"enable_cod": false` in the store config JSON. The CartModule sees this flag and stops generating the COD chip. Zero code changes.

**Example:** Store changes refund policy from 30 days to 14 days.
- Set `"refund_window": "14 days"` → PolicyModule updates the chip label instantly.

---

## Testing the API Directly

```bash
# Product Discovery
curl -X POST http://localhost:3001/v1/compute_chips \
  -H "Content-Type: application/json" \
  -d '{
    "intent": "product_discovery",
    "channel": "web",
    "stats": {
      "price_min": 25, "price_max": 1200, "price_median": 450,
      "rating_coverage": 0.72,
      "facets": [{"name": "gender", "values": [
        {"value": "Mens", "share": 0.45},
        {"value": "Womens", "share": 0.40}
      ]}]
    },
    "config": {
      "modules": {"budget": true, "facet": true, "sort": true, "order": false, "cart": false, "policy": false},
      "thresholds": {"variance": 2.0, "facet_threshold": 0.2, "rating_threshold": 0.5}
    }
  }'

# Track Order (Known User)
curl -X POST http://localhost:3001/v1/compute_chips \
  -H "Content-Type: application/json" \
  -d '{
    "intent": "track_order",
    "channel": "whatsapp",
    "stats": {"price_min":0,"price_max":0,"price_median":0,"rating_coverage":0,"facets":[]},
    "context": {
      "auth_state": "known",
      "recent_orders": [
        {"id": "1001", "status": "shipped"},
        {"id": "1002", "status": "processing"}
      ]
    },
    "config": {
      "modules": {"budget":false,"facet":false,"sort":false,"order":true,"cart":false,"policy":false},
      "thresholds": {"variance":2.0,"facet_threshold":0.2,"rating_threshold":0.5},
      "store": {"support_phone": "+1-800-555-0199"}
    }
  }'

# Checkout Help (Cart with Items)
curl -X POST http://localhost:3001/v1/compute_chips \
  -H "Content-Type: application/json" \
  -d '{
    "intent": "checkout_help",
    "channel": "web",
    "stats": {"price_min":0,"price_max":0,"price_median":0,"rating_coverage":0,"facets":[]},
    "context": {
      "cart_count": 3,
      "cart_value": 45.0,
      "currency": "USD",
      "payment_methods": ["stripe", "cod"]
    },
    "config": {
      "modules": {"budget":false,"facet":false,"sort":false,"order":false,"cart":true,"policy":false},
      "thresholds": {"variance":2.0,"facet_threshold":0.2,"rating_threshold":0.5},
      "store": {"enable_cod": true, "free_shipping_threshold": 50}
    }
  }'
```

---

## Success Metrics (from PRD)

- **Latency:** API responds in <50ms ✅ (check `X-Latency-Ms` header)
- **Safety:** 0% hallucinated chips ✅ (chips only fire when data supports them)
- **Usability:** Non-technical user can create scenarios and verify chip logic ✅

---

## Summary Table

| Intent | Module | Critical INPUT | Critical CONFIGURED | Chip Output Pattern |
|--------|--------|----------------|---------------------|---------------------|
| `product_discovery` | Discovery modules | `stats` (Price/Facets), `stage` | `variance_threshold`, `max_chips` | `[Under $X]`, `[Men/Women]`, `[Sort]` |
| `track_order` | OrderModule | `user_phone`, `order_history` | `tracking_provider`, `support_phone` | `[Track #123]`, `[Login]`, `[Agent]` |
| `checkout_help` | CartModule | `cart_total`, `items_count` | `cod_enabled`, `shipping_limit` | `[Checkout]`, `[Add for Free Ship]`, `[COD]` |
| `check_policy` | PolicyModule | `policy_type` (return/ship) | `refund_days`, `policy_links` | `[Start Return]`, `[Continue Shopping]` |

---

## Running Tests

```bash
# Engine tests (55 tests)
pnpm --filter @smartchip/engine test

# Build workbench (type-check + production bundle)
pnpm --filter @smartchip/workbench build
```

All 55 tests pass — 6 per discovery module (Budget, Facet, Sort), 6 for Order, 8 for Cart, 7 for Policy, plus 7 pipeline, 6 validation, and 5 HTTP tests.
