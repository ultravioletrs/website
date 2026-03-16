---
slug: cube-ai-public-beta-launch
title: "Cube AI Public Beta: The Future of Confidential LLM Inference is Here"
excerpt: "We are incredibly excited to announce the public beta release of Cube AI. Unlock the power of open-source, hardware-secured generative AI. Build and deploy agentic workflows with absolute data privacy using Trusted Execution Environments."
description: "Discover Cube AI, the open-source framework by Ultraviolet for secure, agentic LLM inference. Learn how we use AMD SEV-SNP and Intel TDX to secure vLLM and Ollama deployments."
author:
  name: "sammy oina"
  picture: "https://avatars.githubusercontent.com/u/44265300?v=4"
tags: [confidential-computing, ai, privacy, "cube ai", beta-launch, open-source]
date: 2026-03-04
image: /img/cube-beta-launch-cover.png
ogImage:
  url: /img/cube-beta-launch-cover.png
featured: true
category: announcement
---

The maturation of generative artificial intelligence has arrived at a structural impasse. While Large Language Models (LLMs) offer unprecedented cognitive capabilities, their deployment within enterprise environments is fundamentally constrained by a crisis of digital sovereignty and data privacy.

Organizations have been forced into a binary choice: sacrifice proprietary data and intellectual property to public cloud providers or forego the advantages of cutting-edge AI. Today, that choice is obsolete.

We are incredibly excited to announce the **Public Beta of Cube AI**, an open-source framework developed by Ultraviolet that pioneers a "Confidential-by-Design" architecture. By leveraging hardware-based Trusted Execution Environments (TEEs), Cube AI secures the entire AI inference lifecycle.

<!--truncate-->

## The Imperative of Confidential Computing

Traditional security models focus on data at rest and data in transit. However, the computational nature of LLMs requires data to be "in use," which traditionally necessitates decryption within the system's memory. This moment of decryption creates a critical vulnerability: host operating systems, hypervisors, and cloud providers can potentially access sensitive prompts, model weights, and intermediate states.

Confidential computing addresses this through **Trusted Execution Environments (TEEs)**. Cube AI utilizes these secure enclaves to create a hardware-enforced perimeter around the AI inference engine, shielding it from unauthorized access—even if the host environment is fully compromised.

### Hardware-Rooted Trust

Cube AI provides software enablement for leading TEE architectures: **[AMD SEV-SNP and Intel TDX](/blog/amd-sev-snp-vs-intel-tdx)**. By integrating with Buildroot and custom Linux kernels, we minimize the Trusted Computing Base (TCB), thereby significantly reducing the attack surface.

To achieve this deep hardware integration, Cube AI relies on the open-source **[Cocos AI](https://cocos.ai)** framework—another flagship platform from Ultraviolet. Cocos AI provisions the secure **Hardware Abstraction Layer (HAL)** and manages the intricate **Remote Attestation** protocols. By leveraging Cocos, a client can cryptographically verify that the AI model is running inside a genuine hardware enclave with an unmodified software configuration. This establishes true "Zero Trust" at the hardware level.

## Architectural Innovation: The Cube AI Stack

Cube AI is not merely a wrapper around existing LLM backends; it is a multi-tenant, microservices-based framework designed for scalability and secure governance.

### Multi-Tenancy and Domain Isolation
At the heart of the platform's scalability is the **SuperMQ** microservices architecture. It handles identity management natively and ensures that each domain acts as a strictly isolated workspace, preventing data leakage between different departments or organizations.

![Domain Overview UI](https://cube.ultraviolet.rs/img/ui/domain-overview.png)
![Routes Management UI](https://cube.ultraviolet.rs/img/ui/routes.png)

### High-Performance Inference Backends
We support two primary [inference backends](/blog/vllm-vs-ollama-in-cube-ai) to suit varying computational needs:
*   **Ollama**: Ideal for lightweight model management, local deployments, and rapid prototyping.
*   **vLLM**: Built for production environments requiring high throughput. Utilizing PagedAttention and continuous batching, vLLM maximizes memory efficiency and inference speed. When deployed within a Cube AI TEE, model weights and intermediate tensors remain encrypted throughout the execution cycle.

![Models UI](https://cube.ultraviolet.rs/img/ui/models.png)

### The Cube Proxy & Security Guardrails
The Cube Proxy serves as the hardened gateway, providing an **OpenAI-compatible API**. This allows organizations to leverage existing Python or JavaScript SDKs effortlessly.

Beyond hardware isolation, our integrated Guardrails Service enforces proactive defense against prompt injection, output sanitization, and automatic **PII (Personally Identifiable Information) redaction** through Microsoft Presidio. Hot-reload capabilities ensure administrators can update safety rules with zero downtime.

![Guardrails UI](https://cube.ultraviolet.rs/img/ui/guardrails.png)
![Audit Logs UI](https://cube.ultraviolet.rs/img/ui/audit-logs.png)

## Benchmarking Performance

A critical concern for enterprise adoption is the performance overhead associated with TEE-based inference. Research demonstrates that these overheads are increasingly minimal.

The total latency (`L_total`) of a confidential inference request can be modeled as:

> `L_total = L_network + L_attestation + L_inference + L_encryption`

Where `L_attestation` represents the time taken for remote verification and `L_encryption` accounts for the hardware-level memory encryption overhead. With continuous batching in our vLLM backend, Cube AI achieves high throughput (approximately 85-95% of native performance) in multi-user scenarios.

## Tooling Ecosystem: IDEs and Secure RAG

We prioritize a "developer-first" approach to ensure seamless integration:
*   **IDE Support**: Native integration with "Continue" and OpenCode IDE ensures safe AI-assisted development without intellectual property leakage.
*   **Secure Embeddings (RAG)**: Generate embeddings entirely within the TEE. This ensures that sensitive documents are properly vectorized for Retrieval-Augmented Generation architectures without ever exposing raw text to an external provider.
*   **Secure Chat**: Provide users with an end-to-end encrypted chat interface powered by verifiable hardware attestation for maximum privacy.

![Secure Chat UI](https://cube.ultraviolet.rs/img/chat-ui.png)

## The Future is Confidential: Join the Beta

The launch of Cube AI is a major milestone towards securing agentic workflows. As we align with Ultraviolet's broader mission in the Confidential Computing Consortium, future iterations will include Model Context Protocol (MCP) integrations, scaling to H100 and Blackwell GPUs, and deep integration with **[Prism AI](/blog/prism-public-beta-launch)** for Secure Multi-Party Collaborative computing.

Cube AI represents a fundamental shift in how Large Language Models are deployed across healthcare, finance, and the enterprise at large. We refuse to compromise on data integrity.

The future of AI is confidential. Welcome to the Cube AI Beta!

* **Get Started**: Visit [cube.ultraviolet.rs](https://cube.ultraviolet.rs) to launch your first confidential AI stack.
* **Read the Docs**: Dive deep into the [Cube AI Documentation](https://cube.ultraviolet.rs/docs/) and [Getting Started Guide](https://cube.ultraviolet.rs/docs/user/getting-started/).