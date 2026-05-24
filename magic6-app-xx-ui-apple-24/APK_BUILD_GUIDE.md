# 用 GitHub 云端打包 APK

这套方案不要求你在电脑上安装 Android Studio、JDK、Android SDK。你只需要把项目上传到 GitHub，然后让 GitHub Actions 云端构建。

## 第一次操作

1. 打开 [GitHub](https://github.com)，登录账号。
2. 点右上角 `+`，选择 `New repository`。
3. 仓库名可以填 `timewheel-magic6`。
4. 选择 `Private` 或 `Public` 都可以。
5. 不要勾选 `Add a README file`，因为项目里已经有 README。
6. 创建仓库后，GitHub 会显示上传代码的说明。

## 上传代码

如果你会用 Git，可以在当前项目目录执行：

```powershell
git init
git add .
git commit -m "Initial TimeWheel app"
git branch -M main
git remote add origin https://github.com/你的用户名/timewheel-magic6.git
git push -u origin main
```

如果不想用命令行，也可以：

1. 在 GitHub 仓库页面点 `Add file`。
2. 选择 `Upload files`。
3. 把这个项目文件夹里的文件拖进去。
4. 注意 `.github/workflows/android-debug.yml` 也要上传，它负责云端打包。
5. 点 `Commit changes`。

## 运行打包

1. 进入仓库页面。
2. 点上方 `Actions`。
3. 左侧选择 `Build Android Debug APK`。
4. 点 `Run workflow`。
5. 分支选择 `main`。
6. 再点绿色的 `Run workflow`。
7. 等几分钟，看到任务变成绿色对勾。

## 下载 APK

1. 打开刚刚完成的 workflow 运行记录。
2. 页面底部找到 `Artifacts`。
3. 下载 `TimeWheel-debug-apk`。
4. 解压后里面有 `app-debug.apk`。
5. 把 APK 发到荣耀 Magic6 上安装。

## 手机安装注意

- 这是 debug APK，手机可能提示“未知来源应用”，需要允许安装。
- debug APK 适合自己测试，不适合正式发布。
- 后续如果要长期使用，建议做 release 签名 APK，这样升级更稳定。

## 后续升级数据会不会丢

如果保持同一个 `appId`：`com.timewheel.magic6`，并且以后使用同一个签名证书，覆盖安装 APK 不会清空应用数据。

当前版本的数据存在 WebView 的本地存储里。正式版最好再升级到 SQLite/Room 或 Capacitor SQLite 插件，这样会更稳。
