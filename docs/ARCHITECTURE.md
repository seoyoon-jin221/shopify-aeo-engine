# System Architecture & Technical Design

## 1. High-Level Overview

The **Shopify GEO Platform** is architected as a **decoupled monorepo** to maximize early distribution velocity via the Shopify App Store while preventing platform lock-in.

![Shopify GEO Architecture](/Users/emanon/.gemini/antigravity/brain/7a2512ab-71de-45bd-9dae-412c22529925/shopify_geo_architecture_1787431527526.jpg)

---

## 2. Decoupled 3-Layer Architecture

The system comprises three cleanly isolated layers:

```mermaid
graph TD
    subgraph Layer1["Layer 1: Shopify Embedded App & Storefront"]
        UI["Merchant Embedded Dashboard<br/>(React / Shopify Polaris)"]
        ThemeExt["Theme App Extension<br/>(Liquid App Blocks)"]
        HeadlessBridge["App Bridge / OAuth 2.0"]
    end

    subgraph Layer2["Layer 2: Core GEO Microservices Engine"]
        SimEngine["Prompt Simulation Pipeline<br/>(Perplexity / ChatGPT Search / Gemini)"]
        ScoreEngine["Citation Readiness & Info Gain Scorer<br/>(0–100 Algorithm)"]
        SchemaGen["RAG JSON-LD & FAQ Generator"]
        Worker["Async Audit Job Worker<br/>(Inngest / BullMQ)"]
    end

    subgraph Layer3["Layer 3: Data & External API Connectors"]
        ShopifyAPI["Shopify GraphQL Admin API<br/>(Products & Metafields)"]
        SupabaseDB[("Multi-Tenant Supabase DB<br/>(PostgreSQL + RLS)")]
        LLMAPIs["External LLM Search APIs<br/>(OpenAI, Perplexity, Google AI)"]
    end

    UI -->|"Trigger Audit / Sync"| Worker
    Worker --> SimEngine
    SimEngine --> LLMAPIs
    SimEngine --> ScoreEngine
    ScoreEngine --> SchemaGen
    SchemaGen --> SupabaseDB
    UI -->|"Read Scores"| SupabaseDB
    UI -->|"Write 1-Click Fix"| ShopifyAPI
    ShopifyAPI -->|"Sync Metafields"| ThemeExt
```

---

## 3. C4 Model: Container & Component Design

### Container Diagram
```mermaid
C4Container
    title Container Diagram for Shopify GEO SaaS

    Person(merchant, "Shopify Merchant", "D2C Brand Owner / E-commerce Manager")
    System_Boundary(c1, "Shopify GEO System") {
        Container(polaris_ui, "Embedded Dashboard", "React, Polaris, App Bridge", "Provides audit scores, citation breakdowns, and 1-click schema injection")
        Container(app_backend, "Shopify Gateway", "Remix / Node.js", "Handles OAuth, GDPR webhooks, and billing mutations")
        Container(core_engine, "Core GEO Engine", "TypeScript / Node.js", "Simulates AI searches, calculates 0-100 scores, generates JSON-LD graphs")
        ContainerDb(database, "Multi-Tenant DB", "PostgreSQL / Supabase", "Stores merchant audit histories, synthetic queries, and cached schema records")
        Container(theme_ext, "Theme App Extension", "Liquid Blocks & Metafields", "Injects RAG schema into head and FAQ accordions into storefront")
    }

    System_Ext(shopify_admin, "Shopify Admin API", "GraphQL endpoint for product catalog and metafields")
    System_Ext(llm_providers, "AI Search Engines", "Perplexity, ChatGPT Search, Gemini APIs")

    Rel(merchant, polaris_ui, "Uses", "HTTPS / App Bridge")
    Rel(polaris_ui, app_backend, "API Calls", "JSON / HTTPS")
    Rel(app_backend, core_engine, "Executes Audits", "Internal RPC / Async Queue")
    Rel(core_engine, llm_providers, "Simulates Queries", "REST / Streaming")
    Rel(core_engine, database, "Persists Results", "PostgreSQL")
    Rel(app_backend, shopify_admin, "Fetches & Mutates", "GraphQL")
    Rel(shopify_admin, theme_ext, "Renders Metafields", "Liquid")
```

---

## 4. End-to-End Sequence Flow: 1-Click GEO Optimization

```mermaid
sequenceDiagram
    autonumber
    actor Merchant as Merchant (Polaris UI)
    participant Gateway as Shopify Gateway (Remix)
    participant Core as Core GEO Engine
    participant LLM as Perplexity / OpenAI / Gemini
    participant GraphQL as Shopify GraphQL Admin API
    participant Theme as Shopify Theme (Storefront)

    Merchant->>Gateway: Click "Run GEO Audit" for Product Catalog
    Gateway->>GraphQL: Query products(first: 20) { title, tags, description, metafields }
    GraphQL-->>Gateway: Return Product Catalog Items
    Gateway->>Core: Dispatch Audit Job(products)
    
    loop For each Product
        Core->>Core: Generate Target Buyer Queries (intent, ingredients, comparisons)
        Core->>LLM: Simulate Search Query across AI Providers
        LLM-->>Core: Return AI Responses & Cited Domains
        Core->>Core: Compute 0–100 Citation Readiness & Information Gain Score
        Core->>Core: Generate RAG JSON-LD Graph & FAQ Accordion Data
    end

    Core-->>Gateway: Return Audit Results & Recommendations
    Gateway-->>Merchant: Display Scorecard (e.g., 42/100, Missing Clinical Claims)
    
    Merchant->>Gateway: Click "1-Click Auto Fix"
    Gateway->>GraphQL: mutation metafieldsSet(geo_engine.structured_data, geo_engine.faq_data)
    GraphQL-->>Gateway: Mutation Success
    Gateway-->>Merchant: Toast: "Score Boosted to 94/100! Metafields Synced."
    
    Note over Theme: Storefront dynamically renders schema & FAQ for GPTBot & PerplexityBot
```

---

## 5. Multi-Tenant Database Schema (PostgreSQL / Supabase)

```sql
-- Merchants table (Multi-tenant isolation via shop_domain)
CREATE TABLE merchants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_domain VARCHAR(255) UNIQUE NOT NULL,
    access_token TEXT NOT NULL,
    plan_tier VARCHAR(50) DEFAULT 'free', -- 'free', 'pro', 'scale'
    installed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    uninstalled_at TIMESTAMP WITH TIME ZONE
);

-- Product Audit Scores
CREATE TABLE product_audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE,
    shopify_product_id VARCHAR(255) NOT NULL,
    product_title VARCHAR(500) NOT NULL,
    overall_score INT NOT NULL,
    citation_rate_score INT NOT NULL,
    entity_completeness_score INT NOT NULL,
    info_gain_score INT NOT NULL,
    schema_readiness_score INT NOT NULL,
    missing_entities JSONB DEFAULT '[]'::jsonb,
    competitor_threats JSONB DEFAULT '[]'::jsonb,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Simulation Logs
CREATE TABLE simulation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_id UUID REFERENCES product_audits(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    query_text TEXT NOT NULL,
    raw_response TEXT,
    cited_domains JSONB DEFAULT '[]'::jsonb,
    is_brand_cited BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 6. Expansion & Future Multi-Channel Connectors

Because `@shopify-geo/core-engine` is decoupled from Shopify APIs, expanding to other channels (WooCommerce, Amazon Brand Registry, Standalone D2C Web) requires only adding a channel connector:

```
[Core GEO Engine (@shopify-geo/core-engine)]
       │
       ├──► [Shopify Adapter (@shopify-geo/shopify-app)]
       ├──► [Future: WooCommerce REST Adapter]
       ├──► [Future: Amazon A9/Rufus Entity Adapter]
       └──► [Future: Standalone Merchant Web Portal]
```
