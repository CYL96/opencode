# 废除 Worktree 并改为分支识别 实施计划

> **给代理执行者：** REQUIRED SUB-SKILL: 使用 `subagent-driven-development`（推荐）或 `executing-plans` 逐任务执行本计划。步骤使用复选框 `- [ ]` 语法追踪。

**目标：** 删除 `skills/` 中的 worktree 工作流，改为基于当前分支识别来决定实施前确认和计划完成后的收尾合并。

**架构：** 本次改造只保留“当前分支”和“主分支”两个核心上下文。执行类 skill 在开始前检查当前分支，若为 `main/master` 必须先征得用户同意；收尾类 skill 不再判断 worktree，而只根据“当前分支是否为功能分支”决定是否提供合并、PR、保留、丢弃等动作。本地合并统一改为 `--no-ff` 命名合并，确保提交名能表达本次任务语义。

**技术栈：** Markdown、Git、OpenCode skills、`rg`

---

### 任务 1：移除计划编写与执行流程中的 worktree 前置假设

**文件：**
- 修改：`skills/writing-plans/SKILL.md`
- 修改：`skills/executing-plans/SKILL.md`
- 修改：`skills/subagent-driven-development/SKILL.md`
- 测试：`skills/writing-plans/SKILL.md`
- 测试：`skills/executing-plans/SKILL.md`
- 测试：`skills/subagent-driven-development/SKILL.md`

- [ ] **步骤 1：先写失败检查与基线场景**

```bash
rg -n "dedicated worktree|using-git-worktrees|isolated workspace" \
  skills/writing-plans/SKILL.md \
  skills/executing-plans/SKILL.md \
  skills/subagent-driven-development/SKILL.md
```

```text
基线场景 A（main 分支起跑）：
你现在要严格按照 `skills/executing-plans/SKILL.md` 执行一个已有 plan。仓库当前分支是 `main`，用户没有授权直接在 `main` 上开发。请只回答你的第一步动作。

基线场景 B（subagent 模式起跑）：
你现在要严格按照 `skills/subagent-driven-development/SKILL.md` 执行一个已有 plan。仓库当前分支是 `master`，用户没有授权直接在 `master` 上开发。请只回答你的第一步动作。
```

- [ ] **步骤 2：运行检查并确认当前文档失败**

运行：

```bash
rg -n "dedicated worktree|using-git-worktrees|isolated workspace" \
  skills/writing-plans/SKILL.md \
  skills/executing-plans/SKILL.md \
  skills/subagent-driven-development/SKILL.md
```

预期：
- 能看到 `writing-plans` 中的 `dedicated worktree`
- 能看到 `executing-plans` 与 `subagent-driven-development` 中的 `using-git-worktrees`
- 基线场景回答不能稳定体现“main/master 必须先询问用户”的正式前置步骤

- [ ] **步骤 3：编写最小实现**

将 `skills/writing-plans/SKILL.md` 的上下文说明改成下面这段：

```markdown
**Context:** This should run in the current git branch context. External tooling may prepare or switch branches before execution, but this skill must not require or create a worktree.
```

在 `skills/executing-plans/SKILL.md` 的 `## The Process` 下方插入新的前置步骤，并保留原有后续步骤：

```markdown
### Step 0: Check Current Branch
1. Run `git branch --show-current`
2. If the branch name is empty: stop and ask the user how to proceed
3. If the branch is `main` or `master`: ask the user for explicit permission before implementation
4. If the user does not approve direct development on `main/master`: stop immediately
5. Otherwise continue to Step 1
```

将 `skills/executing-plans/SKILL.md` 的 Integration 改成下面这段：

```markdown
## Integration

**Required workflow skills:**
- **`writing-plans`** - Creates the plan this skill executes
- **`finishing-a-development-branch`** - Complete development after all tasks
```

在 `skills/subagent-driven-development/SKILL.md` 的 `## The Process` 之前插入正式前置分支检查段落：

```markdown
## Branch Gate Before Dispatch

Before reading tasks or dispatching any implementation subagent:

1. Run `git branch --show-current`
2. If the branch name is empty, stop and ask the user how to proceed
3. If the branch is `main` or `master`, ask the user for explicit permission before implementation
4. If the user does not approve direct development on `main/master`, stop immediately
5. Otherwise continue into the normal process
```

将 `skills/subagent-driven-development/SKILL.md` 的 Integration 改成下面这段：

```markdown
## Integration

**Required workflow skills:**
- **`writing-plans`** - Creates the plan this skill executes
- **`finishing-a-development-branch`** - Complete development after all tasks

**Subagents should use:**
- **`test-driven-development`** - Subagents follow TDD for each task

**Alternative workflow:**
- **`executing-plans`** - Use for parallel session instead of same-session execution
```

- [ ] **步骤 4：运行检查并确认通过**

运行：

```bash
rg -n "dedicated worktree|using-git-worktrees|isolated workspace" \
  skills/writing-plans/SKILL.md \
  skills/executing-plans/SKILL.md \
  skills/subagent-driven-development/SKILL.md
```

预期：
- 以上 3 个文件中不再出现这些 worktree 前置文案
- `executing-plans` 与 `subagent-driven-development` 都存在正式的 branch gate 文案

- [ ] **步骤 5：提交**

```text
使用 `git-commit`，只提交：
- skills/writing-plans/SKILL.md
- skills/executing-plans/SKILL.md
- skills/subagent-driven-development/SKILL.md

建议提交信息：
docs(skill): replace worktree setup with branch gate checks
```

### 任务 2：重写分支收尾流程并删除废弃的 worktree skill

**文件：**
- 修改：`skills/finishing-a-development-branch/SKILL.md`
- 删除：`skills/using-git-worktrees/SKILL.md`
- 测试：`skills/finishing-a-development-branch/SKILL.md`
- 测试：`skills/using-git-worktrees/SKILL.md`

- [ ] **步骤 1：先写失败检查**

```bash
rg -n "worktree|using-git-worktrees|Cleanup Worktree|Present exactly these 4 options|git merge " \
  skills/finishing-a-development-branch/SKILL.md \
  skills/using-git-worktrees/SKILL.md
```

- [ ] **步骤 2：运行检查并确认失败**

运行：

```bash
rg -n "worktree|using-git-worktrees|Cleanup Worktree|Present exactly these 4 options|git merge " \
  skills/finishing-a-development-branch/SKILL.md \
  skills/using-git-worktrees/SKILL.md
```

预期：
- `finishing-a-development-branch` 里仍有 `worktree` 清理与固定四选项文案
- `using-git-worktrees/SKILL.md` 仍然存在
- 本地合并仍是未命名的普通 `git merge` 命令

- [ ] **步骤 3：编写最小实现**

将 `skills/finishing-a-development-branch/SKILL.md` 的核心原则改成：

```markdown
**Core principle:** Verify tests → Determine branches → Present context-aware options → Execute choice.
```

将原来的 `### Step 2: Determine Base Branch` 替换为下面这段：

````markdown
### Step 2: Determine Current Branch And Base Branch

```bash
current_branch=$(git branch --show-current)
git show-ref --verify --quiet refs/heads/main && base_branch=main || git show-ref --verify --quiet refs/heads/master && base_branch=master
```

If `current_branch` is empty, stop and ask the user.

If neither `main` nor `master` exists, stop and ask the user which branch should receive the completed work.
````

将原来的 `### Step 3: Present Options` 替换为下面这段：

````markdown
### Step 3: Present Options

If `current_branch` is not `base_branch`, present these 4 options:

```text
Implementation complete. What would you like to do?

1. Merge back to `$base_branch` locally
2. Push and create a Pull Request
3. Keep the branch as-is (I'll handle it later)
4. Discard this work

Which option?
```

If `current_branch` is already `base_branch`, present this message instead of the 4-option list:

```text
Implementation complete on the base branch. No merge is needed.

1. Keep the current branch as-is
2. Discard this work

Which option?
```
````

在 `Option 1: Merge Locally` 之前插入 merge message 规则，并将合并命令替换为下面这段：

````markdown
Generate the merge commit message from the current plan title first, then the current task title. If neither is explicit in context, stop and ask the user.

```bash
git checkout "$base_branch"
git pull
git merge --no-ff -m "$merge_message" "$current_branch"
npm test / cargo test / pytest / go test ./...
git branch -d "$current_branch"
```
````

将 `Option 2`、`Option 3`、`Option 4` 中所有 `worktree` 文案删除；删除整个 `### Step 5: Cleanup Worktree`；把 Quick Reference 改成不再包含 Keep/Cleanup Worktree 列；把 Common Mistakes、Red Flags、Integration 中所有 `worktree` / `using-git-worktrees` 文案删掉。

使用 `apply_patch` 删除文件：

```diff
*** Begin Patch
*** Delete File: skills/using-git-worktrees/SKILL.md
*** End Patch
```

- [ ] **步骤 4：运行检查并确认通过**

运行：

```bash
rg -n "worktree|using-git-worktrees|Cleanup Worktree|Present exactly these 4 options|git merge " \
  skills/finishing-a-development-branch/SKILL.md skills || true
test ! -e skills/using-git-worktrees/SKILL.md
```

预期：
- `skills/finishing-a-development-branch/SKILL.md` 中不再出现任何 `worktree` 相关内容
- `skills/using-git-worktrees/SKILL.md` 已删除
- 本地合并命令改为 `git merge --no-ff -m`

- [ ] **步骤 5：提交**

```text
使用 `git-commit`，只提交：
- skills/finishing-a-development-branch/SKILL.md
- skills/using-git-worktrees/SKILL.md

建议提交信息：
docs(skill): switch completion flow to branch-based merge handling
```

### 任务 3：验证分支识别流程与 skill 残留引用

**文件：**
- 测试：`skills/writing-plans/SKILL.md`
- 测试：`skills/executing-plans/SKILL.md`
- 测试：`skills/subagent-driven-development/SKILL.md`
- 测试：`skills/finishing-a-development-branch/SKILL.md`

- [ ] **步骤 1：先写最终验证**

```bash
rg -n "worktree|worktrees|using-git-worktrees" skills --glob "*/SKILL.md"
```

```text
场景 A：
你现在要严格按照 `skills/executing-plans/SKILL.md` 执行一个已有 plan。当前分支是 `main`，用户没有授权直接在主分支开发。请只回答你的第一步动作。

场景 B：
你现在要严格按照 `skills/subagent-driven-development/SKILL.md` 执行一个已有 plan。当前分支是 `feature/branch-based-completion`。请只回答开始实施前的第一步动作。

场景 C：
你现在要严格按照 `skills/finishing-a-development-branch/SKILL.md` 收尾。当前分支是 `feature/branch-based-completion`，主分支是 `main`。请列出要给用户的选项，不要提及 worktree。

场景 D：
你现在要严格按照 `skills/finishing-a-development-branch/SKILL.md` 收尾。当前分支是 `main`。请列出要给用户的选项，不要提供“Merge back to main locally”。
```

- [ ] **步骤 2：运行验证并确认通过**

运行：

```bash
rg -n "worktree|worktrees|using-git-worktrees" skills --glob "*/SKILL.md"
```

预期：
- `skills/` 下的 active skill 文件不再包含任何 `worktree` / `worktrees` / `using-git-worktrees`
- 场景 A 的第一步必须是询问用户是否允许在 `main` 直接开发
- 场景 B 的第一步必须是检查当前分支，不得要求准备 worktree
- 场景 C 的选项必须是合并 / PR / 保留分支 / 丢弃，不得提及 worktree
- 场景 D 的选项不得再出现“Merge back to main locally”

- [ ] **步骤 3：请求最终代码审查**

```text
使用 `requesting-code-review` 对以下变更做最终审查：
- skills/writing-plans/SKILL.md
- skills/executing-plans/SKILL.md
- skills/subagent-driven-development/SKILL.md
- skills/finishing-a-development-branch/SKILL.md
- 删除 skills/using-git-worktrees/SKILL.md

审查重点：
- 是否还残留 worktree 语义
- main/master 分支起跑是否有正式询问步骤
- 合并回主分支是否改成分支识别与命名 merge commit
```

- [ ] **步骤 4：若审查无新增修改，不创建空提交**

```text
如果最终验证和代码审查都没有引入新修改，不要创建空提交。
如果审查要求你补一处文案，再修正对应文件并使用 `git-commit` 创建一条最终提交。
建议提交信息：
docs(skill): verify branch-based execution and completion flow
```
