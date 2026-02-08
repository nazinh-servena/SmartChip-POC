# Smart Chips Engine API

This document describes the HTTP API exposed by the Smart Chips Engine service.

## Base URL

- Local dev: `http://localhost:3001`

## Endpoints

### `POST /v1/compute_chips`

Compute chips from request input.

Supports two request modes:
- Direct config mode: caller provides full `config`.
- Merchant-hydrated mode: caller provides `merchant_id`; server resolves config.

#### Request Body (Direct Config Mode)

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
          { "value": "Women's", "share": 0.4 }
        ]
      }
    ]
  },
  "context": {
    "auth_state": "known",
    "recent_orders": [
      { "id": "1001", "status": "shipped" }
    ]
  },
  "config": {
    "config_version": 1,
    "modules": {
      "budget": true,
      "facet": true,
      "sort": true,
      "order": false,
      "cart": false,
      "policy": false
    },
    "thresholds": {
      "variance": 2,
      "facet_threshold": 0.2,
      "rating_threshold": 0.5
    },
    "store": {
      "support_phone": "+1-800-555-0199",
      "enable_cod": true,
      "free_shipping_threshold": 50,
      "policy_links": {
        "returns": "https://store.example.com/policies/returns"
      },
      "refund_window": "30 days"
    }
  }
}
```

#### Request Body (Merchant-Hydrated Mode)

```json
{
  "intent": "product_discovery",
  "channel": "web",
  "merchant_id": "demo-electronics",
  "stats": {
    "price_min": 25,
    "price_max": 1200,
    "price_median": 450,
    "rating_coverage": 0.72,
    "facets": []
  },
  "config_overrides": {
    "thresholds": {
      "variance": 3.0
    },
    "modules": {
      "sort": false
    }
  }
}
```

#### Field Reference

- `intent` (`string`): caller-defined label (metadata; does not directly route modules).
- `channel` (`"web" | "whatsapp"`): controls output chip cap.
- `stats` (`object`): discovery statistics.
- `context` (`object`, optional): one of order/cart/policy contexts.
- `config` (`object`, direct mode):
  - `config_version` (`number`, optional): config schema version.
  - `modules` (`object`): module enable/disable toggles.
  - `thresholds` (`object`):
    - `variance` (`number > 0`)
    - `facet_threshold` (`number 0..1`)
    - `rating_threshold` (`number 0..1`)
  - `store` (`object`, optional): store-level static settings.
- `merchant_id` (`string`, merchant mode): store id for server-side config lookup.
- `config_overrides` (`object`, optional, merchant mode): validated partial override for experiments.
- Threshold semantics:
  - `variance` (`number > 0`)
  - `facet_threshold` (`number 0..1`)
  - `rating_threshold` (`number 0..1`)

#### Successful Response

Always HTTP `200`.

```json
{
  "option": "success",
  "chips": [
    { "label": "Under $450", "action": "filter_price_max:450", "priority": 90 },
    { "label": "Best Rated", "action": "sort:rating_desc", "priority": 80 }
  ],
  "trace": [
    { "module": "BudgetModule", "fired": true, "reason": "Variance ratio 48.0x exceeds threshold 2x" },
    { "module": "FacetModule", "fired": false, "reason": "No facet had 2+ values exceeding 20% share threshold" },
    { "module": "SortModule", "fired": true, "reason": "Rating coverage 72% exceeds threshold 50%" },
    { "module": "OrderModule", "fired": false, "reason": "Module disabled by config" },
    { "module": "CartModule", "fired": false, "reason": "Module disabled by config" },
    { "module": "PolicyModule", "fired": false, "reason": "Module disabled by config" }
  ]
}
```

#### Validation Error Response

Also HTTP `200` (business error in payload, not transport error).

```json
{
  "option": "error",
  "chips": [],
  "trace": [],
  "error": "channel: Invalid enum value. Expected 'web' | 'whatsapp', received 'sms'"
}
```

Common error cases:
- Unknown `merchant_id` in merchant mode.
- Invalid `config_overrides` schema.
- Invalid payload shape/ranges.

#### Response Headers

- `X-Latency-Ms`: server-side compute latency in milliseconds as a string (example: `"1.24"`).
- CORS enabled (`Access-Control-Allow-Origin: *` by default in current setup).

#### Channel Chip Limits

- `web`: maximum 6 chips
- `whatsapp`: maximum 3 chips

## Intent and Module Coverage

`POST /v1/compute_chips` is the same endpoint for all intents.  
Different modules fire based on `config.modules` and request `context`.

### 1) `product_discovery` (Budget + Facet + Sort)

#### Request Example

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
    "config_version": 1,
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

#### Response Example

```json
{
  "option": "success",
  "chips": [
    { "label": "Under $450", "action": "filter_price_max:450", "priority": 90 },
    { "label": "Best Rated", "action": "sort:rating_desc", "priority": 80 },
    { "label": "Men's", "action": "filter_facet:gender:Men's", "priority": 75 },
    { "label": "Women's", "action": "filter_facet:gender:Women's", "priority": 74 }
  ],
  "trace": [
    { "module": "BudgetModule", "fired": true, "reason": "Variance ratio 48.0x exceeds threshold 2x" },
    { "module": "FacetModule", "fired": true, "reason": "Generated 2 chips from facets exceeding 20% share" },
    { "module": "SortModule", "fired": true, "reason": "Rating coverage 72% exceeds threshold 50%" },
    { "module": "OrderModule", "fired": false, "reason": "Module disabled by config" },
    { "module": "CartModule", "fired": false, "reason": "Module disabled by config" },
    { "module": "PolicyModule", "fired": false, "reason": "Module disabled by config" }
  ]
}
```

#### Field Notes

- Required `stats`: `price_min`, `price_max`, `price_median`, `rating_coverage`, `facets`.
- Uses thresholds:
  - `variance` for BudgetModule
  - `facet_threshold` for FacetModule
  - `rating_threshold` for SortModule

### 2) `track_order` (OrderModule)

#### Request Example

```json
{
  "intent": "track_order",
  "channel": "whatsapp",
  "stats": {
    "price_min": 0,
    "price_max": 0,
    "price_median": 0,
    "rating_coverage": 0,
    "facets": []
  },
  "context": {
    "auth_state": "known",
    "recent_orders": [
      { "id": "1001", "status": "shipped" },
      { "id": "1002", "status": "processing" }
    ]
  },
  "config": {
    "config_version": 1,
    "modules": {
      "budget": false,
      "facet": false,
      "sort": false,
      "order": true,
      "cart": false,
      "policy": false
    },
    "thresholds": {
      "variance": 2.0,
      "facet_threshold": 0.2,
      "rating_threshold": 0.5
    },
    "store": {
      "support_phone": "+1-800-555-0199"
    }
  }
}
```

#### Response Example

```json
{
  "option": "success",
  "chips": [
    { "label": "Track #1001", "action": "track_specific_order:1001", "priority": 85 },
    { "label": "Track #1002", "action": "track_specific_order:1002", "priority": 84 },
    { "label": "Talk to Agent", "action": "handoff:phone:+1-800-555-0199", "priority": 60 }
  ],
  "trace": [
    { "module": "BudgetModule", "fired": false, "reason": "Module disabled by config" },
    { "module": "FacetModule", "fired": false, "reason": "Module disabled by config" },
    { "module": "SortModule", "fired": false, "reason": "Module disabled by config" },
    { "module": "OrderModule", "fired": true, "reason": "User known — 2 active order(s), 0 delivered" },
    { "module": "CartModule", "fired": false, "reason": "Module disabled by config" },
    { "module": "PolicyModule", "fired": false, "reason": "Module disabled by config" }
  ]
}
```

#### Field Notes

- Required `context` fields:
  - `auth_state`: `"known"` or `"unknown"`
  - `recent_orders[]`: `{ id, status }`
- Optional store setting:
  - `store.support_phone` enables `Talk to Agent`.

### 3) `checkout_help` (CartModule)

#### Request Example

```json
{
  "intent": "checkout_help",
  "channel": "web",
  "stats": {
    "price_min": 0,
    "price_max": 0,
    "price_median": 0,
    "rating_coverage": 0,
    "facets": []
  },
  "context": {
    "cart_count": 3,
    "cart_value": 45.0,
    "currency": "USD",
    "payment_methods": ["stripe", "cod"]
  },
  "config": {
    "config_version": 1,
    "modules": {
      "budget": false,
      "facet": false,
      "sort": false,
      "order": false,
      "cart": true,
      "policy": false
    },
    "thresholds": {
      "variance": 2.0,
      "facet_threshold": 0.2,
      "rating_threshold": 0.5
    },
    "store": {
      "enable_cod": true,
      "free_shipping_threshold": 50
    }
  }
}
```

#### Response Example

```json
{
  "option": "success",
  "chips": [
    { "label": "Checkout ($45.00)", "action": "checkout:proceed", "priority": 95 },
    { "label": "Add $5.00 for Free Ship", "action": "navigate:upsell:5.00", "priority": 85 },
    { "label": "Pay with Cash (COD)", "action": "checkout:cod", "priority": 80 },
    { "label": "View Cart", "action": "navigate:cart", "priority": 70 }
  ],
  "trace": [
    { "module": "BudgetModule", "fired": false, "reason": "Module disabled by config" },
    { "module": "FacetModule", "fired": false, "reason": "Module disabled by config" },
    { "module": "SortModule", "fired": false, "reason": "Module disabled by config" },
    { "module": "OrderModule", "fired": false, "reason": "Module disabled by config" },
    { "module": "CartModule", "fired": true, "reason": "Cart has 3 item(s) worth $45.00 (free shipping at $50)" },
    { "module": "PolicyModule", "fired": false, "reason": "Module disabled by config" }
  ]
}
```

#### Field Notes

- Required `context` fields:
  - `cart_count`, `cart_value`, `currency`, `payment_methods[]`
- Optional store settings:
  - `store.free_shipping_threshold` for upsell chip
  - `store.enable_cod` (plus `"cod"` in `payment_methods`) for COD chip

### 4) `check_policy` (PolicyModule)

#### Request Example

```json
{
  "intent": "check_policy",
  "channel": "web",
  "stats": {
    "price_min": 0,
    "price_max": 0,
    "price_median": 0,
    "rating_coverage": 0,
    "facets": []
  },
  "context": {
    "policy_type": "returns",
    "current_product": "Nike Air Max 90"
  },
  "config": {
    "config_version": 1,
    "modules": {
      "budget": false,
      "facet": false,
      "sort": false,
      "order": false,
      "cart": false,
      "policy": true
    },
    "thresholds": {
      "variance": 2.0,
      "facet_threshold": 0.2,
      "rating_threshold": 0.5
    },
    "store": {
      "policy_links": {
        "returns": "https://store.example.com/policies/returns"
      },
      "refund_window": "30 days"
    }
  }
}
```

#### Response Example

```json
{
  "option": "success",
  "chips": [
    { "label": "Read Full Policy", "action": "link:https://store.example.com/policies/returns", "priority": 90 },
    { "label": "Start a Return (30 days)", "action": "flow:start_return", "priority": 85 },
    { "label": "View Nike Air Max 90", "action": "navigate:product:Nike Air Max 90", "priority": 75 },
    { "label": "Back to Shopping", "action": "navigate:shop", "priority": 60 },
    { "label": "View Best Sellers", "action": "navigate:best_sellers", "priority": 55 }
  ],
  "trace": [
    { "module": "BudgetModule", "fired": false, "reason": "Module disabled by config" },
    { "module": "FacetModule", "fired": false, "reason": "Module disabled by config" },
    { "module": "SortModule", "fired": false, "reason": "Module disabled by config" },
    { "module": "OrderModule", "fired": false, "reason": "Module disabled by config" },
    { "module": "CartModule", "fired": false, "reason": "Module disabled by config" },
    { "module": "PolicyModule", "fired": true, "reason": "Policy type \"returns\" — linked full policy, offered return flow, linked back to Nike Air Max 90, added shopping pivot" }
  ]
}
```

#### Field Notes

- Required `context` field:
  - `policy_type`: `"returns" | "shipping" | "warranty" | "general"`
- Optional `context.current_product` adds product pivot chip.
- Optional store settings:
  - `store.policy_links` controls `Read Full Policy` URL
  - `store.refund_window` is included in return chip label

### `GET /health`

Health check endpoint.

#### Response

HTTP `200`

```json
{ "status": "ok" }
```

## Curl Examples

### Compute Chips

```bash
curl -X POST http://localhost:3001/v1/compute_chips \
  -H "Content-Type: application/json" \
  -d '{
    "intent": "product_discovery",
    "channel": "web",
    "stats": {
      "price_min": 25,
      "price_max": 1200,
      "price_median": 450,
      "rating_coverage": 0.72,
      "facets": []
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
  }'
```

### Compute Chips (Merchant-Hydrated Mode)

```bash
curl -X POST http://localhost:3001/v1/compute_chips \
  -H "Content-Type: application/json" \
  -d '{
    "intent": "product_discovery",
    "channel": "web",
    "merchant_id": "demo-electronics",
    "stats": {
      "price_min": 25,
      "price_max": 1200,
      "price_median": 450,
      "rating_coverage": 0.72,
      "facets": []
    },
    "config_overrides": {
      "thresholds": { "variance": 3.0 }
    }
  }'
```

### Health Check

```bash
curl http://localhost:3001/health
```

## Implementation References

- API routes: `packages/engine/src/server/app.ts`
- Hydration layer: `packages/engine/src/config/hydrate-request.ts`
- Merchant config schema/resolver: `packages/engine/src/config/merchant-config.ts`
- Request validation: `packages/engine/src/core/validate.ts`
- Pipeline logic: `packages/engine/src/core/compute-chips.ts`
- Request types: `packages/types/src/request.ts`
- Response types: `packages/types/src/response.ts`
