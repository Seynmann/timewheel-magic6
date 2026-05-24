# TimeWheel for Honor Magic6

面向荣耀 Magic6 小屏使用的时间管理应用原型。当前版本是 PWA/网页原型，功能结构已经按后续 Android APK 设计：日程、任务计时、习惯、倒数日、积分段位、DDL 扣分和热力图都保存到本地。

## 已实现

- 首页 24 小时时间齿轮：大齿轮、分钟齿轮、秒齿轮持续转动。
- 周视图/月视图日历：周视图为主，月视图辅助。
- 任务新增、编辑、删除：支持日期、开始时间、时长、奖励分、DDL、P1-P5 优先级、颜色。
- 左右分栏：左侧任务，右侧计时器；点任务自动关联，一键启动。
- DDL 扣分：截止时间前未完成会自动扣分，P5 作为 BOSS 任务扣分最高。
- 任务完成热力图：根据每天完成任务数量决定颜色深浅。
- 习惯新增、编辑、打卡：每个习惯有独立颜色和每日目标次数。
- 单习惯热力图：每个习惯卡片里显示近期热力；颜色深浅按当天完成次数/目标计算。
- 总览热力图：所有习惯按行展示，每个习惯一行，颜色各自区分。
- 滴水穿石动画：习惯打卡时水滴落下，连续天数影响石头痕迹。
- 倒数日新增、编辑、删除：可记录重要日期和备注。
- 成长系统：积分从 0 开始，早晨签到、睡前奖励、随机奖励、段位进度。

## 数据保存

当前原型使用 `localStorage`，数据键为 `timewheel.state.v2`。只要不清除浏览器站点数据，同一个地址下更新代码不会丢任务、习惯、倒数日和积分。

正式 Android 版建议：

- 使用 Room SQLite 保存任务、习惯、完成记录、积分流水、倒数日。
- 使用 DataStore 保存设置项。
- 每次升级写数据库 `Migration`，避免旧数据丢失。
- 保持同一个 `applicationId` 和签名证书，APK 覆盖安装不会清空应用数据。
- 增加 JSON 导入/导出，给用户一个可见的备份出口。

## 怎么装到手机

现在有两条路：

1. 快速体验：把 PWA 部署到一个 HTTPS 地址，然后在安卓 Chrome 里“添加到主屏幕”。这种方式最轻，但通知和后台能力有限。
2. 正式交付：用 Capacitor 或 Android Studio 把当前 PWA 包进 WebView，生成 `.apk` 或 `.aab`。这样可以接入 Android 原生通知、闹钟、后台任务、本地 SQLite。

后续要真正给你手机安装，建议走第 2 条：我可以继续把这个项目改成 Capacitor 工程，然后生成 Android 项目；在你电脑有 Android Studio/JDK/SDK 后，再打包出 APK。

也可以不用在电脑上安装 Android Studio。更省事的方式是把项目放到 GitHub，然后用 GitHub Actions 云端打包：

- 本地只维护网页/PWA 代码。
- GitHub Actions 在云端安装 Node、JDK、Android SDK。
- 工作流自动运行 Capacitor/Gradle 构建。
- 构建完成后在 GitHub 的 Artifacts 里下载 `.apk`。

限制是：第一次仍然需要我把项目改造成 Capacitor/Android 工程，并写好 `.github/workflows/android.yml`；如果以后要正式发布应用商店，还需要签名密钥和更严格的版本管理。

我已经加入了 GitHub Actions 打包文件：`.github/workflows/android-debug.yml`。具体操作看 `APK_BUILD_GUIDE.md`。

## 本地运行

当前工作区带了一个 PowerShell 静态服务器：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\dev-server.ps1 8765
```

打开：

```text
http://localhost:8765
```
