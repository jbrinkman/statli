---
inclusion: always
---

# Spec Task Completion and Commit Requirements

## Task Completion Criteria

When implementing tasks from a spec (requirements.md, design.md, tasks.md), a task is NOT complete until ALL of the following conditions are met:

### 1. All Tests Must Pass

- Run ALL tests associated with the task (unit tests, property-based tests, integration tests)
- Every test MUST pass before the task can be marked complete
- If ANY test fails, you MUST fix the failing test before proceeding
- Do NOT mark a task as complete with failing tests
- Do NOT skip or ignore test failures

### 2. Fix All Failing Tests

- Investigate the root cause of each test failure
- Fix the implementation code or test code as appropriate
- Re-run tests to verify the fix
- Repeat until ALL tests pass
- Do NOT move forward with known test failures

### 3. Prevent Error Compounding

- Each task builds on previous tasks
- Completing a task with failing tests will compound errors in subsequent tasks
- Always ensure a clean, passing test suite before moving to the next task
- If you cannot fix a failing test after reasonable attempts, stop and ask the user for guidance

## Commit Requirements

Once a task is complete (all tests passing), you MUST commit all outstanding changes before moving to the next task.

### Commit Process

1. **Verify all tests pass** - Run the test suite one final time
2. **Stage all changes** - Include all modified files related to the task
3. **Create commit** - Follow conventional commit standards and include DCO signoff
4. **Verify commit success** - Ensure the commit was created successfully
5. **Only then proceed** - Move to the next task only after successful commit

### Commit Message Format

Follow the conventional commit standards from `commit-standards.md`:

```bash
git commit -s -m "<type>(<scope>): <description>"
```

**Type examples for spec tasks:**

- `feat`: Implementing new functionality from requirements
- `test`: Adding or fixing tests
- `refactor`: Restructuring code without changing behavior
- `fix`: Fixing bugs discovered during implementation
- `chore`: Build configuration, dependencies, tooling

**Scope examples:**

- Use the task number or feature area (e.g., `task-5.3`, `template-service`, `report-generation`)

**Description:**

- Use imperative mood: "add" not "added" or "adds"
- Be specific about what the task accomplished
- Reference the task number if helpful

### Commit Examples

```bash
# After completing task 5.3 (template variable replacement property test)
git commit -s -m "test(task-5.3): add property test for template variable replacement"

# After completing task 6.1 (project service CRUD operations)
git commit -s -m "feat(project-service): implement CRUD operations with logging"

# After completing task 10.5 (change detection property test)
git commit -s -m "test(report-generation): add property test for change detection accuracy"

# After fixing a bug found during task implementation
git commit -s -m "fix(task-service): correct soft delete logic for subtasks"
```

### DCO Signoff

All commits MUST include Developer Certificate of Origin signoff using the `-s` flag:

```bash
git commit -s -m "your commit message"
```

This automatically adds:

```
Signed-off-by: Your Name <your.email@example.com>
```

## Workflow Summary

For each task in the spec:

1. ✅ Implement the task functionality
2. ✅ Write required tests (if task includes tests)
3. ✅ Run ALL tests
4. ✅ Fix ANY failing tests
5. ✅ Re-run tests until ALL pass
6. ✅ Mark task as complete in tasks.md
7. ✅ Commit all changes with proper message and signoff
8. ✅ Verify commit succeeded
9. ✅ Move to next task

## Critical Rules

- **NEVER mark a task complete with failing tests**
- **NEVER skip committing after completing a task**
- **NEVER move to the next task without a successful commit**
- **ALWAYS fix failing tests before proceeding**
- **ALWAYS include DCO signoff in commits**
- **ALWAYS follow conventional commit format**

## Rationale

This workflow ensures:

- **Quality**: Every task is verified to work correctly
- **Traceability**: Each commit represents a complete, working increment
- **Debugging**: Easy to identify when/where issues were introduced
- **Collaboration**: Clear history for code review and team coordination
- **Confidence**: Each task builds on a solid, tested foundation

## When to Ask for Help

If you encounter any of these situations, STOP and ask the user:

- Tests fail repeatedly after multiple fix attempts
- Unclear how to fix a failing test
- Test failure reveals a design flaw
- Commit fails due to git configuration issues
- Unsure about appropriate commit message or scope
