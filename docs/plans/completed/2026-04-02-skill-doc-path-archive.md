# Skill Doc Path Archive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development` (recommended) or `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate project skill defaults from `docs/superpowers/` to `docs/specs/` and `docs/plans/`, add `active/` and `completed/` states, and make completion-time archiving happen in the branch-finishing workflow.

**Architecture:** Treat this as a skill-ecosystem consistency change rather than a content migration. Update creation-time skills to write into `active/`, update downstream examples to reference the new paths, and put the archive action only in `finishing-a-development-branch` with a strict rule that it may move only the current work's explicitly identified spec and plan.

**Tech Stack:** Markdown skills, ripgrep (`rg`), OpenCode skill workflow, `apply_patch`

---

### Task 1: Establish RED Baseline And Directory Skeleton

**Files:**
- Create: `docs/specs/completed/.gitkeep`
- Create: `docs/plans/completed/.gitkeep`
- Verify: `skills/brainstorming/SKILL.md`
- Verify: `skills/writing-plans/SKILL.md`
- Verify: `skills/brainstorming/spec-document-reviewer-prompt.md`
- Verify: `skills/subagent-driven-development/SKILL.md`
- Verify: `skills/requesting-code-review/SKILL.md`

- [ ] **Step 1: Run the failing baseline search for old paths**

```bash
rg -n 'docs/superpowers/(plans|specs)' skills
```

Expected: matches in the five skill files and one reviewer prompt file, proving the old path contract is still present.

- [ ] **Step 2: Run the failing baseline search for missing active/completed structure**

```bash
rg -n 'docs/(plans|specs)/(active|completed)' skills
```

Expected: missing or incomplete coverage, proving the new stateful directory contract is not yet documented.

- [ ] **Step 3: Create the completed-directory placeholders**

```diff
*** Add File: docs/specs/completed/.gitkeep
+
*** Add File: docs/plans/completed/.gitkeep
+
```

This keeps the empty archive directories visible in the repository without inventing extra documentation files.

- [ ] **Step 4: Verify the docs directory skeleton exists**

Run: `ls docs/specs docs/plans`
Expected: each directory exists, and each has `active` / `completed` represented either by real files or placeholder files.

- [ ] **Step 5: Do not commit yet**

Wait for explicit user instruction before any git commit. This repository does not allow proactive commits.

### Task 2: Update Spec And Plan Creation Skills

**Files:**
- Modify: `skills/brainstorming/SKILL.md`
- Modify: `skills/writing-plans/SKILL.md`
- Modify: `skills/brainstorming/spec-document-reviewer-prompt.md`

- [ ] **Step 1: Reproduce the old creation-path behavior in the targeted files**

```bash
rg -n 'docs/superpowers/(plans|specs)' \
  skills/brainstorming/SKILL.md \
  skills/writing-plans/SKILL.md \
  skills/brainstorming/spec-document-reviewer-prompt.md
```

Expected: old spec and plan save paths are still referenced.

- [ ] **Step 2: Update brainstorming to create specs in active and describe unified archival timing**

```diff
- 6. **Write design doc** — save to `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md` and commit
+ 6. **Write design doc** — save to `docs/specs/active/YYYY-MM-DD-<topic>-design.md`
...
- - Write the validated design (spec) to `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`
+ - Write the validated design (spec) to `docs/specs/active/YYYY-MM-DD-<topic>-design.md`
+ - Keep the spec in `docs/specs/active/` until the entire work item is complete, then move it to `docs/specs/completed/`
```

Keep the rest of the brainstorming flow intact; only adjust path and lifecycle language.

- [ ] **Step 3: Update writing-plans to create plans in active and describe unified archival timing**

```diff
- **Save plans to:** `docs/superpowers/plans/YYYY-MM-DD-<feature-name>.md`
+ **Save plans to:** `docs/plans/active/YYYY-MM-DD-<feature-name>.md`
...
- **"Plan complete and saved to `docs/superpowers/plans/<filename>.md`. Two execution options:**
+ **"Plan complete and saved to `docs/plans/active/<filename>.md`. Two execution options:**
+
+Keep the plan in `docs/plans/active/` until the entire work item is complete, then move it to `docs/plans/completed/`.
```

Preserve the rest of the execution handoff wording.

- [ ] **Step 4: Update the spec reviewer prompt to point at active specs**

```diff
- **Dispatch after:** Spec document is written to docs/superpowers/specs/
+ **Dispatch after:** Spec document is written to docs/specs/active/
```

- [ ] **Step 5: Verify the targeted creation-time files no longer mention old paths**

Run: `rg -n 'docs/superpowers/(plans|specs)' skills/brainstorming/SKILL.md skills/writing-plans/SKILL.md skills/brainstorming/spec-document-reviewer-prompt.md`
Expected: no output.

### Task 3: Update Downstream Examples And Completion-Time Archiving

**Files:**
- Modify: `skills/subagent-driven-development/SKILL.md`
- Modify: `skills/requesting-code-review/SKILL.md`
- Modify: `skills/finishing-a-development-branch/SKILL.md`

- [ ] **Step 1: Reproduce the downstream old-path references**

```bash
rg -n 'docs/superpowers/(plans|specs)' \
  skills/subagent-driven-development/SKILL.md \
  skills/requesting-code-review/SKILL.md \
  skills/finishing-a-development-branch/SKILL.md
```

Expected: matches in the first two files, and no archive rule yet in `finishing-a-development-branch`.

- [ ] **Step 2: Update downstream examples to use active plan paths**

```diff
- [Read plan file once: docs/superpowers/plans/feature-plan.md]
+ [Read plan file once: docs/plans/active/feature-plan.md]
```

```diff
-   PLAN_OR_REQUIREMENTS: Task 2 from docs/superpowers/plans/deployment-plan.md
+   PLAN_OR_REQUIREMENTS: Task 2 from docs/plans/active/deployment-plan.md
```

- [ ] **Step 3: Add safe archive guidance to finishing-a-development-branch**

```diff
+ ### Step 3.5: Archive Active Spec And Plan
+
+ Before presenting final completion options or immediately after the user chooses a completion path, archive only the current work's explicitly identified documents:
+
+ - Move the current spec from `docs/specs/active/` to `docs/specs/completed/`
+ - Move the current plan from `docs/plans/active/` to `docs/plans/completed/`
+ - Never bulk-move all files from either `active/` directory
+ - If the current spec or plan path is not explicit in context, stop and ask before moving anything
```

Place this where it naturally fits the completion workflow without weakening the existing test-verification gate.

- [ ] **Step 4: Verify downstream files now reflect the new lifecycle**

Run: `rg -n 'docs/(plans|specs)/(active|completed)' skills/subagent-driven-development/SKILL.md skills/requesting-code-review/SKILL.md skills/finishing-a-development-branch/SKILL.md`
Expected: active-path examples in the first two files, and active-to-completed archive guidance in the finishing skill.

- [ ] **Step 5: Verify there are no remaining old-path references in these downstream files**

Run: `rg -n 'docs/superpowers/(plans|specs)' skills/subagent-driven-development/SKILL.md skills/requesting-code-review/SKILL.md skills/finishing-a-development-branch/SKILL.md`
Expected: no output.

### Task 4: Perform Skill-Level Verification And Review

**Files:**
- Verify: `skills/brainstorming/SKILL.md`
- Verify: `skills/writing-plans/SKILL.md`
- Verify: `skills/brainstorming/spec-document-reviewer-prompt.md`
- Verify: `skills/subagent-driven-development/SKILL.md`
- Verify: `skills/requesting-code-review/SKILL.md`
- Verify: `skills/finishing-a-development-branch/SKILL.md`

- [ ] **Step 1: Run the full old-path sweep across project skills**

```bash
rg -n 'docs/superpowers/(plans|specs)' skills
```

Expected: no output.

- [ ] **Step 2: Run the positive sweep for the new path contract**

```bash
rg -n 'docs/(plans|specs)/(active|completed)' skills
```

Expected: the updated creation-time and completion-time rules appear in the six touched files.

- [ ] **Step 3: Run the manual pressure review required by writing-skills**

Use this checklist and confirm each answer from the edited skill text itself:

```text
1. When brainstorming writes a new spec, does the documented default path point to docs/specs/active/?
2. When writing-plans writes a new plan, does the documented default path point to docs/plans/active/?
3. When finishing work, does the completion skill archive only the explicitly identified current spec and plan?
4. Is verification-before-completion still only a verification gate, not a file-moving workflow?
```

Expected: all four answers are an explicit yes.

- [ ] **Step 4: Request code review before claiming completion**

Use `requesting-code-review` against the diff for these skill changes. Treat any important review finding as blocking.

- [ ] **Step 5: Do not commit yet**

After review and verification, report results to the user and wait for explicit commit instructions.
