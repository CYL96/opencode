# Code Quality Reviewer Prompt Template

Use this template when dispatching a code quality reviewer subagent.

**Session boundary rule:** This prompt is scoped to one plan task review cycle. Never reuse its `task_id` for a different plan task.

**Purpose:** Verify implementation is well-built (clean, tested, maintainable)

**Only dispatch after spec compliance review passes.**

```
OpenCode `task` tool:
  description: "Review code quality for Task N"
  subagent_type: "general"
  prompt: |
    Review the current task's code quality before it is committed.

    WHAT_WAS_IMPLEMENTED: [from implementer's report]
    PLAN_OR_REQUIREMENTS: Task N from [plan-file]
    BASE_SHA: [commit before task]
    DESCRIPTION: [task summary]

    The task is not committed yet. Review the working tree diff against BASE_SHA with:
    - `git diff --stat [BASE_SHA]`
    - `git diff [BASE_SHA]`

    Output exactly these sections:
    ### Strengths
    ### Issues
    #### Critical (Must Fix)
    #### Important (Should Fix)
    #### Minor (Nice to Have)
    ### Assessment

    Do not ask for `HEAD_SHA` or a committed review range.
```

**In addition to standard code quality concerns, the reviewer should check:**
- Does each file have one clear responsibility with a well-defined interface?
- Are units decomposed so they can be understood and tested independently?
- Is the implementation following the file structure from the plan?
- Did this implementation create new files that are already large, or significantly grow existing files? (Don't flag pre-existing file sizes — focus on what this change contributed.)

**Code reviewer returns:** Strengths, Issues (Critical/Important/Minor), Assessment
