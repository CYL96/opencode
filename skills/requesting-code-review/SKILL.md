---
name: requesting-code-review
description: Use when completing tasks, implementing major features, or before merging to verify work meets requirements
---

# Requesting Code Review

Request a real `code-reviewer` subagent with a committed range or other explicit review range. This skill prepares the review context and dispatch contract; the reviewer behavior itself lives in `agents/code-reviewer.md`.

**Core principle:** The controller curates the review range and requirements. The real `code-reviewer` performs the actual review.

## When to Request Review

**Mandatory:**
- After completing a major feature
- Before merge to main

**Optional but valuable:**
- When stuck and you want a fresh technical review
- Before refactoring risky code
- After fixing a complex bug

## Dispatch Contract

Before dispatching the real `code-reviewer`, prepare:
- `review_goal`
- `full_context`
- `requirements_context`
- `diff_base`
- `diff_target`
- `current_diff_or_range`
- `severity_policy`
- `expected_output`

Use `./code-reviewer-dispatch-prompt.md` to package these fields.

## Committed-Range Review Flow
1. Determine a precise review range. Prefer `git merge-base HEAD origin/main` for branch review, or another explicit base when the branch base is not the right boundary.
2. Resolve `BASE_SHA` and `HEAD_SHA`.
3. Fill `./code-reviewer-dispatch-prompt.md` with the complete review goal, requirements context, and committed range.
4. Dispatch the real `code-reviewer` subagent type.
5. Act on the returned status:
   - `APPROVED`: continue
   - `CHANGES_REQUIRED`: fix the findings before merge or before the next milestone
   - `BLOCKED`: stop and resolve the missing context or review-range problem

## Subagent-Driven Development Exception

Do not use this committed-range flow for per-task pre-commit review inside `subagent-driven-development`. That workflow must dispatch the real `code-reviewer` using `skills/subagent-driven-development/code-reviewer-dispatch-prompt.md` against the task's current working tree diff after `spec-reviewer` approves.

## Red Flags

**Never:**
- Dispatch `general` for code review when `code-reviewer` exists
- Ask the reviewer to inspect a vague range such as “latest changes”
- Omit the requirements context
- Treat the summary as more important than findings
- Continue past `CHANGES_REQUIRED` without explicitly accepting the risk

## Template Path
- `./code-reviewer-dispatch-prompt.md` - Dispatch committed-range review to the real `code-reviewer`
