---
slug: deploying-cube-ai-on-cvms
title: "Deploying Cube AI on Confidential Virtual Machines: A Complete Guide to Secure LLM Inference on GCP and Azure"
author:
  name: "Washington Kamadi"
  picture: "https://avatars.githubusercontent.com/u/43080232?v=4&size=64"
tags: [confidential computing, deployment, gcp, azure, cube ai, infrastructure, security]
excerpt: "A comprehensive guide to deploying Cube AI on user-managed confidential virtual machines on GCP and Azure, with full control over your AI infrastructure and hardware-based attestation."
description: "Walk through deploying Cube AI on AMD SEV-SNP confidential VMs on Google Cloud Platform and Microsoft Azure, covering KMS setup, cloud-init configuration, backend selection (Ollama vs vLLM), TLS certificates, GPU support, and verification steps."
image: /img/deploying-cube-ai-on-cvms/deploying_cube_ai_on_cvms_cover.png
date: 2026-02-11
---

![Deploying Cube AI on Confidential Virtual Machines](/img/deploying-cube-ai-on-cvms/deploying_cube_ai_on_cvms_cover.png)

Confidential computing is transforming how we deploy and run AI workloads in cloud environments. As large language models (LLMs) become increasingly powerful and valuable, protecting the data they process and the models themselves has become paramount. Cube AI leverages confidential computing to provide secure, verifiable AI inference on hardware-encrypted confidential virtual machines (CVMs).

This comprehensive guide walks you through deploying Cube AI on user-managed CVMs on both Google Cloud Platform (GCP) and Microsoft Azure, giving you complete control over your AI infrastructure while maintaining the highest security standards through hardware-based attestation and encryption.

<!--truncate-->

## Why Deploy Cube AI on Confidential VMs?

Cube AI combines the power of modern LLMs with the security guarantees of confidential computing. By deploying on CVMs, you gain unprecedented protection for both your data and models.

### Key Advantages

- **Data Sovereignty and Privacy:** Keep sensitive data encrypted even during processing, with hardware-level protection that prevents access even by cloud administrators
- **Model Protection:** Safeguard proprietary models and intellectual property through memory encryption and attestation
- **Regulatory Compliance:** Meet stringent compliance requirements (HIPAA, GDPR, financial regulations) with verifiable confidential computing
- **Flexible AI Backend Options:** Choose between Ollama for ease of use or vLLM for high-performance inference, both running in a secure enclave
- **Infrastructure Control:** Maintain complete control over compute resources, network configurations, and security policies
- **Multi-Cloud Flexibility:** Deploy across multiple cloud providers or integrate with on-premises infrastructure
- **Cost Optimization:** Leverage existing cloud commitments, reserved instances, and custom VM configurations

## Cube AI Architecture

Cube AI is a secure, privacy-preserving AI platform that runs LLMs within Trusted Execution Environments (TEE) with comprehensive security, authentication, and audit capabilities.

### Core Architecture Layers

#### 1. TEE Enclave Layer (Inside CVM - AMD SEV-SNP / Intel TDX)

The secure enclave provides hardware-based memory encryption and isolation:

- **LLM Engine:** Ollama or vLLM runtime for model inference
- **Enclave Agent (Cube Agent):** Handles attestation, key management, and secure communication
- **Secure Memory:** Hardware-encrypted memory space preventing unauthorized access
- **Attestation Module:** Generates and validates attestation reports to prove enclave integrity
- **Model Storage:** Encrypted model weights and configurations

#### 2. Proxy Layer (Outside Enclave)

- **Cube Proxy:** API gateway that routes requests to confidential agents
- Authentication integration with SuperMQ for user management and access control
- Request validation and forwarding with attested TLS
- Domain-based workspace isolation

#### 3. Authentication & Authorization

Cube AI integrates with SuperMQ for enterprise-grade authentication:

- JWT/Personal Access Token authentication
- Domain-based workspace isolation (multi-tenancy)
- Role-based access control (RBAC)
- Token validation and refresh capabilities

## Prerequisites

Before beginning deployment, ensure you have:

### Cloud Provider Access

- Active GCP and/or Azure account with appropriate permissions
- Ability to create confidential VMs with AMD SEV-SNP support

### Required Tools

- Terraform/OpenTofu installed (`v1.0+`)
- Git for cloning repositories
- `cloud-init` tool for configuration validation (optional but recommended)

### Infrastructure Templates

- Download from [cocos-infra repository](https://github.com/ultravioletrs/cocos-infra)

### Cube Configuration

- Cloud-init configuration from [Cube repository](https://github.com/ultravioletrs/cube)
- Access to Cube platform (if using managed platform) or standalone deployment

### Certificates (Optional)

- TLS/mTLS certificates for production deployments
- Can be generated or obtained from your certificate authority

---

## Deploying Cube AI on Google Cloud Platform

### Step 1: Clone Required Repositories

First, clone the infrastructure templates and Cube repository:

```bash
# Clone infrastructure templates
git clone https://github.com/ultravioletrs/cocos-infra.git
cd cocos-infra

# Clone Cube repository (for cloud-init config)
git clone https://github.com/ultravioletrs/cube.git
```

### Step 2: Set Up KMS Infrastructure

Navigate to the GCP KMS directory and create encryption keys:

```bash
cd gcp/kms
tofu init
tofu plan -var-file="../../terraform.tfvars"
tofu apply -var-file="../../terraform.tfvars"
```

This creates the necessary encryption keys and outputs:

```
Outputs:
disk_encryption_id = "projects/<project-id>/locations/global/keyRings/vm-encryption-keyring/cryptoKeys/vm-encryption-key"
kms_keyring_id = "projects/<project-id>/locations/global/keyRings/vm-encryption-keyring"
```

Save the `disk_encryption_id` — you'll need it in the next step.

### Step 3: Configure Terraform Variables

Create or update `terraform.tfvars` in the `cocos-infra` directory:

```hcl
# Common Configuration
vm_name = "cube-ai-vm"

# GCP-specific
project_id = "your-gcp-project-id"
region = "us-central1"
zone = "us-central1-a"
min_cpu_platform = "AMD Milan"
confidential_instance_type = "SEV_SNP"

# VM Configuration
disk_encryption_id = "projects/<project-id>/locations/global/keyRings/vm-encryption-keyring/cryptoKeys/vm-encryption-key"
cloud_init_config = "/path/to/cube/hal/ubuntu/cube-agent-config.yml"
machine_type = "n2d-standard-4" # 4 vCPUs recommended for LLM inference
```

**Machine Type Recommendations:**

| Use Case | Machine Type | Specs |
| :--- | :--- | :--- |
| Development/Testing | `n2d-standard-2` | 2 vCPUs, 8GB RAM |
| Production (Ollama) | `n2d-standard-4` | 4 vCPUs, 16GB RAM |
| Production (vLLM) | `n2d-standard-8` or higher | 8+ vCPUs, with GPU support |

### Step 4: Customize Cloud-Init Configuration

The cloud-init configuration (`hal/ubuntu/cube-agent-config.yml`) sets up Cube Agent with your chosen AI backend.

#### Choosing Your AI Backend

**Ollama (Recommended for Ease of Use)**

Perfect for getting started quickly and running multiple models:

- Simple model management: `ollama pull`, `ollama list`, `ollama rm`
- Built-in quantization support: Q4_0, Q4_1, Q8_0 for reduced memory usage
- Automatic GPU detection and utilization
- Lightweight REST API
- Broad model support: Llama, Mistral, CodeLlama, Gemma, and more
- Lower memory requirements due to quantization
- Ideal for CPU or small GPU deployments

No configuration changes needed. Default installs Ollama and pulls `tinyllama:1.1b`.

To customize models:

```yaml
runcmd:
  # ... other commands ...
  # Pull multiple models on startup
  - export CUBE_MODELS="llama2:7b,mistral:latest,codellama:13b"
```

**vLLM (Recommended for High Performance)**

Optimized for production workloads requiring maximum throughput:

- **Continuous batching:** Higher throughput by batching multiple requests
- **PagedAttention:** Efficient memory management for long contexts
- **Advanced sampling algorithms** for better quality
- **Superior GPU utilization** compared to standard inference
- **OpenAI-compatible API**
- **Tensor parallelism** support for multi-GPU setups
- Best for large-scale production deployments

Before deploying, set environment variables:

```bash
export CUBE_AI_BACKEND=vllm
export CUBE_VLLM_MODEL="meta-llama/Llama-2-7b-hf"
```

#### Optional: Add TLS/mTLS Certificates

For production deployments, uncomment and add certificates in the cloud-init file:

```yaml
- path: /etc/cube/certs/server.crt
  content: |
    -----BEGIN CERTIFICATE-----
    MIIFbTCCBFWgAwIBAgIRALKEQiuQNmWdAUKriL2Ky60wDQYJKoZIhvcNAQELBQAw
    [Your server certificate]
    -----END CERTIFICATE-----
  permissions: '0644'

- path: /etc/cube/certs/server.key
  content: |
    -----BEGIN PRIVATE KEY-----
    [Your server private key]
    -----END PRIVATE KEY-----
  permissions: '0600'
```

Then update `/etc/cube/agent.env.template`:

```bash
UV_CUBE_AGENT_SERVER_CERT=/etc/cube/certs/server.crt
UV_CUBE_AGENT_SERVER_KEY=/etc/cube/certs/server.key
```

### Step 5: Deploy the Confidential VM

Navigate back to the GCP directory and deploy:

```bash
cd ../ # Back to gcp directory
tofu init
tofu plan -var-file="../terraform.tfvars"
tofu apply -var-file="../terraform.tfvars"
```

The deployment process creates:

- AMD SEV-SNP confidential compute instance
- Encrypted boot and data disks
- Firewall rules allowing TCP 7001 (Cube Agent)
- Network configurations for secure connectivity

Upon successful completion:

```
Outputs:
vm_public_ip = "35.192.45.123"
```

### Step 6: Verify Deployment

After 2-3 minutes (depending on backend and models), verify the deployment:

**Check cloud-init completion:**

```bash
ssh cubeadmin@35.192.45.123
cloud-init status --wait
```

Expected output:

```
status: done
```

**Verify Cube Agent status:**

```bash
sudo systemctl status cube-agent
```

Expected output:

```
● cube-agent.service - Cube Agent Service
   Loaded: loaded (/etc/systemd/system/cube-agent.service; enabled)
   Active: active (running) since...
```

**Test the Cube Agent API:**

```bash
curl http://localhost:7001/health
```

Expected response:

```json
{"status": "pass"}
```

**Check AI backend status:**

For Ollama:

```bash
sudo systemctl status ollama
curl http://localhost:11434/api/version
```

For vLLM:

```bash
sudo systemctl status vllm
curl http://localhost:8000/health
```

---

## Deploying Cube AI on Microsoft Azure

### Step 1: Azure Authentication and KMS Setup

Start by authenticating with Azure and setting up key management:

```bash
cd cocos-infra/azure/kms
az login
tofu init
tofu plan -var-file="../../terraform.tfvars"
tofu apply -var-file="../../terraform.tfvars"
```

This creates the disk encryption set and outputs:

```
Outputs:
disk_encryption_id = "/subscriptions/<subscription-id>/resourceGroups/cube-rg/providers/Microsoft.Compute/diskEncryptionSets/des-cube-ai"
```

### Step 2: Configure Azure-Specific Variables

Update `terraform.tfvars` with Azure-specific configurations:

```hcl
# Common Configuration
vm_name = "cube-ai-vm"

# Azure-specific
resource_group_name = "cube-ai-rg"
location = "westus"
subscription_id = "your-subscription-id"

# VM Configuration
disk_encryption_id = "/subscriptions/<subscription-id>/resourceGroups/cube-rg/providers/Microsoft.Compute/diskEncryptionSets/des-cube-ai"
cloud_init_config = "/path/to/cube/hal/ubuntu/cube-agent-config.yml"
machine_type = "Standard_DC4ads_v5" # 4 vCPUs, AMD SEV-SNP
```

**Azure Machine Type Recommendations:**

| Use Case | Machine Type | Specs |
| :--- | :--- | :--- |
| Development/Testing | `Standard_DC2ads_v5` | 2 vCPUs, 8GB RAM |
| Production (Ollama) | `Standard_DC4ads_v5` | 4 vCPUs, 16GB RAM |
| Production (vLLM) | `Standard_DC8ads_v5` or higher | 8+ vCPUs, 32GB+ RAM |

### Step 3: Deploy Azure CVM

Follow the same pattern as GCP:

```bash
cd ../ # Back to azure directory
tofu init
tofu plan -var-file="../terraform.tfvars"
tofu apply -var-file="../terraform.tfvars"
```

Azure deployment outputs:

```
Outputs:
vm_fqdn = "cube-ai-vm.westus.cloudapp.azure.com"
vm_public_ip = "52.183.45.67"
```

### Step 4: Verify Azure Deployment

Use the same verification steps as GCP:

```bash
ssh cubeadmin@52.183.45.67
cloud-init status --wait
sudo systemctl status cube-agent
curl http://localhost:7001/health
```

---

## Testing Your Deployment

### Chat Completion (Ollama)

```bash
curl http://<vm-ip>:7001/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "tinyllama:1.1b",
    "messages": [
      {"role": "user", "content": "What is confidential computing?"}
    ]
  }'
```

### Chat Completion (vLLM)

```bash
curl http://<vm-ip>:7001/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "meta-llama/Llama-2-7b-hf",
    "messages": [
      {"role": "user", "content": "Explain secure AI inference"}
    ]
  }'
```

---

## Advanced Configurations

### Custom Models and Fine-Tuning

**For Ollama - Custom Modelfile:**

```bash
# SSH into VM
ssh cubeadmin@<vm-ip>

# Create custom modelfile
cat > /tmp/Modelfile <<EOF
FROM llama2:7b
PARAMETER temperature 0.7
PARAMETER top_p 0.9
SYSTEM You are a helpful AI assistant specializing in cybersecurity.
EOF

# Create custom model
sudo -u ollama /usr/local/bin/ollama create cybersec-assistant -f /tmp/Modelfile
```

**For vLLM - Custom Model from HuggingFace:**

```bash
# Update cloud-init or manually
export CUBE_VLLM_MODEL="your-org/your-custom-model"
sudo systemctl restart vllm
```

### GPU Support (vLLM)

**GCP with GPU:**

Update `terraform.tfvars`:

```hcl
machine_type = "n1-standard-8"
gpu_type     = "nvidia-tesla-t4"
gpu_count    = 1
```

**Azure with GPU:**

Update `terraform.tfvars`:

```hcl
machine_type = "Standard_NC6s_v3" # NVIDIA V100
```

### Multi-Model Deployment

Deploy multiple models on the same VM:

```yaml
# In cloud-init
runcmd:
  - export CUBE_MODELS="llama2:7b,codellama:13b,mistral:latest,tinyllama:1.1b"
```

---

Deploying Cube AI on confidential virtual machines provides enterprise-grade security for AI workloads while maintaining complete infrastructure control.

---

## Next Steps

1. **Start Small:** Deploy a development instance to familiarize yourself with the architecture
2. **Test Thoroughly:** Validate performance, security, and cost before production
3. **Scale Gradually:** Move to production with monitoring and backup strategies in place
4. **Stay Updated:** Keep cloud-init configurations, models, and infrastructure templates current

## Additional Resources

- **Cube Documentation:** [github.com/ultravioletrs/cube-docs](https://github.com/ultravioletrs/cube-docs)
- **Infrastructure Templates:** [github.com/ultravioletrs/cocos-infra](https://github.com/ultravioletrs/cocos-infra)
- **SuperMQ (Authentication):** [github.com/absmach/supermq](https://github.com/absmach/supermq)
- **Ollama Models:** [ollama.com/library](https://ollama.com/library)
- **vLLM Documentation:** [docs.vllm.ai](https://docs.vllm.ai)
- **AMD SEV-SNP:** [AMD Confidential Computing](https://www.amd.com/en/technologies/security-confidential-computing)
- **Intel TDX:** [Intel Trust Domain Extensions](https://www.intel.com/content/www/us/en/developer/tools/trust-domain-extensions/overview.html)

---

Ready to deploy? Start your confidential AI journey with Cube AI on secure CVMs today. Whether you're processing sensitive healthcare data, protecting proprietary models, or ensuring regulatory compliance, Cube AI provides the security foundation you need.

For questions, issues, or contributions, visit our [GitHub repository](https://github.com/ultravioletrs/cube) or join our community discussions.

**Deploy confidently. Infer securely. Scale with Cube AI.**
