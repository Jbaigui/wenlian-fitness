# Work 模式部署接力清单

## 当前交付状态

V1 单机 PWA 代码已实现，包含静态部署 workflow。本包未创建 GitHub 仓库，也没有公开 HTTPS 地址；不能将其描述为已经上线。当前测试通过了计划单元测试和浏览器 DOM 模拟测试，但真实 iOS Safari、IndexedDB 与 Service Worker 离线模式尚未验收。

## Work 模式下一步

1. 使用本包源码，优先在用户个人 GitHub 下创建一个专用**公开仓库**（例如 `wenlian-fitness`）。只上传源码，不上传个人训练记录。
2. 验证 `.github/workflows/deploy.yml` 已提交到 `main`，将 Pages Source 设为 `GitHub Actions`，等待部署成功，并记录**实际验证过**的站点 URL。
3. 在部署后的实际 HTTPS 网站上验证 PWA Manifest、图标、Service Worker 安装、离线缓存命中、重新载入、导航、计时器恢复、数据保留和导出下载。
4. 如发现兼容问题，修复并重新部署，不能仅凭构建成功声称 iPhone PWA 已验收。
5. 用户在 iPhone Safari 访问网站，选择「分享 → 添加到主屏幕」，再实测后台/锁屏计时和网站数据保存；明确告知 iOS 后台通知限制。
6. 第一版没有跨设备同步；不要擅自创建 Supabase 项目、添加数据库或配置账号凭据。等待后续 V1.5 的正式开发要求。

## 安全说明

- 公开 GitHub 仓库不得包含私人运动记录、健康信息或认证密钥。
- 本地 IndexedDB 数据不会因为 GitHub Pages 发布自动出现在 ChatGPT 中。训练报告需要用户主动上传到聊天中分析。
- GitHub Pages 的静态站点不是数据同步后端。云同步将作为后续独立阶段设计。
