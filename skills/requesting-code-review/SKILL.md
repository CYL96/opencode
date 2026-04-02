---
name: requesting-code-review
description: Use when completing tasks, implementing major features, or before merging to verify work meets requirements
---

# Requesting Code Review

Dispatch an OpenCode reviewer subagent with the `task` tool to catch issues before they cascade. The reviewer gets precisely crafted context for evaluation — never your session's history. This keeps the reviewer focused on the work product, not your thought process, and preserves your own context for continued work.

**Core principle:** Review early, review often.

## When to Request Review

**Mandatory:**
- After completing major feature
- Before merge to main

**Optional but valuable:**
- When stuck (fresh perspective)
- Before refactoring (baseline check)
- After fixing complex bug

## How to Request

**Subagent-driven-development exception:**

Do not use the committed-range flow below for pre-commit task reviews. In that workflow, the controller should wait until spec compliance passes, then dispatch the task-specific prompt at `skills/subagent-driven-development/code-quality-reviewer-prompt.md` to review the current working tree diff against `BASE_SHA`.

Use the steps below when reviewing an already-committed range, such as a major feature before merge.

**1. Get git SHAs:**
```bash
BASE_SHA=$(git rev-parse HEAD~1)  # or origin/main
HEAD_SHA=$(git rev-parse HEAD)
```

**2. Dispatch reviewer subagent:**

Use the OpenCode `task` tool with `subagent_type: "general"`, and fill the prompt template at `code-reviewer.md`.

**Placeholders:**
- `{WHAT_WAS_IMPLEMENTED}` - What you just built
- `{PLAN_OR_REQUIREMENTS}` - What it should do
- `{BASE_SHA}` - Starting commit
- `{HEAD_SHA}` - Ending commit for committed-range reviews
- `{DESCRIPTION}` - Brief summary

**3. Act on feedback:**
- Fix Critical issues immediately
- Fix Important issues before proceeding
- Note Minor issues for later
- Push back if reviewer is wrong (with reasoning)

## Example

```
[Just completed a major feature and want review before merge]

You: Let me request code review before proceeding.

BASE_SHA=$(git merge-base HEAD origin/main)
HEAD_SHA=$(git rev-parse HEAD)

[Dispatch reviewer subagent via OpenCode `task`]
  WHAT_WAS_IMPLEMENTED: Search indexing and repair support
  PLAN_OR_REQUIREMENTS: docs/superpowers/plans/deployment-plan.md
  BASE_SHA: a7981ec
  HEAD_SHA: 3df7661
  DESCRIPTION: Added indexing, verification, and repair flows for conversation search

[Subagent returns]:
  Strengths: Clean architecture, real tests
  Issues:
    Important: Missing progress indicators
    Minor: Magic number (100) for reporting interval
  Assessment: Ready to proceed

You: [Fix progress indicators]
[Continue to Task 3]
```

## Integration with Workflows

**Subagent-Driven Development:**
- First complete spec compliance review for the task
- Then review the uncommitted task diff against `BASE_SHA`
- Use `skills/subagent-driven-development/code-quality-reviewer-prompt.md`, not `requesting-code-review/code-reviewer.md`

**Executing Plans:**
- Review after each batch (3 tasks)
- Get feedback, apply, continue

**Ad-Hoc Development:**
- Review before merge
- Review when stuck

## Red Flags

**Never:**
- Skip review because "it's simple"
- Ignore Critical issues
- Proceed with unfixed Important issues
- Argue with valid technical feedback

**If reviewer wrong:**
- Push back with technical reasoning
- Show code/tests that prove it works
- Request clarification

See template at: `requesting-code-review/code-reviewer.md`
