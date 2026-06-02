#!/bin/bash
# 部署脚本 - 在服务器上执行
set -e

echo "=== 药品进销存 ERP 部署 ==="

# 检查环境变量文件
if [ ! -f .env.production ]; then
    echo "错误: 请先创建 .env.production 文件"
    echo "参考 .env.example 创建"
    exit 1
fi

# 加载环境变量
set -a
source .env.production
set +a

# 拉取最新代码（如果用 git 部署的话）
# git pull origin main

# 构建并启动
echo ">>> 构建并启动服务..."
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# 等待数据库就绪
echo ">>> 等待数据库就绪..."
sleep 5

# 运行数据库迁移（如果需要）
echo ">>> 初始化数据库..."
docker-compose exec app node dist/main &
sleep 3
docker-compose stop app
docker-compose up -d app

echo ">>> 检查服务状态..."
docker-compose ps

echo ""
echo "=== 部署完成 ==="
echo "API 服务运行在: http://localhost:3000"
echo "请配置 Nginx 反向代理并设置 SSL"
