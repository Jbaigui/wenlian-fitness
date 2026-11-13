# 稳练 / Wenlian · 个人健身助手 V1.2

面向 iPhone Safari 的**纯静态 PWA**，适配职工健身房和零基础 8 周全身训练。界面语言为简体中文。

## V1.2 更新（2026-11-13）

- 所有动作标注执行方式：双侧同时、单侧分别、对侧手脚交替或连续步行。双手持一只哑铃与每手各一只哑铃分别说明。
- 单臂划船分别记录左手/右手次数、单侧重量与体感；死虫式分别记录“右手＋左腿”“左手＋右腿”。两侧都完成才计入一组；一侧未完成、提前结束时已做一侧仍保存。
- 刷新恢复、撤销、历史、JSON 备份、CSV 和 AI 复盘报告都保留分侧数据。CSV 每个已完成侧输出一行，附带侧别与整组完成状态，不把两行当成两组。
- 已完成的旧版合并记录不推测或补写两侧；未完成草稿升级为分侧表单，原来已填数值作为待确认输入保留。
- JSON 新备份采用 schemaVersion 2，包含分侧记录；V1.2 可导入旧版 schemaVersion 1。新备份应在 V1.2 或更新版本恢复，避免旧软件丢失左右侧信息。
- 页面版本 V1.2，离线缓存包含 movement.js。13 项 Node 检查覆盖左右侧完成/撤销/刷新、双侧一次计数、死虫式配对、旧草稿迁移、分侧导出与导入。

## V1.1 更新（2026-11-13）

- 正式地址：https://jbaigui.github.io/wenlian-fitness/
- 本动作独立显示总组数、已完成组数、下一组和逐组状态。最后一组完成后保留完成提示，手动进入下一动作。
- 第 1 周每项主要力量动作 1 组，第 2 周起 2 组，保留既有入门训练量。修复首次未改设置时起始周不保存、跨周可能回到第 1 周的问题；旧设备可依据训练快照推回起始周。既有草稿与历史仍按原来组数保存。
- 9 个动作均内置完整中文教学：准备、分步动作、呼吸、检查点、常见错误、降阶、注意事项和计数方法。无需打开外站；来源入口默认折叠。
- 按动作核对 ACE、NASM、AHA 和 CDC 官方资料；硬拉改为哑铃版来源，推肩改为坐姿推举专页。中文内容为整理与入门调整，不镜像第三方全文或图片。
- 升级离线缓存版本，缓存教学模块；后续升级提供保存进度再更新的提示。首次从 V1 更新若仍显示旧版，请关闭重开后再刷新一次，确认页眉 V1.1；不要清除网站数据。

## V1 已实现

- 每周一/三/五训练日历；可设置第 1 周起始日期，自动切换第 1–8 周训练量。
- 初学者的固定动作流程：热身、杯式深蹲、高位下拉、哑铃卧推、哑铃罗马尼亚硬拉、单臂划船、死虫式、结束快走；第 3 周起加入坐姿推肩。
- 逐动作跟练，逐组记录实际次数或分钟、哑铃/器械重量、主观难度；可以撤销完成、跳过动作、提前结束并保留记录。
- 组间计时自动开始、加 30 秒、跳过；使用绝对结束时间，切后台再回来不会因暂停 JS 定时器而计时错误。
- 每个动作的安全提示与 ACE 专业外链，不托管受版权保护的第三方教学素材。
- 本地 IndexedDB 记录历史与未完成训练，首页显示本周完成情况；最近 8 周统计。
- JSON 完整备份/导入、CSV 明细导出、Markdown 格式的 AI 复盘报告。
- App Manifest、iPhone 主屏幕图标、Service Worker 离线缓存和 GitHub Pages 部署 Workflow。

## V1 不包括（不要误认为已同步）

- **没有云端同步或登录系统**。GitHub Pages 是静态托管，数据默认只存在当前浏览器的本地存储中。
- **没有 Apple Watch / Apple Health 数据接口**。普通网页不能直接读取 HealthKit 数据。
- **不能保证锁屏时响铃或推送提醒**。iOS 可能暂停后台网页计时，返回网页时会按真实时间恢复。
- **训练调整目前由导出报告后交给 ChatGPT 分析完成**，没有 AI 自动修改功能。

## 本地运行

无需 Node、npm 或额外依赖。在项目根目录运行：

```bash
python3 -m http.server 8080
```

在浏览器打开 `http://localhost:8080/`。首次访问后，Service Worker 会缓存应用主体。要在真机安装，请先部署至 HTTPS 站点。

## 部署到 GitHub Pages

1. 在 GitHub 创建 **公开的空仓库**，例如 `wenlian-fitness`。
2. 将此目录所有文件（包含 `.github/workflows/deploy.yml`、`icons` 文件夹）提交到仓库 `main` 分支。
3. 进入仓库 **Settings → Pages → Build and deployment**，将 Source 设置为 **GitHub Actions**。
4. 若工作流没有自动运行，进入 **Actions → Deploy Wenlian PWA to GitHub Pages → Run workflow**。
5. 等待工作流成功后，打开 `https://<你的GitHub用户名>.github.io/<仓库名>/`。不需要修改 base URL；文件引用与离线缓存使用相对路径，可放在任意仓库子目录。 

参考 [GitHub Docs](https://docs.github.com/en/get-started/start-your-journey/deploying-your-website-automatically)。

### iPhone 安装

1. 在 iPhone 的 Safari 打开 HTTPS 部署地址。
2. 点击分享菜单 → **添加到主屏幕**。
3. 如出现开关，打开 **作为网页 App 打开**，点添加。
4. 打开一次应用以完成缓存。之后在断网情况下可查看内置动作要点、跟练和记录；外部 ACE 资料页仍需网络。

参考 [Apple 官方说明](https://support.apple.com/guide/iphone/bookmark-a-website-iph42ab2f3a7/ios)。

## 数据与隐私

- 本站不加载 Google Analytics 或其他遥测，不设置广告，无后端网络上传。外部动作来源链接仅在你主动点击时打开。
- 历史与草稿保存在 **IndexedDB**（无法使用时回退到 `localStorage`），每次操作都会保存。iOS 清除网站数据、卸载应用或切换浏览器可能会删除数据。
- **强烈建议每周在「我的」中导出 JSON 完整备份**，并将文件保存在可信任的位置。
- GitHub 公共仓库只存应用代码与计划，不要提交备份 JSON、CSV、Markdown 复盘报告、健康信息或个人隐私。
- 目前由 ChatGPT 分析训练表现的正确流程为「历史 → AI 复盘报告 → 上传到聊天」。不会自动获取你的健康数据。
- 如果后期启用 Supabase，必须加入登录、Row-Level Security（RLS）并分别测试跨设备同步与访问隔离；绝对不能在公开前端写入 service_role 密钥。

## 训练计划说明

这是面向无明显运动禁忌的健康成年人、以提升体能和健康为主的通用入门参考。首两周主要学习动作。训练动作出现锐痛、胸痛、显著头晕等立即停止，并根据需要寻求专业帮助。器械结构以现场铭牌、安全限位和实际运动轨迹为准，第三张推举机因未确认型号不被当作固定动作。

| 周数 | 每项主要力量动作默认组数 | 坐姿哑铃推肩 |
|---|---|---|
| 第 1 周 | 1 组 | 暂不加入 |
| 第 2 周 | 2 组 | 暂不加入 |
| 第 3–4 周 | 2 组 | 1 组 |
| 第 5–8 周 | 2 组 | 2 组 |

动作重量不在程序中预设；以动作规范、保留约 2–3 次余力为原则逐渐增加。每周三练之外，有时间可在非训练日安排 20–30 分钟快走。此 V1 不提供医疗诊断。

## 技术架构

为了让 V1 不依赖外部包管理服务、可直接通过 GitHub Pages 部署，本版使用原生 JavaScript ES Modules + CSS + IndexedDB + Service Worker。数据模型及计划定义与 UI 分离：

- `plan.js`：动作库、8 周递进、起始周恢复与组数进度计算
- `exercise-guides.js`：动作教学与逐项来源
- `movement.js`：执行方式、左右侧记录与旧草稿升级
- `storage.js`：离线持久化、备份下载
- `app.js`：界面、跟练、计时、记录、导出、导入
- `styles.css`：iPhone-first 样式
- `manifest.webmanifest` / `sw.js`：安装与离线缓存
- `.github/workflows/deploy.yml`：自动发布 GitHub Pages

后续可迁移至 React + TypeScript，但不应影响用户现有本地记录。V2 若要实现真正跨设备同步，需先进行数据迁移设计。

## 测试

目前已完成：Node 计划进阶单元测试，以及 Chromium **内联 DOM 模拟测试**（移动端布局、动作说明、组次录入、跨页面状态恢复、历史、JSON/CSV/MD 导出、删除及备份恢复）。测试脚本对 localStorage 提供了内存替身，**未实际验证 Safari IndexedDB、Service Worker 离线加载和锁屏响铃**。环境允许访问 localhost 或 HTTPS 时，请另行执行真实加载/离线测试。建议每次修改后用 iOS Safari 真机验证锁屏、PWA 安装与本地存储行为；桌面 Chromium 测试不能代替 iOS Safari 测试。

### 执行测试

```bash
node --test tests/plan.test.mjs
python3 tests/browser-inline-smoke.py
```

浏览器测试要求 Python 环境提供 Playwright，系统中提供 Chromium（测试脚本目前使用 `/usr/bin/chromium` 路径）。脚本不会把模拟用户记录写入仓库。

### V1.1 验证范围

Node 测试覆盖周数、8 周进阶、跨周起始日期保存逻辑、旧记录起始周恢复、多组进度与撤销、所有动作教学与来源完整性。浏览器验收以实际记录为准；旧版内联 DOM 测试已适配新流程，不能代替 Safari 真机与离线验收。
