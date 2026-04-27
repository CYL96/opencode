---
name: requesting-code-review
description: "派遣审查子代理对代码进行独立评审，及早发现问题。强制触发：完成重大功能后、合并到 main 前。可选触发：卡住时需要新鲜视角、重构前需要基线检查、修复复杂 bug 后。subagent-driven-development 场景中使用专用 reviewer 而非本技能的标准流程。"
---

# Requesting Code Review

Dispatch an OpenCode reviewer subagent with the `task` tool to catch issues before they cascade. The reviewer gets precisely crafted context for evaluation - never your session's history. This keeps the reviewer focused on the work product, not your thought process, and preserves your own context for continued work.

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

Do not use the committed-range flow below for pre-commit task reviews. In that workflow, the controller should wait until spec compliance passes, then dispatch the task-specific prompt at `skills/subagent-driven-development/code-reviewer-dispatch-prompt.md` to review the current working tree diff against `BASE_SHA`.

Use the steps below when reviewing an already-committed range, such as a major feature before merge.

**1. Get git SHAs:**
```bash
BASE_SHA=$(git rev-parse HEAD~1)  # or origin/main
HEAD_SHA=$(git rev-parse HEAD)
```

**2. Dispatch reviewer subagent:**

Use the OpenCode `task` tool with `subagent_type: "code-reviewer"`, and fill the prompt template at `code-reviewer-dispatch-prompt.md`.

**Fields to provide:**
- `review_goal` - What decision the review should support
- `full_context` - What you built and why it matters
- `requirements_context` - Plan or requirements the code should satisfy
- `diff_base` - Starting commit
- `diff_target` - Ending commit for committed-range reviews

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
  review_goal: Confirm the search indexing and repair feature is ready to merge
  full_context: Added indexing, verification, and repair flows for conversation search
  requirements_context: Task 2 from docs/plans/active/deployment-plan.md
  diff_base: a7981ec
  diff_target: 3df7661

[Subagent returns]:
  Status: CHANGES_REQUIRED
  Findings:
    [Important] Missing progress indicators for long-running repair operations
    [Minor] Magic number (100) for reporting interval
  Summary: Ready after fixing the important issue

You: [Fix progress indicators]
[Continue to Task 3]
```

## Integration with Workflows

**Subagent-Driven Development:**
- First complete spec compliance review for the task
- Then review the uncommitted task diff against `BASE_SHA`
- Use `skills/subagent-driven-development/code-reviewer-dispatch-prompt.md`, not `requesting-code-review/code-reviewer-dispatch-prompt.md`

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

See template at: `requesting-code-review/code-reviewer-dispatch-prompt.md`
