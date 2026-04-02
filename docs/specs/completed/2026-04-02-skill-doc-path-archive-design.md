# Skill 文档路径与归档规则设计

## 目标

把当前项目内与 plan、spec 相关的 skill 默认路径从 `docs/superpowers/` 迁移到 `docs/plans/` 与 `docs/specs/`，并引入 `active/`、`completed/` 两级目录，明确文档创建与归档时机。

## 背景

当前项目中的多个 skill 仍然把 spec 与 plan 默认写到 `docs/superpowers/specs/` 和 `docs/superpowers/plans/`。但仓库希望改为更直接的顶层结构：

- `docs/specs/`
- `docs/plans/`

同时，文档状态需要显式区分：

- `active/` 表示仍在推进中的工作文档
- `completed/` 表示对应需求已经完成并归档的文档

## 设计决策

### 1. 目录契约

统一使用以下目录：

- `docs/specs/active/`
- `docs/specs/completed/`
- `docs/plans/active/`
- `docs/plans/completed/`

默认文件命名保持现有约定，只改目录层级：

- spec: `docs/specs/active/YYYY-MM-DD-<topic>-design.md`
- plan: `docs/plans/active/YYYY-MM-DD-<feature-name>.md`

不再使用 `docs/superpowers/specs/` 与 `docs/superpowers/plans/`，也不保留兼容路径。

### 2. 生命周期规则

创建新 spec 或新 plan 时，一律进入各自的 `active/` 目录。

归档采用统一时机，而不是分阶段归档：

- 只要整个需求还没有完成，spec 与 plan 都继续保留在 `active/`
- 当整个需求完成时，再分别移动到各自的 `completed/`

这样可以避免出现 spec 已归档但 plan 仍在执行中的状态分裂。

### 3. 职责分配

不同 skill 分别负责不同阶段的规则：

- `skills/brainstorming/SKILL.md`
  - 负责规定 spec 的默认创建位置是 `docs/specs/active/`
- `skills/writing-plans/SKILL.md`
  - 负责规定 plan 的默认创建位置是 `docs/plans/active/`
- `skills/finishing-a-development-branch/SKILL.md`
  - 负责规定在整个开发完成的收尾阶段，将当前工作关联的 spec 与 plan 从 `active/` 移到 `completed/`

`skills/verification-before-completion/SKILL.md` 不承担迁移动作。这个 skill 的职责是验证证据，不应扩展为归档编排器。

### 4. 归档安全边界

归档动作只能作用于“当前这次工作明确关联的 spec / plan”，不能对 `active/` 做批量清空或目录级扫动。

允许归档的前提是：

- 当前上下文已明确对应的 spec 路径
- 当前上下文已明确对应的 plan 路径

如果收尾阶段无法确认其中任一文件，则应该先询问或要求显式指定路径，而不是猜测后自动移动。

### 5. 影响文件

本次规则调整预计会修改以下文件：

- `skills/brainstorming/SKILL.md`
- `skills/writing-plans/SKILL.md`
- `skills/brainstorming/spec-document-reviewer-prompt.md`
- `skills/subagent-driven-development/SKILL.md`
- `skills/requesting-code-review/SKILL.md`
- `skills/finishing-a-development-branch/SKILL.md`

此外，仓库需要建立以下默认目录，确保 skill 指向的路径可直接使用：

- `docs/specs/active/`
- `docs/specs/completed/`
- `docs/plans/active/`
- `docs/plans/completed/`

## 数据流与执行流程

### 创建阶段

1. brainstorming 产出 spec，写入 `docs/specs/active/...`
2. writing-plans 基于 spec 产出 plan，写入 `docs/plans/active/...`
3. 执行实现期间，两类文档都保留在 `active/`

### 完成阶段

1. finishing-a-development-branch 进入收尾流程
2. 确认当前工作关联的 spec 与 plan 路径
3. 仅移动当前关联文档到对应 `completed/`
4. 如果路径不明确，则停下并请求确认

## 错误处理

- 不猜测归档目标文件
- 不批量迁移整个 `active/` 目录
- 不在 `verification-before-completion` 中引入文件迁移动作
- 不保留旧路径兼容说明，避免新旧规范并存

## 验证策略

### 文本验证

- 搜索仓库，确保项目 skill 中不再出现 `docs/superpowers/specs` 与 `docs/superpowers/plans`
- 确保所有示例路径切换为 `docs/specs/active/...` 或 `docs/plans/active/...`

### Skill 级验证

针对本次 skill 修改，至少验证以下压力场景：

1. 生成 spec 时，是否默认落到 `docs/specs/active/`
2. 生成 plan 时，是否默认落到 `docs/plans/active/`
3. 收尾时，是否只归档当前关联文档，而不会误移动其他 `active/` 文档

## 非目标

- 不做旧目录到新目录的兼容层
- 不把归档动作塞进 `verification-before-completion`
- 不引入额外状态目录或更复杂的生命周期标签
