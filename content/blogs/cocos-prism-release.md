---
slug: cocos-prism-release
title: "Unleashing Confidential AI: Cocos v0.8.0 and Prism v0.6.0 Released"
author:
  name: "sammy oina"
  picture: "https://avatars.githubusercontent.com/u/44265300?v=4"
tags: [confidential-computing, ai, cocos, prism, privacy]
image: /img/cocos-prism-release.png
date: 2026-02-06
---

The confidential computing landscape continues to evolve with two major releases that strengthen the ecosystem for secure, privacy-preserving AI: **Cocos AI v0.8.0** and **Prism v0.6.0**. Together, they represent a powerful advancement in enabling organizations to build trustworthy, collaborative AI systems without compromising data privacy.

<!--truncate-->

---

## What is Cocos AI?

Cocos AI (Confidential Computing System for AI) is a comprehensive software platform engineered for confidential and privacy-preserving AI and machine learning. At its foundation, Cocos uses **Trusted Execution Environments (TEEs)**—specialized hardware enclaves that isolate data and code from the entire system, providing protection even from privileged software.

![Cocos Architecture](https://raw.githubusercontent.com/ultravioletrs/cocos-docs/main/static/img/arch.png)

The platform enables:
- **Model training and inference on sensitive data** without ever exposing that data
- **Secure Multi-Party Computation (SMPC)** for collaborative analysis across different data sources
- **Hardware attestation** to verify the integrity and trustworthiness of computations
- **End-to-end encrypted communication** through aTLS (attestation TLS)

---

## Introducing Prism: The Gateway to Enterprise Confidential AI

While Cocos AI provides the core confidential computing infrastructure, **Prism** is the user-friendly, enterprise-grade platform layer that makes Cocos accessible to organizations and teams. Prism is a **web-based SaaS** that sits on top of Cocos, adding essential enterprise capabilities:

![Prism Admin Console](https://raw.githubusercontent.com/ultravioletrs/prism-docs/main/static/img/admin_console.png)

### What Prism Brings to the Table

**1. User & Workspace Management**
- Create and manage users across workspaces (consortiums)
- Fine-grained role-based access control (RBAC)
- Multi-tenant isolation for collaborative environments

**2. Policy Management**
- Define access control policies between users, workspaces, and computations
- Manage asset access and computational workflows
- Enforce data governance rules seamlessly

**3. Asset Management**
- Organize and search datasets and algorithms
- Track asset usage across computations
- Maintain metadata and audit trails

![Asset Management Dashboard](https://raw.githubusercontent.com/ultravioletrs/prism-docs/main/static/img/asset_management.png)

**4. Computation Orchestration**
- Submit and monitor confidential computations
- View computation results with audit logs
- Track computation policies and resource allocation

**5. Billing & Subscription Management**
- Manage subscription tiers and payment information
- Track resource usage and costs
- Email notifications for important events

**6. Secure Infrastructure**
- Leverage TEE-based secure VM provisioning
- End-to-end encryption throughout the workflow
- Comprehensive logging and monitoring

---

## Cocos v0.8.0: Enhanced Security and Performance

Cocos v0.8.0 brings significant improvements focused on attestation, security, and architecture refinement—critical for enterprises demanding the highest security standards.

### Key Highlights

**Enhanced Attestation Policy**
- Improved CLI attestation policy tools for better developer experience
- Updated configurations for AMD SEV-SNP and Intel TDX platforms
- Added reported TCB (Trusted Computing Base) support for more comprehensive security validation
- SEV version bump to 7.0.0 for latest security standards

![SEV-SNP Threat Model](https://raw.githubusercontent.com/ultravioletrs/cocos-docs/main/static/img/SEVSNPThreatModel.png)

**Performance Innovations**
- **VCEK Caching on aTLS Verification**: Significantly improves performance by caching VCEK (Versioned Chip Endorsement Key) certificates during attestation TLS verification
- Optimized certificate handling and verification workflows
- Enhanced HTTP and gRPC client reusability

**Architecture Enhancements**
- Refactored attestation handling: `AttestationResult` renamed to `AzureAttestationToken` for clarity
- New `CertificateProvider` interface for flexible certificate handling
- Improved aTLS and gRPC server architecture
- Better code reusability across components

**Security Updates**
- Major dependency upgrades (gRPC 1.74.2 → 1.75.0, Docker SDK 28.3.2 → 28.5.0)
- Updated SMQ library to 0.18.1 with security patches
- Enhanced certificate library integration


### Patch Updates

Recent patch releases (**v0.8.1** and **v0.8.2**) have focused on platform stability, security patches for cryptography libraries, and adding advanced vTPM features to enhance SEV-SNP reporting.

---

## Prism v0.6.0: Usability and Discovery

Prism v0.6.0 focuses on user experience, asset discovery, and operational improvements—making the platform more accessible and intuitive.

### What's New

**Advanced Search & Discovery**
- **Comprehensive Asset Search**: New asset search functionality with full UI and backend support
- Find and manage algorithms, datasets, and computational resources effortlessly
- Enhanced search performance and filtering options

**User Management Enhancements**
- **Subscription Management Button**: Dedicated UI for easier subscription control access
- **Email Notifications**: Introduced notifications for email events, keeping users informed of critical updates
- Better visibility into account and subscription status

### 🔧 Improvements

**UI/UX Refinements**
We've polished the interface with cleaner styling for asset templates, improved content navigation, and enhanced validation messages to provide better guidance.

![Asset View Interface](https://raw.githubusercontent.com/ultravioletrs/prism-docs/main/static/img/asset_view.png)

---

## Why These Releases Matter

### For Data Scientists & Researchers
- **Cocos**: Attestable proof that their sensitive algorithms and data are executed in protected enclaves
- **Prism**: Intuitive interface to run confidential computations without infrastructure complexity

### For Enterprises & Organizations
- **Cocos**: Hardware-validated security guarantees for regulatory compliance (HIPAA, GDPR, etc.)
- **Prism**: Enterprise features like billing, user management, and audit logs for governance

### For Security Teams
- **Cocos**: Advanced attestation validation, updated security policies, and dependency management
- **Prism**: Fine-grained access control, comprehensive logging, and policy enforcement

---

## The Collaborative AI Future

Together, Cocos and Prism enable a new paradigm for AI:

![Collaborative AI Architecture](https://raw.githubusercontent.com/ultravioletrs/cocos-docs/main/static/img/DataFlow.png)

**Healthcare**: Train diagnostic AI models on patient data from multiple hospitals without sharing raw data.

**Finance**: Perform collaborative fraud detection across institutions while maintaining data privacy.

**Government**: Enable multi-agency analysis on sensitive information without centralized data collection.

**Research**: Combine datasets from different organizations for breakthroughs while maintaining strict confidentiality.

---

## Getting Started

### Explore Cocos AI
Visit the [Cocos GitHub repository](https://github.com/ultravioletrs/cocos) to deploy and integrate confidential computing into your infrastructure.

### Experience Prism
Access [Prism's web interface](https://prism.ultraviolet.rs/) to manage users, policies, and computations in a secure, user-friendly environment.

---

## What's Next?

Both projects continue to evolve. The roadmap includes:
- Enhanced multi-party computation capabilities
- Support for additional TEE technologies
- Expanded analytics and reporting features
- Improved developer tooling and SDKs

Stay tuned for more innovations in the confidential computing space!

---

**Learn More:**
- [Cocos AI Documentation](https://docs.ultraviolet.rs/cocos)
- [Prism Documentation](https://docs.ultraviolet.rs/prism)
- [Ultraviolet RS](https://ultraviolet.rs)
