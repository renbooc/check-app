/**
 * 数据种子脚本 - 填充示例数据用于报表展示
 * 运行方式: npx ts-node src/seed.ts
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { Category } from './entities/category.entity';
import { Unit } from './entities/unit.entity';
import { Warehouse } from './entities/warehouse.entity';
import { Location } from './entities/location.entity';
import { Supplier } from './entities/supplier.entity';
import { Customer } from './entities/customer.entity';
import { Inventory } from './entities/inventory.entity';
import { PurchaseOrder, PurchaseOrderStatus } from './entities/purchase-order.entity';
import { PurchaseOrderItem } from './entities/purchase-order-item.entity';
import { SalesOrder, SalesOrderStatus } from './entities/sales-order.entity';
import { SalesOrderItem } from './entities/sales-order-item.entity';
import * as bcrypt from 'bcrypt';

async function seed() {
  console.log('🌱 开始填充示例数据...');
  
  const app = await NestFactory.createApplicationContext(AppModule);

  const productRepo = app.get<Repository<Product>>(getRepositoryToken(Product));
  const categoryRepo = app.get<Repository<Category>>(getRepositoryToken(Category));
  const unitRepo = app.get<Repository<Unit>>(getRepositoryToken(Unit));
  const warehouseRepo = app.get<Repository<Warehouse>>(getRepositoryToken(Warehouse));
  const locationRepo = app.get<Repository<Location>>(getRepositoryToken(Location));
  const supplierRepo = app.get<Repository<Supplier>>(getRepositoryToken(Supplier));
  const customerRepo = app.get<Repository<Customer>>(getRepositoryToken(Customer));
  const inventoryRepo = app.get<Repository<Inventory>>(getRepositoryToken(Inventory));
  const purchaseRepo = app.get<Repository<PurchaseOrder>>(getRepositoryToken(PurchaseOrder));
  const purchaseItemRepo = app.get<Repository<PurchaseOrderItem>>(getRepositoryToken(PurchaseOrderItem));
  const salesRepo = app.get<Repository<SalesOrder>>(getRepositoryToken(SalesOrder));
  const salesItemRepo = app.get<Repository<SalesOrderItem>>(getRepositoryToken(SalesOrderItem));

  // 清空现有数据
  await salesItemRepo.delete({});
  await salesRepo.delete({});
  await purchaseItemRepo.delete({});
  await purchaseRepo.delete({});
  await inventoryRepo.delete({});
  await productRepo.delete({});
  await categoryRepo.delete({});
  await supplierRepo.delete({});
  await customerRepo.delete({});
  await locationRepo.delete({});
  await warehouseRepo.delete({});

  console.log('✅ 已清空现有数据');

  // 1. 创建单位
  const units = await unitRepo.save([
    { id: 'unit_box', name: '盒', code: 'BOX' },
    { id: 'unit_bottle', name: '瓶', code: 'BTL' },
    { id: 'unit_bag', name: '袋', code: 'BAG' },
    { id: 'unit_box_large', name: '箱', code: 'CTN' },
  ]);
  console.log('✅ 单位数据已创建');

  // 2. 创建仓库
  const warehouse = await warehouseRepo.save({
    id: 'wh_main',
    name: '中心仓库',
    code: 'WH001',
    address: '药品仓储中心A区',
  });

  // 3. 创建库位
  const locations = await locationRepo.save([
    { id: 'loc_a01', warehouseId: 'wh_main', code: 'A01-01-01', name: 'A区01架01层' },
    { id: 'loc_a02', warehouseId: 'wh_main', code: 'A01-02-01', name: 'A区01架02层' },
    { id: 'loc_a03', warehouseId: 'wh_main', code: 'A02-01-01', name: 'A区02架01层' },
    { id: 'loc_a04', warehouseId: 'wh_main', code: 'A02-02-01', name: 'A区02架02层' },
    { id: 'loc_b01', warehouseId: 'wh_main', code: 'B01-01-01', name: 'B区01架01层' },
  ]);
  console.log('✅ 仓库和库位数据已创建');

  // 4. 创建供应商
  const suppliers = await supplierRepo.save([
    { id: 'sup_001', name: '华润三九医药股份有限公司', code: 'SUP001', contact: '李经理', phone: '0755-12345678' },
    { id: 'sup_002', name: '珠海联邦制药股份有限公司', code: 'SUP002', contact: '王经理', phone: '0756-87654321' },
    { id: 'sup_003', name: '中美天津史克制药有限公司', code: 'SUP003', contact: '张经理', phone: '022-12345678' },
  ]);
  console.log('✅ 供应商数据已创建');

  // 5. 创建客户
  const customers = await customerRepo.save([
    { id: 'cust_001', name: '第一人民医院', code: 'CUST001', contact: '陈医生', phone: '020-12345678' },
    { id: 'cust_002', name: '第二社区卫生服务中心', code: 'CUST002', contact: '刘护士', phone: '020-87654321' },
    { id: 'cust_003', name: '康和大药房', code: 'CUST003', contact: '赵店长', phone: '021-12345678' },
  ]);
  console.log('✅ 客户数据已创建');

  // 6. 创建商品
  const products = await productRepo.save([
    {
      id: 'prod_001',
      name: '感冒灵颗粒',
      code: '6901339800011',
      approvalNo: '国药准字Z20055711',
      spec: '10g*9袋/盒',
      unitId: 'unit_box',
      manufacturer: '华润三九医药股份有限公司',
      price: 12.50,
      minQuantity: 100,
    },
    {
      id: 'prod_002',
      name: '阿莫西林胶囊',
      code: '6922266445021',
      approvalNo: '国药准字H44021351',
      spec: '0.5g*24粒/盒',
      unitId: 'unit_box',
      manufacturer: '珠海联邦制药股份有限公司',
      price: 18.90,
      minQuantity: 80,
    },
    {
      id: 'prod_003',
      name: '布洛芬缓释胶囊',
      code: '6923287100013',
      approvalNo: '国药准字H20013062',
      spec: '0.3g*20粒/盒',
      unitId: 'unit_box',
      manufacturer: '中美天津史克制药有限公司',
      price: 22.50,
      minQuantity: 60,
    },
    {
      id: 'prod_004',
      name: '复方板蓝根颗粒',
      code: '6903281004015',
      approvalNo: '国药准字Z44020849',
      spec: '15g*20袋/盒',
      unitId: 'unit_box',
      manufacturer: '广州白云山制药总厂',
      price: 15.00,
      minQuantity: 50,
    },
    {
      id: 'prod_005',
      name: '蒙脱石散',
      code: '6922045620017',
      approvalNo: '国药准字H20000690',
      spec: '3g*10袋/盒',
      unitId: 'unit_box',
      manufacturer: '博福-益普生(天津)制药有限公司',
      price: 28.80,
      minQuantity: 40,
    },
    {
      id: 'prod_006',
      name: '维生素C片',
      code: '6903281005012',
      approvalNo: '国药准字H44021151',
      spec: '100mg*100片/瓶',
      unitId: 'unit_bottle',
      manufacturer: '华中药业股份有限公司',
      price: 8.50,
      minQuantity: 100,
    },
    {
      id: 'prod_007',
      name: '氨茶碱片',
      code: '6923281006019',
      approvalNo: '国药准字H44021622',
      spec: '0.1g*100片/瓶',
      unitId: 'unit_bottle',
      manufacturer: '西南药业股份有限公司',
      price: 6.80,
      minQuantity: 30,
    },
    {
      id: 'prod_008',
      name: '头孢克肟分散片',
      code: '6922266448017',
      approvalNo: '国药准字H20040125',
      spec: '0.1g*6片/盒',
      unitId: 'unit_box',
      manufacturer: '广州南新制药有限公司',
      price: 35.60,
      minQuantity: 50,
    },
  ]);
  console.log('✅ 商品数据已创建');

  // 7. 创建库存记录
  const inventoryData = [
    { productId: 'prod_001', locationId: 'loc_a01', batchNo: 'CK20240501', quantity: 320, expiryDate: '2026-12-31' },
    { productId: 'prod_002', locationId: 'loc_a01', batchNo: 'CK20240502', quantity: 180, expiryDate: '2026-08-15' },
    { productId: 'prod_003', locationId: 'loc_a02', batchNo: 'CK20240503', quantity: 250, expiryDate: '2027-03-10' },
    { productId: 'prod_004', locationId: 'loc_a02', batchNo: 'CK20240504', quantity: 45, expiryDate: '2026-10-20' }, // 低库存
    { productId: 'prod_005', locationId: 'loc_a03', batchNo: 'CK20240505', quantity: 95, expiryDate: '2027-05-05' },
    { productId: 'prod_006', locationId: 'loc_a03', batchNo: 'CK20240506', quantity: 380, expiryDate: '2027-06-30' },
    { productId: 'prod_007', locationId: 'loc_a04', batchNo: 'CK20240507', quantity: 25, expiryDate: '2026-09-30' }, // 低库存
    { productId: 'prod_008', locationId: 'loc_b01', batchNo: 'CK20240508', quantity: 120, expiryDate: '2027-01-15' },
  ];

  for (const inv of inventoryData) {
    await inventoryRepo.save({
      ...inv,
      warehouseId: 'wh_main',
    });
  }
  console.log('✅ 库存数据已创建');

  // 8. 创建采购订单 (本月)
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const purchaseOrders = await purchaseRepo.save([
    {
      orderNo: 'PO202505001',
      supplierId: 'sup_001',
      totalAmount: 3750.00,
      status: PurchaseOrderStatus.RECEIVED,
      createdAt: new Date(startOfMonth.getTime() + 1 * 24 * 60 * 60 * 1000),
    },
    {
      orderNo: 'PO202505002',
      supplierId: 'sup_002',
      totalAmount: 2835.00,
      status: PurchaseOrderStatus.RECEIVED,
      createdAt: new Date(startOfMonth.getTime() + 5 * 24 * 60 * 60 * 1000),
    },
    {
      orderNo: 'PO202505003',
      supplierId: 'sup_003',
      totalAmount: 5625.00,
      status: PurchaseOrderStatus.RECEIVED,
      createdAt: new Date(startOfMonth.getTime() + 10 * 24 * 60 * 60 * 1000),
    },
  ]);

  // 采购明细
  await purchaseItemRepo.save([
    { purchaseOrderId: purchaseOrders[0].id, productId: 'prod_001', productName: '感冒灵颗粒', quantity: 300, price: 10.00, subtotal: 3000 },
    { purchaseOrderId: purchaseOrders[0].id, productId: 'prod_006', productName: '维生素C片', quantity: 100, price: 7.50, subtotal: 750 },
    { purchaseOrderId: purchaseOrders[1].id, productId: 'prod_002', productName: '阿莫西林胶囊', quantity: 150, price: 15.00, subtotal: 2250 },
    { purchaseOrderId: purchaseOrders[1].id, productId: 'prod_007', productName: '氨茶碱片', quantity: 100, price: 5.85, subtotal: 585 },
    { purchaseOrderId: purchaseOrders[2].id, productId: 'prod_003', productName: '布洛芬缓释胶囊', quantity: 250, price: 18.00, subtotal: 4500 },
    { purchaseOrderId: purchaseOrders[2].id, productId: 'prod_005', productName: '蒙脱石散', quantity: 50, price: 22.50, subtotal: 1125 },
  ]);
  console.log('✅ 采购订单数据已创建');

  // 9. 创建销售订单 (本月)
  const salesOrders = await salesRepo.save([
    {
      orderNo: 'SO202505001',
      customerId: 'cust_001',
      totalAmount: 4520.00,
      status: SalesOrderStatus.APPROVED,
      createdAt: new Date(startOfMonth.getTime() + 2 * 24 * 60 * 60 * 1000),
    },
    {
      orderNo: 'SO202505002',
      customerId: 'cust_002',
      totalAmount: 1860.00,
      status: SalesOrderStatus.APPROVED,
      createdAt: new Date(startOfMonth.getTime() + 4 * 24 * 60 * 60 * 1000),
    },
    {
      orderNo: 'SO202505003',
      customerId: 'cust_003',
      totalAmount: 3250.00,
      status: SalesOrderStatus.APPROVED,
      createdAt: new Date(startOfMonth.getTime() + 7 * 24 * 60 * 60 * 1000),
    },
    {
      orderNo: 'SO202505004',
      customerId: 'cust_001',
      totalAmount: 2890.00,
      status: SalesOrderStatus.DELIVERED,
      createdAt: new Date(startOfMonth.getTime() + 12 * 24 * 60 * 60 * 1000),
    },
    {
      orderNo: 'SO202505005',
      customerId: 'cust_002',
      totalAmount: 1580.00,
      status: SalesOrderStatus.DELIVERED,
      createdAt: new Date(startOfMonth.getTime() + 15 * 24 * 60 * 60 * 1000),
    },
  ]);

  // 销售明细
  await salesItemRepo.save([
    { salesOrderId: salesOrders[0].id, productId: 'prod_001', productName: '感冒灵颗粒', quantity: 200, price: 12.50, subtotal: 2500 },
    { salesOrderId: salesOrders[0].id, productId: 'prod_003', productName: '布洛芬缓释胶囊', quantity: 80, price: 22.50, subtotal: 1800 },
    { salesOrderId: salesOrders[0].id, productId: 'prod_006', productName: '维生素C片', quantity: 30, price: 8.50, subtotal: 255 },
    { salesOrderId: salesOrders[1].id, productId: 'prod_002', productName: '阿莫西林胶囊', quantity: 60, price: 18.90, subtotal: 1134 },
    { salesOrderId: salesOrders[1].id, productId: 'prod_005', productName: '蒙脱石散', quantity: 20, price: 28.80, subtotal: 576 },
    { salesOrderId: salesOrders[2].id, productId: 'prod_004', productName: '复方板蓝根颗粒', quantity: 80, price: 15.00, subtotal: 1200 },
    { salesOrderId: salesOrders[2].id, productId: 'prod_003', productName: '布洛芬缓释胶囊', quantity: 50, price: 22.50, subtotal: 1125 },
    { salesOrderId: salesOrders[2].id, productId: 'prod_001', productName: '感冒灵颗粒', quantity: 50, price: 12.50, subtotal: 625 },
    { salesOrderId: salesOrders[3].id, productId: 'prod_008', productName: '头孢克肟分散片', quantity: 40, price: 35.60, subtotal: 1424 },
    { salesOrderId: salesOrders[3].id, productId: 'prod_002', productName: '阿莫西林胶囊', quantity: 50, price: 18.90, subtotal: 945 },
    { salesOrderId: salesOrders[3].id, productId: 'prod_007', productName: '氨茶碱片', quantity: 80, price: 6.80, subtotal: 544 },
    { salesOrderId: salesOrders[4].id, productId: 'prod_006', productName: '维生素C片', quantity: 100, price: 8.50, subtotal: 850 },
    { salesOrderId: salesOrders[4].id, productId: 'prod_001', productName: '感冒灵颗粒', quantity: 50, price: 12.50, subtotal: 625 },
  ]);
  console.log('✅ 销售订单数据已创建');

  console.log('\n🎉 数据填充完成！');
  console.log('📊 报表数据汇总：');
  console.log('   - 商品数量: 8 个');
  console.log('   - 本月采购: 3 笔，共 ¥12,210.00');
  console.log('   - 本月销售: 5 笔，共 ¥14,100.00');
  console.log('   - 低库存预警: 2 个商品');

  await app.close();
}

seed().catch(console.error);
