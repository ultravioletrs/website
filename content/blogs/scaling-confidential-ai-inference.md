---
slug: scaling-confidential-ai-inference
title: "Scaling Confidential AI Inference: Multi-Tenant Architecture in Cube"
excerpt: "How Cube uses confidential computing and domain-based multi-tenancy to securely scale AI inference across tenants at production."
description: "An in-depth look at Cube's multi-tenant architecture for confidential AI inference, combining confidential computing, attested infrastructure, and strong observability to securely run AI workloads at production scale."
author:
  name: "Washington Kamadi"
  picture: "https://avatars.githubusercontent.com/u/43080232?v=4&size=64"
tags: [architecture, operations, multi-tenancy, confidential-computing, infrastructure, "cube ai"]
category: architecture
coverImage: /img/scaling-confidential-ai-inference/scaling_confidential_ai_inference_cover.png
ogImage:
  url: /img/scaling-confidential-ai-inference/scaling_confidential_ai_inference_cover.png
date: 2026-02-06
---

![Scaling Confidential AI Inference](/img/scaling-confidential-ai-inference/scaling_confidential_ai_inference_cover.png)

Confidential AI is quickly transitioning from research environments into production infrastructure. As enterprises deploy large language models across departments, customers, and workloads, the question is no longer *whether* AI can scale — but whether it can scale **securely**. The challenge is multifaceted: organizations need to serve multiple tenants from shared infrastructure without leaking data between them, they need to prove that inference is happening inside trusted hardware rather than simply trusting that it is, and they need full observability into system behavior without exposing the sensitive payloads flowing through it.

[Cube AI](https://docs.cube.ultraviolet.rs/architecture) is designed to answer that challenge head-on.

Built around confidential computing, attested infrastructure, and domain-based multi-tenancy, Cube enables operations teams to run AI workloads at production scale without compromising isolation, auditability, or performance. Rather than treating security as an afterthought that gets bolted onto a working system, Cube weaves confidential computing guarantees into every layer of the request lifecycle — from the moment a request arrives at the edge proxy to the point where the LLM generates a response inside a hardware-attested enclave.

This article explores how Cube achieves multi-tenant confidential inference, the operational patterns that support it, and what it looks like to run real workloads in production.

<!--truncate-->

## The Architectural Foundation

At a high level, Cube separates control-plane responsibilities from confidential compute environments while maintaining a strongly observable and policy-driven infrastructure. The control plane — which handles authentication, authorization, routing, auditing, and metrics — runs in the operator's trusted environment, while the actual LLM inference happens inside Confidential Virtual Machines (CVMs) that provide hardware-level isolation and cryptographic attestation.

### Inference Flow

The full path of a request through Cube's architecture looks like this:

```
Client → Traefik → Cube Proxy → Auth → Audit → Route → Agent (CVM) → LLM Backend
```

Each layer in this pipeline is intentionally modular and serves a distinct purpose:

- **Proxy** is the central nervous system of the platform — it handles dynamic routing based on configurable priority rules, enforces authentication and authorization policies, collects Prometheus metrics for every request, and writes detailed audit logs capturing approximately 40 fields per request.
- **Agent** runs inside a Confidential Virtual Machine (CVM) and performs attested inference. Before the proxy will forward traffic to an agent, the agent must prove its runtime integrity through cryptographic attestation — ensuring that the code running inside the CVM has not been tampered with.
- **SuperMQ + SpiceDB** provide the identity and relationship-based access control (ReBAC) layer. SuperMQ handles authentication and session management, while SpiceDB (deployed as `authzed/spicedb:v1.30.0`) evaluates fine-grained authorization policies that determine which users and domains can access which resources.
- **OpenSearch, Prometheus, and Jaeger** form the observability stack. OpenSearch ingests structured audit logs via Fluent Bit for compliance and forensic analysis, Prometheus scrapes metrics from the proxy's `/metrics` endpoint for operational dashboards and alerting, and Jaeger collects distributed traces via OTLP for end-to-end request reconstruction across services.

The result is an architecture where security is not bolted on as an afterthought — it is intrinsic to every step of request execution, from the initial TLS handshake to the final token generation.

## Multi-Tenant Design Patterns in Cube

Multi-tenancy in Cube is built on top of **SuperMQ (SMQ)**, which serves as the multi-tenant identity and domain management provider. SMQ manages the domain abstraction that all tenant isolation is built upon, handling authentication, session management, and the relationship model that ties users, domains, and resources together.

The core abstraction SMQ exposes is simple but powerful:

> **Every tenant is a Domain.**

A domain is the fundamental unit of isolation in Cube's architecture. Each request carries a domain identifier embedded directly into the API path, which means tenant context is established at the very first moment a request enters the system:

```
/{domainID}/v1/chat/completions
```

The proxy extracts the `domainID` from the URL path (validated as a UUID), uses it for authentication, authorization, and audit scoping, and then strips it from the path before forwarding the request to the backend. This design decision pushes tenant isolation upstream into the routing layer, preventing any cross-tenant ambiguity before a request ever reaches compute resources. There is no shared namespace, no ambient tenant context that could accidentally leak — the tenant identity is explicit in every single request.

### Layered Isolation Model

Cube enforces separation across multiple infrastructure layers simultaneously, ensuring that a failure or misconfiguration in one layer cannot compromise isolation in another:

| Layer | Isolation Mechanism |
| :--- | :--- |
| **API** | Domain ID embedded in request path and validated as UUID |
| **Auth** | Per-domain relationship-based access control (ReBAC) via SpiceDB |
| **Audit** | Logs filtered and indexed by `session.domain_id` in OpenSearch |
| **Database** | Schema-level separation through SuperMQ's domain abstractions |
| **Compute** | Agent executes inside hardware-attested CVMs with aTLS verification |

Rather than relying on a single boundary to keep tenants apart, Cube adopts a **defense-in-depth** posture — isolating identity, storage, compute, and telemetry at each layer independently. If one layer were to be bypassed, the remaining layers would still enforce separation. This is particularly important for audit isolation: each domain's audit logs are tagged with `session.domain_id` and can be queried independently in OpenSearch, ensuring that one tenant's compliance officers cannot see another tenant's request patterns.

This layered approach is critical for enterprises operating in regulated industries where compliance frameworks such as SOC 2, HIPAA, or GDPR demand verifiable separation between customers or business units — not just a promise of isolation, but an auditable, cryptographically backed guarantee.

## Isolation Guarantees Between Tenants

Logical isolation through domain scoping and access control policies is only half the story. In confidential AI environments, operators must also guarantee **runtime integrity** — proving that the compute environment itself has not been tampered with and that the code executing inference is exactly the code that was intended to run.

Cube achieves this through **Attestation-TLS (aTLS)**, a protocol that extends the standard TLS handshake with hardware-backed attestation from Trusted Execution Environments (TEEs). During connection establishment, the agent running inside a CVM provides a cryptographic attestation report generated by the underlying hardware, which the proxy verifies against a stored measurement policy before allowing any traffic to flow.

Cube supports multiple confidential computing platforms, ensuring broad compatibility across cloud providers and hardware vendors:

- **AMD SEV-SNP** — Secure Encrypted Virtualization with Secure Nested Paging, providing memory encryption and integrity protection at the hardware level
- **Intel TDX** — Trust Domain Extensions, offering hardware-isolated virtual machines with cryptographic attestation
- **Azure Confidential VMs** — Microsoft Azure's confidential computing offering, integrated through the Microsoft Azure Attestation (MAA) service
- **Google Cloud Confidential VMs** — Google Cloud Platform's confidential computing offering, leveraging AMD SEV-SNP to protect VM memory during processing
- **vTPM** — virtual Trusted Platform Module, used in combination with AMD SEV-SNP to provide TPM-based attestation chains on supported platforms

The verification process is strict: before a connection is established, the proxy validates the agent's cryptographic attestation report against the expected measurements. **Only workloads running inside verified, unmodified environments receive traffic.** Any agent that cannot prove its integrity — whether due to unauthorized code modifications, missing TEE support, or a failed attestation check — is silently rejected.

### Why This Matters

In traditional multi-tenant AI systems, operators *trust* that infrastructure boundaries are intact. They assume that hypervisors are not compromised, that containers are properly isolated, and that no one has tampered with the inference service. These assumptions may be reasonable in many contexts, but they are fundamentally unverifiable.

In Cube, infrastructure **proves its integrity** before participating in inference. The hardware generates cryptographic evidence of the runtime environment's state, and this evidence is verified before any tenant data is processed. This transforms tenant isolation from a policy assumption — "we believe the infrastructure is secure" — into a **cryptographically verifiable guarantee** — "the hardware has attested that the environment is exactly what we expect."

## Resource Management and Quota Enforcement

Production AI systems rarely fail from a lack of raw compute power — they fail from **uncontrolled contention**. When multiple tenants share inference infrastructure without proper governance, a single tenant's burst traffic can starve others of resources, degrade latency across the board, and create unpredictable performance characteristics that make capacity planning impossible.

Cube approaches resource governance through an observability-first design philosophy, providing operators with the signals and control points they need to enforce quotas based on real usage patterns rather than theoretical estimates.

### Current Enforcement Signals

**Proxy Metrics**

The proxy exposes a Prometheus-compatible `/metrics` endpoint that tracks request counters per domain, latency histograms broken down by endpoint and status code, and OpenAI-compatible API usage metrics. These signals give operators real-time visibility into how each tenant is consuming inference capacity, enabling data-driven decisions about resource allocation and quota thresholds.

**Transport Optimization**

The agent's reverse proxy (implemented in `agent/agent.go`) configures its HTTP transport layer for efficient connection reuse:

```go
MaxIdleConns: 100
IdleConnTimeout: 90s
```

By maintaining a pool of up to 100 idle connections with a 90-second timeout, the agent avoids the overhead of establishing new TCP connections and TLS handshakes for every request. This is particularly important during burst traffic, where the connection setup overhead could otherwise dominate response times and create artificial bottlenecks.

**GPU Scheduling (vLLM)**

When using vLLM as the inference backend, GPU resources are managed through explicit configuration parameters:

```
--gpu-memory-utilization 0.85
--max-model-len 1024
```

The `--gpu-memory-utilization 0.85` flag reserves 85% of GPU memory for model inference, leaving a 15% safety margin for system operations. The `--max-model-len 1024` flag caps the maximum sequence length, directly controlling the KV-cache memory footprint. Combined with vLLM's continuous batching engine, these settings ensure high throughput without allowing a single tenant's long-context requests to starve smaller tenants of GPU resources.

**Database Limits**

The control-plane database enforces connection limits to prevent traffic spikes from overwhelming the metadata layer:

```
SMQ_POSTGRES_MAX_CONNECTIONS=100
```

This protects control-plane stability during traffic spikes by ensuring that authentication, authorization, and route lookups remain responsive even when inference traffic is at peak levels. Without this limit, a surge in new connections could exhaust PostgreSQL's connection pool and cascade into failures across the entire control plane.

### The Middleware Advantage

Cube's middleware stack is designed for composability. Because the proxy processes every request through a well-defined chain of middleware functions — authentication, audit, authorization, logging, tracing, and metrics — operators can insert additional governance layers such as rate limiting, usage-based billing, token quotas, and per-domain throttling without redesigning the request pipeline.

This composability is what enables Cube to evolve from observability-driven governance (where operators monitor usage and manually intervene) toward fully automated quota enforcement (where the system automatically throttles or rejects traffic that exceeds configured thresholds).

## Monitoring and Observability in Confidential Environments

Confidential infrastructure does not mean invisible infrastructure. One of the most common concerns about confidential computing is that the hardware isolation and encryption that protect sensitive data will also make the system opaque to operators — creating a black box that is impossible to monitor, debug, or audit. Cube addresses this concern directly by building comprehensive observability into every layer of the architecture.

Cube captures approximately **40 audit fields per request** (defined in the `Event` struct in `agent/audit/audit.go`), spanning identity, model behavior, security posture, and compliance signals. These fields are structured as JSON and provide a complete forensic record of every inference request that flows through the system.

### Example Audit Dimensions

**Identity**

Every request is tagged with a full identity context, including a distributed `TraceID` for correlating the request across services, a unique `RequestID` for identifying the specific request, a `Session` object that encapsulates the authenticated user's context, and a `DomainUserID` that ties the request to a specific user within a specific tenant domain. This identity chain makes it possible to answer questions like "which user in which domain made this request?" without any ambiguity.

**Model Telemetry**

The audit system captures LLM-specific metadata including the model name that was used for inference, the number of input and output tokens consumed (which directly maps to cost), and generation parameters such as temperature. This telemetry is essential for usage-based billing, capacity planning, and detecting anomalous inference patterns that might indicate misuse.

**Security**

Each audit event records the security posture of the connection, including the TLS version and cipher suite negotiated during the handshake, the attestation type used by the CVM agent (AMD SEV-SNP, Intel TDX, Azure, or vTPM), and whether the attestation verification succeeded or failed. Additionally, aTLS handshake duration is captured, giving operators visibility into the performance overhead of attestation.

**Compliance**

For environments subject to data protection regulations, the audit system tracks PII detection flags (powered by Presidio and spaCy in the guardrails pipeline), content filtering decisions, and configurable compliance policy tags. These fields enable compliance teams to verify that sensitive data is being handled according to policy without needing to inspect the actual request or response payloads.

### Log Pipeline

The audit data flows through a structured pipeline designed for reliability and searchability:

```
Application → JSON slog → Fluent Bit → OpenSearch
```

The application layer uses Go's standard `slog` library to emit structured JSON log entries, which Fluent Bit collects from Docker container logs, parses, and routes to the appropriate OpenSearch index based on log level and type. Indexes are organized by purpose and rotated for efficient storage management:

- `cube-audit-logs` — the primary audit trail containing all 40 fields for every inference request
- `cube-error-logs` — error-level events for alerting and incident response
- `cube-warn-logs` — warning-level events for proactive monitoring
- `cube-app` — general application logs for debugging and operational visibility

Distributed tracing flows through OTLP (OpenTelemetry Protocol) into Jaeger, enabling full end-to-end request reconstruction across all services in the pipeline. When an issue occurs, SRE teams can trace a request from the moment it entered Traefik through authentication, authorization, audit, routing, and inference — understanding exactly where time was spent and where failures occurred.

For SRE teams, this means confidential workloads remain **fully diagnosable** without exposing sensitive payloads. The audit system captures everything needed for debugging, compliance, and capacity planning while the actual inference data remains encrypted inside the CVM.

## Performance Optimization at Scale

Running inference inside Confidential Virtual Machines introduces legitimate concerns around latency and throughput. The attestation handshake adds overhead to connection establishment, the hardware encryption layer introduces a small but measurable cost per memory operation, and the overall architecture has more moving parts than a simple "application talks directly to GPU" deployment. Cube mitigates these concerns through careful architectural placement and transport efficiency, ensuring that the security guarantees do not come at an unacceptable performance cost.

### Dynamic Routing

Routes in Cube are stored in PostgreSQL and loaded into the proxy's in-memory router at startup, with the ability to update routes at runtime via the route management API without redeploying any services. Each route is matched using configurable priority rules that can evaluate across multiple dimensions including path patterns (with regex support), HTTP headers, query parameters, and request body fields.

This dynamic routing capability enables sophisticated traffic shaping strategies. For example, operators can configure high-priority routes that direct latency-sensitive requests to GPU-backed vLLM agents, guardrail-enforced paths that route chat traffic through the NeMo Guardrails pipeline for content filtering and PII detection, and region-specific inference routes that direct traffic to the nearest CVM cluster. All of this traffic shaping happens at the proxy level through configuration changes — no code changes, no redeployments, and no service restarts required.

### Backend Flexibility

Cube supports multiple inference engines, and the choice of backend can be configured per deployment or even per route:

**Ollama** is ideal for general-purpose deployments where operational simplicity and hardware flexibility are priorities. It supports CPU-only inference, runs on NVIDIA and AMD GPUs alike, and provides runtime model management that allows operators to pull, swap, and delete models without restarting the service. This makes it particularly well-suited for development environments, edge deployments, and confidential computing scenarios where GPU availability is not guaranteed.

**vLLM** is designed for high-throughput production workloads where GPU efficiency is paramount. Its continuous batching engine dynamically groups concurrent requests for parallel processing, maximizing GPU utilization and minimizing per-token cost. For multi-tenant SaaS deployments where hundreds of concurrent users share inference infrastructure, vLLM's ability to maintain stable response times under load makes it the clear choice.

Operators can select the appropriate backend based on workload characteristics, and Cube's proxy abstraction ensures that the switch is transparent to clients and application code.

### Middleware Execution Order

The proxy processes every request through a carefully ordered middleware chain:

```
Request → Request ID → AuthN → Audit → AuthZ → Logging → Tracing → Metrics → Route → Reverse Proxy
```

This ordering is deliberate and performance-conscious. By performing authentication and authorization early in the chain — before the request is routed to the inference backend — Cube ensures that unauthorized or unauthenticated requests are rejected immediately, without consuming CVM compute resources or GPU cycles. Audit logging happens after authentication but before authorization, ensuring that even rejected requests leave a forensic trail. Metrics and tracing capture the full lifecycle of every request, including failures.

This ordering becomes increasingly important at scale, where the cost of forwarding unauthorized traffic to expensive GPU-backed agents compounds rapidly. Every rejected request that never reaches the CVM is compute time and GPU memory saved for legitimate traffic.

## Case Study: Running Production Workloads

Consider a SaaS provider deploying AI assistants across hundreds of enterprise customers. Each customer has different compliance requirements, different usage patterns, and different expectations for data isolation. Some customers operate in regulated industries where they need provable evidence that their data never left a trusted execution environment. Others care primarily about performance and latency. All of them expect that their inference requests are completely invisible to every other customer on the platform.

With Cube, each customer receives:

- **A dedicated domain** — a unique domain ID that scopes every API call, audit log entry, and authorization decision to that specific customer
- **Relationship-based access control** — fine-grained permissions managed through SpiceDB that determine exactly which users within each domain can access which models and endpoints
- **Cryptographically attested compute** — inference executes inside hardware-attested CVMs, and the attestation report is verified before any traffic is forwarded, ensuring that the customer's data is processed only by trusted, unmodified code
- **Full audit traceability** — every request generates a structured audit event with 40 fields capturing identity, model telemetry, security posture, and compliance signals, all indexed by `session.domain_id` for per-tenant querying

The request lifecycle is end-to-end secure: traffic enters through Traefik at the edge, is authenticated via SuperMQ's identity layer, authorized through SpiceDB's relationship-based policy engine, audited in real time with structured JSON logging, and routed into a verified CVM agent that has proven its integrity through hardware attestation.

Even during burst demand, the architecture remains stable. Connection pools with 100 idle connections and 90-second timeouts prevent transport thrashing during traffic spikes. When using vLLM, continuous batching maximizes GPU efficiency by processing concurrent requests in parallel rather than queuing them sequentially. The composable middleware stack provides the insertion points needed for future quota enforcement, rate limiting, and usage-based billing as the platform scales.

Most importantly — **no tenant can observe or influence another tenant's workload**. The domain-scoped isolation, hardware attestation, and layered access control ensure that each customer's inference requests are processed in a cryptographically verified environment, logged independently, and billed accurately.

This is the operational bar that modern AI platforms must meet, and Cube is architected to deliver it from day one.

## Deployment Topologies

Cube supports multiple deployment topologies through its Docker Compose-based configuration, allowing operators to choose the profile that best matches their infrastructure requirements and compliance constraints.

**Default**

The default deployment profile (launched via `make up-ollama` or `make up-vllm`) includes the full Cube stack: the proxy service, the agent service, the chosen inference backend (Ollama or vLLM), the SuperMQ identity and authorization layer, the OpenSearch audit log store, Fluent Bit for log routing, Jaeger for distributed tracing, and Traefik as the edge reverse proxy. This profile is designed for development, testing, and single-node production deployments where all components run on the same infrastructure.

**Cloud**

The cloud deployment profile (defined in `docker/cloud-compose.yaml`) separates control-plane services from CVM-hosted agents. The control plane — including the proxy, SuperMQ, SpiceDB, OpenSearch, Fluent Bit, Jaeger, and the UI — runs in the operator's cloud environment, while the agent and inference backends run inside Confidential Virtual Machines in a separate trust domain. This topology is ideal for regulated environments where the compliance boundary requires that inference happens inside attested hardware while management and observability remain accessible to operations teams.

**GPU Variant**

The GPU variant uses a dedicated vLLM configuration (defined in `docker/vllm-compose.yml`) with NVIDIA container runtime, full GPU capability reservation, and explicit memory management. This profile is designed for high-throughput inference clusters where maximum GPU utilization and continuous batching are required to serve production traffic at scale.

This flexibility allows operators to align their infrastructure topology with their specific compliance boundaries, hardware availability, and cost models — starting with a simple default deployment and evolving toward a separated cloud topology as requirements mature.

## The Operational Takeaway

Scaling AI is no longer just a machine learning challenge — it is an **infrastructure discipline**. The models themselves are a solved problem; what remains unsolved for most organizations is how to serve those models securely, efficiently, and observably across multiple tenants at production scale.

Cube demonstrates that confidential computing, multi-tenancy, and production observability are not mutually exclusive — they are **mutually reinforcing**. Hardware attestation strengthens tenant isolation beyond what software-only approaches can achieve. Domain-based tenancy makes audit logging and compliance reporting straightforward. Deep observability through structured audit fields, distributed tracing, and Prometheus metrics gives operators the visibility they need to manage confidential workloads with the same confidence they bring to conventional infrastructure.

By combining domain-based tenancy for clean multi-tenant isolation, hardware-backed attestation for cryptographically verifiable runtime integrity, middleware-driven governance for composable policy enforcement, deep telemetry spanning 40 audit fields per request across identity, model behavior, security, and compliance, and flexible dynamic routing that enables traffic shaping without redeployments — operations teams can deploy AI systems that scale without sacrificing trust.

## Key Takeaway

Operations teams can confidently deploy Cube AI at scale — with **verifiable isolation**, **production-grade observability**, and infrastructure designed for the realities of multi-tenant inference.

Confidential AI is not merely about protecting data at rest or in transit. It is about building platforms that enterprises are willing to trust with their most sensitive workloads — platforms where isolation is provable, where audit trails are comprehensive, and where the infrastructure itself provides cryptographic evidence of its integrity. That is the standard Cube is built to meet.

---

*Cube is engineered for exactly that future. Explore the [Architecture](https://docs.cube.ultraviolet.rs/architecture) or get started with the [Deployment Guide](https://docs.cube.ultraviolet.rs/getting-started).*
