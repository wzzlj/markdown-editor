# Markdown Editor

这是一个面向 Windows 桌面的 Markdown 编辑器第一版，使用 Electron、React 和 Vite 构建。

## 当前已经支持

- 左侧编辑 Markdown
- 右侧实时预览
- 新建文档
- 打开本地 `.md` / `.markdown` / `.txt` 文件
- 保存和另存为
- 深色 / 浅色模式切换

## 第一次运行

先安装依赖：

```bash
npm install
```

启动开发版：

```bash
npm run dev
```

启动后会打开一个 Windows 桌面窗口。

## 项目结构

```text
electron/
  main.cjs      桌面窗口和文件读写
  preload.cjs   安全地把文件能力交给前端
src/
  App.tsx       编辑器主界面
  styles.css    界面样式
```

## 下一步可以做

- 保存前提示未保存修改
- 快捷键：Ctrl+S、Ctrl+O、Ctrl+N
- 导出 HTML
- 打包成 Windows 安装程序
