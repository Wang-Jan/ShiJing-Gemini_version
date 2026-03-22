# 视净（Shi Jing）

一个基于 `React + TypeScript + Express + MySQL` 的桌面清洁助手项目，包含：

- 账号注册与登录
- 桌面图片分析
- 最新动态记录
- 设置页账户管理
- Garden 模型本地覆盖配置

## 本地开发

1. 安装依赖

```bash
npm install
```

2. 复制环境变量模板

```bash
copy .env.example .env
```

3. 配置 `.env`

至少填写这些字段：

```env
GARDEN_API_KEY=your_garden_api_key
GARDEN_API_BASE_URL=http://127.0.0.1:8000
SESSION_SECRET=your_session_secret
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_mysql_password
MYSQL_DATABASE=shijing
```

4. 确保本机 MySQL 已启动，并且上面的账号密码可以连接。

5. 启动开发服务

```bash
npm run dev
```

浏览器访问：

```text
http://localhost:3000
```

## Garden 配置来源

项目当前支持两层 Garden 配置：

### 1. 服务端默认配置

来源：

- `.env` 中的 `GARDEN_API_KEY`
- `.env` 中的 `GARDEN_API_BASE_URL`

用途：

- 这是后端默认使用的 Garden 配置
- 如果前端没有提供本地覆盖值，后端就使用这里的配置

### 2. 设置页本地覆盖配置

来源：

- `设置 -> Garden 模型配置`

可填写内容：

- API Key
- Base URL

用途：

- 只保存在当前浏览器设备的 `localStorage`
- 分析页请求 `/api/analyze` 时会优先带上这两个本地值
- 后端优先使用前端传来的覆盖值

### 恢复默认

在 `设置 -> Garden 模型配置` 中点击 `恢复默认` 后：

- 会清空当前设备保存的 API Key
- 会清空当前设备保存的 Base URL
- 后端重新回退到 `.env` 中的 `GARDEN_API_KEY` 和 `GARDEN_API_BASE_URL`

## Garden 分析接口

前端统一请求：

```http
POST /api/analyze
```

后端处理逻辑：

1. 校验登录 token
2. 读取图片数据
3. 优先读取请求头中的 Garden 覆盖配置
4. 如果没有覆盖值，则回退到 `.env`
5. 调用 Garden 模型服务

当前支持的覆盖请求头：

```http
X-Garden-Api-Key: <api_key>
X-Garden-Base-Url: <base_url>
```

## MySQL 说明

- 服务启动时会自动连接 MySQL
- 如果数据库不存在，会自动创建 `MYSQL_DATABASE` 指定的数据库
- 如果 `users` 表不存在，会自动创建
- 你可以直接在 Navicat 中连接 MySQL 后查看 `shijing.users`
- 也可以手动执行项目根目录下的 `schema.sql` 初始化库表

`users` 表主要字段：

- `account_id`：7 位数字登录账号
- `nickname`：用户昵称
- `password`：`bcrypt` 哈希后的密码
- `avatar`：头像数据
- `created_at`：创建时间

## 从 SQLite 迁移到 MySQL

如果项目目录下还保留了旧的 `database.sqlite`，可以执行：

```bash
npm run migrate:mysql
```

默认读取项目根目录下的 `database.sqlite` 并把用户写入 MySQL。

如果 SQLite 文件不在默认位置，可以在 `.env` 中指定：

```env
SQLITE_MIGRATION_PATH=your_sqlite_path
```

## 重置用户密码

如果你需要直接为某个账号重置密码，可以执行：

```bash
npm run reset-password -- <accountId> <newPassword>
```

例如：

```bash
npm run reset-password -- 9445349 Pass123!
```

这个脚本会直接更新 MySQL `users` 表中的 `bcrypt` 密码哈希。

## 构建

```bash
npm run build
```

## 当前架构

- 前端使用 `HashRouter`
- 登录后从后端获取签名 token，并通过 `/api/session` 恢复会话
- 图片分析通过后端 `/api/analyze` 调用 Garden 模型服务
- 设置页支持本地覆盖 Garden 的 API Key 和 Base URL
- 用户数据保存于 MySQL，便于通过 Navicat 直接查看和修改
