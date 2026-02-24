# RFC: Smart Chips Engine Production Readiness

Status: Draft  
Owner: Smart Chips Platform Team  
Last Updated: 2026-02-11

## 1. Goal

Define the architecture, controls, and delivery plan required to move Smart Chips Engine from POC to a production-grade, deployable service.

## 2. Scope

In scope:
- Runtime hardening for `POST /v1/compute_chips`
- Reliable config management for merchant-specific behavior
- Observability, operability, and SLO-driven reliability
- CI/CD, packaging, and deployment topology
- Security and compliance baseline controls
- Backward-compatible API and action contract governance

Out of scope:
- New chip modules or new intent business logic
- Major UX redesign of the Workbench

## 3. Current State (POC)

What exists:
- Deterministic module execution engine with solid unit/integration test coverage
- Express server exposing `POST /v1/compute_chips` and `GET /health`
- Merchant config hydration path with static in-repo configs
- Workbench UI for scenario simulation and threshold tuning

Main production gaps:
- No authn/authz at API boundary
- Always-200 API responses (no production error taxonomy)
- Static in-memory merchant configs
- Minimal security middleware and traffic controls
- No structured logs/metrics/traces
- No deploy artifacts (containerization + start/build release workflow)
- No CI/CD quality gates or progressive delivery

## 4. Production Requirements

### 4.1 Reliability & Performance
- P50 latency: <= 20 ms
- P95 latency: <= 75 ms
- P99 latency: <= 150 ms
- Availability SLO: 99.9% monthly for compute endpoint
- Error rate SLO: < 0.5% 5xx per rolling 30 minutes

### 4.2 Security
- Service-to-service authentication required
- Tenant isolation by `merchant_id` scope
- Strict CORS allowlist
- Rate limiting and abuse protections
- Input size limits and request timeout enforcement
- Security headers and dependency vulnerability scanning

### 4.3 Operability
- Structured logs with request id and merchant id
- Metrics for request volume, latency, error codes, module fire rates
- Distributed traces for request lifecycle
- Readiness/liveness probes and graceful shutdown
- Runbooks for incident response and rollback

### 4.4 Contract Stability
- Versioned API with explicit error envelope and error codes
- Versioned action contract (`chip.action`) with compatibility policy
- Release notes and change classification (breaking vs non-breaking)

## 5. Target Architecture

### 5.1 Runtime Components
- API Gateway / ingress with TLS termination and auth policy
- Smart Chips Engine service (stateless, horizontally scalable)
- Merchant Config Service or DB-backed config store
- Cache layer (optional) for merchant config snapshots
- Observability stack (logs, metrics, traces, alerting)

### 5.2 Request Flow
1. Client sends request with auth credential and `merchant_id`.
2. Gateway validates auth and forwards request with request-id.
3. Engine validates request schema and auth scope.
4. Engine fetches merchant config (cache-first, store fallback).
5. Engine applies validated overrides (if enabled by policy).
6. Engine computes chips deterministically and emits trace metadata.
7. Engine returns typed response with appropriate HTTP status.
8. Telemetry emitted asynchronously for logs/metrics/traces.

### 5.3 Deployment Model
- Build immutable container image per commit/tag
- Deploy on Kubernetes (or ECS equivalent) with min 2 replicas
- Blue/green or canary rollout with automated rollback on SLO breach
- Environment tiers: `dev`, `staging`, `prod`

## 6. API Hardening Plan

### 6.1 Response Semantics
- `200`: successful compute
- `400`: schema/validation errors
- `401/403`: auth and permission failures
- `404`: unknown merchant/config not found
- `429`: rate limited
- `500`: unhandled server error

Standard error envelope:
```json
{
  "option": "error",
  "error": {
    "code": "INVALID_REQUEST",
    "message": "stats.facets[0].values[1].share must be <= 1",
    "request_id": "req_...",
    "details": []
  }
}
```

### 6.2 Validation and Limits
- Enforce `Content-Type: application/json`
- Request payload size cap (for example 128 KB)
- Strict unknown-field handling for external API
- Per-field constraints for strings used in labels/actions

### 6.3 Action Contract
- Replace free-form `action: string` with versioned action schema
- Example namespace: `filter_facet.v1`, `checkout.v1`, `handoff.v1`
- Document parser/consumer contract and deprecation policy

## 7. Config Architecture Plan

Current problem:
- Merchant configs are hardcoded in code and require redeploy.

Target:
- Central config storage with schema validation and versioning.

Requirements:
- Per-merchant config versions and audit history
- Runtime reload and cache invalidation
- Safe fallback to last-known-good config
- Config publish workflow with staged rollout

## 8. Security Controls

- Add authentication middleware (JWT or mTLS, based on platform standard)
- Enforce merchant authorization by credential claims
- Add `helmet`, strict CORS, and rate limiter middleware
- Add request timeout and body parser limits
- Redact sensitive fields in logs
- Run dependency and container scanning in CI

## 9. Observability & SRE

Logs:
- JSON structured logging
- Required fields: timestamp, level, request_id, merchant_id, endpoint, duration_ms, status_code

Metrics:
- Request count by status code
- Latency histogram by endpoint and merchant tier
- Module execution counters (`module`, `fired`)
- Validation error counters by code/path class

Tracing:
- Trace spans: ingress, validation, config-fetch, compute, response
- Correlate trace id with logs

Alerting:
- 5xx spike
- P95 latency breach
- elevated `429` for hot tenants
- config fetch failures

## 10. CI/CD & Release Engineering

Required pipeline stages:
1. Lint + typecheck
2. Unit/integration tests
3. Contract tests (response + action schema)
4. Security scans (deps + image)
5. Build/publish container image
6. Deploy to staging + smoke tests
7. Canary prod rollout + automated rollback policy

Release policy:
- Semantic versioning
- Changelog required for every release
- Breaking contract changes require major version increment

## 11. Operational Readiness

Must-have runbooks:
- Service outage triage
- Elevated latency triage
- Config rollback procedure
- Canary rollback procedure
- Merchant-specific incident isolation

Maintenance:
- On-call rotation and escalation matrix
- Monthly resilience review and game day

## 12. Phased Delivery Plan

### Phase P0 (2-3 weeks): Safety Baseline
- API authn/authz, strict CORS, rate limiting, request limits
- Proper HTTP status mapping and typed error envelope
- Structured logging + request id propagation
- Readiness/liveness endpoints and graceful shutdown
- Container build + staging deployment path

Exit criteria:
- Pen-test checklist pass for API edge controls
- Staging soak test meets p95 and error SLO targets

### Phase P1 (3-5 weeks): Reliability & Governance
- External merchant config service with cache and fallback
- Metrics + tracing + alerting dashboards
- Action contract v1 formalization and compatibility tests
- CI/CD with canary and automated rollback

Exit criteria:
- 2-week stable staging with no Sev1 incidents
- Contract tests enforced as release gate

### Phase P2 (2-4 weeks): Scale & Compliance
- Tenant quotas and advanced abuse detection
- Disaster recovery rehearsal and RTO/RPO validation
- Audit logs for config changes and access
- Load testing at expected peak + 2x burst

Exit criteria:
- Production launch readiness review approved by Eng + SRE + Security

## 13. Prioritized Backlog

| Priority | Item | Why | Effort |
|---|---|---|---|
| P0 | Add auth middleware and merchant scope checks | Prevent unauthorized compute usage | M |
| P0 | Return correct HTTP status codes + error codes | Required for client reliability | S |
| P0 | Add security middleware (`helmet`, rate limits, size limits) | Reduce abuse and exploit surface | S |
| P0 | Add structured logging and request IDs | Incident debugging and auditability | S |
| P0 | Add Dockerfile + prod start/build scripts | Deployable artifact baseline | S |
| P1 | Externalize merchant config from code | Runtime config management at scale | M |
| P1 | Add OpenTelemetry metrics + traces | SLO monitoring and debugging | M |
| P1 | Define typed/versioned action schema | Prevent downstream breakage | M |
| P1 | Add CI/CD release gates and canary rollout | Safer deployments | M |
| P2 | Add quota management and tenant throttles | Fairness and cost control | M |
| P2 | DR playbook + failover rehearsal | Business continuity | M |

## 14. Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Contract drift between engine and consumers | Runtime failures in clients | Typed action schema + contract tests |
| Config service outage | Chip compute degradation | Cache + last-known-good fallback |
| Overly strict validation causing false negatives | User journey friction | Staged rollout + metrics by error code |
| Latency regressions from middleware | SLA breach | Benchmark gates and profiling in CI |

## 15. Decision Log (Initial)

- Keep compute engine deterministic and stateless.
- Separate runtime config from code deployment.
- Treat action schema as first-class API contract.
- Use SLO-driven rollout gates, not manual judgment only.

## 16. Definition of Done for Production Launch

Launch is approved only when:
- All P0 and P1 backlog items are completed
- SLO dashboards and alerts are live
- Security review is signed off
- Runbooks are tested with at least one game day
- Canary rollout and rollback are proven in staging and production
