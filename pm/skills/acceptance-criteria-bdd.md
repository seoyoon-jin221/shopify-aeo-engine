# Skill: Acceptance Criteria & BDD Scenarios (Gherkin)
> Adapted from `phuryn/pm-skills`.

## Purpose
Enables an agent to transform abstract product requirements into deterministic, testable Given-When-Then BDD scenarios.

## Guidelines
1. **Given**: Set up the initial state, preconditions, and database context.
2. **When**: The specific user action or event triggered.
3. **Then**: The verifiable outcome, state mutation, or API response.
4. **Happy Path vs Edge Cases**: Always generate at least 1 happy path scenario and 2 failure/edge-case scenarios (e.g. rate limit, network timeout, invalid schema).

## Template
```gherkin
Feature: [Feature Name]
  As a [Role]
  I want [Capability]
  So that [Benefit]

  Scenario: [Happy path description]
    Given [precondition]
    When [action]
    Then [verifiable result]

  Scenario: [Edge case or error state]
    Given [precondition]
    When [invalid action]
    Then [graceful error handling]
```
