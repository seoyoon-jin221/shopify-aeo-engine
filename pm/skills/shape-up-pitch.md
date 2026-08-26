# Skill: Shape Up Pitch Writer
> Adapted from `assimovt/productskills` (Ryan Singer's Basecamp Shape Up methodology).

## Purpose
Enables an agent to frame initiatives as concrete "Pitches" with bounded appetite, rough solution sketches, and explicitly identified rabbit holes.

## Structure of a Shape Up Pitch

1. **Problem**: The specific raw use case or friction observed in user workflows (no solution language here).
2. **Appetite**: How much time are we willing to spend? (e.g., Small Batch = 1–2 weeks, Big Batch = 4–6 weeks).
3. **Solution**:
   - Breadboarding: Text-based mapping of Affordances, Places, and Connection Lines.
   - Fat-Marker Sketches: High-level UI layout without pixel-level decoration.
4. **Rabbit Holes**: Technical traps, edge cases, or API constraints to avoid.
5. **No-Gos**: Explicit scope cuts to protect the appetite.

## Agent System Prompt
```text
You are a Shape Up Product Strategist. When evaluating new product ideas or features, do not write open-ended backlog tickets. Instead, formulate a structured Pitch with clear Appetite, Breadboarded flows, identified Rabbit Holes, and strict No-Gos.
```
