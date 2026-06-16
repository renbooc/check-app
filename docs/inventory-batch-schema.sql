-- ============================================================
-- 库存批次管理 — 表结构 DDL
-- 设计说明：
--   inventory          库存总表（按 productId+warehouseId 唯一）
--   inventory_details  库存明细表（按批次拆分）
--   inventory_logs     库存日志表（增加批次字段）
-- ============================================================

-- 1. 库存总表（已修改：移除 batchNo/expiryDate/locationId，新增 avgPrice/amount/latestSupplier/latestInboundDate）
CREATE TABLE IF NOT EXISTS public.inventory (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "productId" uuid NOT NULL,
    "warehouseId" uuid NOT NULL,
    quantity integer DEFAULT 0 NOT NULL,
    "avgPrice" numeric(12,2) DEFAULT 0 NOT NULL,
    amount numeric(14,2) DEFAULT 0 NOT NULL,
    "latestSupplier" character varying(100),
    "latestInboundDate" date,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT "PK_inventory" PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS "IDX_inventory_product" ON public.inventory ("productId");
CREATE INDEX IF NOT EXISTS "IDX_inventory_warehouse" ON public.inventory ("warehouseId");

-- 2. 库存明细表（按批次拆分）
CREATE TABLE IF NOT EXISTS public.inventory_details (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "productId" uuid NOT NULL,
    "warehouseId" uuid NOT NULL,
    "batchCode" character varying(50) NOT NULL,
    "batchNo" character varying(50) NOT NULL,
    "productionDate" date,
    "expiryDate" date,
    price numeric(10,2) DEFAULT 0 NOT NULL,
    quantity integer DEFAULT 0 NOT NULL,
    "pendingQuantity" integer DEFAULT 0 NOT NULL,
    "locationCode" character varying(50),
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT "PK_inventory_details" PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS "IDX_detail_product" ON public.inventory_details ("productId");
CREATE INDEX IF NOT EXISTS "IDX_detail_batch" ON public.inventory_details ("batchCode");
CREATE INDEX IF NOT EXISTS "IDX_detail_expiry" ON public.inventory_details ("expiryDate");

-- 3. 库存日志表（已增加 batchCode/batchNo/price 字段）
CREATE TABLE IF NOT EXISTS public.inventory_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "productId" uuid NOT NULL,
    "productName" character varying(100) NOT NULL,
    type character varying(20) NOT NULL,
    "changeQuantity" integer NOT NULL,
    "beforeQuantity" integer NOT NULL,
    "afterQuantity" integer NOT NULL,
    "relatedOrderId" uuid,
    "batchCode" character varying(50),
    "batchNo" character varying(50),
    price numeric(10,2),
    "operatorId" uuid,
    "operatorName" character varying(50),
    remark character varying(200),
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT "PK_inventory_logs" PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS "IDX_log_product" ON public.inventory_logs ("productId");
CREATE INDEX IF NOT EXISTS "IDX_log_type" ON public.inventory_logs (type);
