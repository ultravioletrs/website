---
slug: prism-mpc-covid-prediction
title: "Secure Multiparty Computation in Action: Training a COVID-19 Prediction Model with Prism"
excerpt: "How Prism enables hospitals to collaboratively train AI models on sensitive patient data without ever sharing the underlying records — illustrated through a COVID-19 risk prediction use case."
description: "Explore how Prism combines secure multiparty computation and confidential computing to let competing institutions jointly train AI models while keeping their raw data fully private. Illustrated with a real-world COVID-19 prediction model scenario."
author:
  name: "Washington Kamadi"
  picture: "https://avatars.githubusercontent.com/u/43080232?v=4&size=64"
tags: [prism-ai, confidential-computing, mpc, privacy, ai, healthcare]
category: blog
coverImage: /img/prism-mpc-covid-prediction/prism_mpc_covid_prediction_cover.png
ogImage:
  url: /img/prism-mpc-covid-prediction/prism_mpc_covid_prediction_cover.png
date: 2026-02-19
---

## 🌍 In the Age of AI, Collaboration Meets Privacy

Artificial intelligence thrives on data. The more diverse, representative, and high-quality the datasets, the better the models become. But there's a catch: most of this valuable data is sensitive.

- Hospitals cannot simply exchange patient records.
- Banks won't share transaction histories with competitors.
- Governments must abide by strict data protection regulations.

The result? Datasets remain siloed, and models underperform because they lack the breadth of real-world diversity.

Prism changes that equation. By combining secure multiparty computation (MPC) with confidential computing, Prism creates a system where organizations can contribute to AI training without ever exposing raw data.

<!--truncate-->

## 🔑 Why This Matters

Modern machine learning is collaborative by nature. No single hospital, bank, or utility has enough data diversity to capture the full picture on its own. Yet pooling data in the traditional sense — sharing it in raw form — is either:

- **Illegal** (e.g., HIPAA, GDPR restrictions),
- **Commercially risky** (revealing customer or transaction data), or
- **Politically sensitive** (government or defense data).

Prism provides a "third way." It allows institutions to train on combined knowledge while keeping their raw data locked inside their own boundaries.

## 🦠 The COVID-19 Prediction Model Use Case

When the COVID-19 pandemic struck, hospitals worldwide faced the same urgent question: how can we predict patient risk and allocate resources more effectively?

**The challenge:**

- Hospital A had thousands of local patient records.
- Hospital B had data from a different region.
- Hospital C had a different demographic mix.

Separately, each dataset was incomplete. Together, they could produce a much more accurate predictive model — but privacy rules forbade raw sharing.

With Prism, these hospitals could:

1. Contribute their datasets securely into confidential compute environments.
2. Run the training algorithm collectively, without revealing the underlying patient information.
3. Retrieve a shared model that outperformed what any one hospital could build alone.

**Impact:** The collective model identified risk factors faster, supported triage decisions, and helped manage scarce resources like ventilators.

## 🔄 How It Works at a Glance

While Prism is deeply technical under the hood, the user experience can be summarized in five phases:

| Phase | Description |
| :--- | :--- |
| **Provisioning** | Define the collaborative project and onboard participants. |
| **Asset Registration** | Each party contributes their dataset or training algorithm securely. |
| **Confidential Compute Setup** | Secure Virtual Machines (CVMs) are created, ensuring encrypted processing. |
| **Execution** | The training task runs inside the enclave; participants monitor results, not raw data. |
| **Results** | The final model is shared only with authorized stakeholders. |

This simplicity hides a lot of cryptographic rigor: attestation guarantees that no tampering occurred, audit logs prove compliance, and results can only be consumed by whitelisted participants.

## 🌐 Beyond COVID-19: Sector-Wide Potential

The COVID-19 scenario is just one example. Prism's design applies across industries where data is valuable, but sensitive:

- **Healthcare** → Train diagnostic AI models across multiple hospitals while patient records stay private.
- **Finance** → Collaboratively build fraud-detection systems using transaction data from multiple banks — without ever seeing competitors' customers.
- **Insurance** → Develop risk models using anonymized claims data pooled across providers.
- **Energy & Utilities** → Forecast demand with data from different operators while protecting business-sensitive usage patterns.
- **Public Sector** → Enable agencies to run large-scale analytics on census, mobility, or defense data without violating regulations.

## 🚀 Why Prism Stands Out

There are other attempts at privacy-preserving collaboration, but Prism offers a distinctive blend of:

- **Privacy by design** — Data owners never lose control. Their datasets never leave their custody unencrypted.
- **Auditability** — Every action is cryptographically signed and verifiable. No black boxes.
- **Scalability** — Built to support multi-institution, multi-geography collaborations across different compliance regimes.
- **Neutrality** — Prism acts as a trusted facilitator, not a data broker.

## 🧭 The Strategic Value for Organizations

For CIOs, compliance officers, and innovation leads, Prism delivers tangible benefits:

- **Unlocks new partnerships** → Collaborations that were previously "impossible" become feasible.
- **Accelerates AI adoption** → More diverse datasets = more accurate and fairer models.
- **Reduces compliance risk** → Stay aligned with HIPAA, GDPR, and emerging AI regulations.
- **Strengthens trust** → Partners and customers see that privacy is protected by architecture, not just promises.

## 📌 Final Thoughts

The future of AI is not just about bigger models — it's about better collaboration. But collaboration only works if privacy is guaranteed.

Prism, powered by the Cocos framework, proves that this isn't just theory — it's practice. Hospitals, banks, governments, and enterprises can all contribute their knowledge without surrendering control of their data.

In a world where data is both powerful and sensitive, Prism shows that organizations don't have to choose between innovation and privacy. They can have both.

---

## References

- [AI COVID-19 Training Repository](https://github.com/ultravioletrs/ai)
- [Cocos CLI Documentation](https://docs.cocos.ultraviolet.rs/)
- [Prism Getting Started Guide](https://docs.prism.ultraviolet.rs/getting-started)
