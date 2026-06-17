-- ============================================================
-- 销售出库单模块 — 表结构 DDL
-- 注意：DROP 会删除已有数据，仅初始化使用
-- ============================================================

DROP TABLE IF EXISTS public.outbound_note_items CASCADE;
DROP TABLE IF EXISTS public.outbound_notes CASCADE;

CREATE TABLE public.outbound_notes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "orderNo" character varying(50) NOT NULL,
    "salesOrderId" character varying,
    "salesOrderNo" character varying(50),
    "customerId" character varying,
    "customerName" character varying(100),
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    "totalAmount" numeric(12,2) DEFAULT 0 NOT NULL,
    "totalQuantity" integer DEFAULT 0 NOT NULL,
    "warehouseId" character varying,
    "warehouseName" character varying(100),
    "operatorId" character varying NOT NULL,
    "operatorName" character varying(50) NOT NULL,
    "outboundDate" character varying(50),
    remark character varying(500),
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT "PK_outbound_notes" PRIMARY KEY (id)
);

CREATE TABLE public.outbound_note_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "outboundId" uuid NOT NULL,
    "productId" character varying NOT NULL,
    "productName" character varying(100) NOT NULL,
    "productSpec" character varying(100),
    "productUnit" character varying(20),
    "productManufacturer" character varying(100),
    quantity numeric(12,2) NOT NULL,
    price numeric(10,2) NOT NULL,
    amount numeric(12,2) NOT NULL,
    "batchCode" character varying(50),
    "batchNo" character varying(50),
    "locationCode" character varying(50),
    CONSTRAINT "PK_outbound_note_items" PRIMARY KEY (id),
    CONSTRAINT "FK_outbound_note_items_outbound" FOREIGN KEY ("outboundId")
        REFERENCES public.outbound_notes(id) ON DELETE CASCADE
);
