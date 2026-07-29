---
id: "72"
slug: "moderations-flat-request-pricing"
date: "2026-07-29"
title: "Moderations Pricing From August 5"
summary: "Starting Wednesday, August 5, 2026, the /v1/moderations endpoint is billed at a flat $0.00001 per successful request — no token metering, no per-model rates, and no charge for failed or retried attempts. Until then, moderation requests remain free."
image:
  src: "/changelog/moderations-flat-request-pricing.png"
  alt: "A circuit board with a glowing shield on the central chip surrounded by coin and checkmark icons, representing per-request moderation pricing"
  width: 1536
  height: 1024
---

Safety classification is cheap upstream but not free to serve: every moderation call still goes through routing, key rotation, logging, and retention like any other request. So far `/v1/moderations` has been recorded at zero cost, which left the request handling unpriced and made moderation traffic invisible in spend analytics. From **Wednesday, August 5, 2026**, the moderations endpoint is billed at a **flat $0.00001 per successful request**. Until that date, moderation requests stay free.

## What Changes On August 5

| Behavior           | Today               | From August 5                          |
| ------------------ | ------------------- | -------------------------------------- |
| Successful request | $0                  | $0.00001, regardless of input size     |
| Failed request     | $0                  | $0                                     |
| Retried attempt    | $0                  | $0 — only the successful attempt bills |
| Moderation model   | No effect on price  | No effect on price                     |
| `api-keys` mode    | No credits deducted | No credits deducted                    |

The price is per request, not per input item and not per token: classifying one string and classifying a batch of fifty cost the same. Every moderation model the endpoint accepts, including `omni-moderation-latest`, bills at that same flat rate.

## Nothing To Change In Your Code

The request and response shapes are unchanged, and no migration is needed:

```bash
curl https://api.llmgateway.io/v1/moderations \
  -H "Authorization: Bearer $LLM_GATEWAY_API_KEY" \
  -d '{
    "input": "I want to harm someone."
  }'
```

At 100,000 moderation calls that is $1.00 in total. Requests served with your own OpenAI key in `api-keys` mode will continue to deduct no credits — the cost is recorded on the log for visibility only.

Once the price takes effect, moderation calls carry a real per-request cost in your activity logs and cost breakdowns, so moderation spend is attributable per project and per API key like the rest of your traffic.

---

**[Moderations docs →](https://docs.llmgateway.io/features/moderations)** | **[View your usage →](https://llmgateway.io/dashboard)**
