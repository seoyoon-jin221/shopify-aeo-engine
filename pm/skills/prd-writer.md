# Skill: PRD Writer (Product Requirements Document)
> Adapted from open-source patterns (`phuryn/pm-skills` and `product-on-purpose/pm-skills`).

## Purpose
Instructs an AI agent to write comprehensive, unambiguous, and engineering-ready PRDs for new features or products.

## Trigger Instructions
When prompted to draft or update a PRD, follow these rules:

1. **Start with the Problem & JTBD**: Never jump directly into solution features. State the user pain point, the job to be done, and why existing solutions fail.
2. **Detail Critical User Journeys (CUJs)**: Map step-by-step user interactions from discovery to completion.
3. **Specify Data Contracts & APIs**: Detail input/output schemas, error cases, and third-party dependencies.
4. **Define Measurable Success Metrics**: Include North Star metrics, engagement targets, and guardrail metrics.
5. **Include Non-Functional Requirements**: Latency bounds, privacy/compliance constraints, and browser support.

## Output Format
```markdown
# [Feature / Product Name] PRD
## 1. Problem Statement & Opportunity
## 2. Target Personas & JTBD
## 3. Critical User Journeys (CUJs)
## 4. Technical Specifications & API Contracts
## 5. Non-Functional Requirements & Security
## 6. Success Metrics & Guardrails
```
