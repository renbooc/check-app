# 药品进销存 ERP 小程序 — 上线实施方案

> **目标：** 将现有小程序修复完善并部署上线，使其可用于实际的药品企业进销存管理。
>
> **性质：** 个人项目，快速上线。
>
> **当前状态：** 后端 NestJS + PostgreSQL 架构完整，16 张数据表，21 个前端页面骨架已存在。需要修复关键 BUG、补齐缺失功能、做生产化加固后上线。

---

## 总体路线图

| 阶段 | 内容 | 预估时间 |
|------|------|---------|
| **Phase 1 — 修复加固** | 修 BUG + 安全 + 数据安全 | 3-5 天 |
| **Phase 2 — 功能补齐** | 盘点更新库存 + API 对齐 + 流程完善 | 5-7 天 |
| **Phase 3 — 上线准备** | Docker + 部署脚本 + 配置 | 3-4 天 |
| **Phase 4 — 发布上线** | 服务器部署 + 小程序提审 | 2-3 天 |

---

## Phase 1：修复加固

### 1.1 后端生产化加固

**当前风险：** `app.module.ts` 中 `synchronize: true`，生产环境启动可能误删表。

改动清单：

1. **`server/src/main.ts`** — 全局注册 ValidationPipe：
   ```typescript
   app.useGlobalPipes(new ValidationPipe({
     transform: true,
     whitelist: true,
     forbidNonWhitelisted: true,
   }));
   ```

2. **`server/src/app.module.ts`** — 根据环境控制 synchronize：
   - 开发环境（dev/test）：`synchronize: true`
   - 生产环境（prod）：`synchronize: false`，使用 migration
   - 添加 TypeORM migration 配置（`migrationsRun: true`, `migrations: ['dist/migrations/*.js']`）

3. **`.env` 安全** — JWT_SECRET 不在代码仓库中硬编码，生产环境通过系统环境变量注入：
   - 开发环境：`.env` 文件保留当前默认值
   - 生产环境：服务器环境变量设置，`.env` 不提交到仓库

### 1.2 关键 BUG 修复

| BUG | 位置 | 说明 | 修复方案 |
|-----|------|------|---------|
| 盘点不更新库存 | `inventory.service.ts:saveCheck()` | 只写盘点记录和日志，未更新 inventory 表 quantity | saveCheck 中增加 inventoryRepo.update() 同步更新库存数量 |
| seed.ts 类型错误 | `seed.ts:30` | `Repository<Repository<Unit>>` 多包了一层泛型 | 改为 `Repository<Unit>` |
| mine.js 跳过 storage 层 | `mine.js:30-31` | 直接调用 `wx.removeStorageSync` 而非 `storage.remove` | 改为调用 storage 工具函数 |
| Mock 开关未使用 | `config/index.js:34` + `request.js` | `useMock: false` 但 request.js 未集成 mock 切换 | request.js 根据 useMock 自动切 mock/真实 API |

### 1.3 安全加固

| 措施 | 实现方式 |
|------|---------|
| 请求频率限制 | 添加 `@nestjs/throttler` Guard（`@SkipThrottle()` 注解跳过登录接口） |
| 全局异常过滤器 | 统一 `{ code, message, data }` 响应格式 |
| CORS 配置 | 仅允许小程序业务域名 |
| 敏感信息剥离 | passport-jwt 返回用户信息时确保不返回 password 字段 |

---

## Phase 2：功能补齐 + 前后端联调

### 2.1 盘点核心流程闭环

当前盘点只写 stock_check_items 和 inventory_logs，不更新 inventory 表。修复后流程：

```
扫码商品 → 填写盘点数量 → 保存
  ├── 写入 stock_check 和 stock_check_items
  ├── 更新 inventory.quantity（关键修复）
  └── 写入 inventory_logs（已有）
```

**`InventoryService.saveCheck()` 新增：**
```typescript
// 查找并更新库存记录
const inventoryRecord = await this.inventoryRepo.findOne({
  where: { productId: dto.productId, locationId: dto.locationId }
});
if (inventoryRecord) {
  const beforeQty = inventoryRecord.quantity;
  inventoryRecord.quantity = dto.checkCount;
  await this.inventoryRepo.save(inventoryRecord);
}
```

### 2.2 采购/销售订单状态机

保留简单审核流程，操作入口在订单列表页：

**采购订单状态：**
```
draft(草稿) → 提交 → pending(待审核) → 确认入库 → received(已入库)
```
- 列表页卡片根据当前状态显示操作按钮
- 「确认入库」操作同时更新 inventory 表（增加库存）

**销售订单状态：**
```
draft(草稿) → 提交 → pending(待审核) → 确认出库 → delivered(已出库)
```
- 「确认出库」操作同时更新 inventory 表（扣减库存）

### 2.3 前后端 API 路由对齐

| 前端当前调用 | 后端实际路由 | 修复动作 |
|------------|------------|---------|
| `/inventory/overview` | 实现在 ReportService | ReportController 添加 GET /report/overview 路由，前端改为 `/report/overview` |
| `/products/search?keyword=` | ProductController `findAll` 已支持 keyword 参数 | 前端统一用 `/products?keyword=` |
| `/products/barcode?code=` | ProductController.findByBarcode | 无需改动（已验证路径正确） |
| `/stock/list` | InventoryController.getStockList | 统一用 `/inventory?keyword=` |
| `/check/save` | InventoryController.saveCheck | 改为 `/inventory/check` |
| `/check/records` | InventoryController.getCheckRecords | 改为 `/inventory/checks` |

### 2.4 前端页面补齐

所有 21 个页面的文件已存在，主要补齐内容包括：

- **采购/销售表单页** — `pages/purchase/form`、`pages/sales/form` 已有完整实现，确认 WXML 中的 picker/input 事件绑定正确
- **列表页分页** — 确认所有列表页的分页参数与后端一致（page/pageSize 命名对齐）
- **状态反馈** — 所有增删改操作增加成功/失败 Toast
- **网络异常** — 确认所有异步操作已被 try-catch 包裹

---

## Phase 3：上线准备

### 3.1 Docker 容器化

**`server/Dockerfile`：**
```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY package*.json ./
EXPOSE 3000
CMD ["node", "dist/main"]
```

**`docker-compose.yml`（项目根目录）：**
```yaml
services:
  app:
    build: ./server
    ports:
      - "3000:3000"
    environment:
      - DB_HOST=db
      - DB_PORT=5432
      - DB_USERNAME=postgres
      - DB_PASSWORD=${DB_PASSWORD}
      - DB_DATABASE=erp_db
      - JWT_SECRET=${JWT_SECRET}
      - NODE_ENV=production
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:16-alpine
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=erp_db
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
```

### 3.2 数据库迁移

1. 生成初始 migration：
   ```bash
   cd server
   npx typeorm-ts-node-commonjs migration:generate src/migrations/InitialSchema -d src/data-source.ts
   ```
2. 生产环境关闭 `synchronize`，改为 `migrationsRun: true`
3. seed 脚本保留作为可选操作

### 3.3 小程序配置

- `project.config.json` — `appid` 替换为正式 AppID
- `config/index.js` — `prod.baseUrl` 指向生产 API 域名（如 `https://erp-api.yourdomain.com`）
- Nginx 配置 HTTPS 反代：
  ```nginx
  server {
      listen 443 ssl;
      server_name erp-api.yourdomain.com;
      ssl_certificate /etc/letsencrypt/live/erp-api/fullchain.pem;
      ssl_certificate_key /etc/letsencrypt/live/erp-api/privkey.pem;

      location / {
          proxy_pass http://localhost:3000;
          proxy_set_header Host $host;
          proxy_set_header X-Real-IP $remote_addr;
      }
  }
  ```

---

## Phase 4：发布上线

### 4.1 服务器部署

**推荐配置：** 2C4G 云服务器（约 100 元/月）

**部署步骤：**
1. 服务器安装 Docker + docker-compose
2. 上传 `.env.production` 环境变量文件
3. `docker-compose up -d` 启动
4. 配置 Nginx 反向代理 + SSL 证书

### 4.2 小程序提审

**微信公众平台配置：**
- 服务器域名：配置 `request` 合法域名指向 API 地址
- 服务类目：根据实际业务选择（医药类可能需要资质）
- 订阅消息：如有需要先申请模板

**审核注意事项：**
- 首次提交可能需要补充企业资质
- 个人开发者账号部分类目受限
- 确保所有功能在体验版可正常使用

### 4.3 上线验证清单

- [ ] 后端健康检查：`GET /api/health` 返回 200
- [ ] 登录/注册/退出登录正常
- [ ] 首页仪表盘数据显示正常
- [ ] 扫码盘点全流程：扫码 → 盘点 → 保存 → 库存更新
- [ ] 采购单：创建 → 搜索 → 审核 → 入库
- [ ] 销售单：创建 → 搜索 → 审核 → 出库
- [ ] 商品/供应商/客户 CRUD 操作正常
- [ ] 报表数据可正常展示
- [ ] 下拉刷新、分页加载正常
- [ ] 网络断开/恢复提示正常
- [ ] 操作日志记录正常

---

## 附录：前端页面完整性确认

通过代码审查确认所有 21 个页面的 JS/WXML/WXSS 文件均存在，状态覆盖（Loading/Empty/Error）在各页面中均已实现。
