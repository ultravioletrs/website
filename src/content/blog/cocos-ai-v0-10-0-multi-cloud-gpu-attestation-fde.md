---
slug: cocos-ai-v0-10-0-multi-cloud-gpu-attestation-fde
title: "Cocos AI v0.10.0: Multi-Cloud Sources, GPU Attestation, FDE"
excerpt: "Cocos AI v0.10.0 pulls algorithms and datasets from S3, GCS, and OCI registries; lets every party in a computation hold its own key broker; attests NVIDIA GPUs alongside the CPU TEE; adds Azure TDX; and encrypts the confidential VM's writable disk at rest."
description: "Cocos AI v0.10.0 adds multi-cloud algorithm and dataset sources, multiple key broker servers, GPU confidential computing attestation, Azure TDX, and full-disk encryption for confidential VMs."
author:
  name: "Sammy Oina"
  picture: "https://avatars.githubusercontent.com/u/44265300?v=4"
tags:
  [
    confidential-computing,
    "cocos ai",
    gpu-attestation,
    open-source,
    tee,
    release-notes,
  ]
category: confidential-computing
date: 2026-07-01
image: /img/blogs/cocos-ai-v0-10-0-multi-cloud-gpu-attestation-fde/cover.png
coverImage: /img/blogs/cocos-ai-v0-10-0-multi-cloud-gpu-attestation-fde/cover.png
ogImage: /img/blogs/cocos-ai-v0-10-0-multi-cloud-gpu-attestation-fde/cover.png
featured: true
---

[Cocos AI](/products/cocos-ai) is the hardware abstraction layer that turns AMD SEV-SNP and Intel TDX confidential-computing hardware into a single, auditable API: a Manager orchestrates confidential VMs from outside, an in-enclave Agent runs the workload, and attested TLS (aTLS) binds every session to a hardware-verified measurement of what's actually running. **v0.10.0** widens two of the platform's hardest edges — where sealed data is allowed to come from, and what "the enclave" is allowed to include. Algorithms and datasets can now live in S3, GCS, or any OCI registry instead of a single HTTP endpoint; each party in a multi-party computation can run its own key broker; and for the first time, an NVIDIA GPU attached to the CVM gets attested as part of the same trust chain as the CPU. Full-disk encryption and Azure TDX support round out the release.

<!--truncate-->

---

## Multi-cloud algorithm and dataset sources

Before this release, sealed algorithms and datasets had to be staged behind a single HTTP endpoint the Agent could pull from. v0.10.0 replaces that with an extensible `Downloader` interface and a `Registry` that resolves a downloader by source type at runtime:

```go
// Downloader defines the interface for downloading resources from a remote source.
type Downloader interface {
    // Download fetches a resource from the given URL and writes it to destPath.
    Download(ctx context.Context, url string, destPath string) error
    // Type returns the source type identifier (e.g., "oci-image", "s3", "gcs", "https", "http").
    Type() string
}
```

Out of the box, the registry ships `HTTPDownloader`, `OCIDownloader`, `S3Downloader`, and `GCSDownloader` implementations, so an algorithm or dataset source can point at `s3://bucket/key`, `gs://bucket/key`, `docker://registry/repo:tag`, or a plain HTTPS URL — the Agent picks the right client without any change to how the computation is submitted. The `S3Downloader` also accepts a custom endpoint, so it works against MinIO or any other S3-compatible store, not just AWS.

On the wire, a source is described once and carried on the `Algorithm` and `Dataset` messages:

```protobuf
message Source {
  string type = 1;              // "oci-image", "s3", "gcs", "https", "http"
  string url = 2;                // s3://bucket/key, docker://registry/repo:tag, https://host/path
  string kbs_resource_path = 3;  // path to the decryption key in KBS, e.g. "default/key/my-key"
  bool encrypted = 4;             // whether the resource is encrypted (requires KBS)
}
```

If a resource is marked `encrypted`, the Agent downloads the ciphertext, resolves the key from the configured key broker, and decrypts inside the enclave before the algorithm ever touches disk — the same guarantee as before, just no longer tied to one storage backend.

---

## Multiple key broker servers

Multi-party computations rarely want a single, shared key broker — each participant typically wants to control the keys for the assets they contribute. v0.10.0 makes the key broker server (KBS) a per-resource setting instead of a global one: both `Algorithm` and `Dataset` now carry their own `KBSConfig`.

```protobuf
message KBSConfig {
  string url = 1;      // KBS endpoint URL, e.g. "https://kbs.example.com"
  bool enabled = 2;    // whether to use KBS for key retrieval
}

message Algorithm {
  Source source = 3;
  KBSConfig kbs = 6;   // overrides the default KBS for this algorithm
}

message Dataset {
  Source source = 4;
  KBSConfig kbs = 6;   // overrides the default KBS for this dataset
}
```

In practice, this means Party A can hold the key for their algorithm behind their own KBS while Party B's dataset key lives behind a different KBS entirely, and the Agent resolves each independently at run time — no shared trust anchor required between participants beyond the enclave attestation itself. The resource downloader framework and the multi-KBS support share the same delivery path in `agent/service.go`, and both were built and tested against the [Confidential Containers](https://confidentialcontainers.org/) Key Broker Service (Trustee), using `skopeo` and the `ocicrypt` key-provider protocol for OCI-encrypted images — Cocos plugs into the existing CoCo ecosystem rather than inventing its own key-delivery format.

---

## GPU confidential computing attestation

This is the largest change in the release. Cocos can now verify that an NVIDIA GPU attached to a confidential VM is itself running in a trusted state, and — critically — cryptographically bind that GPU evidence to the same attestation session as the CPU TEE measurement, so a verifier gets one report covering both, not two reports that have to be trusted to refer to the same machine.

The attestation service shells out to an NVIDIA attestation helper binary (path set via `ATTESTATION_GPU_HELPER_PATH`) and parses its verification output:

```go
type gpuDeviceClaims struct {
    HWModel               string
    DriverVersion         string  `json:"x-nvidia-gpu-driver-version"`
    VBIOSVersion          string  `json:"x-nvidia-gpu-vbios-version"`
    SecBoot               bool    `json:"secboot"`
    MeasurementResult     string  `json:"measres"`
    NonceMatch            bool    `json:"x-nvidia-gpu-attestation-report-nonce-match"`
    SigVerified           bool    `json:"x-nvidia-gpu-attestation-report-signature-verified"`
    FWIDMatch             bool    `json:"x-nvidia-gpu-attestation-report-cert-chain-fwid-match"`
    DriverRIMSigVerified  bool    `json:"x-nvidia-gpu-driver-rim-signature-verified"`
    VBIOSRIMSigVerified   bool    `json:"x-nvidia-gpu-vbios-rim-signature-verified"`
}
```

If any of those flags come back false — secure boot off, an unrecognized VBIOS, a signature that doesn't verify — the attestation fails closed. On success, the evidence isn't just logged: it's attached to the platform's Entity Attestation Token as a `GPUExtensions` submodule, nonce-bound to the same session as the CPU claims:

```go
// GPUExtensions contains optional GPU attestation evidence that is bound to
// the same attestation session as the root TEE evidence.
type GPUExtensions struct {
    Vendor         string
    EvidenceFormat string
    Nonce          []byte
    EvidenceJSON   []byte
}
```

This is meaningful because it closes a substitution gap common to naive GPU-CC setups: without binding, nothing stops a relying party from being handed a valid CPU attestation from one machine and a valid GPU attestation from another. Here, both live inside the same EAT, checked against the same nonce.

GPU CC attestation on Cocos currently targets the [COCONUT-SVSM](https://github.com/coconut-svsm/svsm) stack, and requires a fairly specific set of components:

| Component     | Version / source                                                          |
| ------------- | ------------------------------------------------------------------------- |
| Host kernel   | 6.11.0+, `coconut-svsm/linux` branch `svsm`                               |
| Guest kernel  | 6.17.0+, `coconut-svsm/linux` branch `svsm-planes-v6.17`                  |
| QEMU          | 10.1.0-based, `coconut-svsm/qemu` branch `svsm-igvm`                      |
| COCONUT-SVSM  | v2026.02-devel-39-g797c118c                                               |
| OVMF          | Custom EDK2 (`coconut-svsm/edk2` branch `svsm`, built with `TPM2_ENABLE`) |
| IGVM library  | `microsoft/igvm`                                                          |
| NVIDIA driver | 570.211.01 (DKMS, built with GCC 14)                                      |

This is early-stage, hardware- and driver-version-pinned infrastructure — expect the matrix above to loosen as the SVSM ecosystem stabilizes.

---

## NVIDIA GPU passthrough for confidential VMs

Attesting a GPU is only useful if the Manager can actually give a CVM one. v0.10.0 adds GPU passthrough to the QEMU-based CVM launcher via VFIO:

```go
type GPUConfig struct {
    EnableGPU    bool
    GPUBDF       string `env:"GPU_BDF"            envDefault:""`
    PCIeRootPort string `env:"GPU_PCIE_ROOT_PORT" envDefault:"pci.1"`
    PCIeBus      string `env:"GPU_PCIE_BUS"       envDefault:"pcie.0"`
    FWCfgPciMmio string `env:"GPU_FW_CFG_MMIO_MB" envDefault:"262144"`
}
```

If `GPU_BDF` isn't set explicitly, the Manager probes the host for a passthrough-capable device and enables GPU attachment automatically when it finds one. Combined with the attestation work above, a Manager can now stand up a CVM with a GPU attached and have the Agent refuse to run the workload unless that GPU verifies clean.

---

## Azure TDX support

Cocos already supported Azure confidential VMs backed by AMD SEV-SNP; v0.10.0 adds Intel TDX as a second Azure backend, alongside a matching test suite (`pkg/attestation/azure/tdx.go`). The Manager and Agent API is unchanged — TDX-backed CVMs on Azure attest and run through the same aTLS handshake as every other supported platform, so switching between AMD- and Intel-based Azure confidential VM SKUs doesn't change anything above the attestation layer.

---

## Full-disk encryption

Cocos's disk image already protected the read-only root filesystem with dm-verity, so tampering with the boot image is detectable. What wasn't covered was the writable `cocos` partition the Agent uses at runtime. v0.10.0 closes that gap: the partition is now provisioned as an encrypted ext4 filesystem, and the decryption key is only released locally, over gRPC, by the in-enclave attestation agent to an `ocicrypt` key provider:

```json
{
  "key-providers": {
    "attestation-agent": {
      "grpc": "127.0.0.1:50011"
    }
  }
}
```

Practically: the root filesystem's integrity was already covered by dm-verity, and now the writable partition's confidentiality is covered by FDE keyed to attestation — nothing written to disk during a computation is recoverable without first passing through the enclave's own attestation flow.

---

## Also in this release

- **Non-chunked computation requests** — algorithms and datasets can now be sent to the Agent as a single request instead of always being streamed in chunks, and uploaded (not remotely sourced) algorithms and datasets can now also be KBS-encrypted and decrypted in-enclave, matching what remote sources already supported.
- **Enforced binding label check** — a bug fix that makes aTLS strictly enforce the `ExporterLabelAttestation` check during connection verification, tightening the session-binding work Cocos shipped in its [Level 2 aTLS binding](/blog/atls-binding-milestone) release.
- **Agent startup fix** — resolved an issue affecting Agent initialization.
- Refactored test code onto the `testing.TB` interface and improved SNP claims extraction.
- Dependency bumps: `go-chi/chi` 5.2.3→5.2.4, `google/go-tpm` 0.9.6→0.9.8, `absmach/certs` 0.18.2→0.18.5, `absmach/supermq` 0.19.0→0.19.1, `cloud.google.com/go/storage` 1.57.2→1.62.3.

---

## Getting started

- Source and full changelog: [github.com/ultravioletrs/cocos](https://github.com/ultravioletrs/cocos), diff [v0.9.0...v0.10.0](https://github.com/ultravioletrs/cocos/compare/v0.9.0...v0.10.0)
- Release binaries (Manager, Agent, CLI, attestation service, and more): [v0.10.0 release assets](https://github.com/ultravioletrs/cocos/releases/tag/v0.10.0)
- Documentation: [Cocos AI Documentation](https://www.ultraviolet.rs/docs/cocos-ai)
- Remote resource + multi-KBS testing guide: [`agent/TESTING_REMOTE_RESOURCES.md`](https://github.com/ultravioletrs/cocos/blob/master/agent/TESTING_REMOTE_RESOURCES.md)

Thanks to [@danko-miladinovic](https://github.com/danko-miladinovic), [@SammyOina](https://github.com/SammyOina), [@jovan-djukic](https://github.com/jovan-djukic), and dependabot for this release.
