---
slug: prism-public-beta-launch
title: "Prism AI Public Beta: Empowering Secure AI Collaboration"
excerpt: "We are thrilled to announce the public beta release of Prism AI, our confidential computing platform for secure AI collaboration. Build and deploy privacy-preserving AI with hardware-verified security."
description: "Discover Prism AI, the web-based SaaS platform for secure, collaborative AI workloads. Learn how Prism AI leverages Trusted Execution Environments (TEEs) to protect sensitive data and algorithms."
author:
  name: "sammy oina"
  picture: "https://avatars.githubusercontent.com/u/44265300?v=4"
tags: [confidential-computing, ai, privacy, "prism ai", beta-launch]
date: 2026-02-12
image: /img/prism-beta-launch-cover.png
coverImage: /img/prism-beta-launch-cover.png
ogImage:
  url: /img/prism-beta-launch-cover.png
featured: true
category: announcement
---


In an era where AI is transforming industries, the challenge of **data privacy** remains a significant hurdle. Organizations often find themselves choosing between the power of state-of-the-art AI and the security of their most sensitive data. 

Today, we are thrilled to bridge that gap with the launch of the [**Prism AI Public Beta**](https://cloud.prism.ultraviolet.rs/).

[Prism AI](https://prism.ultraviolet.rs) is a web-based SaaS platform designed to make **Confidential Computing** accessible, powerful, and truly collaborative. It provides an enterprise-ready interface for orchestrating **zero-trust collaboration** via **Secure Multiparty Computation (SMPC)**, powered by Trusted Execution Environments (TEEs). 

Through the technical guarantees of hardware-level isolation, Prism AI allows multiple organizations to jointly train models or run private inferences in a shared TEE. Critically, raw datasets and proprietary algorithms are technically shielded from *every* other party in the computation—including collaborators and the cloud provider itself—ensuring absolute privacy throughout the entire lifecycle. Built on the open-source **Cocos AI** foundation, Prism AI turns trust from a policy into a physical law.

<!--truncate-->

## Why Prism AI is a Game-Changer

Traditional AI workflows require you to trust your infrastructure provider. Whether you're using a public cloud or a third-party API, your data is visible to the underlying system. Prism AI changes this paradigm by moving from **policy-based security** ("we promise not to look") to **technology-based security** ("it is physically impossible for us to look").

### The Anatomy of a Technical Guarantee

Prism AI isn't just a layer of software; it's a bridge to hardware-level security. Here is how the platform ensures your data remains confidential:

1.  **Hardware-Level Isolation (TEEs)**: Prism AI orchestrates **Confidential VMs** (CVMs) powered by **AMD SEV-SNP** or **Intel TDX**. This means your data and AI models are encrypted in the system's RAM. The decryption keys are managed by a secure, hardware-embedded processor that is inaccessible even to the cloud provider's core operating system or hypervisor.

2.  **The TEE Manager**: Running on host hardware, the TEE Manager is a critical open-source microservice that dynamically provisions and configures the secure enclaves. Once a computation is finished, it ensures the TEE is securely destroyed, leaving no trace of the sensitive data behind.

3.  **Attested TLS (aTLS) & The In-Enclave Agent**: Before any data or algorithm is uploaded, Prism AI performs a **Remote Attestation** handshake. The In-Enclave Agent (running inside the secure VM) provides a cryptographic "quote" signed by the hardware. Prism AI verifies this quote against strict security policies. Only after the hardware’s identity and software’s integrity are proven is a secure aTLS tunnel established for data transmission.

4.  **Policy-Driven Orchestration**: Prism AI’s control plane ensures that computations only run if every participant’s security requirements are met. This moves the trust model from human promises to high-assurance, mathematical proofs.

## Built on an Open Source Core

Transparency is fundamental to trust. That's why the core components of Prism AI—including the TEE Manager and the In-Enclave Agent—are part of the open-source **Cocos AI** project. This ensuring that any organization can benefit from robust TEE orchestration, whether in the cloud or on-premises.

## Real-World Applications

Prism AI is already being used to solve critical privacy challenges in high-stakes industries:

*   **Healthcare**: Training diagnostic models on patient records across multiple hospitals without violating GDPR or HIPAA.
*   **Finance**: Collaborative fraud detection and risk assessment across institutions without sharing proprietary data.
*   **Governments**: Enabling secure data sharing between agencies for public safety and research while maintaining strict data sovereignty.

## Join the Mission for Secure AI

We’re on a mission to make privacy the default for artificial intelligence, and we’d love for you to be a part of it. The Prism AI Public Beta is officially live, and we can’t wait to see what you build.

*   🚀 **Get Started for Free**: Sign up at [cloud.prism.ultraviolet.rs](https://cloud.prism.ultraviolet.rs/) and start running your first confidential computations.
*   📚 **Explore the Docs**: Dive into the technical details at [docs.prism.ultraviolet.rs](https://docs.prism.ultraviolet.rs/).
*   🤝 **Join the Community**: Follow our progress on [GitHub](https://github.com/ultravioletrs/cocos) and help us shape the next generation of privacy-preserving AI.

The era of choosing between powerful AI and strict privacy is finally over. With Prism AI, you can have both—fearlessly.

---

**Learn More:**
- 🌐 [Prism AI Website](https://prism.ultraviolet.rs/)
- 📖 [Cocos AI Documentation](https://docs.cocos.ultraviolet.rs/)
- 💜 [Ultraviolet RS](https://ultraviolet.rs/)
