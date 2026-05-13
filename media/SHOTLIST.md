# CC Buddy — 产品视频拍摄脚本 / 分镜表

目标：30–60 秒短片，发推 / 发小红书 / 放 GitHub README 顶部。
基调：**安静、治愈、不浮夸**。CC Buddy 是「陪伴感」工具，不是炫技工具。
推荐节奏：~24 fps 剪辑，留呼吸感，不要堆动效。

---

## 资产清单

`media/` 文件夹里已生成的 GIF（七只动物 × 五个状态）：

| 动物 | idle | working | question | done | hero（四态串烧） |
|------|------|---------|----------|------|------------------|
| beagle | ✅ | ✅ | ✅ | ✅ | ✅ |
| chipmunk | ✅ | ✅ | ✅ | ✅ | ✅ |
| evil_beagle | ✅ | ✅ | ✅ | ✅ | ✅ |
| hamster | ✅ | ✅ | ✅ | ✅ | ✅ |
| orange_cat | ✅ | ✅ | ✅ | ✅ | ✅ |
| red_panda | ✅ | ✅ | ✅ | ✅ | ✅ |
| tuxedo_cat | ✅ | ✅ | ✅ | ✅ | ✅ |

**推荐主角**：`orange_cat` 或 `red_panda`——色彩最暖、辨识度最高、最适合做封面。

需要重新生成或调整时长/帧序：跑 `python media/generate_gifs.py`，参数在 `build_for_animal()` 里改。

---

## 你需要自己录制的素材

我生成不了这部分（我不能跑你的 app 或截桌面）。用 **OBS Studio**（免费）、**ScreenToGif**（Win 免费）、或 **Kap**（Mac 免费）录，720p 或 1080p 都行。

| 标签 | 内容 | 时长 | 备注 |
|------|------|------|------|
| `R1-terminal-idle` | 一个空的终端，提示符闪烁 | 3s | 干净，深色主题 |
| `R2-buddy-spawn` | 启动 `claude` 后，桌面右下角 buddy 淡入出现 | 3s | 关键画面：buddy 跟会话同步出现 |
| `R3-typing` | 你在 Claude 里发 prompt，buddy 立刻切到 typing 动画 | 4s | 同屏拍：终端 + buddy |
| `R4-question` | Claude 弹出 AskUserQuestion，buddy 切到 alert | 3s | 重点展示「状态同步及时」 |
| `R5-answer-resume` | 你点选项，buddy 立刻回到 typing | 3s | 紧跟 R4 |
| `R6-done` | Claude 完成响应，buddy 蹦一下进入 celebrate | 2s | "完成啦！" 气泡可选 |
| `R7-multi` | 三个终端并排，每个跑一个 Claude 会话，桌面上三只 buddy 各自反应 | 5s | 卖点：多会话感知 |
| `R8-quiet` | 你不操作时，桌面只有 buddy 在轻轻呼吸 | 3s | 强调「不打扰」 |

如果时间紧，**R2 / R3 / R4 / R7** 是不能省的四个核心镜头。

---

## 60 秒版本分镜（推荐）

### 段落 1 — 钩子（0:00–0:05）

| 时间 | 画面 | 字幕 / 旁白 | 音效 |
|------|------|-------------|------|
| 0:00–0:03 | 黑场，白字淡入：「在等 Claude Code 跑完时，你都在干嘛？」 | （静音字幕） | 低频心跳一下 |
| 0:03–0:05 | 切到 `R1-terminal-idle`，终端孤零零 | — | 安静，键盘远景白噪 |

### 段落 2 — 引入（0:05–0:12）

| 时间 | 画面 | 字幕 | 音效 |
|------|------|------|------|
| 0:05–0:08 | `R2-buddy-spawn`，buddy 淡入 | 「现在你不是一个人。」 | 轻柔的「叮」一声 |
| 0:08–0:12 | 字幕大写：**CC Buddy** + `orange_cat-idle.gif` 居中放大 | 「Claude Code 的桌面伙伴」 | 持续轻音乐 fade in |

### 段落 3 — 状态同步演示（0:12–0:35）

| 时间 | 画面 | 字幕 | 音效 |
|------|------|------|------|
| 0:12–0:16 | `R3-typing` | 「它在思考时——」 | 打字声节奏感 |
| 0:16–0:18 | 放大 buddy，叠加 `orange_cat-working.gif` | （无字幕） | — |
| 0:18–0:22 | `R4-question` | 「需要你回答时——」 | 提示音「叮」 |
| 0:22–0:24 | 放大 buddy，叠加 `orange_cat-question.gif` | （无字幕） | — |
| 0:24–0:28 | `R5-answer-resume` → `R6-done` | 「完成时——」 | 轻快短旋律 |
| 0:28–0:30 | 放大 buddy，叠加 `orange_cat-done.gif` | （无字幕） | — |
| 0:30–0:35 | 三态 GIF 并排展示 | 「它都知道。」 | — |

### 段落 4 — 多会话（0:35–0:45）

| 时间 | 画面 | 字幕 | 音效 |
|------|------|------|------|
| 0:35–0:42 | `R7-multi`，三个终端 + 三只 buddy | 「多个会话？多个伙伴。一个一个跟。」 | 音乐略升 |
| 0:42–0:45 | 镜头拉远，桌面全景 | — | — |

### 段落 5 — 收尾（0:45–0:58）

| 时间 | 画面 | 字幕 | 音效 |
|------|------|------|------|
| 0:45–0:50 | `R8-quiet`，buddy 安静呼吸 | 「不打扰，只陪伴。」 | 音乐回落 |
| 0:50–0:55 | 切到 hero GIF（任选动物） | （无字幕） | — |
| 0:55–0:58 | 黑场 + 白字：「github.com/royzjq/cc-buddy-」 | （静音） | 心跳尾音 |

---

## 30 秒精简版分镜（适合推/X）

| 时间 | 画面 | 字幕 |
|------|------|------|
| 0:00–0:03 | `R2-buddy-spawn` | 「CC Buddy」 |
| 0:03–0:08 | `R3-typing` + buddy 反应 | 「Claude 在干嘛，它都知道。」 |
| 0:08–0:13 | `R4-question` → `R5-answer-resume` | 「问问题、想问题、答完了——状态实时同步。」 |
| 0:13–0:18 | `R7-multi` | 「多终端？一个会话一只。」 |
| 0:18–0:23 | `R8-quiet` + `orange_cat-idle.gif` 居中 | 「不打扰，只陪伴。」 |
| 0:23–0:30 | 黑场 + GitHub URL | — |

---

## 配乐建议

- 风格：**lofi**、**ambient piano**、或 **8-bit chill**（贴像素美术）。
- 推荐免版税来源：
  - YouTube Audio Library — 搜 "calm" / "ambient" / "lofi"
  - Pixabay Music — 免费可商用
  - Epidemic Sound（付费但质量高）
- **不要用**重鼓点、EDM、激昂的钢琴——跟产品调子冲突。

---

## 字幕样式

- 字体：**Inter** / **思源黑体** / **PingFang SC**，干净无衬线
- 颜色：白底深色字 / 黑底白字均可，**不要**渐变 / 描边 / 阴影堆叠
- 出现方式：淡入淡出（≥200ms），不要打字机效果（跟产品里 buddy 的 typing 抢戏）

---

## 一些「不要做」

- ❌ 不要堆动效转场（zoom blur / 旋转 / 故障）—— 跟「quiet companion」气质相反
- ❌ 不要给 buddy 加额外动效（爱心、闪光、惊叹号）—— memory 里你明确说过 no random flair
- ❌ 不要 TTS / 配音解说 ——纯字幕 + 音乐就够
- ❌ 不要拿 buddy 的 alert 表情当封面 —— alert 是「打扰用户」的状态，封面应该用 idle 或 working

---

## 缩略图 / 封面图

推荐：`orange_cat-idle.gif` 第一帧（静态导出为 PNG），加一行简短 tagline，深灰背景。
也可以做四宫格：idle / working / question / done 各一张，下面写 "one buddy per session"。

---

## 文件清单总结

```
media/
├── generate_gifs.py            # 重新生成脚本（已可重跑）
├── SHOTLIST.md                 # 本文档
├── beagle-{idle,working,question,done,hero}.gif
├── chipmunk-...
├── evil_beagle-...
├── hamster-...
├── orange_cat-...
├── red_panda-...
└── tuxedo_cat-...
```

总计 **35 个 GIF**，文件总大小约 11 MB。
