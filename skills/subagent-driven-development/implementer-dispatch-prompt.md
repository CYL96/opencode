# Implementer Dispatch Prompt Template

Use this template when dispatching the real `implementer` subagent for exactly one plan task.

**Session boundary rule:** If the controller moves from Task N to Task N+1, start a fresh subagent session. Reuse a `task_id` only for the same task's clarification or fix loop.

```text
OpenCode `task` tool:
  description: "Implement Task N: [task title]"
  subagent_type: "implementer"
  prompt: |
    task_title: [Task N title]

    task_goal: [One-sentence task goal]

    full_task_details: |
      [Paste the FULL TEXT of the current task from the plan.
      Include every checklist item, code block, command, expected result,
      and acceptance note. Do not summarize.]

    repo_path: [Absolute repository path]

    relevant_context: |
      [Explain where this task fits in the plan.
      Include relevant spec excerpts, architectural context, existing file patterns,
      prior reviewer findings for same-task re-dispatches, and any assumptions
      already confirmed by the user.]

    allowed_edit_scope: |
      [List the exact files or directories the implementer may edit.
      Also list any touched-but-out-of-scope files that must not be changed.]

    constraints: |
      [Task-specific constraints, including:
      - do not broaden scope
      - do not commit unless this dispatch is explicitly the commit step
      - no unrelated refactors
      - language, API, or compatibility constraints from the spec
      - any repo or branch restrictions that matter for this task]

    verification_requirements: |
      [List the exact verification commands to run and what success means for each.]

    expected_output: |
      Status: DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED
      Summary: what was implemented or attempted
      Verification: commands run and results
      Files changed: exact paths
      Concerns: important follow-up notes
      Blocking reason: if blocked
      Context needed: if more context is required

    Additional instructions:
    - This dispatch is for exactly one plan task.
    - Use `full_task_details` as the source of truth for scope.
    - If key context is missing, return `NEEDS_CONTEXT` instead of guessing.
```
