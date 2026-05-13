# 2026-05-13 项目日记

今天把这个 Markdown 桌面编辑器从项目雏形推进到了可以纳入 Git 和 GitHub 管理的第一版。

## 今天做了什么

### 1. 搭建桌面编辑器项目

项目定位为一个 Windows 桌面 Markdown 编辑器，技术栈使用 Electron、React、Vite 和 TypeScript。

今天创建并整理了这些基础文件：

- `package.json`：定义项目名称、依赖和运行脚本。
- `package-lock.json`：锁定 npm 依赖版本。
- `index.html`：作为前端入口页面。
- `src/main.tsx`：挂载 React 应用。
- `src/App.tsx`：实现编辑器主界面和核心交互。
- `src/styles.css`：实现整体布局、主题和编辑器样式。
- `src/types.d.ts`：声明前端可调用的 Electron API 类型。
- `electron/main.cjs`：创建桌面窗口，处理本地文件打开、保存、另存为。
- `electron/preload.cjs`：安全地把文件能力暴露给前端。
- `tsconfig.json`、`vite.config.ts`、`.editorconfig`、`.vscode/settings.json`：配置开发环境。

### 2. 完成第一版编辑器功能

第一版已经具备一个 Markdown 编辑器最基本的闭环：

- 左侧编辑 Markdown。
- 右侧实时预览渲染结果。
- 支持新建文档。
- 支持打开本地 `.md`、`.markdown`、`.txt` 文件。
- 支持保存和另存为。
- 支持深色和浅色主题切换。
- 显示文件名、保存状态、字数和行数。
- 使用 `marked` 解析 Markdown。
- 使用 `DOMPurify` 对预览 HTML 做安全清理。

### 3. 做了 Git 版本管理

今天为项目加入了 Git 版本管理：

- 初始化了本地 Git 仓库。
- 新增 `.gitignore`，排除了 `node_modules/`、`dist/`、日志文件、环境变量文件等不应该提交的内容。
- 创建了第一次提交：

```text
099ad3f 第一个版本
```

- 当前主分支为 `main`。
- 本地 `main` 已经关联并同步到 `origin/main`。

### 4. 提交到 GitHub

今天已经把第一个版本推送到了 GitHub 远程仓库。

从当前仓库状态看，本地分支和远程分支的基础版本一致：

```text
main...origin/main
```

这说明项目已经正式进入“本地开发 + GitHub 备份/同步”的管理方式。

### 5. 晚些时候继续做了编辑体验优化

第一次提交之后，项目里又出现了一批本地改动，目前还没有提交。

这些改动主要集中在：

- `electron/main.cjs`
- `src/App.tsx`
- `src/styles.css`
- `.codex/environments/environment.toml`

本地改动内容包括：

- Electron 窗口默认背景改为深色。
- 隐藏原生菜单栏，让窗口更像独立应用。
- 编辑器默认从浅色主题开始。
- 增加撤销历史记录。
- 增加中文输入法组合输入处理，避免输入过程中误记录状态。
- 增加快捷键：
  - `Ctrl+Z`：撤销。
  - `Ctrl+N`：新建。
  - `Ctrl+O`：打开。
  - `Ctrl+S`：保存。
  - `Ctrl+Shift+S`：另存为。
  - `Ctrl+,`：切换主题。
  - `Ctrl+B`：加粗。
  - `Ctrl+I`：斜体。
  - `Ctrl+K`：插入链接。
  - `Ctrl++` / `Ctrl+-` / `Ctrl+0`：调整或重置编辑字号。
- 增加 `Tab` / `Shift+Tab` 缩进和反缩进。
- 让编辑区和预览区字号同步变化。
- 移除了侧边栏和网格背景，让界面更简洁。

## 当前项目状态

截至这篇日记写入时：

- GitHub 上已经有“第一个版本”。
- 本地还有未提交改动。
- README 已被替换为今天的项目日记。

下一次适合做的事情是：

1. 运行应用，检查新增快捷键、撤销、中文输入和字号调整是否正常。
2. 如果确认没有问题，把当前本地改动提交为第二个版本。
3. 再次推送到 GitHub。

推荐的下一次提交信息：

```text
优化编辑器快捷键和编辑体验
```
