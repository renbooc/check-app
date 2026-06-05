# 阿里云服务器部署指南 — 药品进销存 ERP

> 适用于：微信小程序前端 + NestJS/PostgreSQL 后端 Docker 部署  
> 操作系统：Ubuntu 24.04 LTS
> 最后更新：2026-06-03

---

## 目录

1. [服务器选购](#1-服务器选购)
2. [服务器初始化配置](#2-服务器初始化配置)
3. [安装 Docker + Docker Compose](#3-安装-docker--docker-compose)
4. [安装 Nginx](#4-安装-nginx)
5. [上传项目代码](#5-上传项目代码)
6. [配置生产环境变量](#6-配置生产环境变量)
7. [修改小程序 API 地址](#7-修改小程序-api-地址)
8. [构建并启动服务](#8-构建并启动服务)
9. [配置 Nginx 反向代理](#9-配置-nginx-反向代理)
10. [申请 SSL 证书并配置 HTTPS](#10-申请-ssl-证书并配置-https)
11. [初始化数据库（首次部署）](#11-初始化数据库首次部署)
12. [微信小程序发布](#12-微信小程序发布)
13. [验证部署结果](#13-验证部署结果)
14. [日常运维命令](#14-日常运维命令)
15. [常见问题排查](#15-常见问题排查)

---

## 1. 服务器选购

### 推荐配置

| 项目 | 推荐 | 说明 |
|------|------|------|
| **产品类型** | 轻量应用服务器 | 性价比高，操作简单 |
| **系统** | Alibaba Cloud Linux 3.2104 | 阿里云官方优化，兼容 CentOS 生态 |
| **CPU/内存** | 2核 2GB | 足够运行 Docker + Node.js + PostgreSQL |
| **磁盘** | 50GB SSD | 满足数据和日志存储 |
| **带宽** | 3Mbps 或以上 | 小程序请求体较小，3M 够用 |
| **地区** | 按用户所在地选 | 华南/华东/华北就近访问 |
| **预算** | 约 60~150 元/年 | 新用户首年优惠 |

### 购买步骤

1. 访问 [阿里云官网](https://www.aliyun.com/) 注册/登录
2. 进入 **轻量应用服务器** 产品页
3. 选择 **Alibaba Cloud Linux 3** 镜像（默认已选）
4. 选择 **2核2G / 50GB SSD** 套餐，完成支付
5. 等待实例创建完成，记录 **公网 IP 地址**

### 配置安全组（开放端口）

购买完成后，进入 **控制台 → 轻量应用服务器 → 防火墙**，确保开放以下端口：

| 端口 | 协议 | 用途 |
|------|------|------|
| 22 | TCP | SSH 远程登录 |
| 80 | TCP | HTTP |
| 443 | TCP | HTTPS |

---

## 2. 服务器初始化配置

### 2.1 使用 SSH 连接服务器

**方式一：阿里云控制台在线终端**
直接在控制台点击「远程连接」进入 Web Shell。

**方式二：本地终端（推荐）**
```bash
ssh root@你的服务器公网IP
```

### 2.2 修改 root 密码（首次登录建议修改）

```bash
passwd
```

### 2.3 创建普通用户（可选，推荐）

```bash
adduser deploy
usermod -aG sudo deploy
su - deploy
```

> Ubuntu 的 `sudo` 用户组相当于 CentOS 的 `wheel` 组。

### 2.4 更新系统

```bash
sudo apt update && sudo apt upgrade -y
```

### 2.5 设置时区

```bash
sudo timedatectl set-timezone Asia/Shanghai
```

---

## 3. 安装 Docker + Docker Compose

### 3.1 安装 Docker（使用阿里云镜像，国内速度更快）

```bash
# 安装依赖
sudo apt install -y ca-certificates curl gnupg

# 添加 Docker 官方 GPG 密钥
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://mirrors.aliyun.com/docker-ce/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# 添加阿里云 Docker 仓库（适配 Ubuntu 24.04）
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://mirrors.aliyun.com/docker-ce/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 刷新缓存并安装
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
```

### 3.2 启动并设置开机自启

```bash
sudo systemctl enable docker
sudo systemctl start docker
```

### 3.3 验证安装

```bash
docker --version
docker compose version
```

预期输出：
```
Docker version 27.x.x
Docker Compose version v2.x.x
```

### 3.4 当前用户加入 docker 组（免 sudo）

```bash
sudo usermod -aG docker $USER
# 重新登录后生效
```

---

## 4. 安装 Nginx

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

验证：在浏览器访问 `http://你的服务器公网IP`，看到 Nginx 欢迎页即成功。

> **说明：** Ubuntu 上 ufw 防火墙默认未启用。阿里云服务器实际由**安全组**控制流量，
> 只要安全组已开放 80/443 端口，无需额外配置 ufw。
> 如需启用 ufw：
> ```bash
> sudo ufw allow 'Nginx Full'
> sudo ufw enable
> ```

---

## 5. 上传项目代码

### 方式一：Git 拉取（推荐）

**前提：** 项目已托管到 GitHub / Gitee / GitLab

```bash
# 服务器安装 Git
sudo apt install -y git

# 创建项目目录
sudo mkdir -p /opt/erp
sudo chown $USER:$USER /opt/erp
cd /opt/erp

# 拉取代码
git clone https://github.com/renbooc/check-app.git .
```

### 方式二：本地上传（scp）

**在你的 Windows 电脑上执行 PowerShell：**

```powershell
# 将整个项目上传到服务器
scp -r "D:\wwwroot\checkApp" root@服务器公网IP:/opt/erp
```

> 若 scp 上传慢，可先打成 zip 包上传后在服务器解压。

### 验证项目结构

```bash
cd /opt/erp
ls -la
```

应能看到：
```
docker-compose.yml
server/
pages/
config/
deploy/
utils/
...
```

---

## 6. 配置生产环境变量

### 6.1 生成安全的 JWT_SECRET

```bash
# 生成一个随机字符串作为 JWT 密钥
openssl rand -hex 32
```

记录输出结果（类似：`a8f5f167f44f4964e6c998dee827110c`）。

### 6.2 创建 .env.production 文件

```bash
cd /opt/erp

cat > .env.production << 'EOF'
# ── 运行环境 ──
NODE_ENV=production

# ── 数据库配置（务必修改为强密码）──
DB_USERNAME=erp_user
DB_PASSWORD=此处填写强密码（建议16位以上，含大小写数字符号）
DB_DATABASE=erp_db

# ── JWT 认证（填写上一步生成的随机字符串）──
JWT_SECRET=此处填写openssl生成的随机字符串
JWT_EXPIRES_IN=7d

# ── 跨域设置（有域名后改为具体域名）──
CORS_ORIGIN=*
EOF
```

### 6.3 设置文件权限（保护敏感信息）

```bash
chmod 600 .env.production
```

> **重要：** 生产环境密码建议包含：大小写字母 + 数字 + 特殊符号，长度 ≥ 16 位。

---

## 7. 修改小程序 API 地址

> 此步骤在**本地电脑**操作，修改后重新上传到服务器。

编辑 `config/index.js`，将 `prod` 的 `baseUrl` 改为你的实际域名：

```javascript
const ENV_MAP = {
  dev: {
    baseUrl: 'http://localhost:3000',
    env: 'development',
    debug: true
  },
  test: {
    baseUrl: 'https://你的域名.com',   // ← 改为你的 HTTPS 域名
    env: 'testing',
    debug: true
  },
  prod: {
    baseUrl: 'https://你的域名.com',   // ← 改为你的 HTTPS 域名
    env: 'production',
    debug: false
  }
}
```

> 如果没有域名，暂时填 `http://服务器公网IP`（仅用于测试，正式发布小程序必须有域名）。

---

## 8. 构建并启动服务

### 8.1 执行部署

```bash
cd /opt/erp

# 使用 docker compose 构建并启动（后台运行）
# --env-file 指定环境变量来源，确保 db 和 app 使用相同的凭据
git pull origin main
sudo docker compose --env-file .env.production up -d --build
```

首次构建大约需要 3~8 分钟（下载基础镜像 + 安装依赖 + 编译 TypeScript）。

> **安全提示：** 后端端口 `3000` 只绑定到 `127.0.0.1`（本地回环），外部无法直接访问。
> Nginx 在同一台服务器上可以通过反向代理转发请求，既安全又无需额外防火墙配置。

### 8.2 检查容器状态

```bash
sudo docker compose ps
```

预期输出（两个容器均为 healthy）：

```
NAME      STATUS          PORTS
erp-db    Up (healthy)    5432/tcp
erp-app   Up (healthy)    127.0.0.1:3000->3000/tcp
```

> 两个服务都带有健康检查，`STATUS` 列显示 `Up (healthy)` 才表示完全就绪。
> `app` 首次启动时可能出现短暂的 `(starting)` 状态，这是正常的（`start_period: 30s`）。

### 8.3 查看启动日志

```bash
# 查看应用日志
sudo docker compose logs -f app

# 查看数据库日志
sudo docker compose logs -f db
```

看到以下日志说明启动成功：
```
[Nest] xxx  - ...  Nest application successfully started
```

按 `Ctrl+C` 退出日志查看。

---

## 9. 配置 Nginx 反向代理

### 9.1 创建站点配置

> Alibaba Cloud Linux 使用 `/etc/nginx/conf.d/` 目录存放站点配置（非 Ubuntu 的 sites-available）
> 如果暂时没有域名，使用 IP 访问测试

```bash
sudo vi /etc/nginx/conf.d/erp.conf
```

**有域名（推荐）：**
```nginx
server {
    listen 80;
    server_name api.你的域名.com;

    # 小程序上传大小限制
    client_max_body_size 10m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection '';

        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    access_log /var/log/nginx/erp-access.log;
    error_log  /var/log/nginx/erp-error.log;
}
```

**暂无域名（测试用）：**
```nginx
server {
    listen 80;
    server_name _;

    client_max_body_size 10m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### 9.2 启用站点

```bash
# 测试配置语法
sudo nginx -t

# 重载 Nginx（conf.d 下的 .conf 文件自动加载，无需创建软链接）
sudo systemctl reload nginx
```

### 9.3 验证反向代理

```bash
curl http://localhost:3000/health
# 应返回 API 响应

curl http://你的服务器IP/health
# 通过 Nginx 也应返回相同响应
```

---

## 10. 申请 SSL 证书并配置 HTTPS

> **前提：** 已有域名并完成 ICP 备案。

### 10.1 域名解析

在阿里云控制台 → **云解析 DNS** → 添加 A 记录：

| 记录类型 | 主机记录 | 记录值 |
|---------|---------|--------|
| A | api | 你的服务器公网 IP |

### 10.2 使用 Let's Encrypt 申请免费证书

```bash
# 安装 certbot
sudo apt install -y certbot python3-certbot-nginx

# 自动申请并配置 SSL
sudo certbot --nginx -d api.你的域名.com
```

按提示输入邮箱、同意协议，完成后证书自动配置到 Nginx。

### 10.3 验证 HTTPS

```bash
curl -I https://api.你的域名.com/health
# 应返回 HTTP 200
```

### 10.4 设置证书自动续期

```bash
# 测试续期命令
sudo certbot renew --dry-run
```

Certbot 安装后会自动添加定时任务，证书到期前自动续期。

---

## 11. 初始化数据库（首次部署）

### 11.1 运行种子脚本填充基础数据

```bash
cd /opt/erp

# 在 app 容器内运行 seed 脚本（需要开启同步以创建表结构）
sudo docker compose exec -e DB_SYNCHRONIZE=true app node dist/seed.js
```

成功后将看到：
```
🌱 开始填充示例数据...
✅ 单位数据已创建
✅ 仓库和库位数据已创建
✅ 供应商数据已创建
✅ 客户数据已创建
✅ 商品数据已创建
✅ 库存数据已创建
✅ 采购订单数据已创建
✅ 销售订单数据已创建

🎉 数据填充完成！
```

### 11.2 创建管理员账号

系统首次启动后，需要通过 API 创建管理员账号：

```bash
curl -X POST http://127.0.0.1:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "你的管理员密码",
    "name": "管理员",
    "phone": "你的手机号"
  }'
```

> 如果注册接口不存在，可通过后端 seed 脚本添加用户，或参考 `server/src/seed.ts` 扩展。

---

## 12. 微信小程序发布

### 12.1 微信公众平台配置域名

登录 [微信公众平台](https://mp.weixin.qq.com)：

1. 进入 **开发 → 开发管理 → 开发设置**
2. 在 **服务器域名** 中填写：
   - `request合法域名`：`https://api.你的域名.com`
3. 记录你的 **AppID** 和 **AppSecret**

### 12.2 本地准备小程序代码

1. 打开 **微信开发者工具**
2. 确认 `config/index.js` 中 `prod.baseUrl` 已更新为 `https://api.你的域名.com`
3. 确认 `useMock: false`（正式环境必须关闭 mock）
4. 在 **模拟器** 中测试各页面功能正常

### 12.3 上传并审核

1. 点击工具栏 **上传**
2. 填写：
   - 版本号：`2.0.0`
   - 描述：`药品进销存ERP管理系统`
3. 点击 **上传**
4. 登录微信公众平台 → **版本管理** → 找到刚上传的版本 → **提交审核**
5. 等待审核通过（通常 1~3 个工作日）
6. 审核通过后点击 **全量发布**

### 12.4 发布后验证

- 在手机微信搜索小程序名称，打开后测试各功能
- 重点检查：登录 → 首页加载 → 采购/销售/库存操作 → 报表数据

---

## 13. 验证部署结果

### 后端服务检查

```bash
# 1. 容器状态正常
sudo docker compose ps
# 两个容器均为 Up (healthy)

# 2. API 可访问
curl https://api.你的域名.com/health

# 3. 数据库连接正常（查看日志无报错）
sudo docker compose logs app --tail 20

# 4. 登录接口可用
curl -X POST https://api.你的域名.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"你的密码"}'
```

### 小程序检查清单

- [ ] 登录功能正常
- [ ] 首页数据加载正常
- [ ] 采购订单创建/查询正常
- [ ] 销售订单创建/查询正常
- [ ] 库存查询/盘点正常
- [ ] 报表数据分析正常
- [ ] 供应商/客户管理正常

---

## 14. 日常运维命令

### 常用操作

```bash
# 进入项目目录
cd /opt/erp

# 查看服务状态（含健康检查）
sudo docker compose ps

# 查看实时日志
sudo docker compose logs -f app
sudo docker compose logs -f db

# 重启应用（不影响数据库）
sudo docker compose restart app

# 重启所有服务
sudo docker compose restart
```

### 代码更新后重新部署

```bash
cd /opt/erp

# 拉取最新代码
git pull origin main

# 重新构建并启动（--env-file 确保变量替换正确）
sudo docker compose --env-file .env.production up -d --build

# 等待健康检查通过
sudo docker compose ps

# 查看启动日志确认
sudo docker compose logs -f app --tail 20
```

### 数据库备份

```bash
# 创建备份目录
sudo mkdir -p /opt/backup && sudo chmod 755 /opt/backup

# 备份数据库到文件
sudo docker compose exec db pg_dump -U ${DB_USERNAME:-erp_user} ${DB_DATABASE:-erp_db} \
  > /opt/backup/erp_$(date +%Y%m%d_%H%M%S).sql

# 创建定期备份的 cron 任务（每天凌晨3点自动备份，保留最近30天）
sudo crontab -e
# 添加以下行：
# 0 3 * * * cd /opt/erp && docker compose exec -T db pg_dump -U erp_user erp_db > /opt/backup/erp_$(date +\%Y\%m\%d).sql && find /opt/backup -name 'erp_*.sql' -mtime +30 -delete
```

### 数据库恢复

```bash
# 从备份文件恢复
sudo docker compose exec -T db psql -U erp_user erp_db < /opt/backup/erp_20260602.sql
```

### 查看磁盘空间

```bash
df -h
# 如果 /var/lib/docker 占用过大，可清理无用镜像：
sudo docker system prune -a --volumes
```

---

## 15. 常见问题排查

### Q1：容器启动失败，数据库连接超时

**原因：** PostgreSQL 容器还未完全就绪，app 容器就开始连接。

**解决：** `docker-compose.yml` 已配置 `depends_on: condition: service_healthy`，正常情况下不会发生。若仍发生：
```bash
sudo docker compose logs db
# 查看数据库报错信息
sudo docker compose restart
```

### Q2：API 返回 502 Bad Gateway

**原因：** Nginx 无法连接到后端服务（3000端口未监听）。

**排查：**
```bash
# 检查容器是否在运行
sudo docker compose ps

# 直接访问后端端口测试
curl http://127.0.0.1:3000/health

# 如果容器挂了，重启
sudo docker compose up -d
```

### Q3：小程序无法请求 API（开发工具报域名不在白名单）

**解决：**
1. 确认微信公众平台 **服务器域名** 已配置
2. 开发工具中勾选 **不校验合法域名**（仅调试阶段）
3. 正式发布前必须配置正确域名

### Q4：CORS 跨域错误

**解决：** 修改 `.env.production` 的 `CORS_ORIGIN`：
```bash
# 改为实际域名
CORS_ORIGIN=https://api.你的域名.com

# 重启服务
sudo docker compose up -d
```

### Q5：数据库 synchronize 问题

**说明：** 生产环境（`NODE_ENV=production`）下，TypeORM 的 `synchronize` 为 `false`，不会自动创建或修改表结构。

**首次部署创建表结构：**
```bash
# 运行 seed 脚本时临时开启同步（自动建表 + 填充数据）
sudo docker compose exec -e DB_SYNCHRONIZE=true app node dist/seed.js
```

**如需手动迁移（有配置迁移文件时）：**
```bash
sudo docker compose exec app npx typeorm migration:run
```

> `synchronize` 行为由 `DB_SYNCHRONIZE` 环境变量控制，默认值根据 `NODE_ENV` 决定：
> - `NODE_ENV=production` 且未设置 `DB_SYNCHRONIZE` → 关闭
> - 其他环境或显式设置 `DB_SYNCHRONIZE=true` → 开启

### Q6：服务器内存不足，容器被 kill

**排查：**
```bash
free -h
sudo dmesg | grep -i "oom\|kill"
```

**解决：** 添加 Swap 空间
```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
# 永久生效
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

> Ubuntu 24.04 建议优先使用 `fallocate` 而非 `dd` 创建 swap 文件，速度更快。

---

## 附录：完整部署命令速查（按顺序执行）

```bash
# === 服务器初始化 ===
ssh root@服务器公网IP
passwd
sudo apt update && sudo apt upgrade -y
sudo timedatectl set-timezone Asia/Shanghai

# === 安装 Docker（阿里云镜像）===
sudo apt install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://mirrors.aliyun.com/docker-ce/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://mirrors.aliyun.com/docker-ce/linux/ubuntu $(. /etc/os-release && echo \"$VERSION_CODENAME\") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo systemctl enable docker && sudo systemctl start docker

# === 安装 Nginx ===
sudo apt install -y nginx
sudo systemctl enable nginx

# === 上传代码（Git 方式）===
sudo apt install -y git
sudo mkdir -p /opt/erp && sudo chown $USER:$USER /opt/erp
cd /opt/erp
git clone https://github.com/你的用户名/checkApp.git .

# === 配置环境变量 ===
openssl rand -hex 32
vi .env.production    # 填入实际配置（含 NODE_ENV=production）
chmod 600 .env.production

# === 构建并启动服务 ===
sudo docker compose --env-file .env.production up -d --build
sudo docker compose ps                      # 等待均为 healthy
sudo docker compose logs -f app --tail 50   # 查看启动日志

# === 配置 Nginx 反向代理 ===
sudo vi /etc/nginx/conf.d/erp.conf    # 填入配置内容（proxy_pass http://127.0.0.1:3000）
sudo nginx -t && sudo systemctl reload nginx

# === SSL 证书（有域名后）===
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.你的域名.com

# === 初始化数据库（首次部署）===
sudo docker compose exec -e DB_SYNCHRONIZE=true app node dist/seed.js

# === 完成验证 ===
curl https://api.你的域名.com/health
```
