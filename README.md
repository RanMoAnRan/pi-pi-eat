# 今天吃什么（离线 PWA）

一个极简单页应用：显示当天日期/星期，并在 `AD` 与 `D3` 之间按天轮换；支持安装到 iOS/Android 桌面并离线使用。

## 本地运行（用于开发/预览）

在该目录启动一个静态服务器（`localhost` 可用于调试 Service Worker）：

```bash
python3 -m http.server 8000
```

打开：`http://localhost:8000/`

## 部署（用于手机首次打开与安装）

将整个 `eat-what-pwa/` 目录作为静态站点发布到任意支持 **HTTPS** 的静态托管（例如 GitHub Pages / Cloudflare Pages / Netlify）。

提示：iOS 上要正常离线（Service Worker）一般要求通过 HTTPS 访问。

### GitHub Pages（最简）

1) 新建一个 GitHub 仓库（例如 `pi-pi-eat`）
2) 把 `eat-what-pwa/` 目录下的所有文件放到仓库根目录（包含 `.nojekyll`）
3) GitHub 仓库 → Settings → Pages → Build and deployment：
   - Source 选 `Deploy from a branch`
   - Branch 选 `main` / `(root)` → Save
4) 等 1~2 分钟，打开 Pages 给的 `https://<username>.github.io/<repo>/` 链接

## 安装到桌面

- iOS（Safari）：打开站点 → 分享 → 添加到主屏幕
- Android（Chrome）：打开站点 → 菜单 → 安装应用/添加到主屏幕

## 轮换规则

- 第一次使用时，程序会把“今天”作为轮换起点，默认今天显示 `AD`，明天 `D3`，之后交替。
- 你也可以点击“切换今天”对当天做一次手动指定（只影响今天），再点“按轮换”恢复。

## 图标说明

目前使用的是 `icon.svg` 占位。若你想在 iOS 上获得更一致的桌面图标效果，建议补充 `apple-touch-icon.png`（180×180）以及 Android PNG 图标。
