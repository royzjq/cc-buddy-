# CC Buddy - TODO

## 当前状态

Three.js 的 import 问题已修复（CDN → 本地 importmap + vendor 文件），但尚未在 Tauri WebView2 中验证。需要重新编译运行。

## 待办事项

### 1. 验证 3D 渲染在 Tauri WebView2 中工作（最高优先级）
- 在有 Rust 环境的终端运行 `npx tauri dev` 或直接运行 `src-tauri/target/release/cc-buddy.exe`
- 确认 Pudge 模型能正常渲染 + idle 动画播放
- 如果不工作，检查浏览器 DevTools 的 Console 和 Network 面板

### 2. 完善 Tauri 构建
- 确保 `beforeBuildCommand` 配置正确（目前为空）
- 考虑用 Vite 或类似工具打包前端资源，避免运行时依赖 python HTTP server
- 配置 release 构建流程

### 3. 接入 Claude Code Hooks
- 安装 hooks：`claude mcp add-hooks` 或手动配置 `~/.claude/hooks.json`
- 确保 `hooks/cc-buddy-hook.py` 中的 `websockets` 库已安装（`pip install websockets`）
- 验证 hook 事件（SessionStart / Notification / Stop / SessionEnd）能通过 WebSocket 发送到 Tauri 后端
- 验证 Tauri 后端能正确转发事件到前端
- 验证前端能正确响应事件（创建/删除 buddy、切换动画状态）

### 4. 实现 5 小时 / 每周用量条
- 从 Claude Code 日志中读取用量数据
- 计算最近 5 小时和本周的 token 使用量
- 通过 Tauri command 或 WebSocket 推送到前端
- 更新底部进度条 UI

### 5. 英雄互动
- idle 状态下的随机看向其他 buddy
- waiting 状态时其他 buddy 转向观察
- 随机触发 taunt 交换

### 6. UI 完善
- 窗口可拖拽（已有 drag-handle）
- 多 buddy 布局自适应
- 半透明窗口效果优化
- 关闭按钮 / 最小化按钮（无 decorations 时需要自己画）

## 已知问题

- `src/vendor/` 中的 Three.js 版本与之前 CDN 使用的版本一致（均为 0.184.0），但 vendor 文件的内部 import 使用 bare specifier `'three'`，需要 importmap 支持
- `beforeDevCommand` 依赖 `python -m http.server 8765`，生产构建需要替换
- hooks 的 WebSocket 连接没有重连机制
