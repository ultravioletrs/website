---
slug: securing-trust-rats-and-attested-tls
title: "Securing Trust: RATS and Attested TLS (aTLS)"
excerpt: "COCOS AI leverages modern attestation standards to prove the integrity and operational state of the platform."
description: "Learn about attestation, attested TLS and IETF document defining how a system can prove its integrity and operational state."
author:
  name: "Jovan Djukic"
  picture: "https://avatars.githubusercontent.com/u/7561155?v=4"
tags: [confidential-computing, attestation, aTLS, cocos ai]
date: 2026-02-19
coverImage: "/img/securing-trust-rats-and-attested-tls/overview.png"
ogImage:
    url: "/img/securing-trust-rats-and-attested-tls/overview.png"
---

In this article, we'll explore **Remote ATtestation procedureS (RATS)**,
an IETF standard that defines how systems can securely prove their
integrity and operational state to others. We'll break down the key
components of the RATS architecture, explain how evidence and
attestation results are exchanged, and discuss its relevance in
establishing trust between devices and services. Building on this
foundation, we'll dive into **Attested TLS (aTLS)**, which integrates
remote attestation directly into the TLS handshake. Finally, we'll look
at how these concepts are **implemented in** [**COCOS
AI**](https://github.com/ultravioletrs/cocos), demonstrating how RATS and aTLS enable secure,
verifiable communication between clients, servers, and trusted execution
environments (TEEs).

### Remote ATtestation procedureS (RATS) - The Architectural Backbone

**Remote ATtestation procedureS (RATS)**, defined in [RFC
9334](https://datatracker.ietf.org/doc/rfc9334/), provide a standardized architecture for proving the
trustworthiness of a device, workload, or service. At its core, RATS
enable one system to produce **verifiable evidence** about its current
state, while another system evaluates this information to decide whether
to trust it. In an age where workloads run on untrusted infrastructures
and sensitive computations happen in shared environments, having a
portable and interoperable way to prove integrity has become essential.

RATS define several key **roles** in this process:

1\. The **Attester** is the entity that generates **Evidence** about its
own operational state.

-   Runs in a TEE, device, confidential VM, or enclave.
-   Produces measurements like firmware hashes, kernel versions, or PCR
    values from a TPM.
-   Uses **Attestation Keys** bound to hardware or firmware to sign
    this evidence.

2\. The **Verifier** evaluates the **Evidence** received from the
Attester.

-   Uses **Endorsements** (e.g., TPM vendor certificates) and
    **Reference Values** (known-good measurements) to check
    validity.
-   Produces an **Attestation Result** - a signed statement about the
    Attester's trustworthiness.
-   Often operated by a trusted authority, like a cloud provider or
    security service.

3\. The **Relying Party** consumes the **Attestation Result** from the
Verifier and **makes trust decisions**. Examples:

-   A cloud orchestration platform deciding whether to schedule
    workloads on a VM.
-   A client deciding whether to connect to a server running inside a
    TEE.
-   Does **not** need to understand raw evidence, only the Verifier's
    signed results.

4\. The **Endorser** vouches for the trustworthiness of an **Attesting
Environment** by providing **Endorsements**. Typically the hardware or
firmware vendor. Examples:

-   Intel SGX/TDX provisioning services signing enclave keys.
-   AMD providing ARK and ASK certificates for SEV-SNP.

5\. The **Reference Value Provider** supplies **Reference
Values** - known-good measurements used by the Verifier. Ensures the
Verifier knows what a "trusted state" looks like. Examples:

-   BIOS vendors providing approved firmware hashes.
-   Container registries providing signed digests of container
    images.

6\. The **Verifier Owner** defines **appraisal policies** for a device
or environment. Determines **what evidence matters** and **what
constitutes a trustworthy state**. Could be:

-   A cloud tenant defining which OS images are approved.
-   An IoT fleet operator defining minimum firmware
    requirements.

7\. **Relying Party Owner** (optional, less explicit). Some deployments
separate the **Relying Party** from the **Relying Party Owner**:

-   The **Relying Party** executes policy decisions.
-   The **Owner** defines those policies.

This distinction matters in multi-tenant or cloud scenarios where
**service providers enforce policies defined by customers**.

![RATS architecture diagram](/img/securing-trust-rats-and-attested-tls/overview.png)

To support different deployment models, RATS describe two primary
patterns: the **passport model** and the **background-check model**. In
the passport model (left picture), the Attester communicates directly
with the Verifier, obtains the attestation result, and then presents
this "passport" to the Relying Party. In contrast, the background-check
model (right picture) shifts more responsibility to the Relying
Party - it sends the evidence to the Verifier itself, ensuring
independent validation. This flexibility allows RATS to fit into diverse
ecosystems, from cloud platforms to IoT devices.

![RATS patterns](/img/securing-trust-rats-and-attested-tls/rats-patterns.png)

Another important aspect of RATS is its **layered and composite
attestation model**. Modern systems often consist of multiple
components, each capable of measuring and attesting to the state of the
next layer. For example, a device's BIOS might measure the bootloader,
the bootloader measures the kernel, and the kernel measures user-space
workloads. RATS provide a way to structure this **chain of trust** so
that relying parties can evaluate integrity from the hardware level all
the way up to applications.

Security in RATS goes beyond exchanging evidence. The architecture
considers **freshness**, ensuring that attestation results cannot be
replayed or reused maliciously. Mechanisms like nonces, secure clocks,
and epoch identifiers are critical here. Equally important is the secure
handling of **attestation keys** - compromising these would undermine
the entire trust model. By combining cryptographic proofs, policy
evaluation, and carefully designed message flows, RATS establish a
portable framework for secure, cross-vendor attestation.

In essence, RATS solve one of the hardest problems in distributed
computing: **how to trust a remote system without physically inspecting
it**. Whether you're securing IoT devices, protecting cloud workloads,
or enabling confidential computing, RATS provide the architectural
foundation for verifiable trust at scale.

### From TLS to aTLS: Embedding Trust into Secure Channels 

#### TLS Recap - The Foundation of Secure Communication 

Transport Layer Security (**TLS**) is the backbone of secure
communication on the internet. It establishes an encrypted channel
between two parties - typically a client and a server - ensuring
that data exchanged cannot be intercepted or modified.

In a standard **TLS 1.3** handshake:

1.  The **client** and **server** negotiate encryption
    parameters.
2.  The server presents an **X.509 certificate** proving its
    identity.
3.  The client validates this certificate against trusted Certificate
    Authorities (CAs).
4.  Both parties derive a **session key** to encrypt all subsequent
    communication.

This model provides **confidentiality**, **integrity**, and
**authentication**. But there's a problem: **TLS certificates only prove
identity, not trustworthiness**.

For example, a server can present a valid certificate while running
outdated firmware or malicious code, and the client has no way of
knowing. In highly sensitive environments - like confidential
computing, IoT, and secure AI workloads - this isn't enough.

#### What Is aTLS? - Attested TLS 

**Attested TLS (aTLS)** extends TLS by embedding **remote attestation**
into the TLS handshake, enabling endpoints to prove not just **who**
they are, but also **how they are running**.

With aTLS, the TLS certificate - or an additional handshake
extension - includes **attestation evidence** or **attestation
results**. This allows one party to verify not only the cryptographic
identity of the other, but also:

-   Whether it's running in a **Trusted Execution Environment
    (TEE)**.
-   Whether the **firmware and software stack** match known-good
    configurations.
-   Whether **security policies** are being enforced.

This builds on the **RATS architecture** defined in [RFC
9334](https://datatracker.ietf.org/doc/rfc9334/), which standardizes how evidence, endorsements, and
attestation results are produced and consumed.

#### How aTLS Uses RATS 

aTLS doesn't invent a new attestation framework - it **integrates RATS
into TLS**. The flow depends on which RATS model is used. The Passport
Model in aTLS has the following steps:

1.  The **Attester** (e.g., a TEE-enabled server) contacts a
    **Verifier** before the TLS handshake.
2.  The Verifier evaluates evidence and returns an **Attestation
    Result** - essentially a signed "passport."
3.  During the TLS handshake, the Attester embeds this result into its
    TLS certificate.
4.  The client (**Relying Party**) validates the attestation result and
    decides whether to trust the session.

The Background-Check Model in aTLS has the following steps:

1.  The client (**Relying Party**) requests attestation during the TLS
    handshake.
2.  The Attester sends **raw evidence** rather than pre-verified
    results.
3.  The client forwards this evidence to a **Verifier** in real
    time.
4.  The Verifier issues an **Attestation Result**, which the client
    uses to decide whether to proceed.

This flexibility makes aTLS suitable for cloud workloads, IoT
deployments, and secure AI environments - each with different trust
relationships.

#### The Bigger Picture 

By combining **TLS** with **RATS**, aTLS transforms "secure
communication" into **"secure and verifiable communication."** It
ensures that:

-   **Who you're talking to** is verified.
-   **What they're running** is trustworthy.
-   **How your data is handled** respects your security
    policies.

This is especially critical for **confidential computing**, where trust
must extend beyond identities to include the **state of the runtime
environment**.

### Real-World Example - Confidential Computing & AI in COCOS AI 

**Cocos AI** is an advanced platform that leverages **Confidential
Computing** and **Trusted Execution Environments (TEEs)** to enable
**secure multiparty computation (SMPC)**. Within its architecture, the
**Agent** operates inside a TEE and plays a crucial role in establishing
an **attested TLS (aTLS)** connection with the **CLI**, ensuring both
secure communication and runtime integrity.

![COCOS AI architecture](/img/securing-trust-rats-and-attested-tls/cocos-ai-architecture.png)

**COCOS AI** adopts the **RATS background-check model** for remote attestation.
During certificate creation, the **attestation report** is embedded
directly into the **X.509 certificate** by passing it through the
**Certificate Signing Request (CSR)** and including it in the issued
certificate. The following Go
[snippet](https://github.com/ultravioletrs/cocos/blob/207bfd99af4b308a1609f3439317fbd83145f106/pkg/atls/certificate_provider.go#L143) demonstrates how the CSR is generated.

```go
csrMetadata := certs.CSRMetadata{
	Organization:    []string{p.subject.Organization},
	Country:         []string{p.subject.Country},
	CommonName:      p.subject.CommonName,
	Province:        []string{p.subject.Province},
	Locality:        []string{p.subject.Locality},
	StreetAddress:   []string{p.subject.StreetAddress},
	PostalCode:      []string{p.subject.PostalCode},
	ExtraExtensions: []pkix.Extension{extension},
}

csr, sdkerr := p.certsSDK.CreateCSR(ctx, csrMetadata, privateKey)
if sdkerr != nil {
	return nil, fmt.Errorf("failed to create CSR: %w", sdkerr)
}
```

Once the certificate is obtained, a
standard **TLS connection** can be established. The key difference
compared to a regular TLS setup is the inclusion of a **custom
verification function** for the **X.509 certificate**. This function
ensures that the embedded **attestation extension** contains a valid
attestation report.

The following Go
[snippet](https://github.com/ultravioletrs/cocos/blob/207bfd99af4b308a1609f3439317fbd83145f106/pkg/tls/tls.go#L136) demonstrates how to configure TLS to perform this
additional verification step.

```go
tlsConfig := &tls.Config{
	InsecureSkipVerify: true,
	RootCAs:            rootCAs,
	ServerName:         sni,
	VerifyPeerCertificate: func(rawCerts [][]byte, verifiedChains [][]*x509.Certificate) error {
		return atls.NewCertificateVerifier(rootCAs).VerifyPeerCertificate(rawCerts, verifiedChains, nonce)
	},
}
```
Note: setting `InsecureSkipVerify: true` disables Go's built‑in certificate
verification. In this aTLS setup, that is intentional because
`VerifyPeerCertificate` replaces the default verifier so it can both
perform all the usual checks (build and validate the certificate chain
against `rootCAs`, verify the peer identity via `ServerName`/SAN,
check validity periods, key usage, etc.) and validate the embedded
attestation evidence. Do **not** copy this configuration without
implementing full certificate and hostname/SAN validation in your own
`VerifyPeerCertificate` callback, otherwise TLS certificate checks will
effectively be disabled.


The behavior of the `VerifyPeerCertificate` function, which verifies the attestation extension,
depends on the underlying platform, such as **AMD SEV-SNP** or
**Intel TDX**.

### Conclusion 

As workloads move to **untrusted environments** like public clouds and
edge platforms, securing communication is no longer just about
encryption - it's about **verifiable trust**. This is where **RATS**
and **aTLS** come together.

**RATS** provides the architectural framework for generating,
evaluating, and sharing **attestation evidence**, while **aTLS**
seamlessly integrates this attestation into the TLS handshake. The
result is not just **secure communication**, but communication where
each party can **prove its integrity and runtime state** before
exchanging sensitive data.

**COCOS AI** builds on this foundation by leveraging **Confidential
Computing** and **Trusted Execution Environments** to enable **secure
multiparty computation**. By adopting the **RATS background-check model** and
embedding **attestation reports** directly into X.509 certificates,
COCOS AI ensures that every connection is both **encrypted** and
**verifiably trusted**.

As technologies like confidential computing and secure AI continue to
evolve, approaches like **RATS + aTLS** are set to become a cornerstone
of **next-generation security architectures** - enabling us to build
systems where trust is **cryptographically enforced**, not just assumed.