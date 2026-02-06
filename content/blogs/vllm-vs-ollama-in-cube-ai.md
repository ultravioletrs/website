---
slug: vllm-vs-ollama-in-cube-ai
title: "vLLM vs Ollama in Cube AI: Choosing the Right LLM Backend for Your Use Case"
author:
  name: "Washington Kamadi"
  picture: "https://avatars.githubusercontent.com/u/43080232?v=4&size=64"
tags: [architecture, devops, inference, vllm, ollama, "cube ai"]
image: /img/vllm-vs-ollama-in-cube-ai/vllm_vs_ollama_cover.png
date: 2026-02-06
---

![vLLM vs Ollama in Cube AI](/img/vllm-vs-ollama-in-cube-ai/vllm_vs_ollama_cover.png)

Selecting the right Large Language Model (LLM) backend is no longer just an infrastructure decision — it directly impacts latency, throughput, operational cost, scalability, and developer velocity.

Cube AI is intentionally designed with **backend modularity**, allowing teams to switch between inference engines without changing application logic. Whether you prioritize **GPU-accelerated performance** or **lightweight local deployments**, Cube AI supports both paradigms through two production-ready backends:

- **vLLM** — optimized for high-throughput, GPU-driven inference
- **Ollama** — flexible, developer-friendly runtime for local and hybrid environments

The architectural takeaway is simple:

> **In Cube AI, the LLM backend is a swappable module behind a single environment variable.**

<!--truncate-->

## Backend Selection Architecture

Cube AI routes all inference traffic through a **backend-agnostic agent proxy**. The proxy simply forwards requests to whichever backend is configured.

```bash
UV_CUBE_AGENT_TARGET_URL=http://ollama:11434
# OR
UV_CUBE_AGENT_TARGET_URL=http://vllm:8000
```

Switching backends is operationally trivial:

```makefile
up-ollama: config-ollama
up-vllm:   config-vllm
```

- No application rewrites.
- No routing changes.
- No SDK updates.

Just redeploy.

### Why This Matters Architecturally

This design creates a clean separation between:

- Application layer
- Guardrails
- Proxy routing
- Inference engine

The agent (`httputil.NewSingleHostReverseProxy`) handles:

- Header sanitization
- Connection pooling (`MaxIdleConns: 100`)
- Idle timeout (`90s`)

From the application's perspective, the backend is invisible.

This is critical for:

- Multi-environment deployments
- Gradual GPU rollouts
- Cost optimization
- Performance experimentation

## Performance Benchmarks (Architectural Expectations)

While exact numbers vary by model and GPU class, the underlying architecture reveals clear performance behavior.

### Throughput

**vLLM**

- Continuous batching dramatically increases tokens/sec
- Designed for concurrent request handling
- Ideal for production APIs serving many users

**Ollama**

- Sequential processing model
- Excellent for low-to-moderate concurrency
- Predictable performance on smaller nodes

**Expected Winner: vLLM** (by design)

### Latency

Single-request latency:

- Ollama performs well for isolated prompts.
- vLLM shines under load due to batching efficiency.

**Important Insight:**
If your system sees burst traffic, vLLM latency often *improves* relative to sequential engines.

### Memory Usage

**vLLM**

Explicit control:

```
--gpu-memory-utilization 0.85
--max-model-len 1024
```

Predictable GPU allocation is extremely valuable for capacity planning.

**Ollama**

- Automatic memory handling
- Model-dependent footprint
- Lower operational tuning overhead

**Trade-off:**

| Goal | Better Choice |
| :--- | :--- |
| Deterministic GPU planning | vLLM |
| Operational simplicity | Ollama |

## vLLM: High-Performance GPU Inference

Cube AI deploys vLLM via:

```bash
vllm/vllm-openai:v0.10.2
```

Key characteristics:

- OpenAI-compatible API (`/v1/chat/completions`)
- NVIDIA runtime required
- Continuous batching
- HuggingFace model loading
- Cache volume for faster restarts
- Startup-defined model

Example:

```
VLLM_MODEL=microsoft/DialoGPT-medium
```

> Model changes require a restart — a deliberate design choice that stabilizes production behavior.

### When vLLM Is the Right Choice

Choose vLLM if your system requires:

- High tokens/sec
- Multi-tenant inference
- GPU saturation
- Production-scale APIs
- Predictable latency under load

Typical environments:

- Enterprise AI platforms
- Internal copilots
- Retrieval pipelines
- Customer-facing LLM APIs

## Ollama: Lightweight and Operationally Flexible

Cube AI ships Ollama as:

```bash
ollama/ollama:latest
```

Default auto-pulled models:

- `llama3.2:3b`
- `starcoder2:3b`
- `nomic-embed-text:v1.5`

### Major Strength: Runtime Model Management

Unlike vLLM:

- Pull models without restart
- Delete unused models
- Push private builds

This dramatically improves developer velocity.

### Hardware Flexibility

| Capability | Ollama |
| :--- | :--- |
| CPU-only | Supported |
| NVIDIA GPU | Supported |
| AMD GPU | Supported |
| Edge devices | Supported |

This makes Ollama extremely attractive for:

- CVMs
- Edge inference
- On-prem deployments
- Secure environments

## Deployment Scenarios and Trade-offs

### Scenario 1 — Enterprise Production API

**Recommended: vLLM**

Why:

- Continuous batching
- GPU utilization
- OpenAI compatibility
- Predictable scaling

### Scenario 2 — Confidential / Air-Gapped Environment

**Recommended: Ollama**

Why:

- Runtime model control
- Hardware flexibility
- Easier offline workflows

### Scenario 3 — Developer Sandbox

**Recommended: Ollama**

- Startup friction is minimal.
- Perfect for experimentation.

### Scenario 4 — High-Concurrency SaaS

**Recommended: vLLM**

- Sequential engines become bottlenecks quickly.

## Cost Analysis and Resource Requirements

### vLLM Cost Profile

Higher infrastructure cost — lower cost per token at scale.

Requires:

- NVIDIA GPUs
- GPU-aware orchestration
- Capacity planning

Best when utilization is high. Idle GPUs are expensive.

### Ollama Cost Profile

Lower entry cost — higher marginal cost under heavy load.

Runs on:

- CPU nodes
- Mixed GPU fleets
- Smaller instances

Excellent for staged growth.

### Strategic Insight

**Start with Ollama. Move to vLLM when concurrency justifies GPU spend.**

Cube AI makes this migration trivial.

## Integration Patterns with Cube AI

### Proxy-Level API Exposure

Cube AI exposes both formats:

**OpenAI-Compatible**

```
POST /{domainID}/v1/chat/completions
GET  /{domainID}/v1/models
```

Works with both backends.

**Ollama-Native**

```
POST /api/chat
POST /api/generate
GET  /api/tags
```

Available when Ollama is active.

### Guardrails Integration

Guardrails currently leverage the `ExtendedOllama` LangChain adapter, enabling:

- Dynamic header injection
- Per-request model selection
- Option mapping (temperature, top_p, etc.)

Model config example:

```yaml
engine: CubeLLM
model: llama3.2:3b
base_url: http://cube-proxy:8900
```

Sensitive data detection is handled via:

- Presidio
- spaCy

Atomic configuration swaps ensure safe updates without downtime.

### HAL: Beyond Containers

Cube AI packages both backends inside the Hardware Abstraction Layer (HAL):

- Systemd services
- Init scripts
- Auto model provisioning

This enables bare-metal CVM deployments, not just Docker.

A critical advantage for confidential AI environments.

## Side-by-Side Comparison

| Dimension | Ollama | vLLM |
| :--- | :--- | :--- |
| **Version** | 0.12.3 | 0.10.2 |
| **API** | Native `/api/*` | OpenAI `/v1/*` |
| **GPU** | Optional | Required (NVIDIA) |
| **CPU Support** | Yes | No |
| **Model Mgmt** | Runtime | Startup |
| **Batching** | Sequential | Continuous |
| **Default Model** | `llama3.2:3b` | `DialoGPT-medium` |
| **Memory Config** | Automatic | Explicit |
| **Guardrails** | Native adapter | Via OpenAI |
| **Compose Profile** | default | vllm |

## The Architectural Insight That Matters Most

Cube AI treats inference engines like **infrastructure plugins**.

Not dependencies. Not lock-in points. Just modules.

Because of the agent proxy:

**Your application never needs to know which backend is running.**

This dramatically reduces platform risk.

## Decision Framework

**Choose vLLM if:**

- You operate at scale
- Latency under load matters
- GPU clusters are available
- You need maximum throughput

**Choose Ollama if:**

- You want operational flexibility
- You deploy to edge or CVMs
- You value runtime model control
- You are cost-sensitive early

## Key Takeaway

Cube AI eliminates the traditional trade-off between performance and flexibility.

You do not need to commit early. You can evolve your backend alongside your workload.

**Start lightweight. Scale when necessary. Switch without friction.**

That is the power of backend modularity.

---

*Explore Cube AI's backend architecture in the [Deployment Guide](https://docs.cube.ultraviolet.rs/getting-started) or learn more about [Cube AI Architecture](https://docs.cube.ultraviolet.rs/architecture).*
