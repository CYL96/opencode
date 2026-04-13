# Spec Reviewer Dispatch Prompt Template

Use this template when dispatching the real `spec-reviewer` subagent for exactly one plan task review cycle.

**Session boundary rule:** Reuse the same reviewer session only for the same task's fix-and-review loop. Start a fresh session for a different plan task.

```text
OpenCode `task` tool:
  description: "Review spec compliance for Task N: [task title]"
  subagent_type: "spec-reviewer"
  prompt: |
    review_target: [Task N title and short scope]

    full_requirement_details: |
      [Paste the complete requirement detail for this task.
      Include the FULL task text from the plan plus any relevant spec excerpts.
      Do not summarize away acceptance criteria.]

    implemented_scope: |
      [Summarize what files and behaviors the implementer claims changed,
      plus the working-tree or commit scope that should contain the task.]

    base_reference: [BASE_SHA or other exact review reference]

    current_diff_or_range: |
      [Tell the reviewer exactly what to inspect, for example:
      - git diff --stat [BASE_SHA]
      - git diff [BASE_SHA]
      or another precise committed range]

    review_constraints: |
      [This review is requirement-compliance only.
      Check for missing requirements, extra behavior, wrong interpretation,
      and ambiguity that blocks approval.
      Do not block on naming taste, refactor preferences, or style-only feedback.]

    expected_output: |
      Status: APPROVED | CHANGES_REQUIRED | BLOCKED
      missing_requirements:
      - none
      extra_behavior:
      - none
      ambiguous_items:
      - none
      blocking_findings:
      - none
      review_summary: one short paragraph

    Additional instructions:
    - Inspect the actual code and diff. Do not trust the implementer report.
    - Use file:line references for every material finding.
```
