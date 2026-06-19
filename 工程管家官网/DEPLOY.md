# 工程管家官网 — 部署指南

## 🚀 部署到 Gitee Pages（免费）

### 前提
- 注册 [Gitee（码云）](https://gitee.com/) 账号
- 项目已构建完成（`dist/` 目录）

### 步骤

#### 1. 创建 Gitee 仓库

1. 登录 Gitee，点击右上角 **+** → **新建仓库**
2. 仓库名建议使用英文：`engineering-manager` 或 `em-website`
3. 选择 **公开**
4. 创建完成后，将本项目的 `dist/` 目录推送到仓库

```bash
# 在工程管家官网目录下执行
cd E:\测试\工程管家官网

# 初始化 git（如果尚未初始化）
git init

# 将构建产物提交
git add dist/
git commit -m "Initial website build"

# 关联远程仓库（替换 YOUR_USERNAME）
git remote add origin https://gitee.com/YOUR_USERNAME/engineering-manager.git
git push -u origin master
```

#### 2. 启用 Gitee Pages

1. 进入仓库页面 → **服务** → **Gitee Pages**
2. 部署分支选择 `master`
3. 部署目录填写 `dist`
4. 点击 **启动**
5. 等待部署完成，你会得到一个地址：
   ```
   https://YOUR_USERNAME.gitee.io/engineering-manager
   ```

#### 3. 更新网站内容

后续只需在本地修改后重新构建并推送到 Gitee：

```bash
# 1. 修改代码

# 2. 构建
npm run build

# 3. 提交 dist 目录
git add dist/
git commit -m "Update website"
git push

# 4. Gitee Pages 会自动重新部署（或手动点击"更新"）
```

### 优化建议

#### 📦 只推送 dist 目录（推荐）

在 `.gitignore` 中添加：

```
# 只跟踪 dist 目录
*
!/dist/**
```

但更好的做法是创建一个 **orphan 分支** 只存放 dist：

```bash
git checkout --orphan pages
git rm -rf .
cp -r dist/* .
git add .
git commit -m "Deploy website"
git push origin pages

# 然后在 Gitee Pages 设置中选 pages 分支 + 根目录
```

### 绑定自定义域名（可选）

1. 购买一个域名（如阿里云/腾讯云）
2. 在 Gitee Pages 设置中绑定域名
3. 在你的域名 DNS 中添加 CNAME 记录指向 `YOUR_USERNAME.gitee.io`

---

## 💻 本地开发

```bash
# 启动开发服务器（热更新）
npm run dev

# 构建生产版本
npm run build

# 预览构建结果
npx vite preview
```

## 📁 项目结构

```
工程管家官网/
├── public/                     # 静态资源
│   └── favicon.svg            # 网站图标
├── src/
│   ├── components/
│   │   ├── Navbar.tsx          # 导航栏（响应式 + 玻璃拟态）
│   │   ├── Hero.tsx            # Hero 区域（打字机效果 + 粒子背景）
│   │   ├── Features.tsx        # 功能特性（10 大模块网格）
│   │   ├── Gallery.tsx         # 截图展示（灯箱轮播）
│   │   ├── Download.tsx        # 下载页面（版本号 + 系统要求）
│   │   ├── Footer.tsx          # 页脚
│   │   └── ParticleBackground.tsx  # Canvas 粒子背景
│   ├── App.tsx                 # 主应用
│   ├── main.tsx                # 入口（HashRouter）
│   └── index.css               # 全局样式（CSS 自定义属性）
├── index.html
├── vite.config.ts
└── package.json
```
