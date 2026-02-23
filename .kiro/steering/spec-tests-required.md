---
inclusion: auto
---

# Spec Tests Are Always Required

## Critical Rule

**ALL test tasks in spec task lists MUST be marked as REQUIRED (no asterisk).**

Tests are NEVER optional. Property-based tests, unit tests, integration tests - all testing tasks are mandatory and must be completed as part of the implementation.

## Task Marking Convention

In tasks.md files:

- **REQUIRED tasks** (default): No asterisk after the checkbox
  - Example: `- [ ] 2.2 Write property test for section data loading`
  
- **OPTIONAL tasks**: Have an asterisk (`*`) after the closing bracket
  - Example: `- [ ]* Add performance optimization`

## What This Means

- Property-based test tasks: REQUIRED (no asterisk)
- Unit test tasks: REQUIRED (no asterisk)
- Integration test tasks: REQUIRED (no asterisk)
- Any task that writes or runs tests: REQUIRED (no asterisk)

## When Creating Specs

When generating tasks.md files for any spec:

1. Identify all test-related tasks
2. Ensure they have NO asterisk marker
3. Only mark truly optional enhancement tasks with asterisk
4. Tests validate correctness and are core to the implementation

## Examples

**CORRECT:**

```markdown
- [ ] 5.1 Implement feature logic
- [ ] 5.2 Write unit tests for feature logic
- [ ] 5.3 Write property test for feature correctness
- [ ]* 5.4 Add performance monitoring (optional enhancement)
```

**INCORRECT:**

```markdown
- [ ] 5.1 Implement feature logic
- [ ]* 5.2 Write unit tests for feature logic  ❌ WRONG - tests are required
- [ ]* 5.3 Write property test for feature correctness  ❌ WRONG - tests are required
```

## Rationale

Tests are not optional because:

1. They validate correctness properties from the design
2. They provide confidence that requirements are met
3. They prevent regressions during future changes
4. They are part of the definition of "done" for any task
5. Property-based tests especially validate universal correctness across many inputs

## User Expectation

The user has explicitly stated: "Tests are never optional."

This is a hard requirement and must be respected in all spec generation.
