# Jack星际先锋 (Star Pioneer)

一款快节奏的星际飞行射击游戏，驾驶战机在群星中穿梭，击败敌机。

## 游戏特性
- **流畅操控**：支持键盘（WASD/方向键）和移动端触摸操作。
- **动态关卡**：难度随得分提升，敌机生成速度和飞行速度逐渐加快。
- **视觉特效**：复古科幻风格 UI，动态星空背景，引擎喷火特效。
- **响应式设计**：完美适配手机、平板及电脑屏幕。

## 部署到 Vercel 指南

1. **上传到 GitHub**:
   - 在 GitHub 上创建一个新仓库。
   - 在本地项目目录初始化 Git：`git init`。
   - 添加所有文件：`git add .`。
   - 提交更改：`git commit -m "Initial commit: Star Pioneer Game"`。
   - 关联远程仓库：`git remote add origin <你的GitHub仓库URL>`。
   - 推送代码：`git push -u origin main`。

2. **在 Vercel 上部署**:
   - 登录 [Vercel 控制台](https://vercel.com/dashboard)。
   - 点击 **"New Project"**。
   - 导入你刚刚创建的 GitHub 仓库。
   - Vercel 会自动识别 **Vite** 框架。
   - 点击 **"Deploy"** 即可完成部署。

## 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```
