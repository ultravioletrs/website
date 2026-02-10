---
slug: prism-ai-kubernetes-architecture
title: "PRISM AI: Architecting a Cost-Effective Cloud-Native AI Platform with Kubernetes and GitOps"
excerpt: ""
description: "Explore the DevOps and Kubernetes architecture powering PRISM AI, a confidential computing platform that enables secure collaborative AI workloads."
author:
  name: "Jilks Smith"
  picture: "https://avatars.githubusercontent.com/u/41241359?v=4"
tags: [prism-ai, kubernetes, gitops, devops, cloud-native, argocd]
image: /img/prism-kubernetes.png
date: 2026-02-10
---

![PRISM AI Kubernetes Architecture](/img/prism-kubernetes/prism-kubernetes.png)

Here we'll explore the DevOps and Kubernetes architecture powering PRISM AI, a confidential computing platform that enables secure collaborative AI workloads. We'll dive deep into the technical decisions and tooling choices that enable reliable scaling while maintaining enterprise-grade security and observability.

<!--truncate-->

## A Modern Cloud-Native Stack

PRISM AI represents a modern cloud-native application built with a microservices architecture that embraces DevOps best practices from the ground up.

### Microservices

The platform is built around the following microservices, each with specific responsibilities:

| Service | Responsibility |
|---------|----------------|
| **Authentication Service** | Identity and access management |
| **Users Service** | User lifecycle and profile management |
| **Domains Service** | Domain management with Redis caching |
| **Computations Service** | AI workload orchestration and management |
| **Backends Service** | Infrastructure provider abstraction (Azure, GCP, AWS, Ultraviolet Cloud, self-hosted infrastructure) |
| **Certificates Service** | PKI management for secure communications |
| **Billing Services** | Financial operations and subscription management |
| **UI Service** | Frontend application |

## Kubernetes Orchestration: The Foundation

### Helm Charts as Infrastructure Code

PRISM AI's entire Kubernetes infrastructure is defined through Helm charts, Infrastructure as Code. The following dependencies are defined in the charts:

- **External Secrets** for secret management
- **Kube Prometheus Stack** for monitoring
- **Jaeger** for distributed tracing
- **PostgreSQL** for persistence
- **Redis** for caching
- **NATS** for event streaming
- **OpenSearch** for log analytics
- **Fluent Bit** for log collection

This dependency management approach ensures consistent deployments across environments while maintaining version control and rollback capabilities.

### Container Strategy and Registry Management

PRISM AI utilizes the GitHub Container Registry (GHCR) for managing microservices images. These images are built and tagged from the source code repository using GitHub Actions.

**Development Flow:**
- Latest builds tagged as `latest`: deployed to staging
- Release builds tagged with semantic versions: deployed to production

**Security Implementation:**

All services use private registry authentication through Kubernetes secrets. This ensures secure image distribution while maintaining access control.

```yaml
imagePullSecrets:
  - name: your-container-registry-secret
```

### Resource Management and Scaling

For CPU and memory utilization and management, Horizontal Pod Autoscaler limits are enforced in the deployment manifests.

## GitOps Implementation with ArgoCD

PRISM AI implements a pull-based GitOps model using ArgoCD, where the desired state is declaratively defined in Git repositories and automatically synchronized to Kubernetes clusters.

For cost-effective measures, only two environments are used: staging and production. Rigorous end-to-end and load tests are carried out on all latest builds in the staging environment before updating the production environment.

- **Staging Environment**: Uses `digest` strategy for latest tags, enabling rapid iteration
- **Production Environment**: Uses `newest-build` strategy with tagged releases, ensuring stability

### Automated Image Updates

ArgoCD Image Updater is used to automatically monitor container registries and update the deployments when new images are available:

```yaml
annotations:
  argocd-image-updater.argoproj.io/auth.update-strategy: digest
  argocd-image-updater.argoproj.io/auth.force-update: "true"
  argocd-image-updater.argoproj.io/auth.ignore-tags: latest, mastery
```

This automation reduces manual intervention while maintaining control over the deployments.

The manifests in the helm repository are also updated via GitHub Actions every time there is a tagged release on the source code repository.

## Networking and Ingress Architecture

### Traefik

Traefik serves as both the ingress controller and load balancer, providing structured routing and SSL termination. Traefik manifest defines Traefik as a StatefulSet with persistent volumes, allowing multiple instances for scalability and availability.

**Entry Points Configuration:**

| Port | Purpose |
|------|---------|
| 80 | HTTP traffic (redirects to HTTPS) |
| 443 | HTTPS traffic with automatic SSL |
| 8080 | Traefik dashboard on development |
| 7018 | gRPC backends for agent communication |

**Service Routing:**

| Path | Service |
|------|---------|
| `/ui` | PRISM UI Service |
| `/grafana` | Metrics Visualization |
| `/argocd` | GitOps Dashboard |
| `/opensearch` | Log Analytics Interface |

### SSL/TLS Management

SSL certificates are managed automatically through Let's Encrypt on Traefik, with persistent storage for certificate data using StatefulSets and persistent volumes.

## Database Architecture and Management

PRISM AI uses a database-per-service pattern with PostgreSQL. This approach ensures services are isolated and have autonomy.

| Database | Purpose |
|----------|---------|
| `auth` | Authentication and authorization data |
| `users` | User profiles and preferences |
| `spicedb` | Authorization policy engine (SpiceDB) |
| `computations` | AI workload metadata |
| `backends` | Infrastructure provider configurations |
| `billing` | Financial and subscription data |
| `domains` | Domain management |

Each database instance is configured with:
- Resource limits and requests for optimal performance
- Persistent storage for data durability
- Separate secrets management for security isolation

## Observability: Comprehensive Monitoring and Logging

For enterprise-level observability, PRISM AI uses the Kube Prometheus Stack.

### Components

- **Prometheus**: Metrics collection and alerting
- **Grafana**: Visualization and dashboards
- **AlertManager**: Notification routing and management
- **Node Exporter**: Infrastructure metrics
- **Kube State Metrics**: Kubernetes cluster metrics

### Custom Dashboards

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

### Centralized Logging with OpenSearch

PRISM makes use of:
- **Fluent Bit** for log collection and forwarding
- **OpenSearch** for log storage and indexing
- **OpenSearch Dashboards** for log visualization and analysis

A snippet of the log processing pipeline:

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

### Secret Management

A multi-layered secret management approach is used:

**Development/Staging:**
- Kubernetes secrets for sensitive configuration
- Base64 encoded values with RBAC controls

**Production:**
- External Secrets Operator integration with cloud secret managers
- GCP Secret Manager integration for enterprise environments
- Automatic secret rotation capabilities

### Network Security

**Network Policies:**
Kubernetes network policies restrict inter-service communication, implementing zero-trust networking principles.

**Authentication & Authorization:**
- JWT-based authentication with configurable token lifespans
- SpiceDB for fine-grained authorization policies

### Container Security

The following measures have been applied:
- Private container registries with pull secrets
- Non-root container execution
- Resource limits to prevent resource exhaustion attacks
- Regular security scanning through CI/CD pipelines

## Data Persistence and Backup Strategy

### Backup with Velero

To ensure resilience and availability of user data whenever an incident occurs, PRISM AI uses Velero for disaster recovery. Backups are done regularly.

The following have been configured:
- Kubernetes object backup to DigitalOcean Spaces
- Persistent volume snapshots
- Scheduled backups with configurable retention

## CI/CD Pipeline Architecture

### Multi-Environment

The CI/CD pipeline supports multiple environments with different promotion strategies.

**Branching Strategy:**
- `main` branch: Staging environment (latest image tags)
- `production` branch: Production environment (semantic versioning)

**Automated Testing:**
- Unit tests in source repositories run on GitHub Actions
- UI tests with Playwright and load tests with Artillery before production promotion
- Manual QA tests before promotion to production

### Container Build and Distribution

The container build and distribution process is automated through GitHub Actions and takes place in the following sequence:

1. Code commit triggers GitHub Actions
2. Docker images built and tested
3. Images pushed to GHCR
4. Helm repository is updated with new image references
5. ArgoCD detects changes and syncs to cluster

## Deployment Environments and Configuration Management

### Environment-Specific Configurations

The platform supports multiple deployment environments through Helm values files:

- **staging.yaml**: Development and testing configurations
- **production.yaml**: Production-ready configuration with enhanced security

Major key differences between the files:
- Resource allocations scaled for production workloads
- Enhanced security configurations
- External secret management enabled for production

**Best practices from the environment configurations:**
- Sensitive data is not stored in Git
- Environment variables are configured through environment-specific values
- Helm template validation and linting in CI/CD

## Conclusion

There are many lessons that can be drawn from the PRISM AI architecture, CI/CD, and DevOps practices, especially when it comes to cost optimization without compromising on excellence and security. The platform makes good use of open-source production-ready tools. It also utilizes DigitalOcean primarily, which is more affordable than other cloud providers.

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

### Areas for Future Improvement

- **Service Mesh Integration**: Istio or Linkerd for advanced traffic management
- **Chaos Engineering**: Automated failure testing with Chaos Monkey
- **Cost Optimization**: Advanced resource scheduling and spot instance usage
- **Multi-Cloud Deployment**: Cross-cloud redundancy and disaster recovery
- **Kubernetes Operators**: Custom operators for application lifecycle management
- **Advanced Scheduling**: Topology-aware scheduling and resource optimization