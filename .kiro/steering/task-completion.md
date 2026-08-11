---
inclusion: auto
---

# Task Completion Checklist

Every task must satisfy ALL of the following before it can be marked complete:

## Quality Gates

- [ ] All tests pass (`npm run test` — 100% pass rate)
- [ ] Coverage meets threshold (`npm run test:coverage` — 80% minimum)
- [ ] Lint passes (`npm run lint` — zero errors AND zero warnings)
- [ ] Docker build succeeds (`docker build -t statli .`)
- [ ] E2E tests pass (`npm run test:e2e`)

**Warnings are errors.** If any quality gate produces warnings, the task is not complete. Fix the root cause — do not suppress or ignore warnings.

## Commit Requirements

- [ ] Clean commit with conventional commit format
- [ ] DCO signoff included (`git commit -s`)
- [ ] Commit message uses imperative mood
- [ ] Only related changes in the commit

## Documentation

- [ ] README.md updated if task adds user-facing changes
- [ ] `.kiro/steering/` updated if task changes conventions or structure
- [ ] No duplication between README and steering docs

## CI Compatibility

- [ ] All CI steps use `npm run` scripts
- [ ] All GitHub Actions at latest major version
- [ ] No `continue-on-error` for quality steps
