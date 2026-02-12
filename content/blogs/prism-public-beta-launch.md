---
slug: prism-public-beta-launch
title: "Prism Public Beta: Empowering Secure AI Collaboration"
excerpt: "We are thrilled to announce the public beta release of Prism, our confidential computing platform for secure AI collaboration. Build and deploy privacy-preserving AI with hardware-verified security."
description: "Discover Prism AI, the web-based SaaS platform for secure, collaborative AI workloads. Learn how Prism leverages Trusted Execution Environments (TEEs) to protect sensitive data and algorithms."
author:
  name: "sammy oina"
  picture: "https://avatars.githubusercontent.com/u/44265300?v=4"
tags: [confidential-computing, ai, privacy, prism, beta-launch]
date: 2026-02-12
image: /img/prism-beta-launch-cover.png
coverImage: /img/prism-beta-launch-cover.png
ogImage:
  url: /img/prism-beta-launch-cover.png
featured: true
category: announcement
---


In an era where AI is transforming industries, the challenge of **data privacy** remains a significant hurdle. Organizations often find themselves choosing between the power of state-of-the-art AI and the security of their most sensitive data. 

Today, we are bridging that gap with the launch of the **Prism Public Beta**.

Prism is our web-based SaaS platform designed to make **Confidential Computing** accessible, secure, and collaborative. By leveraging Trusted Execution Environments (TEEs), Prism ensures that your data and AI models are protected at the hardware level, even while they are being processed.

<!--truncate-->

## Why Prism?

Traditional AI workflows require you to trust your infrastructure provider. Whether you're using a public cloud or a third-party API, your data is visible to the underlying system. Prism changes this paradigm by moving from **policy-based security** ("we promise not to look") to **technology-based security** ("it is physically impossible for us to look").

### Key Features of the Prism Platform

Prism provides an intuitive interface and enterprise-grade tools built on top of the open-source [Cocos AI](https://github.com/ultravioletrs/cocos) core:

*   **Multi-Party Secure Collaboration**: Securely combine datasets from multiple participants for joint analysis and model training without any party ever seeing the raw data.
*   **Hardware-Verified Trust**: Every computation in Prism runs inside a TEE (like **AMD SEV-SNP** or **Intel TDX**). Prism provides **Remote Attestation**, a cryptographic proof that your code is running on untampered, secure hardware.
*   **Zero-Knowledge Workflows**: Data and algorithms are uploaded into encrypted enclaves using **Attested TLS (aTLS)**. The handshake itself validates the integrity of the TEE and its software before any data is transmitted, ensuring a hardware-verified secure channel.
*   **Intuitive Orchestration**: Manage users, workspaces, and computation lifecycles through a seamless web interface.

## Built on an Open Source Core

Transparency is fundamental to trust. That's why the core components of Prism—including the TEE Manager and the In-Enclave Agent—are part of the open-source **Cocos AI** project. This ensuring that any organization can benefit from robust TEE orchestration, whether in the cloud or on-premises.

## Real-World Applications

Prism is already being used to solve critical privacy challenges in high-stakes industries:

*   **Healthcare**: Training diagnostic models on patient records across multiple hospitals without violating GDPR or HIPAA.
*   **Finance**: Collaborative fraud detection and risk assessment across institutions without sharing proprietary data.
*   **Governments**: Enabling secure data sharing between agencies for public safety and research while maintaining strict data sovereignty.

## Join the Beta

We invite developers, data scientists, and organizations to experience the future of secure AI. The Prism Public Beta is now open for sign-ups.

*   **Get Started for Free**: Sign up at [cloud.prism.ultraviolet.rs](https://cloud.prism.ultraviolet.rs/) and start running your first confidential computations.
*   **Explore the Docs**: Dive into the technical details at [docs.prism.ultraviolet.rs](https://docs.prism.ultraviolet.rs/).
*   **Join the Community**: Follow our progress on [GitHub](https://github.com/ultravioletrs/cocos) and help us shape the next generation of privacy-preserving AI.

The era of choosing between AI and privacy is over. With Prism, you can have both.

---

**Learn More:**
- [Prism Website](https://prism.ultraviolet.rs/)
- [Cocos AI Documentation](https://docs.cocos.ultraviolet.rs/)
- [Ultraviolet RS](https://ultraviolet.rs/)
