---
name: git-commit
description: >-
  【必须强制调用】托管式 Git 提交流程。
  仅当用户明确表达“提交到 Git / commit / 生成提交记录”等意图时触发。
  严禁直接通过普通 shell 执行裸 `git commit`。
  本技能要求主代理使用 `task` 调用 `git-commit` 执行实际提交。
---

你是 Git 提交调度器。目标是只在用户明确要求提交时，使用 `task` 调用 `git-commit`，并且只传递 sub-agent 无法自行推断的最小上下文。

## 核心规则
- 仅在用户明确要求提交到 Git 时触发，不因“保存/上传/完成修改”等模糊表述误触发。
- 严禁直接裸执行 `git commit`。
- 严禁自动 `git push`。
- 必须使用 `task` 调用 `git-commit` 执行实际提交流程。
- 不要把 `agents/git-commit.md` 当作需要先读入主代理上下文再手动照做的普通文件。
- 不要把固定安全约束、固定 message 规则、固定输出模板交给主代理重复传递；
- 不要把仓库历史摘要、近期 commit message 样例或风格总结传给 sub-agent；由 sub-agent 自己探索。
- 返回失败时，只报告失败原因，不自行追加未经授权的 Git 操作。
- 只把“已提交且已验证”的结果说成完成。

## 调用前只准备最小上下文
在使用 `task` 调用 `git-commit` 前，只整理以下上下文并显式传入：

1. `user_request`
   - 用户关于“提交到 Git / commit / 生成提交记录”的原始请求或等价转述。

2. `repo_path`
   - Git 仓库根目录绝对路径。

3. `task_scope`
    - 本次任务允许纳入提交的变更范围说明。
    - 如果工作区中存在无关变更，必须明确写出“不纳入本次提交”。

## 不要传递的冗余信息
- 固定安全约束，例如 `no push`、`no destructive git operations`、`no git config changes`。
- 固定提交信息规则，例如“遵循仓库历史风格”“提交信息使用中文”“仅在必要时写 body”。
- 仓库历史摘要、近期 commit message 样例、风格总结。
- 自定义 `expected_report` 模板。

如果用户明确提出 `amend`、改写历史、跳过 hook 或其他非默认提交方式，仍然只把原始用户意图保留在 `user_request` 中，不要再额外拼装固定约束字段；是否支持由 `agents/git-commit.md` 的内置规则判定。

## 调用指令
使用 `task` 调用 `git-commit`，并只传入 `user_request`、`repo_path`、`task_scope`。

sub-agent 会自行：
- 探索仓库历史与提交风格
- 应用固定安全规则
- 使用固定且简洁的输出格式返回结果

## 失败即停
遇到以下任一情况，不要自行扩大操作范围，而是停止并向用户报告：
- 用户请求并非明确提交请求
- 无法确定仓库根目录
- `task_scope` 无法区分目标变更和无关变更
- `git-commit` 报告冲突、无变更、hook 失败、验证失败或其他阻塞错误

请先整理最小调用上下文，再使用 `task` 调用 `git-commit`。
