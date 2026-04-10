# 废除 Worktree 并改为分支识别的技能改造设计

## 背景

当前 `skills/` 中的计划编写、计划执行、分支收尾流程仍然把 `worktree` 视为标准工作流的一部分。这与当前使用方式不一致：`worktree` 的创建、切换、删除由外部流程管理，仓库内 skill 不应再承担这些职责。

现有实现的主要问题有两类：

1. 多个 skill 仍然要求在专用 `worktree` 中执行，导致技能说明与真实工作流冲突。
2. 收尾流程依赖“是否处于 worktree”来决定后续动作，无法直接围绕“当前分支是否应合回主分支”做决策。

## 目标

1. 从 `skills/` 中彻底移除 `worktree` 的创建、删除、保留、清理语义。
2. 将计划执行前的环境判断改为“当前分支识别”。
3. 在 `main/master` 上开始开发前，必须先询问用户是否允许直接开发。
4. 将计划完成后的收尾逻辑改为“当前分支 vs 主分支”的判断，而不是 `worktree` 判断。
5. 本地合并时强制产生可命名的 merge commit，并保证提交名语义与本次 plan/任务一致。

## 非目标

1. 不在本次改造中新增分支创建能力。
2. 不在本次改造中替代外部环境管理流程。
3. 不尝试兼容旧的 `worktree` 指令文案。

## 影响范围

### 删除

- `skills/using-git-worktrees/SKILL.md`

### 修改

- `skills/writing-plans/SKILL.md`
- `skills/executing-plans/SKILL.md`
- `skills/subagent-driven-development/SKILL.md`
- `skills/finishing-a-development-branch/SKILL.md`

## 设计原则

1. skill 只识别当前 git 上下文，不再准备隔离工作区。
2. “是否允许开始实施”由当前分支决定，而不是由是否存在 `worktree` 决定。
3. “是否需要合并回主分支”由当前是否处于功能分支决定，而不是由是否处于 `worktree` 决定。
4. 收尾动作必须显式体现本次任务语义，避免生成缺乏上下文的默认 merge message。

## 详细设计

### 1. `writing-plans` 的职责收缩

`skills/writing-plans/SKILL.md` 中删除 “This should be run in a dedicated worktree” 这一前提，改为说明：

- 计划应基于当前分支上下文编写和交接。
- 是否处于独立工作区由外部流程决定，不属于该 skill 的职责。

这样可以避免 plan 文档继续把 `worktree` 作为隐含前置条件传播到后续执行 skill。

### 2. 执行前统一进行分支检查

`skills/executing-plans/SKILL.md` 与 `skills/subagent-driven-development/SKILL.md` 都增加正式的前置步骤“检查当前分支”，而不是只在红线列表中提醒。

建议流程：

1. 使用 `git branch --show-current` 读取当前分支。
2. 如果无法识别当前分支，停止并询问用户当前上下文是否允许继续。
3. 如果当前分支为 `main` 或 `master`，必须使用 `question` 工具询问用户是否允许直接在该分支开发。
4. 只有在用户明确同意后，才继续执行计划。
5. 如果当前分支不是 `main/master`，直接继续，不再提及 `worktree`。

该设计满足“在 `main/master` 开发需要询问用户”的明确约束，同时避免 skill 擅自准备新的工作环境。

### 3. 主分支识别规则

`skills/finishing-a-development-branch/SKILL.md` 在收尾前需要同时识别当前分支与主分支。

主分支识别规则：

1. 如果仓库存在 `main`，则主分支为 `main`。
2. 否则如果仓库存在 `master`，则主分支为 `master`。
3. 如果两者都不存在，停止并询问用户本次应该合并到哪个主分支。

当前分支识别规则：

1. 使用 `git branch --show-current` 获取当前分支。
2. 如果当前分支为空或处于 detached HEAD，停止并询问用户。
3. 如果当前分支等于主分支，则不再提供“合并回主分支”的收尾路径。
4. 如果当前分支不等于主分支，则视为功能分支，继续进入可选收尾动作。

### 4. `finishing-a-development-branch` 的新收尾流程

保留“先验证测试，再做后续动作”的原则，但移除全部 `worktree` 分支。

建议流程为：

1. 验证测试通过。
2. 识别当前分支和主分支。
3. 如果当前分支是功能分支，向用户展示收尾选项：
   - 本地合并回主分支
   - 推送并创建 PR
   - 保留当前分支
   - 丢弃当前分支
4. 如果当前分支已经是主分支，不再展示“合并回主分支”，而只展示与当前上下文一致的结束动作。
5. 归档当前 work item 的 spec/plan 文档后，再执行用户选择的后续动作。

这一步的关键变化是：收尾菜单不再以 `worktree` 生命周期为中心，而以“当前功能分支如何结束”为中心。

### 5. 通过非 fast-forward 合并保证提交名可控

为了保证“合并的提交名符合本次操作”，本地合并必须强制使用带消息的非 fast-forward 合并：

```bash
git merge --no-ff -m "merge(skill): 合入分支识别式计划收尾流程" feature/branch-based-completion
```

这样即使功能分支可以 fast-forward，也仍然会生成一条明确的 merge commit，从而保证提交名可控。

`merge-message` 生成规则：

1. 优先从当前 plan 标题生成。
2. 如果 plan 标题不可得，则从当前任务标题生成。
3. 如果两者都不可得，停止并询问用户填写合并提交名。

提交名应明确表达“这是把本次任务成果合回主分支”的语义，避免使用 Git 默认生成的 `Merge branch ...` 文案。

### 6. 删除 `using-git-worktrees` skill

本次改造不保留兼容壳，不将其改造成“只读提示 skill”，而是直接删除 `skills/using-git-worktrees/SKILL.md`。

原因如下：

1. 用户已经明确要求直接废除 `worktree`。
2. 保留旧 skill 只会继续暴露过时概念，增加未来会话误用风险。
3. 当前真正需要保留的能力，已经由“分支识别”和“收尾分支处理”覆盖，不再需要单独的 `worktree` skill。

## 逐文件改动说明

### `skills/writing-plans/SKILL.md`

- 删除对 `dedicated worktree` 的要求。
- 将上下文描述改为“依赖当前分支环境”。

### `skills/executing-plans/SKILL.md`

- 增加正式的 `Step 0: Check Current Branch`。
- 保留“不要在 `main/master` 直接开发”的原则，但改成可执行流程。
- 删除 `using-git-worktrees` 的 Integration 依赖。

### `skills/subagent-driven-development/SKILL.md`

- 增加和 `executing-plans` 一致的当前分支检查步骤。
- 删除 `using-git-worktrees` 的 Integration 依赖。
- 不再要求为任务启动准备 isolated workspace。

### `skills/finishing-a-development-branch/SKILL.md`

- 将 `Determine Base Branch` 扩展为同时识别当前分支和主分支。
- 将固定四选项改为“按当前分支上下文决定展示哪些选项”。
- 本地合并改为 `git merge --no-ff -m`。
- 删除全部 `worktree` 清理、保留、删除相关内容。

### `skills/using-git-worktrees/SKILL.md`

- 直接删除整个文件。

## 错误处理

以下情况必须停止并询问用户，而不是猜测：

1. 当前分支无法识别。
2. 仓库没有 `main` 也没有 `master`。
3. 当前已经在主分支，但用户又要求执行“合并回主分支”。
4. 当前 plan/任务标题无法用于生成 merge commit message。
5. 合并后验证失败。

## 验收标准

1. 仓库 `skills/` 中不再存在任何关于 `worktree` 的创建、删除、清理、保留说明。
2. `executing-plans` 与 `subagent-driven-development` 都显式包含“main/master 需先询问用户”的步骤。
3. `writing-plans` 不再将 `worktree` 作为计划执行前提。
4. `finishing-a-development-branch` 的逻辑完全基于“当前分支 vs 主分支”。
5. 本地合并强制使用 `--no-ff` 生成可控的 merge commit。
6. merge commit message 优先来源于当前 plan/任务标题，不再依赖 Git 默认消息。

## 测试与验证思路

修改完成后应至少人工验证以下场景：

1. 在功能分支执行计划，确认不会再要求使用 `worktree`。
2. 在 `main` 上启动计划执行，确认会先询问用户是否允许直接开发。
3. 在 `master` 上启动计划执行，确认行为与 `main` 一致。
4. 在功能分支完成计划后进入收尾，确认可以选择本地合并且使用命名 merge commit。
5. 在主分支完成计划后进入收尾，确认不会再出现“合并回主分支”的错误选项。
6. 全仓库搜索 `worktree`，确认已无残留引用或只剩历史无关文档。
