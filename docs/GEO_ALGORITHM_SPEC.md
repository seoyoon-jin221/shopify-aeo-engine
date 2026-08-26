# GEO Algorithm & Scoring Specification

## 1. Mathematical Formulation of AI Citation Readiness Score

The overall **AI Citation Readiness Score** \(S \in [0, 100]\) is defined as the weighted composite of four orthogonal vectors:

\[
S = w_1 \cdot C_{\text{citation}} + w_2 \cdot E_{\text{entity}} + w_3 \cdot I_{\text{infogain}} + w_4 \cdot D_{\text{structured}}
\]

Where the component weights and bounds are calibrated as:
* \(w_1 = 30\) (Brand Citation Share across simulated prompts)
* \(w_2 = 25\) (Entity Depth & Attribute Completeness)
* \(w_3 = 25\) (Information Gain & Comparative Density)
* \(w_4 = 20\) (Structured Schema Readiness)

---

## 2. Component Scoring Breakdown

### 2.1 Brand Citation Rate (\(C_{\text{citation}} \in [0, 30]\))
Calculated over a suite of \(N = 4\) generated buyer prompts \(\{q_1, q_2, \dots, q_N\}\):
\[
C_{\text{citation}} = 30 \times \frac{1}{N} \sum_{i=1}^N \mathbf{1}(\text{BrandCited}(q_i))
\]
Where \(\mathbf{1}\) is the indicator function checking if the brand or product domain is cited in the top-3 sources returned by the LLM search simulation.

### 2.2 Entity Completeness (\(E_{\text{entity}} \in [0, 25]\))
Evaluates the existence of high-retrieval entities required by LLM RAG indexing:
- Product Description Length > 200 chars (+5 pts)
- Product Description Length > 500 chars (+5 pts)
- Vendor / Brand Entity (+3 pts)
- \(\ge 3\) Categorical Tags (+4 pts)
- Full Active Ingredient / Material Composition Breakdown (+4 pts)
- Step-by-Step Directions / How to Use (+4 pts)

### 2.3 Information Gain (\(I_{\text{infogain}} \in [0, 25]\))
Evaluates whether the product content answers high-ambiguity buyer queries that search bots synthesize:
- Clinical trial / tested / proven results (+6 pts)
- Target audience / skin type suitability nuance (+6 pts)
- Specific FAQ / Q&A block (+7 pts)
- Sensory texture / finish / scent nuance (+6 pts)

### 2.4 Structured Data Readiness (\(D_{\text{structured}} \in [0, 20]\))
- Active `geo_engine.structured_data` Metafield (+15 pts)
- Legacy Schema / JSON-LD detected (+8 pts)
- Variant & Pricing Availability (+5 pts)

---

## 3. High-Information-Gain FAQ Generation Rules

To maximize citation ranking in Perplexity and ChatGPT Search, generated FAQs must follow the **High Information Gain (HIG)** protocol:
1. **Never generate generic fluff**: Each FAQ must include at least 2 distinct entity terms (e.g. *non-comedogenic, barrier-repair, pH 5.5*).
2. **Direct Answer Syntax**: The first sentence of each answer must directly answer the core question (reducing context truncation in LLM snippets).
3. **Structured Q&A Chunking**: Keep answers between 40–80 words to align with LLM embedding retrieval windows.
