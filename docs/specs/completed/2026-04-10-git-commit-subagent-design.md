# git-commit skill Sub-agent 化重构设计

## 背景

当前 `skills/git-commit/SKILL.md` 是一个完整的主代理提交流程文档，既负责“什么时候触发提交 skill”，也直接承载“如何检查仓库、如何锁定范围、如何生成 message、如何执行 commit、如何验证结果”的全部执行细节。

这种结构有三个明显问题：

1. `SKILL.md` 同时承担调度层和执行层职责，文件过厚，边界不清。
2. 当提交策略需要迭代时，修改的是 skill 本体，而不是更适合承载操作手册的 sub-agent prompt。
3. 当前 skill 不能明确表达“主代理只负责调用，提交由专门 sub-agent 执行”的架构意图。

用户已经明确要求本次改造目标为：

1. 将 `git-commit` 的实际执行流程下沉为 sub-agent 提示词。
2. `SKILL.md` 仅保留调用 sub-agent 的说明，以及调用时必须提供的提交上下文。
3. sub-agent 文件放在 `agents/` 目录下。
4. sub-agent 文件使用英文书写。
5. sub-agent 正文风格不对齐 `agents/review.md`，而是沿用原 `git-commit` skill 的强约束、分步骤、失败即停式操作手册风格。

## 目标

1. 将 `skills/git-commit/SKILL.md` 收缩为一个薄调度 skill。
2. 新增 `agents/git-commit.md`，承载完整的英文 sub-agent prompt。
3. 明确主代理与 sub-agent 之间的调用契约，避免运行时遗漏关键上下文。
4. 保留现有提交流程的安全约束与验证要求，不因 sub-agent 化而放松。

## 非目标

1. 不改变 `git-commit` skill 的触发语义，仍然只在用户明确要求提交时触发。
2. 不新增 `git push`、自动选分支、自动开 PR 等扩展能力。
3. 不把 `agents/git-commit.md` 改写成简短 persona 式模板。
4. 不在本次改造中引入模型、温度、工具权限等 frontmatter 配置字段。

## 影响范围

### 新增

- `agents/git-commit.md`

### 修改

- `skills/git-commit/SKILL.md`

## 设计原则

1. skill 负责调度，agent 负责执行，边界必须清晰。
2. 主代理只传递 sub-agent 无法可靠自行推断的外部上下文。
3. 现有安全规则不能因为文件拆分而丢失。
4. `agents/git-commit.md` 虽然位于 `agents/` 目录，但正文应延续原始 `git-commit` skill 的操作手册风格。
5. `agents/git-commit.md` 使用英文；最终生成的 git commit message 仍保持中文约束。

## 详细设计

### 1. 文件结构重构

重构后的目标结构为：

```text
skills/git-commit/SKILL.md
agents/git-commit.md
```

职责划分如下：

#### `skills/git-commit/SKILL.md`

- 说明何时必须触发该 skill。
- 明确禁止直接裸执行 `git commit`。
- 明确要求调用 `agents/git-commit.md` 对应的 sub-agent。
- 列出调用 sub-agent 时必须提供的上下文。

#### `agents/git-commit.md`

- 用英文承载完整提交流程。
- 保留原 skill 中的仓库检查、范围锁定、diff 分析、历史风格对齐、提交执行、提交后验证、失败即停等完整步骤。
- 作为唯一的提交执行操作手册。

### 2. `SKILL.md` 的瘦身边界

重构后，`skills/git-commit/SKILL.md` 不再保留以下执行细节：

- 仓库与冲突检查的具体命令
- 暂存区与提交范围锁定的具体命令
- staged diff / history 分析命令
- commit message 生成细则的执行流程
- `git commit -F` 的命令包装细节
- 提交后验证命令
- 失败即停的逐条执行逻辑

这些内容全部迁移到 `agents/git-commit.md`。

`SKILL.md` 只保留三类信息：

1. 触发条件
2. 调用指令
3. 调用时必须传入的上下文

### 3. 主代理到 sub-agent 的调用契约

主代理调用 `agents/git-commit.md` 时，必须显式提供以下上下文：

#### `user_request`

- 用户关于“提交到 Git / commit / 生成提交记录”的原始请求或等价转述。
- 用于让 sub-agent 验证本次是否属于明确的提交请求。

#### `repo_path`

- Git 仓库根目录的绝对路径。
- 用于让 sub-agent 在确定的仓库上下文中执行。

#### `task_scope`

- 主代理对本次任务范围的简洁说明。
- 用于约束 sub-agent 只提交与当前任务相关的变更，不误收其他并发工作区改动。

#### `safety_constraints`

- 固定安全约束集合，至少包括：
- no push
- no destructive git operations
- no git config changes
- respect existing staged scope if staged changes already exist
- do not touch unrelated user changes
- use temporary file for commit message, not `git commit -m`

#### `message_constraints`

- 提交信息约束，至少包括：
- follow repository history style
- write the commit message in Chinese
- include body only when needed
- keep lines reasonably short

#### `expected_report`

- 规定 sub-agent 返回结果的结构，至少包括：
- success or failure
- final commit title
- committed scope
- verification summary
- omitted changes, if any

### 4. `agents/git-commit.md` 的 frontmatter 约束

`agents/git-commit.md` 使用极简 frontmatter，不引入模型、温度、工具权限等运行时配置字段。

目标格式为：

```md
---
description: Creates a safe, scope-locked git commit when explicitly requested by the parent agent
mode: subagent
---
```

这样做的原因是：

1. 将运行时决策留给外层环境，而不是固化在仓库文档中。
2. 让该文件聚焦于执行规则本身。
3. 避免未来因运行时配置漂移而频繁修改 skill 仓库内容。

### 5. `agents/git-commit.md` 的正文风格

`agents/git-commit.md` 的正文必须满足以下要求：

1. 使用英文书写。
2. 不采用 `agents/review.md` 那种轻量 persona 模板风格。
3. 延续原始 `skills/git-commit/SKILL.md` 的结构化操作手册风格。

建议保留如下章节结构：

1. `Core Rules`
2. `Execution Flow`
3. `Fail Fast`
4. `Output Requirements`

其中 `Execution Flow` 继续按步骤拆分，例如：

1. Repository and conflict checks
2. Lock the commit scope
3. Analyze staged changes
4. Align with repository history
5. Generate the commit message
6. Perform the commit
7. Post-commit verification
8. Return the result

### 6. 执行规则迁移要求

迁移到 `agents/git-commit.md` 的执行规则必须完整保留原有语义，特别是以下约束：

1. 仅在明确提交请求下继续。
2. 严禁 `push`。
3. 严禁修改 git config。
4. 严禁 destructive git operations。
5. 若已有暂存内容，则只提交暂存区，不能擅自扩大范围。
6. 若暂存区为空，才允许基于任务范围判断是否安全暂存。
7. 不得纳入无关用户改动。
8. 严禁使用 `git commit -m`。
9. 必须使用临时文件与 `git commit -F`。
10. 只有在提交和提交后验证都成功时，才能报告完成。

### 7. `SKILL.md` 中的调用说明写法

重构后的 `skills/git-commit/SKILL.md` 应明确告诉主代理：

1. 遇到明确提交请求时，必须调用 `agents/git-commit.md` 对应的 sub-agent。
2. 不得直接在主代理上下文中裸执行 `git commit`。
3. 调用前先整理调用契约所需上下文。
4. sub-agent 返回失败时，应把失败原因原样报告给用户，而不是自行补救未经授权的 git 操作。

### 8. 基线验证与后续测试要求

由于这是对 skill 的结构性重构，而不是简单文案调整，实施前后都应验证以下行为：

#### 基线问题

当前版本的主要基线问题是：

1. `git-commit` skill 仍是主代理直执行业务流，没有 sub-agent 调度层。
2. `SKILL.md` 过厚，职责混合。
3. sub-agent 所需上下文没有被显式建模为调用契约。

#### 改造后应验证的问题

1. `skills/git-commit/SKILL.md` 是否只剩调度说明和调用上下文。
2. `agents/git-commit.md` 是否承接了完整提交流程。
3. agent 文件是否使用英文，并保持原始 skill 的操作手册风格。
4. `agents/git-commit.md` frontmatter 是否只保留 `description` 与 `mode`。
5. skill 是否仍明确禁止裸 `git commit` 与自动 `push`。

## 错误处理

以下情况必须在文档中保持显式停止语义，不能在 sub-agent 化后弱化：

1. 用户请求并非明确提交请求。
2. 当前目录不是 Git 仓库。
3. 存在未解决冲突。
4. 没有安全可提交范围。
5. `git commit -F` 失败。
6. hook 失败。
7. 提交后验证失败且无法安全修复。

## 验收标准

1. 仓库新增 `agents/git-commit.md`。
2. `skills/git-commit/SKILL.md` 不再包含完整提交流程，只保留调度信息与上下文要求。
3. `agents/git-commit.md` 使用英文书写。
4. `agents/git-commit.md` 的正文风格延续原始 `git-commit` skill 的分步骤操作手册风格。
5. `agents/git-commit.md` 的 frontmatter 只包含 `description` 与 `mode`。
6. 原有的安全约束与失败即停原则在新结构下仍完整保留。

## 实施提示

实施时应尽量最小改动：

1. 优先复用原 `skills/git-commit/SKILL.md` 中已经验证过的规则表述。
2. 以搬移和收缩为主，而不是重新发明新的提交策略。
3. 如果仓库尚不存在 `agents/` 目录，则按最小原则新增。
