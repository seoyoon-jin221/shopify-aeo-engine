# Skill: C4 Architecture & Diagram Designer
> Adapted from `agent-mermaid-skill` (WYXNICK) and `architecture-diagram-skill`.

## Purpose
Enables an agent to generate structured, syntactically valid Mermaid diagrams (C4 Context/Container, Sequence Flows, Entity Relationship Diagrams) for technical specifications.

## Instructions
1. **Always use Mermaid fences**: Wrap diagrams with ````mermaid ... ````.
2. **Prefer C4 & Graph TD**: For system landscapes, use C4Container or `graph TD` with explicit subgraphs.
3. **Prevent Syntax Errors**:
   - Always quote node labels containing special characters or punctuation: `id["Label (Details)"]`.
   - Never use raw HTML tags inside node text.
   - Use meaningful IDs and distinct stroke styling for different tiers (Frontend, Microservice, Storage, Third-party).
4. **Sequence Diagram Clarity**: Include autonumbering (`autonumber`) and explicit participant aliases.
