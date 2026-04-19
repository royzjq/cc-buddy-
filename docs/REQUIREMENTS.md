# CC Buddy - 项目需求

## 概述

CC Buddy 是一个桌面伴侣应用，用于监控 Claude Code 终端 session。每个 Claude Code session 会在一个共享的 playground 中分配一个 Dota 2 英雄 3D 模型作为"伙伴"，通过动画状态反映 session 的当前状态。

## 核心需求

### 英雄列表
5 个英雄，随机分配给每个 session（不重复，直到用完）：
- Pudge（屠夫）
- Sniper（火枪）
- Medusa（美杜莎）
- Juggernaut（剑圣）
- Phantom Assassin（PA）

### 英雄状态与动画
每个英雄 buddy 根据对应 Claude Code session 的状态切换动画：
- **idle** — session 空闲，播放待机动画
- **thinking** — Claude 正在运行/思考，播放技能/攻击动画
- **waiting** — Claude 等待用户输入，播放嘲讽动画（taunt）
- **done** — 任务完成，播放胜利动画

### 共享 Playground
- 所有 buddy 在同一个 3D 场景中并排显示
- 最多 5 个 buddy（对应 5 个英雄）
- session 数量不一定有 5 个，按需创建/销毁

### 英雄互动
buddy 之间应有互动行为：
- idle 状态下随机看向其他 buddy
- 某个 buddy 进入 waiting 状态时，其他 buddy 转向观察
- 随机触发 taunt 交换

### 用量显示
窗口底部显示两个进度条：
- **5 小时用量** — 最近 5 小时的 token 使用量（百分比）
- **每周用量** — 本周的 token 使用量（百分比）

## 技术架构

### 前端
- **框架**: Tauri v2（Rust 后端 + WebView2 前端）
- **3D 渲染**: Three.js（本地 vendor 文件 + importmap，不用 CDN）
- **模型格式**: glTF/GLB（通过 Source 2 Viewer 从 Dota 2 VPK 提取）
- **动画**: Three.js AnimationMixer，每个状态对应一个动画片段

### 后端
- Tauri Rust 后端运行 WebSocket 服务器（端口 19444）
- 接收 Claude Code hooks 发送的事件
- 通过 Tauri event system 转发到前端

### 通信链路
```
Claude Code → hooks (cc-buddy-hook.py) → WebSocket (19444) → Tauri 后端 → Tauri event → 前端 renderer.js
```

### Hook 事件
- **SessionStart** — 新 session 开始，创建新 buddy
- **Notification** — Claude 需要用户输入，buddy 切换到 waiting 状态
- **Stop** — Claude 停止运行，buddy 切换到 idle 状态
- **SessionEnd** — session 结束，销毁对应 buddy

## 窗口规格
- 透明背景，无边框（decorations: false）
- 置顶显示（alwaysOnTop: true）
- 可拖拽（自定义 drag-handle）
- 可调整大小
- 初始尺寸：480 x 360

## 资产
- 3D 模型位于 `assets/raw/{hero}/models/heroes/{hero}/`
- 每个英雄有主模型 + 多个附件部件（.glb）
- 动画内嵌在主模型的 .glb 文件中
- 动画映射表见 `assets/animation_manifest.json`
