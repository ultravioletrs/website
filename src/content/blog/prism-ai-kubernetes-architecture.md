---
slug: prism-ai-kubernetes-architecture
title: "PRISM AI: Architecting a Cost-Effective Cloud-Native AI Platform with Kubernetes and GitOps"
excerpt: "Explore the DevOps and Kubernetes architecture powering Prism AI, a confidential computing platform that enables secure collaborative AI workloads."
description: "Explore the DevOps and Kubernetes architecture powering Prism AI, a confidential computing platform that enables secure collaborative AI workloads."
author:
  name: "Jilks Smith"
  picture: "https://avatars.githubusercontent.com/u/41241359?v=4"
tags: ["prism ai", "kubernetes", "gitops", "devops", "cloud-native", "argocd", "devsecops"]
date: 2026-02-17
image: /img/prism-kubernetes/prism-kubernetes.png
coverImage: /img/prism-kubernetes/prism-kubernetes.png
ogImage:
  url: /img/prism-kubernetes/prism-kubernetes.png
featured: false
---

![PRISM AI Kubernetes Architecture](/img/prism-kubernetes/prism-kubernetes.png)

Here we'll explore the DevOps and Kubernetes architecture powering Prism AI, a confidential computing platform that enables secure collaborative AI workloads. We'll dive deep into the technical decisions and tooling choices that enable reliable scaling while maintaining enterprise-grade security and observability.

---

## A Modern Cloud-Native Stack

Prism AI represents a modern cloud-native application built with a microservices architecture that embraces DevOps best practices from the ground up.

### Microservices

The platform is built around the following microservices, each with specific responsibilities:

- **Authentication Service**: Identity and access management
- **Users Service**: User lifecycle and profile management
- **Domains Service**: Domain management with Redis caching
- **Computations Service**: AI workload orchestration and management
- **Backends Service**: Unified infrastructure provider abstraction. It orchestrates confidential VMs across Azure (TDX), GCP (SEV-SNP), AWS, and Ultraviolet Cloud.
- **Attestation Service (am-certs)**: Manages secure enclave attestation and certificate issuance using OpenBao as the PKI backend.
- **Certificates Service**: General PKI management for secure communications
- **Billing Services**: Financial operations and subscription management
- **UI Service**: Frontend application.

## Kubernetes Orchestration: The Foundation

### Helm Charts as Infrastructure Code

Prism AI's entire Kubernetes infrastructure is defined through Helm charts, Infrastructure as Code. The following dependencies are defined in the charts:

- External Secrets for secret management
- PgBouncer for efficient database connection pooling
- Cloudflared for secure edge tunneling
- Argo Rollouts for progressive delivery
- Kube Prometheus Stack for monitoring
- Jaeger for distributed tracing
- OpenBao for dynamic PKI and secrets
- SpiceDB for fine-grained authorization
- PostgreSQL for persistence
- Redis for caching
- Nats for event streaming
- Opensearch for log analytics
- Fluentbit for log collection

This dependency management approach ensures consistent deployments across environments while maintaining version control and rollback capabilities.

### Container Strategy and Registry Management

Prism AI utilizes the GitHub Container Registry (GHCR) for managing microservices images. These images are built and tagged from the source code repository using GitHub Actions.

**Development Flow:**

- Latest builds tagged as latest: deployed to staging
- Release builds tagged with semantic versions: deployed to production

**Security Implementation:**
All services use private registry authentication through Kubernetes secrets. This ensures secure image distribution while maintaining access control.

```yaml
imagePullSecrets:
 - name: your-container-registry-secret
```

### Resource Management and Scaling

For CPU and memory utilization and management, Horizontal Pod Autoscaler is used. Uniquely, Prism AI targets Argo Rollouts instead of standard Deployments, ensuring that autoscaling rules persist correctly across canary releases. Vertical Pod Autoscalers (VPA) are also employed for specific backend services to automatically adjust resource requests based on historical usage.

### GitOps & Progressive Delivery

Prism AI goes beyond standard GitOps by implementing Progressive Delivery using Argo Rollouts.

![Prism AI GitOps Workflow](/img/prism-kubernetes/prism-gitops-flow.png)

- **Production Strategy (Canary)**: Releases are rolled out in stepped phases (e.g., 20% -> pause -> 40% -> ...). This allows the team to validate metrics before exposing the new version to 100% of traffic.
- **Staging Strategy**: Uses a simplified rolling update strategy to ensure rapid iteration loops. ArgoCD synchronizes these definitions from Git, ensuring that the cluster always matches the declarative state.

### Automated Image Updates

ArgoCD Image Updater is used to automatically monitor container registries and update the deployments when new images are available:

```yaml
annotations:
  argocd-image-updater.argoproj.io/auth.update-strategy: digest
  argocd-image-updater.argoproj.io/auth.force-update: "true"
  argocd-image-updater.argoproj.io/auth.ignore-tags: latest, mastery
```

This automation reduces manual intervention while maintaining control over the deployments.

## Networking and Ingress Architecture

### Secure Edge Connectivity with Cloudflare Tunnels

Before traffic reaches the cluster, Prism AI employs Cloudflare Tunnels (cloudflared) to establish a secure, outbound-only connection to the Cloudflare edge. This architecture eliminates the need to expose public IP addresses or configure complex firewall rules.

### Traefik

Traefik serves as both the ingress controller and load balancer, providing structured routing and SSL termination.

**Entry Points Configuration:**

- Port 80: HTTP traffic (redirects to HTTPS)
- Port 443: HTTPS traffic with automatic SSL (Let's Encrypt)
- Port 8080: Traefik dashboard on development
- Port 7018: gRPC backends for confidential agent communication

### Unified Permissioning with SpiceDB

Prism AI employs SpiceDB (based on Google Zanzibar) for its authorization layer. Instead of simple roles, it defines a schema allowing fine-grained Relationship-Based Access Control (ReBAC). This enables complex permission checks (e.g., "Can User A run computation B on Domain C?") to be evaluated with millisecond latency.

## Database Architecture and Management

Prism AI uses a database-per-service pattern with PostgreSQL. This approach ensures services are isolated and have autonomy.

- `auth`, `users`, `domains`: Core entity application data
- `spicedb`: Stores the authorization graph
- `computations`: AI workload metadata
- `backends`/`am-certs`: Infrastructure and Attestation data

### Connection Efficiency with PgBouncer

To handle high-concurrency workloads without exhausting database connections, Prism AI integrates PgBouncer as a lightweight connection pooler.

## Observability: Comprehensive Monitoring and Logging

**Components:**

- **Prometheus**: Metrics collection and alerting
- **Grafana**: Visualization and dashboards
- **AlertManager**: Notification routing and management
- **Node Exporter**: Infrastructure metrics
- **Kube State Metrics**: Kubernetes cluster metrics
- **Cocos Manager Monitoring**: Specific metrics for Confidential Computing nodes (TDX/SNP status).

**Custom Dashboards:**

There are pre-configured dashboards for each service, which provide deeper and custom insights in addition to the default dashboards that are provided out of the box by Grafana. These dashboards are defined in JSON files and imported into Grafana on service creation via ConfigMaps:

```yaml
{{- range $path, $content := .Files.Glob "files/dashboards/*.json" }}
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ $.Release.Name }}-dashboard-{{ base $path | trimSuffix ".json" }}
  namespace: {{ $.Release.Namespace }}
  labels:
    grafana_dashboard: "1"
data:
  {{ base $path }}: |-
{{ ($content| toString) | indent 4 }}
{{- end }}
```

**Alerting Strategy:**
We have defined custom PrometheusRule sets to catch issues proactively:

- **Application**: High Error Rate (>5%), Latency Spikes (P95 > 2s).
- **Cocos Infrastructure**: Specific alerts for `CocosManagerDown` or `AttestationFailed`, ensuring the confidential computing substrate is always healthy.

### Centralized Logging with OpenSearch

Prism makes use of Fluent Bit for log collection and forwarding, OpenSearch for log storage and indexing, and OpenSearch Dashboards for visualization.

```yaml
fluent-bit:
  inputs: |
    [INPUT]
        Name: tail
        Path: /var/log/containers/*.log
        Parser: cri
  outputs: |
    [OUTPUT]
        Name: opensearch
        Host: opensearch-cluster-master
        Index: prism-logs
```

## Security

### Secret Management & Advanced PKI

- **External Secrets Operator**: Syncs static secrets (DB passwords, API keys) from Google Secret Manager.
- **OpenBao (PKI)**: For the high-security confidential environments, we use OpenBao as a dynamic secret backend. The `am-certs` service interacts with OpenBao to issue short-lived X.509 certificates to computing nodes, enabling mutual TLS (mTLS) and secure attestation without long-lived credentials.

### Network Security

**Micro-Segmentation with Network Policies:**
Kubernetes network policies restrict inter-service communication, implementing zero-trust networking principles.

- **Ingress Allow-listing**: Services only accept traffic from specific upstream callers.
- **Egress lockdown**: Outbound traffic is restricted to essential dependencies like the database or specific external APIs.

### Container Security

For container security, the following measures have been applied:

- Private container registries with pull secrets
- Non-root container execution
- Resource limits to prevent resource exhaustion attacks
- Regular security scanning through CI/CD pipelines

## Data Persistence and Backup Strategy

### Backup with Velero

In order to ensure resilience and availability of user data whenever an incident occurs, Prism AI uses Velero for disaster recovery. Backups are done regularly. You can have a look at [https://velero.io/](https://velero.io/) for more information on configuring back ups.

- Kubernetes object backup to DigitalOcean Spaces
- Persistent volume snapshots
- Scheduled backups with configurable retention

## CI/CD Pipeline Architecture

The CI/CD pipeline supports multiple environments with different promotion strategies:

### Branching Strategy

- `main` branch: Staging environment (latest image tags)
- `production` branch: Production environment (semantic versioning)

### Automated Testing

- Unit tests in source repositories and run on GitHub Actions.
- UI tests with Playwright and Load Test with Artillery before production promotion.
- Manual QA tests before promotion to production.

### Container Build and Distribution

The container build and distribution process is automated through GitHub Actions and takes place in the following sequence:

1. Code commit triggers GitHub Actions
2. Docker images built and tested
3. Helm repository is updated with new image references
4. ArgoCD detects changes and syncs to cluster

## Deployment Environments and Configuration Management

### Environment-Specific Configurations

The platform supports multiple deployment environments through Helm values files:

- `staging.yaml`: This contains development and testing configurations
- `production.yaml`: This contains production-ready configuration with enhanced security

Major key differences between the files are:

- Resource allocations scaled for production workloads
- Enhanced security configurations
- External secret management enabled for production

Some best practices takeaway from the environment configurations:

- Sensitive data is not stored in Git
- Environment variables are configured through environment-specific values
- Helm template validation and linting in CI/CD

---

## Conclusion

There are a lot of lessons that can be drawn from the Prism AI architecture, CI/CD, and DevOps practices, especially when it comes to cost optimisation without compromising on excellence and security. The platform makes good use of open-source production-ready tools. They also utilize Digital Ocean primarily, which is a lot cheaper than other Cloud Providers. Let's look at some of the considerations below:

### Scalability Considerations

- **Service Decomposition**: Clear service boundaries enable independent scaling
- **Database Strategy**: Database-per-service prevents bottlenecks
- **Async Communication**: Event-driven architecture improves resilience

### Operational Excellence

- **Observability First**: Comprehensive monitoring from day one
- **GitOps Adoption**: Declarative infrastructure management
- **Automated Testing**: Continuous validation of deployments
- **Disaster Recovery**: Regular backup testing and restoration procedures

### Security Implementation

- **Zero Trust Networking**: Network policies restrict communication
- **Least Privilege Access**: RBAC controls limit access scope
- **Secret Rotation**: Automated secret management and rotation
- **Container Security**: Private registries and security scanning

It is also worth mentioning a few areas of improvement:

- **Service Mesh Integration**: Istio or Linkerd for advanced traffic management
- **Chaos Engineering**: Automated failure testing with Chaos Monkey
- **Cost Optimization**: Advanced resource scheduling and spot instance usage
- **Multi-Cloud Deployment**: Cross-cloud redundancy and disaster recovery
- **Kubernetes Operators**: Custom operators for application lifecycle management
- **Advanced Scheduling**: Topology-aware scheduling and resource optimization

Happy Orchestrating 🙂!
