# Subagent 类型与提示词分层设计

## 背景

当前仓库里已经存在 `git-commit` 的 sub-agent 化先例：

- `agents/git-commit.md` 承载全局通用的执行提示词
- `skills/git-commit/SKILL.md` 负责何时调用、调用前整理什么上下文、失败时如何停

但 `subagent-driven-development` 与 `requesting-code-review` 仍然把“角色长期规则”和“本次任务上下文”混在 skill 目录内的 prompt 文件里，边界不清，后续如果要把 `implementer`、`spec-reviewer`、`code-reviewer` 做成真实 `subagent_type`，会立即遇到两个问题：

1. 无法区分“给 sub-agent 的全局角色提示词”和“这次启动 subagent 时的上下文提示词模板”。
2. 现有 reviewer 语义分散在 `code-quality-reviewer` 与 `code-reviewer` 两套命名中，真实类型边界不稳定。

用户已经明确要求：

1. 新增真实 `subagent_type`：`implementer`、`spec-reviewer`、`code-reviewer`。
2. 不再保留 `code-quality-reviewer` 作为真实类型。
3. 必须严格区分两类提示词：
   - 给 sub-agent 的全局通用提示词，放在 `agents/`
   - 启动 subagent 时的上下文提示词模板，放在具体 `skills/` 内
4. 启动 subagent 时的上下文提示词模板必须包含完整任务详情。
5. 本次交付范围是仓库侧完整方案，不要求在当前仓库内实现宿主运行时注册代码。

## 目标

1. 为 `implementer`、`spec-reviewer`、`code-reviewer` 建立与 `git-commit` 一致的“全局 agent prompt + skill 内 dispatch 模板”双层结构。
2. 收敛 reviewer 命名，只保留 `code-reviewer` 作为真实类型。
3. 让 `subagent-driven-development` 与 `requesting-code-review` 只负责调度、上下文组装与错误分支控制，不再承载角色长期行为。
4. 把“完整任务详情必须出现在 dispatch 模板中”写成显式约束，避免未来把任务细节错误地下沉到 `agents/`。
5. 明确当前仓库与外部运行时的边界，避免误以为只新增 `agents/*.md` 就等于运行时已经支持新类型。

## 非目标

1. 不在本次改造中实现宿主 OpenCode 运行时的 `subagent_type` 注册代码。
2. 不新增 `final-reviewer`、`branch-integrator` 等额外真实类型。
3. 不保留 `code-quality-reviewer` 作为兼容别名或第二真实类型。
4. 不改写 `git-commit` 的现有结构。

## 影响范围

### 新增

- `agents/implementer.md`
- `agents/spec-reviewer.md`
- `agents/code-reviewer.md`
- `skills/subagent-driven-development/implementer-dispatch-prompt.md`
- `skills/subagent-driven-development/spec-reviewer-dispatch-prompt.md`
- `skills/subagent-driven-development/code-reviewer-dispatch-prompt.md`
- `skills/requesting-code-review/code-reviewer-dispatch-prompt.md`

### 修改

- `skills/subagent-driven-development/SKILL.md`
- `skills/requesting-code-review/SKILL.md`
- `skills/writing-plans/SKILL.md`
- 任何引用 `code-quality-reviewer` 为真实类型的文档

### 删除或迁移

- `skills/subagent-driven-development/implementer-prompt.md`
- `skills/subagent-driven-development/spec-reviewer-prompt.md`
- `skills/subagent-driven-development/code-quality-reviewer-prompt.md`
- `skills/requesting-code-review/code-reviewer.md`

## 设计原则

1. **角色与任务分层**：`agents/` 只描述角色长期规则，`skills/` 内模板只描述本次派单上下文。
2. **skill 负责调度，agent 负责执行**：`SKILL.md` 决定何时调用、调用前准备什么、失败怎么停；`agents/*.md` 决定收到输入后如何执行。
3. **完整任务详情只进 dispatch 模板**：本次任务全文、计划摘录、diff 范围、允许修改范围等都必须由 skill 层注入，不能写死在全局 agent prompt 中。
4. **真实类型尽量少**：实现、需求符合性评审、代码评审三类职责足够，不再拆第二个 reviewer 类型。
5. **场景差异留在 skill 层**：同一个 `code-reviewer` 可以服务单任务评审和整分支评审，但不同场景要由不同 skill 的 dispatch 模板表达。

## 详细设计

### 1. 总体结构

目标结构如下：

```text
agents/
  git-commit.md
  implementer.md
  spec-reviewer.md
  code-reviewer.md

skills/
  subagent-driven-development/
    SKILL.md
    implementer-dispatch-prompt.md
    spec-reviewer-dispatch-prompt.md
    code-reviewer-dispatch-prompt.md

  requesting-code-review/
    SKILL.md
    code-reviewer-dispatch-prompt.md
```

职责划分：

#### `agents/*.md`

- 描述这个 sub-agent 是谁
- 描述它收到哪些输入字段
- 描述它必须遵守哪些长期稳定规则
- 描述它的结构化输出契约

#### `skills/**/**-dispatch-prompt.md`

- 描述本次派单的完整任务详情
- 注入当前工作流所需的上下文
- 注入本次评审或实现的范围约束
- 注入本次任务的成功判定标准
- 告诉 sub-agent 这次具体应该返回什么

#### `skills/**/SKILL.md`

- 说明什么时候调用哪一种真实 `subagent_type`
- 说明调用前主代理必须准备哪些字段
- 说明 sub-agent 返回不同状态后如何推进或停止

### 2. 全局 agent prompt 的边界

`agents/implementer.md`、`agents/spec-reviewer.md`、`agents/code-reviewer.md` 必须保持全局通用，不能写入以下内容：

- 某一次任务的完整文字说明
- 某个 plan 中某一任务的原文
- 某一次 review 的文件清单
- 某一个 skill 特有的临时判断分支

允许写入的内容包括：

- 该角色的核心职责
- 收到输入时必须先验证什么
- 可以使用什么样的状态集合回复父代理
- 哪些行为属于越权
- 失败时必须停止的条件

### 3. Dispatch 模板的边界

所有 `*-dispatch-prompt.md` 都必须把当前任务需要的上下文显式注入进去，并至少覆盖以下类别：

- 当前任务标题
- 当前任务目标
- 完整任务详情
- 当前相关 spec / plan 摘录
- 本次允许修改或检查的范围
- 本次依赖的 diff / commit / working tree 范围
- 本次必须满足的验证标准
- 预期输出格式

dispatch 模板是“这次派单说明书”，因此必须包含完整任务详情，而不是只给一句模糊命令。

### 4. 真实 `subagent_type` 定义

#### `implementer`

职责：根据完整任务详情实现代码、运行要求的验证、做自检，并向父代理汇报明确状态。

建议固定输入字段：

- `task_title`
- `task_goal`
- `full_task_details`
- `repo_path`
- `relevant_context`
- `allowed_edit_scope`
- `constraints`
- `verification_requirements`
- `expected_output`

允许的返回状态：

- `DONE`
- `DONE_WITH_CONCERNS`
- `NEEDS_CONTEXT`
- `BLOCKED`

#### `spec-reviewer`

职责：只审查当前实现是否符合需求与计划，不混入代码风格、命名偏好或主动重构建议。

建议固定输入字段：

- `review_target`
- `full_requirement_details`
- `implemented_scope`
- `base_reference`
- `current_diff_or_range`
- `review_constraints`
- `expected_output`

允许的返回状态：

- `APPROVED`
- `CHANGES_REQUIRED`
- `BLOCKED`

输出重点：

- `missing_requirements`
- `extra_behavior`
- `ambiguous_items`
- `blocking_findings`

#### `code-reviewer`

职责：审查代码正确性、回归风险、危险实现假设和测试缺口，统一覆盖原先分散在 `code-quality-reviewer` 与 `code-reviewer` 名义下的真实 reviewer 能力。

建议固定输入字段：

- `review_goal`
- `full_context`
- `requirements_context`
- `diff_base`
- `diff_target`
- `current_diff_or_range`
- `severity_policy`
- `expected_output`

允许的返回状态：

- `APPROVED`
- `CHANGES_REQUIRED`
- `BLOCKED`

输出重点：

- findings 按严重级别排序
- 优先 bug、风险、回归、漏测
- 摘要为次要信息，不得压过 findings

### 5. Skill 侧模板设计

#### `skills/subagent-driven-development/implementer-dispatch-prompt.md`

必须注入：

- 当前任务全文
- 当前任务在整个 plan 中的位置
- 相关 spec / plan 摘录
- 允许编辑范围
- 必须执行的验证命令
- 完成后必须按 `DONE` / `DONE_WITH_CONCERNS` / `NEEDS_CONTEXT` / `BLOCKED` 返回

#### `skills/subagent-driven-development/spec-reviewer-dispatch-prompt.md`

必须注入：

- 当前任务需求全文
- 当前任务对应的实现范围
- 当前 task 的 base commit 或等价参考点
- 当前待审 diff
- 只允许做需求符合性审查，不做代码质量偏好判断

#### `skills/subagent-driven-development/code-reviewer-dispatch-prompt.md`

必须注入：

- 当前任务全文
- 当前 task base 参考点
- 当前 working tree diff
- 本次 review 只针对当前任务改动
- findings 输出格式和严重级别要求

#### `skills/requesting-code-review/code-reviewer-dispatch-prompt.md`

必须注入：

- 本次 review 的目标说明
- `BASE_SHA`
- `HEAD_SHA` 或等价范围
- 相关 requirements / plan
- findings 输出格式和严重级别要求

这里与 `subagent-driven-development` 的关键区别是：

- 前者主要面向单任务、未提交 diff 的 review
- 后者主要面向已提交范围或整分支范围的 review

因此 `code-reviewer` 只有一个全局类型，但可以有多个 skill 内 dispatch 模板。

### 6. 现有 skill 的迁移策略

#### `subagent-driven-development`

迁移后只负责：

- 判定当前应该调用哪个真实类型
- 组装 dispatch 模板所需上下文
- 调用 `implementer`、`spec-reviewer`、`code-reviewer`
- 按返回状态推进流程或停止

迁移建议：

- `implementer-prompt.md` -> `implementer-dispatch-prompt.md`
- `spec-reviewer-prompt.md` -> `spec-reviewer-dispatch-prompt.md`
- 删除 `code-quality-reviewer-prompt.md`
- 新增 `code-reviewer-dispatch-prompt.md`

#### `requesting-code-review`

迁移后只负责：

- 判断什么时候需要请求 review
- 整理 review 范围与 requirements
- 调用真实 `code-reviewer`

迁移建议：

- 删除或替换现有 `code-reviewer.md`
- 新增 `code-reviewer-dispatch-prompt.md`
- `SKILL.md` 改写为薄调度说明

#### `writing-plans`

本次不需要直接调用新类型，但需要更新 handoff 说明，明确后续执行工作流会调用真实类型：

- `implementer`
- `spec-reviewer`
- `code-reviewer`

#### `finishing-a-development-branch`

本次无需直接接入新类型。
如果未来需要最终整体验收 review，应继续复用 `code-reviewer`，而不是再造第二个 reviewer 类型。

### 7. 错误处理

主代理不得猜测 sub-agent 是否成功，必须依赖显式状态分支。

控制规则：

1. `implementer` 返回 `NEEDS_CONTEXT`：父代理补上下文后重新派发同一任务。
2. `implementer` 返回 `BLOCKED`：父代理必须升级处理，不得盲目重试。
3. `spec-reviewer` 返回 `CHANGES_REQUIRED`：回到 `implementer` 修正。
4. `code-reviewer` 返回 `CHANGES_REQUIRED`：回到 `implementer` 修正。
5. 任一 reviewer 返回 `BLOCKED`：停止推进并向父代理或用户升级。

### 8. 与宿主运行时的边界

本次仓库改造完成后，只能说明：

- 仓库内已经定义了 3 个真实类型的提示词与调用契约
- skills 已经为未来调用这些真实类型做好准备

但不能宣称：

- 当前宿主运行时已经支持这 3 个新 `subagent_type`
- 在未修改外部运行时注册代码的情况下，这 3 个类型现在就一定可调用

因此文档中必须显式写明：

> 真实 `subagent_type` 的实际注册属于仓库外宿主运行时工作，本仓库只负责定义 agent prompt、dispatch 模板与调用契约。

## 错误处理与风险

1. **继续混用两层提示词**
   - 风险：`agents/*.md` 重新长成任务实例文档，失去通用性
   - 缓解：在验收时明确检查全局 agent prompt 中不得出现任务实例上下文

2. **只重命名旧 prompt 文件，不改语义边界**
   - 风险：文件名变了，但 skill 和 agent 的职责仍然混在一起
   - 缓解：验收时检查 `SKILL.md`、`agents/*.md`、dispatch 模板三层职责是否分离

3. **保留第二个 reviewer 类型**
   - 风险：后续继续出现 `code-quality-reviewer` 与 `code-reviewer` 双轨
   - 缓解：明确验收标准里只允许 `code-reviewer` 作为真实 reviewer 类型

4. **误以为仓库改动等于运行时已支持**
   - 风险：文档落地后用户直接尝试调用未注册类型而失败
   - 缓解：在 spec、plan 与变更说明中显式写出运行时边界

## 验收标准

1. 仓库新增 3 个全局 agent prompt：
   - `agents/implementer.md`
   - `agents/spec-reviewer.md`
   - `agents/code-reviewer.md`
2. `agents/*.md` 只承载全局通用角色规则，不包含任何具体任务实例上下文。
3. `skills/subagent-driven-development/` 内新增 3 个 dispatch 模板，并且模板显式要求完整任务详情。
4. `skills/requesting-code-review/` 内新增面向真实 `code-reviewer` 的 dispatch 模板。
5. `subagent-driven-development` 改为调度真实类型 `implementer`、`spec-reviewer`、`code-reviewer`。
6. `requesting-code-review` 改为调度真实类型 `code-reviewer`。
7. `code-quality-reviewer` 不再作为真实类型存在。
8. 文档中明确声明：宿主运行时注册不在本次仓库改造范围内。

## 实施提示

1. 参考 `git-commit` 的现有结构，优先复用“薄 skill + 全局 agent prompt”的思路。
2. 迁移旧 prompt 文件时，优先重新整理语义边界，而不是机械改名。
3. dispatch 模板要把完整任务详情当作必填输入，而不是可选补充。
4. reviewer 统一只保留 `code-reviewer`，避免未来再次分叉命名。
