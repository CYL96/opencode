---
name: subagent-driven-development
description: Use when executing implementation plans with independent tasks in the current session
---

# Subagent-Driven Development

Execute an approved plan by dispatching one fresh role-specific subagent per plan task. The controller prepares complete task context, sends it to the real `implementer`, `spec-reviewer`, and `code-reviewer` subagent types, and advances only through explicit status returns.

**Core principle:** The controller coordinates. The real subagents execute. Full task details live in skill-owned dispatch templates, not in `agents/`.

## When to Use
- You already have an approved implementation plan
- Tasks are mostly independent and can be executed one at a time in this session
- You want explicit task boundaries, explicit review gates, and lower context pressure

**vs. `executing-plans`:**
- Stay in the current session instead of handing work to a parallel session
- Dispatch a fresh subagent per plan task
- Keep review loops explicit with `spec-reviewer` before `code-reviewer`

## Branch Gate Before Dispatch

Before reading tasks or dispatching any implementation subagent:

1. Run `git branch --show-current`
2. If the branch name is empty, stop and ask the user how to proceed
3. If the branch is `main` or `master`, ask the user for explicit permission before implementation
4. If the user does not approve direct development on `main/master`, stop immediately
5. Otherwise continue into the normal process

## Required Dispatch Assets
- `./implementer-dispatch-prompt.md`
- `./spec-reviewer-dispatch-prompt.md`
- `./code-reviewer-dispatch-prompt.md`

## The Process
1. Run the branch gate.
2. Read the plan once. Extract each task's full text, task goal, relevant spec excerpts, allowed file scope, and verification commands.
3. Create or update TodoWrite from the plan.
4. For the current task, fill `./implementer-dispatch-prompt.md` with the full task details and dispatch the real `implementer` subagent type.
5. If `implementer` returns `NEEDS_CONTEXT`, provide the missing context directly or ask the user with `question`, then re-dispatch the same task.
6. If `implementer` returns `BLOCKED`, stop and escalate. Do not blindly retry with the same context.
7. If `implementer` returns `DONE` or `DONE_WITH_CONCERNS`, fill `./spec-reviewer-dispatch-prompt.md` with the current task requirements and review range, then dispatch the real `spec-reviewer`.
8. If `spec-reviewer` returns `CHANGES_REQUIRED`, send the findings back to the same-task `implementer` and repeat the spec review until it returns `APPROVED`.
9. After spec approval, fill `./code-reviewer-dispatch-prompt.md` with the current task context and current diff range, then dispatch the real `code-reviewer`.
10. If `code-reviewer` returns `CHANGES_REQUIRED`, send the findings back to the same-task `implementer` and repeat the code review until it returns `APPROVED`.
11. If either reviewer returns `BLOCKED`, stop and resolve the blocker before moving on.
12. Only after both reviewers approve may the controller ask the implementer to perform the task commit.
13. Mark the task complete in TodoWrite.
14. For the next plan task, start a fresh implementer session with a new `task` invocation.
15. After all plan tasks are complete, use `finishing-a-development-branch`.

## Preparing Dispatch Context

Before calling the real `implementer`, prepare these fields:
- `task_title`
- `task_goal`
- `full_task_details`
- `repo_path`
- `relevant_context`
- `allowed_edit_scope`
- `constraints`
- `verification_requirements`
- `expected_output`

Before calling the real `spec-reviewer`, prepare these fields:
- `review_target`
- `full_requirement_details`
- `implemented_scope`
- `base_reference`
- `current_diff_or_range`
- `review_constraints`
- `expected_output`

Before calling the real `code-reviewer`, prepare these fields:
- `review_goal`
- `full_context`
- `requirements_context`
- `diff_base`
- `diff_target`
- `current_diff_or_range`
- `severity_policy`
- `expected_output`

`full_task_details` and `full_requirement_details` must include the complete task detail for the current task. Do not summarize away acceptance criteria.

## Task Boundary Isolation

Context isolation is the whole point of this workflow. Treat each plan task as a hard boundary.

**Required rules:**
- Different plan task means different subagent session. Start a new `task` invocation and do not pass a previous `task_id`.
- Never reuse prior-task `task_id` values for `implementer`, `spec-reviewer`, or `code-reviewer`.
- Reuse is allowed only within the same plan task for clarification loops and fix-and-review loops.
- Once a plan task is marked complete, consider all subagent session IDs for that task closed.

## Handling Status Returns

**`implementer`:**
- `DONE`: continue to `spec-reviewer`
- `DONE_WITH_CONCERNS`: read the concerns, resolve anything material, then continue to `spec-reviewer`
- `NEEDS_CONTEXT`: supply missing context and re-dispatch
- `BLOCKED`: stop and escalate

**`spec-reviewer`:**
- `APPROVED`: continue to `code-reviewer`
- `CHANGES_REQUIRED`: send findings back to the same-task `implementer`
- `BLOCKED`: stop and escalate

**`code-reviewer`:**
- `APPROVED`: allow the task commit
- `CHANGES_REQUIRED`: send findings back to the same-task `implementer`
- `BLOCKED`: stop and escalate

The controller must never guess whether a subagent succeeded. Use only the explicit returned status.

## Red Flags

**Never:**
- Dispatch `general` for these role-specific tasks when `implementer`, `spec-reviewer`, and `code-reviewer` are available
- Let `SKILL.md` carry role behavior that belongs in `agents/*.md`
- Omit the complete task detail from `full_task_details` or `full_requirement_details`
- Start `code-reviewer` before `spec-reviewer` returns `APPROVED`
- Commit task changes before both reviewers approve
- Reuse a `task_id` from Task N for Task N+1
- Let the controller implement or review the task directly instead of dispatching the proper subagent
- Claim that repository-side prompt files mean the host runtime is already registered for these types

## Integration

**Required workflow skills:**
- `writing-plans`
- `finishing-a-development-branch`

**Related review skill:**
- `requesting-code-review` for broader committed-range or branch reviews
