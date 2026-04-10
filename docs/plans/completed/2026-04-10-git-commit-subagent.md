# git-commit 执行流程下沉为 Sub-agent 实施计划

> **给代理执行者：** REQUIRED SUB-SKILL: 使用 `subagent-driven-development`（推荐）或 `executing-plans` 逐任务执行本计划。由于本次会修改现有 skill 文档，开始实施前还必须加载 `writing-skills`；在宣称完成前必须加载 `verification-before-completion`。步骤使用复选框 `- [ ]` 语法追踪。

**目标：** 将 `git-commit` 重构为“薄调度 skill + 英文执行 sub-agent”双层结构，同时完整保留原有提交安全约束、范围锁定规则与提交后验证要求。

**架构：** 先建立当前 `git-commit` skill 仍由主代理直执行业务流的 RED 基线，再以最小改动新增 `agents/git-commit.md` 并收缩 `skills/git-commit/SKILL.md`，最后通过静态检查、行为场景和代码审查确认：执行细节已经全部迁移到 sub-agent，主 skill 只剩触发条件、调用指令和调用契约。

**技术栈：** Markdown、Git、OpenCode `apply_patch`、`rg`、`writing-skills`、`requesting-code-review`、`verification-before-completion`

---

### 任务 1：建立 sub-agent 化改造的 RED 基线

**文件：**
- 验证：`docs/specs/active/2026-04-10-git-commit-subagent-design.md`
- 验证：`skills/git-commit/SKILL.md`
- 验证：`agents/git-commit.md`

- [ ] **步骤 1：运行文件结构与旧流程基线检查**

```bash
rg -n '^## 执行流程|^### 1\. 仓库与异常检查|^### 6\. 执行提交|^### 7\. 提交后验证|^## 失败即停|git add -A :/|git commit -F|git log -1 --format=%B|请从“1\. 仓库与异常检查”开始执行' skills/git-commit/SKILL.md
test ! -e agents/git-commit.md
```

预期：
- `skills/git-commit/SKILL.md` 中能命中完整执行流程、`git commit -F`、`git add -A :/`、提交后验证和失败即停等文案
- `agents/git-commit.md` 尚不存在

- [ ] **步骤 2：运行行为基线场景并确认当前 skill 仍是直执行业务流**

```text
场景 A：
你现在必须严格遵循 `skills/git-commit/SKILL.md`。用户说：“请帮我把当前改动提交到 Git。”
请只回答你的第一步动作。

场景 B：
你现在必须严格遵循 `skills/git-commit/SKILL.md`。用户说：“请帮我生成一条提交记录。”
请只回答你的第一步动作。
```

预期：
- 回答会直接进入仓库检查、暂存区检查或提交信息生成等执行步骤
- 回答里不会出现“调用 `agents/git-commit.md`”之类的调度动作

- [ ] **步骤 3：确认实施范围与已批准 spec 一致**

使用 OpenCode `read` 工具阅读 `docs/specs/active/2026-04-10-git-commit-subagent-design.md`。

预期：
- spec 只要求新增 `agents/git-commit.md`
- spec 只要求修改 `skills/git-commit/SKILL.md`
- spec 明确要求 agent 文件使用英文、frontmatter 只保留 `description` 与 `mode`
- spec 明确要求 `SKILL.md` 仅保留触发条件、调用指令和调用契约

- [ ] **步骤 4：不要提前提交**

```text
在完成任务 2 和任务 3 的验证之前，不要创建 git commit。
```

### 任务 2：新增英文提交 sub-agent，并把主 skill 收缩为调度层

**文件：**
- 新增：`agents/git-commit.md`
- 修改：`skills/git-commit/SKILL.md`
- 测试：`agents/git-commit.md`
- 测试：`skills/git-commit/SKILL.md`

- [ ] **步骤 1：如有需要先创建 `agents/` 目录**

```bash
test -d agents || mkdir -p agents
```

预期：`agents/` 目录存在，为新增 sub-agent 文件做准备。

- [ ] **步骤 2：使用 `apply_patch` 新增 `agents/git-commit.md`，并写入完整英文执行手册**

将新文件内容写成下面这样：

````markdown
---
description: Creates a safe, scope-locked git commit when explicitly requested by the parent agent
mode: subagent
---

You are a Git commit agent. Your goal is to complete one reliable commit with minimal risk, a clear scope, and a verifiable result.

You will receive these inputs from the parent agent:
- `user_request`
- `repo_path`
- `task_scope`
- `safety_constraints`
- `message_constraints`
- `expected_report`

## Core Rules
- Only proceed when `user_request` is an explicit request to create a Git commit.
- Work inside `repo_path`.
- Never push.
- Never change git config.
- Never use destructive git operations.
- If there are already staged changes, treat the staged set as the commit scope and do not broaden it.
- If nothing is staged, use `task_scope` to judge whether the working tree changes are safe to stage for this commit.
- Never include unrelated user changes.
- Never use `git commit -m`.
- Always use a temporary file with `git commit -F`.
- Only report success after the commit and post-commit verification both pass.

## Execution Flow

### 1. Repository and conflict checks
Run:

```bash
git rev-parse --show-toplevel
git diff --name-only --diff-filter=U
```

Judge:
- If the current directory is not a Git repository: stop.
- If any unresolved conflict exists: stop.

### 2. Lock the commit scope
First check the staged set:

```bash
git diff --cached --name-only
```

Rules:
- If the command prints file paths, treat the staged set as the locked commit scope.
- If the command prints nothing, run:

```bash
git status --porcelain
```

- If `git status --porcelain` prints nothing: stop and report that there is nothing to commit.
- If it prints changes, compare them against `task_scope`.
- Only if the visible changes safely match `task_scope`, run:

```bash
git add -A :/
git diff --cached --name-only
```

- If the staged set is still empty after `git add -A :/`: stop.
- Otherwise treat the resulting staged set as the locked commit scope.

### 3. Analyze staged changes
Run:

```bash
git diff --cached --stat
git diff --cached
```

Requirements:
- Determine whether the change is `feat`, `fix`, `docs`, `refactor`, `test`, `build`, `chore`, or another repository-appropriate type.
- Understand the staged change beyond surface-level diff text.
- If the scope was already locked by staged files, only analyze the staged files.

### 4. Align with repository history
Run:

```bash
git log --format=%B%n----END---- -n 10
```

Check:
- whether the repository uses Conventional Commits
- whether it uses emoji prefixes
- how it names scope
- whether the summary leans toward implementation detail or user-visible outcome

Prefer the repository's existing style when drafting the message.

### 5. Generate the commit message
Use this format:

```text
<emoji> <type>(scope when needed): <Chinese summary>

Body when needed
```

Rules:
- The commit message must be written in Chinese.
- Reuse repository scope conventions when possible.
- If no scope convention is clear, derive scope from the main module or omit it for broad changes.
- Add a body only when it clarifies motivation, impact, or scope.
- Keep lines reasonably short.

Type mapping:
- `✨ feat`: new feature
- `🐛 fix`: bug fix
- `📚 docs`: documentation
- `🎨 style`: formatting only
- `♻️ refactor`: refactoring
- `⚡️ perf`: performance
- `🧪 test`: tests
- `📦 build`: build or dependency changes
- `🚀 ci`: CI/CD
- `🧹 chore`: maintenance
- `⏪ revert`: revert

### 6. Perform the commit
You must use a temporary file and `git commit -F`.

Steps:
1. Write the full commit message to a temporary file.
2. Run:

```bash
git commit -F "$tmp"
```

3. Remove the temporary file.

Constraints:
- Do not add `-S` explicitly.
- Do not add `--no-verify` unless the parent agent explicitly authorizes it.
- Prefer `trap 'rm -f "$tmp"' EXIT` for cleanup.
- If you need to preserve the exit code before cleanup, use a normal variable such as `rc` or `exit_code`. Do not use `status`, because it is a readonly special variable in `zsh`.
- If a hook fails, stop and report it.

Recommended wrapper:

```bash
tmp=$(mktemp) || exit 1
trap 'rm -f "$tmp"' EXIT
git commit -F "$tmp"
```

### 7. Post-commit verification
Run:

```bash
git log -1 --format=%B
git log -1 --stat
```

Check:
- whether the title is complete
- whether the body was preserved
- whether the format is correct
- whether the latest commit matches the intended scope

If the commit message is badly damaged and can be repaired safely, use a new temporary file and run:

```bash
tmp=$(mktemp) || exit 1
trap 'rm -f "$tmp"' EXIT
git commit --amend -F "$tmp"
```

Only do this if the parent agent's safety constraints allow it.

## Output Requirements
Use `expected_report` as the output contract. At minimum report:
1. success or failure
2. final commit title
3. committed scope
4. verification summary
5. omitted changes, if any
6. blocking reason, if failed

## Fail Fast
Stop immediately if any of the following is true:
- `user_request` is not an explicit commit request
- the directory is not a Git repository
- there are unresolved conflicts
- there is no safe commit scope
- `git add -A :/` still leaves nothing staged
- `git commit -F` fails
- a hook fails
- post-commit verification fails and cannot be repaired safely

Start from "1. Repository and conflict checks".
````

- [ ] **步骤 3：使用 `apply_patch` 将 `skills/git-commit/SKILL.md` 整体替换为薄调度版本**

将文件整体收缩为下面内容：

````markdown
---
name: git-commit
description: >-
  【必须强制调用】托管式 Git 提交流程。
  仅当用户明确表达“提交到 Git / commit / 生成提交记录”等意图时触发。
  严禁直接通过普通 shell 执行裸 `git commit`。
  本技能要求主代理调用 `agents/git-commit.md` 执行实际提交。
---

你是 Git 提交调度器。目标是只在用户明确要求提交时，向 `agents/git-commit.md` 提供完整上下文并委托它完成提交。

## 核心规则
- 仅在用户明确要求提交到 Git 时触发，不因“保存/上传/完成修改”等模糊表述误触发。
- 严禁直接裸执行 `git commit`。
- 严禁自动 `git push`。
- 必须调用 `agents/git-commit.md` 对应的 sub-agent 执行实际提交流程。
- sub-agent 返回失败时，只报告失败原因，不自行追加未经授权的 Git 操作。
- 只把“已提交且已验证”的结果说成完成。

## 调用前准备
在调用 sub-agent 前，整理以下上下文并显式传入：

1. `user_request`
   - 用户关于“提交到 Git / commit / 生成提交记录”的原始请求或等价转述。

2. `repo_path`
   - Git 仓库根目录绝对路径。

3. `task_scope`
   - 本次任务允许纳入提交的变更范围说明。
   - 如果工作区中存在无关变更，必须明确写出“不纳入本次提交”。

4. `safety_constraints`
   - `no push`
   - `no destructive git operations`
   - `no git config changes`
   - `respect existing staged scope if staged changes already exist`
   - `do not touch unrelated user changes`
   - `use temporary file for commit message, not git commit -m`

5. `message_constraints`
   - `follow repository history style`
   - `write the commit message in Chinese`
   - `include body only when needed`
   - `keep lines reasonably short`

6. `expected_report`
   - `success or failure`
   - `final commit title`
   - `committed scope`
   - `verification summary`
   - `omitted changes, if any`

## 调用指令
使用 `agents/git-commit.md` 对应的 sub-agent，并把上述上下文完整传入。不要在主代理上下文中复制执行该 agent 的内部步骤。

## 失败即停
遇到以下任一情况，不要自行扩大操作范围，而是停止并向用户报告：
- 用户请求并非明确提交请求
- 无法确定仓库根目录
- `task_scope` 无法区分目标变更和无关变更
- sub-agent 报告冲突、无变更、hook 失败、验证失败或其他阻塞错误

请先整理调用上下文，再调用 `agents/git-commit.md`。
````

- [ ] **步骤 4：运行静态检查，确认执行规则已迁移且调用契约完整落地**

运行：

```bash
rg -n 'agents/git-commit.md|user_request|repo_path|task_scope|safety_constraints|message_constraints|expected_report|严禁直接裸执行 `git commit`|严禁自动 `git push`' skills/git-commit/SKILL.md
rg -n '^description:|^mode:|^## Core Rules|^## Execution Flow|^## Output Requirements|^## Fail Fast|write the commit message in Chinese|git commit -F|git add -A :/' agents/git-commit.md
rg -n '^## 执行流程|^### 1\. 仓库与异常检查|^### 6\. 执行提交|^### 7\. 提交后验证|git diff --cached --stat|git log --format=%B%n----END---- -n 10|请从“1\. 仓库与异常检查”开始执行' skills/git-commit/SKILL.md || true
rg -n '^name:|^model:|^temperature:|^tools:' agents/git-commit.md || true
```

预期：
- 前两条命令有命中，证明 `SKILL.md` 已变成调用契约，`agents/git-commit.md` 已承接完整执行规则
- 第三条命令无输出，证明主 skill 不再保留旧的执行流程细节
- 第四条命令无输出，证明 agent frontmatter 没有多余字段

### 任务 3：完成 GREEN / REFACTOR 验证、代码审查与提交边界确认

**文件：**
- 验证：`docs/specs/active/2026-04-10-git-commit-subagent-design.md`
- 验证：`skills/git-commit/SKILL.md`
- 验证：`agents/git-commit.md`
- 审查：`docs/plans/active/2026-04-10-git-commit-subagent.md`

- [ ] **步骤 1：运行改造后行为场景，确认主 skill 只调度、sub-agent 才执行**

```text
场景 A：
你现在必须严格遵循 `skills/git-commit/SKILL.md`。用户说：“请帮我把 git-commit skill 的 sub-agent 化改动提交到 Git。”
仓库根目录是 `/home/chikage/project/opencode`。
本次任务允许纳入提交的范围只有：
- `skills/git-commit/SKILL.md`
- `agents/git-commit.md`

请只回答你的第一步动作。

场景 B：
你现在必须严格遵循 `agents/git-commit.md`。父代理提供了以下输入：
- `user_request`: “请帮我把 git-commit skill 的 sub-agent 化改动提交到 Git。”
- `repo_path`: `/home/chikage/project/opencode`
- `task_scope`: `only commit skills/git-commit/SKILL.md and agents/git-commit.md for the approved sub-agent split`
- `safety_constraints`: `no push; no destructive git operations; no git config changes; respect existing staged scope if staged changes already exist; do not touch unrelated user changes; use temporary file for commit message, not git commit -m`
- `message_constraints`: `follow repository history style; write the commit message in Chinese; include body only when needed; keep lines reasonably short`
- `expected_report`: `success or failure; final commit title; committed scope; verification summary; omitted changes, if any`

请只回答你的第一步动作。
```

预期：
- 场景 A 的第一步必须是整理调用契约并调用 `agents/git-commit.md`，而不是直接执行仓库检查或 `git commit`
- 场景 B 的第一步必须从 `Repository and conflict checks` 开始，而不是要求父代理补发新的运行时字段

- [ ] **步骤 2：请求最终代码审查**

```text
使用 `requesting-code-review` 对以下变更做最终审查：
- skills/git-commit/SKILL.md
- agents/git-commit.md

审查重点：
- `SKILL.md` 是否只剩触发条件、调用指令和调用契约
- `agents/git-commit.md` 是否完整承接原始提交流程
- agent 文件是否为英文且保持操作手册风格
- frontmatter 是否只保留 `description` 与 `mode`
- 原有安全约束、失败即停与 `git commit -F` 规则是否完整保留
```

- [ ] **步骤 3：若审查发现问题，做最小修正并重跑验证**

```text
如果 `requesting-code-review` 提出阻塞问题，只修正 `skills/git-commit/SKILL.md` 或 `agents/git-commit.md` 中与问题直接相关的最小范围。
修正后必须重新执行任务 2 的步骤 4 与任务 3 的步骤 1，然后再次请求 `requesting-code-review`，直到没有阻塞问题为止。
```

- [ ] **步骤 4：做完成前验证并确认没有多余残留**

运行：

```bash
rg -n 'agents/git-commit.md|user_request|repo_path|task_scope|safety_constraints|message_constraints|expected_report' skills/git-commit/SKILL.md
rg -n '^description:|^mode:|^## Core Rules|^## Execution Flow|^## Output Requirements|^## Fail Fast|write the commit message in Chinese|git commit -F|git add -A :/' agents/git-commit.md
rg -n '^name:|^model:|^temperature:|^tools:' agents/git-commit.md || true
rg -n '^## 执行流程|^### 1\. 仓库与异常检查|^### 6\. 执行提交|^### 7\. 提交后验证|^## 失败即停' skills/git-commit/SKILL.md || true
```

预期：
- `skills/git-commit/SKILL.md` 仍能命中全部调用契约字段
- `agents/git-commit.md` 仍能命中 frontmatter、章节结构和关键执行命令
- `agents/git-commit.md` 中没有 `name`、`model`、`temperature`、`tools` 等多余 frontmatter 字段
- `skills/git-commit/SKILL.md` 中不再出现旧的执行流程章节

- [ ] **步骤 5：使用 `git-commit` 创建实现提交**

```text
使用 `git-commit`，只提交：
- skills/git-commit/SKILL.md
- agents/git-commit.md

如果 `docs/specs/active/2026-04-10-git-commit-subagent-design.md` 或 `docs/plans/active/2026-04-10-git-commit-subagent.md` 只是在本次 handoff 中新增、尚未单独提交，先不要把它们混入实现提交，除非用户明确要求把文档与实现一起提交。

建议提交信息：
🧹 chore(skill): 将 git-commit 提交流程下沉到 sub-agent
```
