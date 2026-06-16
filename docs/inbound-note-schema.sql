-- ============================================================
-- 采购入库单模块 — 表结构 DDL
-- TypeORM synchronize 会自动创建，此文件供参考或手动部署使用
-- ============================================================

CREATE TABLE public.inbound_notes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "orderNo" character varying(50) NOT NULL,
    "purchaseOrderId" character varying NOT NULL,
    "purchaseOrderNo" character varying(50),
    "supplierId" character varying NOT NULL,
    "supplierName" character varying(100) NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    "totalAmount" numeric(12,2) DEFAULT 0 NOT NULL,
    "totalQuantity" integer DEFAULT 0 NOT NULL,
    "warehouseId" character varying,
    "warehouseName" character varying(100),
    "inboundDate" character varying(50),
    "operatorId" character varying NOT NULL,
    "operatorName" character varying(50) NOT NULL,
    remark character varying(500),
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT "PK_inbound_notes" PRIMARY KEY (id)
);

CREATE TABLE public.inbound_note_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "inboundId" uuid NOT NULL,
    "productId" character varying NOT NULL,
    "productName" character varying(100) NOT NULL,
    "productSpec" character varying(100),
    "productUnit" character varying(20),
    "productManufacturer" character varying(100),
    quantity numeric(12,2) NOT NULL,
    price numeric(10,2) NOT NULL,
    amount numeric(12,2) NOT NULL,
    "batchNo" character varying(50) NOT NULL,
    "productionDate" date NOT NULL,
    "expiryDate" date NOT NULL,
    "locationCode" character varying(50),
    CONSTRAINT "PK_inbound_note_items" PRIMARY KEY (id),
    CONSTRAINT "FK_inbound_note_items_inbound" FOREIGN KEY ("inboundId")
        REFERENCES public.inbound_notes(id) ON DELETE CASCADE
);
