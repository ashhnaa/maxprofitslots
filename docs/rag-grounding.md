# RAG & Grounding for Arena Business Rules (Prompt 10)

The **RAG & Grounding Layer** for **Sports Turf Profit Optimizer** grounds AI Agent decisions in arena-specific business policies and operating constraints retrieved dynamically from policy documents.

---

## 🎯 1. What Grounding Means in this Project

Grounding ensures that the AI Agent does not make unconstrained or hallucinated decisions. Every recommendation is constrained by real, verifiable business knowledge specified by turf owners (e.g. maximum discount limits, peak/weekend restrictions, notification fees, and pricing floors).

---

## 🏛️ 2. Architectural Separation: Structured vs. Unstructured Data

```
┌────────────────────────────────────────────────────────────┐
│                STRUCTURED DATA (SQL / API)                 │
│  - Slot availability & times                               │
│  - Historical bookings & cancellations                     │
│  - Base rack prices                                        │
│  - Customer booking counts                                 │
│  ──> Handled by: Booking Data Provider                     │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│             UNSTRUCTURED BUSINESS KNOWLEDGE (RAG)          │
│  - Owner discount policy & strict discount caps            │
│  - Peak-hour & weekend discount prohibitions               │
│  - Pricing floors & stacking restrictions                  │
│  - Notification operational costs & cadence caps           │
│  ──> Handled by: Rule Retriever / Policy Chunker           │
└────────────────────────────────────────────────────────────┘
```

> [!IMPORTANT]
> **Why transactional booking data does NOT use RAG**:
> Structured booking records, exact timestamps, and payment amounts require atomic, exact, indexed database queries. RAG is designed for unstructured policy documents, owner preferences, and legal operating terms.

---

## 📄 3. Policy Document Storage & Chunking

Arena policy documents are stored in markdown format under `docs/arena-policies/`:
- `arena-1-champions-policy.md` (Champions Sports Zone — Arena ID 1)
- `arena-2-urban-turf-policy.md` (Urban Turf Arena — Arena ID 2)
- `arena-3-sports-hub-policy.md` (Arena Sports Hub — Arena ID 3)

### Chunking Mechanism:
Each document is parsed and chunked by section (`## [Section Name]`):
- **Chunk 1**: `Discount Policy`
- **Chunk 2**: `Peak-Hour Restrictions`
- **Chunk 3**: `Weekend Restrictions`
- **Chunk 4**: `Customer Notification Policy`
- **Chunk 5**: `Cancellation & Rescheduling Rules`

Each chunk contains metadata:
```json
{
  "arenaId": 2,
  "arenaName": "Urban Turf Arena",
  "source": "arena-2-urban-turf-policy.md",
  "section": "Discount Policy",
  "content": "Maximum Allowed Discount: 10% strict cap...",
  "rules": ["Maximum Allowed Discount: 10% strict cap..."]
}
```

---

## 🔍 4. Retrieval & Constraint Enforcement

1. **Retrieval**: `getRelevantRules({ arenaId, slot })` indexes chunks, matches the target arena ID, and extracts section rules relevant to slot timing and candidate actions.
2. **Action Validation**:
   - If Arena 2 policy states `Maximum discount: 10%`, then `DISCOUNT_20` is rejected with `isValid: false` and `invalidationReason: "Discount (20%) exceeds arena maximum threshold of 10% (Source: arena-2-urban-turf-policy.md - Discount Policy)"`.
   - If the slot is `PEAK`, all discount actions (`DISCOUNT_10`, `DISCOUNT_20`) are rejected.
   - If the slot is Weekend and the policy prohibits weekend discounts (e.g. Arena 2), discount actions are rejected.
3. **Safe Fallback**: If an unknown arena has no policy document, the system falls back to default system constraints (`isGroundedPolicy: false`) without fabricating rules.

---

## 🧩 5. Distinct System Responsibilities

| Subsystem | Responsibility |
|---|---|
| **Booking Data Provider** | Provides real-time and historical transactional data (slots, bookings, customers). |
| **RandomForest ML Model** | Predicts natural booking demand probability $P(\text{booking} \mid \text{do\_nothing})$. |
| **RAG / Grounding Layer** | Retrieves business policies and marks prohibited candidate actions as invalid. |
| **Profit Optimization Engine** | Calculates expected profit $\mathbb{E}[\text{Profit}]$ only for valid candidate actions. |
| **AI Agent Orchestrator** | Orchestrates observation, prediction, grounding, optimization, and transparent explanations. |

---

## 🔮 6. Future Production Vector RAG Roadmap

- **MVP (Current)**: Local deterministic markdown parser and section-based similarity retriever with zero external API dependencies.
- **Production (Future)**:
  ```
  Unstructured PDF / Word Policy Uploads
      ↓
  Document Parser & Semantic Chunker
      ↓
  Embeddings Generation (e.g. Vertex AI text-embedding-004)
      ↓
  Vector Database (pgvector / Pinecone)
      ↓
  Hybrid Dense + Sparse Semantic Retrieval
      ↓
  Reranking & Grounded Agent Policy Injection
  ```
