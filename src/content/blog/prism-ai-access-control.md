---
slug: prism-ai-access-control
title: "PRISM AI: Understanding Privacy-Preserving Access Control"
excerpt: "How PRISM AI's fine-grained permissions and role-based access control create secure, isolated collaborative environments."
description: "How PRISM AI's fine-grained permissions and role-based access control create secure, isolated collaborative environments."
author:
  name: "Jilks Smith"
  picture: "https://avatars.githubusercontent.com/u/41241359?v=4"
tags: ["prism ai", "access-control", "rbac", "confidential-computing", "security"]
date: 2026-02-17
image: /img/prism-access-control/prism-access-control.png
coverImage: /img/prism-access-control/prism-access-control.png
ogImage:
  url: /img/prism-access-control/prism-access-control.png
featured: false
---



In today's AI and data-driven world, building secure collaborative platforms is more critical than ever. Organizations require systems that enable multiple users to collaborate while maintaining strict control over who can access what. In environments with strict policies, it's crucial to prevent organizations from having visibility of data used in processes, and likewise, prevent exposure of their proprietary algorithms to other entities.

PRISM AI solves this by enforcing a black box setup: users and processes are isolated, without visibility into each other's proprietary assets. This allows teams, for example, to train AI models and extract meaningful insights—safely and compliantly.

Let's examine how PRISM AI enforces isolation in its confidential computing platform to ensure secure and controlled collaboration.

## The Challenges of Access Control

When building platforms that serve multiple organizations and users, one of the biggest challenges is creating an access control system that is both secure and flexible. You need to ensure that:

- Users only see what they're authorized to see
- Different roles have appropriate levels of access
- The system scales across multiple organizational units
- Fine-grained permissions can be applied at different levels

PRISM AI addresses these challenges through a hierarchical, role-based access control (RBAC) system that operates at two distinct levels: **Workspaces** and **Computations**.

Let's examine the components of PRISM AI to understand better the access control policies it implements.

![PRISM AI Architecture](/img/prism-access-control/architecture.png)

## Workspaces: Organizational Boundaries

Workspaces are the backbone of PRISM AI's access control model. They act as organizational units—like departments, teams, or projects—defining the primary boundary for user access. Each workspace groups together users, their datasets, and their AI processes (algorithms), all under a clear and secure structure.

### Workspace Roles

The workspace level implements a robust and flexible role structure. There is a default **Administrator** role that is assigned to any user who creates a workspace. There is a provision to create other roles and assign permissions to those roles.

- **Administrator**: Offers complete control over the workspace, including user management, setting configuration, creating Confidential Virtual Machines, and the ability to delete the workspace.

One important permission to mention is the permission to create and delete virtual machines. Computational workloads run inside confidential virtual machines. These CVMs are costly and hence a need to limit such permissions. Deleting a virtual machine stops running computations and this is risky.

A user can create roles such as the ones shown below and assign permissions. This allows for fine-grained access control:

- **Member**: Basic access to workspace resources with standard operational permissions.
- **Viewer Member**: Assign limited permissions, such as view only.

This approach at the workspace level keeps administration simple while ensuring clear separation of responsibilities.

## Computations: Confidential Workloads

While workspaces provide organizational structure, the real power of PRISM AI's access control is seen in how it handles **Computations**. Computations are definitions of AI workloads. A computation consists of the following elements:

- **Assets**: An asset in computation can either be a dataset or an algorithm. These are just definitions on the platform. Each asset is composed of a hash of the contents, name, description, and an optional preview of the contents.
- **Users**: These are the users who own an asset.
- **User Public Keys**: Each user is required to create RSA key pairs and upload their public key. This is important for uploading the actual dataset or algorithm at the time of running a computation.

### Computation Roles

PRISM recognizes that different users interact with computations in fundamentally different ways. Rather than forcing everyone into generic roles, the system provides seven specialized roles:

| Role | Description |
| :--- | :--- |
| **Administrator** | The computation owner with full control |
| **Viewer** | Read-only access to computation details |
| **Editor** | Can modify computation settings and configurations |
| **Runner** | Can execute computations but cannot modify them |
| **Dataset Provider** | Specialized role for users who contribute data |
| **Algorithm Provider** | For users who contribute algorithms |
| **Result Consumer** | For users who need access to computation outputs |

### Permission Mapping

Each role maps to specific permissions that align with real-world workflows:

| Permission | Description |
| :--- | :--- |
| **Owner** | Complete control (view, edit, run, manage access) |
| **View** | Inspect computation details and status |
| **Edit** | Modify settings and configurations |
| **Run** | Execute the computation |
| **Provide Data** | Input datasets for processing |
| **Provide Algo** | Contribute algorithms and processing logic |
| **Consume Result** | Access and utilize computation outputs |

Thanks to the flexibility of PRISM AI's access control, you can create new roles and assign them specific permissions tailored to your needs. Additionally, existing roles can be extended by incorporating any of these permissions, allowing for precise and adaptable access management.

## Cryptography

All users who need to perform the roles of data provision, algorithm provision, and the ability to download computation results are required to upload individual public keys. These keys are important to verify that the user who is uploading the algorithm or data or downloading results is who they say they are.

These three key operations are carried out using the **COCOS CLI Tool**. The tool requires three items for these operations:

1. **The user's private key**
2. **The user's actual asset file** — The hash of the contents of this file are validated against the hash the user supplied when creating the asset definition on the platform. Users do not upload asset files on the platform UI; rather, they are uploaded directly into the Confidential Virtual Machine that will be running the workloads.
3. **The IP address of the Confidential Virtual Machine** — This can be viewed on the platform.

![PRISM AI CLI](/img/prism-access-control/cli.png)

## Why This Architecture Works

### Principle of Least Privilege

Users receive only the permissions they need for their specific role, creating fine-grained access control and isolation.

### Real-World Role Alignment

The roles map directly to how teams work with computational resources, making the system intuitive to use and administer.

### Scalable Governance

The hierarchical structure allows organizations to scale their access control without creating administrative bottlenecks.

### Flexibility Without Complexity

While the system supports fine-grained control, it doesn't overwhelm users with unnecessary complexity at each level.

## Conclusion

PRISM AI's access control architecture demonstrates that security and usability don't have to be at odds. By implementing a hierarchical RBAC system with specialized computation roles, the platform enables secure multi-party collaboration while maintaining strict isolation between users and their proprietary assets.

Whether you're a data scientist contributing datasets, an ML engineer providing algorithms, or an analyst consuming results, PRISM AI ensures you have exactly the access you need—nothing more, nothing less.
