---
slug: scaling-confidential-ai-inference
title: "Scaling Confidential AI Inference: Multi-Tenant Architecture in Cube"
author:
  name: "sammy oina"
  picture: "https://avatars.githubusercontent.com/u/44265300?v=4"
tags: [architecture, operations, multi-tenancy, confidential-computing, infrastructure, "cube ai"]
image: /img/scaling-confidential-ai-inference/scaling_confidential_ai_inference_cover.png
date: 2026-02-06
---

![Scaling Confidential AI Inference](/img/scaling-confidential-ai-inference/scaling_confidential_ai_inference_cover.png)

Confidential AI is quickly transitioning from research environments into production infrastructure. As enterprises deploy large language models across departments, customers, and workloads, the question is no longer *whether* AI can scale — but whether it can scale **securely**.

[Cube AI](https://docs.cube.ultraviolet.rs/architecture) is designed to answer that challenge.

Built around confidential computing, attested infrastructure, and domain-based multi-tenancy, Cube enables operations teams to run AI workloads at production scale without compromising isolation, auditability, or performance.

This article explores how Cube achieves multi-tenant confidential inference, the operational patterns that support it, and what it looks like to run real workloads in production.

<!--truncate-->

## The Architectural Foundation

At a high level, Cube separates control-plane responsibilities from confidential compute environments while maintaining a strongly observable and policy-driven infrastructure.

### Inference Flow

```
Client → Traefik → Cube Proxy → Auth → Audit → Route → Agent (CVM) → LLM Backend
```

Each layer is intentionally modular:

- **Proxy** handles routing, authorization, metrics, and audit.
- **Agent** runs inside a Confidential Virtual Machine (CVM) and performs attested inference.
- **SuperMQ + SpiceDB** provide identity and relationship-based access control.
- **OpenSearch, Prometheus, Jaeger** ensure production-grade observability.

The result is an architecture where security is not bolted on — it is intrinsic to request execution.

## Multi-Tenant Design Patterns in Cube

Multi-tenancy begins with a simple but powerful abstraction:

> **Every tenant is a Domain.**

Each request carries a domain identifier embedded directly into the API path:

```
/proxy/{domainID}/v1/chat/completions
```

This decision pushes tenant isolation upstream into the routing layer, preventing cross-tenant ambiguity before a request reaches compute.

### Layered Isolation Model

Cube enforces separation across multiple infrastructure layers:

| Layer | Isolation Mechanism |
| :--- | :--- |
| **API** | Domain ID embedded in request path |
| **Auth** | Per-domain RBAC via SpiceDB |
| **Audit** | Logs filtered by `session.domain_id` |
| **Database** | Schema-level separation through SuperMQ |
| **Compute** | Agent executes inside attested CVMs |

Rather than relying on a single boundary, Cube adopts a **defense-in-depth** posture — isolating identity, storage, compute, and telemetry.

This layered approach is critical for enterprises where regulatory requirements demand verifiable separation between customers or business units.

## Isolation Guarantees Between Tenants

Logical isolation is only half the story. In confidential AI environments, operators must also guarantee **runtime integrity**.

Cube achieves this through **Attestation-TLS (aTLS)** backed by hardware Trusted Execution Environments.

Supported platforms include:

- AMD SEV-SNP
- Intel TDX
- Azure Confidential VMs
- vTPM-backed environments

Before a connection is established, the proxy verifies the agent's cryptographic attestation against a stored measurement policy.

**Only workloads running inside verified environments receive traffic.**

### Why This Matters

In traditional multi-tenant AI systems, operators *trust* infrastructure boundaries.

In Cube, infrastructure **proves its integrity** before participating in inference.

This transforms tenant isolation from a policy assumption into a **cryptographically verifiable guarantee**.

## Resource Management and Quota Enforcement

Production AI systems fail not from lack of compute — but from **uncontrolled contention**.

Cube approaches resource governance through observability-first design, enabling operators to enforce quotas based on real usage patterns.

### Current Enforcement Signals

**Proxy Metrics**

- Request counters per domain
- Latency histograms
- OpenAI-compatible API usage tracking

**Transport Optimization**

```yaml
MaxIdleConns: 100
IdleConnTimeout: 90s
```

Connection reuse dramatically reduces handshake overhead during burst traffic.

**GPU Scheduling (vLLM)**

```
--gpu-memory-utilization 0.85
--max-model-len 1024
```

Continuous batching ensures high throughput without starving smaller tenants.

**Database Limits**

```
SMQ_POSTGRES_MAX_CONNECTIONS=100
```

Protects control-plane stability during traffic spikes.

### The Middleware Advantage

Cube's middleware stack allows operators to insert:

- Rate limiting
- Usage-based billing
- Token quotas
- Per-domain throttling

without redesigning the request pipeline.

This composability is what enables Cube to evolve from observability-driven governance toward fully automated quota enforcement.

## Monitoring and Observability in Confidential Environments

Confidential infrastructure does not mean invisible infrastructure.

Cube captures approximately **40 audit fields per request**, spanning identity, model behavior, and security posture.

### Example Audit Dimensions

**Identity**

- TraceID
- RequestID
- Session
- DomainUserID

**Model Telemetry**

- Model name
- Input/output tokens
- Temperature

**Security**

- TLS version
- Cipher suite
- Attestation type
- Attestation verification status

**Compliance**

- PII detection
- Content filtering flags
- Policy tags

### Log Pipeline

```
Application → JSON slog → Fluent Bit → OpenSearch
```

Indexes are rotated daily:

- `cube-audit-logs`
- `cube-error-logs`
- `cube-warn-logs`
- `cube-app`

Tracing flows through OTLP into Jaeger, enabling full request reconstruction across services.

For SRE teams, this means confidential workloads remain **fully diagnosable** without exposing sensitive payloads.

## Performance Optimization at Scale

Running inference inside CVMs introduces legitimate concerns around latency and throughput.

Cube mitigates these through architectural placement and transport efficiency.

### Dynamic Routing

Routes are stored in PostgreSQL and matched using priority rules across:

- Path
- Headers
- Query parameters
- Body fields

This enables traffic shaping such as:

- High-priority GPU routes
- Guardrail-enforced paths
- Region-specific inference

without redeploying services.

### Backend Flexibility

Cube supports multiple inference engines:

**Ollama**
- Ideal for general-purpose deployments
- Fast local model iteration

**vLLM**
- Continuous batching
- High GPU utilization
- Production throughput

Operators can mix both depending on workload characteristics.

### Middleware Execution Order

```
Request → Request ID → AuthN → Audit → AuthZ → Logging → Tracing → Metrics → Route → Reverse Proxy
```

By performing authorization early and routing late, Cube avoids unnecessary compute expenditure on rejected traffic.

This ordering becomes increasingly important at scale.

## Case Study: Running Production Workloads

Consider a SaaS provider deploying AI assistants across hundreds of enterprise customers.

Each customer receives:

- A dedicated domain
- Relationship-based access control
- Cryptographically attested compute
- Full audit traceability

Traffic enters through Traefik, is authenticated via SuperMQ, authorized through SpiceDB, audited in real time, and routed into a verified CVM agent.

Even during burst demand:

- Connection pools prevent transport thrashing
- Continuous batching maximizes GPU efficiency
- Middleware enables future quota enforcement

Most importantly — **no tenant can observe or influence another tenant's workload**.

This is the operational bar modern AI platforms must meet.

## Deployment Topologies

Cube supports multiple deployment profiles:

**Default**

Includes proxy, agent, inference backends, and observability stack.

**Cloud**

Separates control-plane services from CVM-hosted agents — ideal for regulated environments.

**GPU Variant**

Dedicated vLLM configuration for high-throughput inference clusters.

This flexibility allows operators to align infrastructure with compliance boundaries and cost models.

## The Operational Takeaway

Scaling AI is no longer just a machine learning challenge. It is an **infrastructure discipline**.

Cube demonstrates that confidential computing, multi-tenancy, and production observability are not mutually exclusive — they are **mutually reinforcing**.

By combining:

- Domain-based tenancy
- Hardware-backed attestation
- Middleware-driven governance
- Deep telemetry
- Flexible routing

operations teams can deploy AI systems that scale without sacrificing trust.

## Key Takeaway

Operations teams can confidently deploy Cube AI at scale — with **verifiable isolation**, **production-grade observability**, and infrastructure designed for the realities of multi-tenant inference.

Confidential AI is not merely about protecting data. It is about building platforms enterprises are willing to trust.

---

*Cube is engineered for exactly that future. Explore the [Architecture](https://docs.cube.ultraviolet.rs/architecture) or get started with the [Deployment Guide](https://docs.cube.ultraviolet.rs/getting-started).*
