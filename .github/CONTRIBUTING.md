# 欢迎为 Elevim 做出贡献！

我们非常高兴您对改进 Elevim 感兴趣。您的所有贡献都将受到欢迎！

## 行为准则

请注意，本项目遵循 [行为准则 (Code of Conduct)](CODE_OF_CONDUCT.md)。参与本项目即表示您同意遵守其条款。

## 我们的贡献理念

本项目是一个开放的、由兴趣驱动的项目。我们鼓励**主动解决问题**：

* 如果您发现了一个 Bug 或有了一个新功能的想法，请**先创建一个 Issue** 来描述它。
* 您**不需要等待任何人为您分配**。如果您有能力和意愿解决某个问题（无论是您自己提的还是其他人提的），请直接开始！
* 完成后，提交您的 Pull Request 即可。

## Commit 信息规范

本仓库遵循**[约定式提交 (Conventional Commits)](https://www.conventionalcommits.org/zh-hans/v1.0.0/)** 规范。这有助于自动化生成更新日志 (CHANGELOG) 并保持 Git 历史的清晰。

您的 `git commit` 信息应遵循以下格式：

```

\<类型\>[可选的作用域]: \<描述\>

[可选的正文]

[可选的页脚]

```

**常用的类型 (type)：**

* **feat**: 新功能 (feature)
* **fix**: 修复 Bug
* **docs**: 仅文档更改
* **style**: 不影响代码含义的更改 (空格、格式、缺少分号等)
* **refactor**: 代码重构，既不修复 Bug 也不添加功能
* **perf**: 提升性能的代码更改
* **test**: 添加缺失的测试或纠正现有的测试
* **chore**: 构建过程或辅助工具的变动（例如更新依赖）

**示例：**

```

feat(editor): 添加 Ctrl+Wheel 缩放字体功能

```
```

fix(ipc): 修复在保存新文件时路径未更新的问题

```

## 如何贡献（技术流程）

1.  **Fork** 本仓库。
2.  创建一个新的特性分支 (`git checkout -b feature/your-feature`)。
3.  **本地开发**：
    ```bash
    # 安装依赖
    npm install

    # 运行开发环境
    npm run start

    # ...进行您的修改...
    ```
4.  提交您的修改。**请务必遵守 [Commit 信息规范](#commit-信息规范)**。
    ```bash
    # 示例:
    git commit -m 'feat(filetree): 添加 Git 状态高亮'
    ```
5.  推送您的分支 (`git push origin feature/your-feature`)。
6.  提交一个 **Pull Request**（请在 PR 中关联您解决的 Issue）。

## 报告问题

* 请使用 [Issue 模板](https://github.com/Microindole/elevim/issues/new/choose) 来报告 Bug 或提交功能请求。
* 在报告 Bug 时，请提供详细的重现步骤、截图和环境信息。

感谢您的贡献！