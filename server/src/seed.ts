/**
 * 数据种子脚本 - 填充示例数据用于报表展示
 * 运行方式: npx ts-node src/seed.ts
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { Unit } from './entities/unit.entity';
import { Warehouse } from './entities/warehouse.entity';
import { Location } from './entities/location.entity';
import { Supplier } from './entities/supplier.entity';
import { Customer } from './entities/customer.entity';
import { Inventory } from './entities/inventory.entity';
import {
  PurchaseOrder,
  PurchaseOrderStatus,
} from './entities/purchase-order.entity';
import { PurchaseOrderItem } from './entities/purchase-order-item.entity';
import { SalesOrder, SalesOrderStatus } from './entities/sales-order.entity';
import { SalesOrderItem } from './entities/sales-order-item.entity';

async function seed() {
  console.log('🌱 开始填充示例数据...');

  const app = await NestFactory.createApplicationContext(AppModule);

  const productRepo = app.get<Repository<Product>>(getRepositoryToken(Product));
  const unitRepo = app.get<Repository<Unit>>(getRepositoryToken(Unit));
  const warehouseRepo = app.get<Repository<Warehouse>>(
    getRepositoryToken(Warehouse),
  );
  const locationRepo = app.get<Repository<Location>>(
    getRepositoryToken(Location),
  );
  const supplierRepo = app.get<Repository<Supplier>>(
    getRepositoryToken(Supplier),
  );
  const customerRepo = app.get<Repository<Customer>>(
    getRepositoryToken(Customer),
  );
  const inventoryRepo = app.get<Repository<Inventory>>(
    getRepositoryToken(Inventory),
  );
  const purchaseRepo = app.get<Repository<PurchaseOrder>>(
    getRepositoryToken(PurchaseOrder),
  );
  const purchaseItemRepo = app.get<Repository<PurchaseOrderItem>>(
    getRepositoryToken(PurchaseOrderItem),
  );
  const salesRepo = app.get<Repository<SalesOrder>>(
    getRepositoryToken(SalesOrder),
  );
  const salesItemRepo = app.get<Repository<SalesOrderItem>>(
    getRepositoryToken(SalesOrderItem),
  );

  // 清空现有数据（注意顺序：先删子表，再删主表）
  await salesItemRepo.delete({});
  await salesRepo.delete({});
  await purchaseItemRepo.delete({});
  await purchaseRepo.delete({});
  await inventoryRepo.delete({});
  await productRepo.delete({});
  await supplierRepo.delete({});
  await customerRepo.delete({});
  await locationRepo.delete({});
  await warehouseRepo.delete({});

  console.log('✅ 已清空现有数据');

  // ==========================================================
  // 1. 创建单位
  // ==========================================================
  const units = await unitRepo.save([
    { name: '盒' },
    { name: '瓶' },
    { name: '袋' },
    { name: '箱' },
  ]);
  const [unitBox, unitBottle] = units;
  console.log('✅ 单位数据已创建');

  // ==========================================================
  // 2. 创建仓库
  // ==========================================================
  const warehouse = await warehouseRepo.save({
    name: '中心仓库',
    address: '药品仓储中心A区',
  });
  console.log('✅ 仓库数据已创建');

  // ==========================================================
  // 3. 创建库位
  // ==========================================================
  const locations = await locationRepo.save([
    { warehouseId: warehouse.id, code: 'A01-01-01', name: 'A区01架01层' },
    { warehouseId: warehouse.id, code: 'A01-02-01', name: 'A区01架02层' },
    { warehouseId: warehouse.id, code: 'A02-01-01', name: 'A区02架01层' },
    { warehouseId: warehouse.id, code: 'A02-02-01', name: 'A区02架02层' },
    { warehouseId: warehouse.id, code: 'B01-01-01', name: 'B区01架01层' },
  ]);
  const [locA01, locA02, locA03, locA04, locB01] = locations;
  console.log('✅ 仓库和库位数据已创建');

  // ==========================================================
  // 4. 创建供应商
  // ==========================================================
  const suppliers = await supplierRepo.save([
    {
      name: '华润三九医药股份有限公司',
      contactPerson: '李经理',
      phone: '0755-12345678',
    },
    {
      name: '珠海联邦制药股份有限公司',
      contactPerson: '王经理',
      phone: '0756-87654321',
    },
    {
      name: '中美天津史克制药有限公司',
      contactPerson: '张经理',
      phone: '022-12345678',
    },
  ]);
  const [supSanjiu, supLianbang, supSk] = suppliers;
  console.log('✅ 供应商数据已创建');

  // ==========================================================
  // 5. 创建客户
  // ==========================================================
  const customers = await customerRepo.save([
    { name: '第一人民医院', contactPerson: '陈医生', phone: '020-12345678' },
    {
      name: '第二社区卫生服务中心',
      contactPerson: '刘护士',
      phone: '020-87654321',
    },
    { name: '康和大药房', contactPerson: '赵店长', phone: '021-12345678' },
  ]);
  const [custHosp, custComm, custPharm] = customers;
  console.log('✅ 客户数据已创建');

  // ==========================================================
  // 6. 创建商品
  // ==========================================================
  const products = await productRepo.save([
    {
      name: '感冒灵颗粒',
      code: '6901339800011',
      approvalNo: '国药准字Z20055711',
      spec: '10g*9袋/盒',
      unitId: unitBox.id,
      manufacturer: '华润三九医药股份有限公司',
      price: 12.5,
      minQuantity: 100,
    },
    {
      name: '阿莫西林胶囊',
      code: '6922266445021',
      approvalNo: '国药准字H44021351',
      spec: '0.5g*24粒/盒',
      unitId: unitBox.id,
      manufacturer: '珠海联邦制药股份有限公司',
      price: 18.9,
      minQuantity: 80,
    },
    {
      name: '布洛芬缓释胶囊',
      code: '6923287100013',
      approvalNo: '国药准字H20013062',
      spec: '0.3g*20粒/盒',
      unitId: unitBox.id,
      manufacturer: '中美天津史克制药有限公司',
      price: 22.5,
      minQuantity: 60,
    },
    {
      name: '复方板蓝根颗粒',
      code: '6903281004015',
      approvalNo: '国药准字Z44020849',
      spec: '15g*20袋/盒',
      unitId: unitBox.id,
      manufacturer: '广州白云山制药总厂',
      price: 15.0,
      minQuantity: 50,
    },
    {
      name: '蒙脱石散',
      code: '6922045620017',
      approvalNo: '国药准字H20000690',
      spec: '3g*10袋/盒',
      unitId: unitBox.id,
      manufacturer: '博福-益普生(天津)制药有限公司',
      price: 28.8,
      minQuantity: 40,
    },
    {
      name: '维生素C片',
      code: '6903281005012',
      approvalNo: '国药准字H44021151',
      spec: '100mg*100片/瓶',
      unitId: unitBottle.id,
      manufacturer: '华中药业股份有限公司',
      price: 8.5,
      minQuantity: 100,
    },
    {
      name: '氨茶碱片',
      code: '6923281006019',
      approvalNo: '国药准字H44021622',
      spec: '0.1g*100片/瓶',
      unitId: unitBottle.id,
      manufacturer: '西南药业股份有限公司',
      price: 6.8,
      minQuantity: 30,
    },
    {
      name: '头孢克肟分散片',
      code: '6922266448017',
      approvalNo: '国药准字H20040125',
      spec: '0.1g*6片/盒',
      unitId: unitBox.id,
      manufacturer: '广州南新制药有限公司',
      price: 35.6,
      minQuantity: 50,
    },
  ]);
  const [
    prodGanmao,
    prodAmox,
    prodIbu,
    prodBanlan,
    prodMengtuo,
    prodVc,
    prodAnchajian,
    prodToubao,
  ] = products;
  console.log('✅ 商品数据已创建');

  // ==========================================================
  // 7. 创建库存记录
  // ==========================================================
  await inventoryRepo.save([
    {
      productId: prodGanmao.id,
      warehouseId: warehouse.id,
      locationId: locA01.id,
      batchNo: 'CK20240501',
      quantity: 320,
      expiryDate: '2026-12-31',
    },
    {
      productId: prodAmox.id,
      warehouseId: warehouse.id,
      locationId: locA01.id,
      batchNo: 'CK20240502',
      quantity: 180,
      expiryDate: '2026-08-15',
    },
    {
      productId: prodIbu.id,
      warehouseId: warehouse.id,
      locationId: locA02.id,
      batchNo: 'CK20240503',
      quantity: 250,
      expiryDate: '2027-03-10',
    },
    {
      productId: prodBanlan.id,
      warehouseId: warehouse.id,
      locationId: locA02.id,
      batchNo: 'CK20240504',
      quantity: 45,
      expiryDate: '2026-10-20',
    },
    {
      productId: prodMengtuo.id,
      warehouseId: warehouse.id,
      locationId: locA03.id,
      batchNo: 'CK20240505',
      quantity: 95,
      expiryDate: '2027-05-05',
    },
    {
      productId: prodVc.id,
      warehouseId: warehouse.id,
      locationId: locA03.id,
      batchNo: 'CK20240506',
      quantity: 380,
      expiryDate: '2027-06-30',
    },
    {
      productId: prodAnchajian.id,
      warehouseId: warehouse.id,
      locationId: locA04.id,
      batchNo: 'CK20240507',
      quantity: 25,
      expiryDate: '2026-09-30',
    },
    {
      productId: prodToubao.id,
      warehouseId: warehouse.id,
      locationId: locB01.id,
      batchNo: 'CK20240508',
      quantity: 120,
      expiryDate: '2027-01-15',
    },
  ]);
  console.log('✅ 库存数据已创建');

  // ==========================================================
  // 8. 创建采购订单 (本月)
  // ==========================================================
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const purchaseOrders = await purchaseRepo.save([
    {
      orderNo: 'PO202505001',
      supplierId: supSanjiu.id,
      totalAmount: 3750.0,
      status: PurchaseOrderStatus.RECEIVED,
      operatorId: 'seed',
      operatorName: '系统初始化',
      createdAt: new Date(startOfMonth.getTime() + 1 * 24 * 60 * 60 * 1000),
    },
    {
      orderNo: 'PO202505002',
      supplierId: supLianbang.id,
      totalAmount: 2835.0,
      status: PurchaseOrderStatus.RECEIVED,
      operatorId: 'seed',
      operatorName: '系统初始化',
      createdAt: new Date(startOfMonth.getTime() + 5 * 24 * 60 * 60 * 1000),
    },
    {
      orderNo: 'PO202505003',
      supplierId: supSk.id,
      totalAmount: 5625.0,
      status: PurchaseOrderStatus.RECEIVED,
      operatorId: 'seed',
      operatorName: '系统初始化',
      createdAt: new Date(startOfMonth.getTime() + 10 * 24 * 60 * 60 * 1000),
    },
  ]);
  const [po1, po2, po3] = purchaseOrders;

  // 采购明细
  await purchaseItemRepo.save([
    {
      orderId: po1.id,
      productId: prodGanmao.id,
      productName: '感冒灵颗粒',
      quantity: 300,
      price: 10.0,
      amount: 3000,
    },
    {
      orderId: po1.id,
      productId: prodVc.id,
      productName: '维生素C片',
      quantity: 100,
      price: 7.5,
      amount: 750,
    },
    {
      orderId: po2.id,
      productId: prodAmox.id,
      productName: '阿莫西林胶囊',
      quantity: 150,
      price: 15.0,
      amount: 2250,
    },
    {
      orderId: po2.id,
      productId: prodAnchajian.id,
      productName: '氨茶碱片',
      quantity: 100,
      price: 5.85,
      amount: 585,
    },
    {
      orderId: po3.id,
      productId: prodIbu.id,
      productName: '布洛芬缓释胶囊',
      quantity: 250,
      price: 18.0,
      amount: 4500,
    },
    {
      orderId: po3.id,
      productId: prodMengtuo.id,
      productName: '蒙脱石散',
      quantity: 50,
      price: 22.5,
      amount: 1125,
    },
  ]);
  console.log('✅ 采购订单数据已创建');

  // ==========================================================
  // 9. 创建销售订单 (本月)
  // ==========================================================
  const salesOrders = await salesRepo.save([
    {
      orderNo: 'SO202505001',
      customerId: custHosp.id,
      totalAmount: 4520.0,
      status: SalesOrderStatus.APPROVED,
      operatorId: 'seed',
      operatorName: '系统初始化',
      createdAt: new Date(startOfMonth.getTime() + 2 * 24 * 60 * 60 * 1000),
    },
    {
      orderNo: 'SO202505002',
      customerId: custComm.id,
      totalAmount: 1860.0,
      status: SalesOrderStatus.APPROVED,
      operatorId: 'seed',
      operatorName: '系统初始化',
      createdAt: new Date(startOfMonth.getTime() + 4 * 24 * 60 * 60 * 1000),
    },
    {
      orderNo: 'SO202505003',
      customerId: custPharm.id,
      totalAmount: 3250.0,
      status: SalesOrderStatus.APPROVED,
      operatorId: 'seed',
      operatorName: '系统初始化',
      createdAt: new Date(startOfMonth.getTime() + 7 * 24 * 60 * 60 * 1000),
    },
    {
      orderNo: 'SO202505004',
      customerId: custHosp.id,
      totalAmount: 2890.0,
      status: SalesOrderStatus.DELIVERED,
      operatorId: 'seed',
      operatorName: '系统初始化',
      createdAt: new Date(startOfMonth.getTime() + 12 * 24 * 60 * 60 * 1000),
    },
    {
      orderNo: 'SO202505005',
      customerId: custComm.id,
      totalAmount: 1580.0,
      status: SalesOrderStatus.DELIVERED,
      operatorId: 'seed',
      operatorName: '系统初始化',
      createdAt: new Date(startOfMonth.getTime() + 15 * 24 * 60 * 60 * 1000),
    },
  ]);
  const [so1, so2, so3, so4, so5] = salesOrders;

  // 销售明细
  await salesItemRepo.save([
    {
      orderId: so1.id,
      productId: prodGanmao.id,
      productName: '感冒灵颗粒',
      quantity: 200,
      price: 12.5,
      amount: 2500,
    },
    {
      orderId: so1.id,
      productId: prodIbu.id,
      productName: '布洛芬缓释胶囊',
      quantity: 80,
      price: 22.5,
      amount: 1800,
    },
    {
      orderId: so1.id,
      productId: prodVc.id,
      productName: '维生素C片',
      quantity: 30,
      price: 8.5,
      amount: 255,
    },
    {
      orderId: so2.id,
      productId: prodAmox.id,
      productName: '阿莫西林胶囊',
      quantity: 60,
      price: 18.9,
      amount: 1134,
    },
    {
      orderId: so2.id,
      productId: prodMengtuo.id,
      productName: '蒙脱石散',
      quantity: 20,
      price: 28.8,
      amount: 576,
    },
    {
      orderId: so3.id,
      productId: prodBanlan.id,
      productName: '复方板蓝根颗粒',
      quantity: 80,
      price: 15.0,
      amount: 1200,
    },
    {
      orderId: so3.id,
      productId: prodIbu.id,
      productName: '布洛芬缓释胶囊',
      quantity: 50,
      price: 22.5,
      amount: 1125,
    },
    {
      orderId: so3.id,
      productId: prodGanmao.id,
      productName: '感冒灵颗粒',
      quantity: 50,
      price: 12.5,
      amount: 625,
    },
    {
      orderId: so4.id,
      productId: prodToubao.id,
      productName: '头孢克肟分散片',
      quantity: 40,
      price: 35.6,
      amount: 1424,
    },
    {
      orderId: so4.id,
      productId: prodAmox.id,
      productName: '阿莫西林胶囊',
      quantity: 50,
      price: 18.9,
      amount: 945,
    },
    {
      orderId: so4.id,
      productId: prodAnchajian.id,
      productName: '氨茶碱片',
      quantity: 80,
      price: 6.8,
      amount: 544,
    },
    {
      orderId: so5.id,
      productId: prodVc.id,
      productName: '维生素C片',
      quantity: 100,
      price: 8.5,
      amount: 850,
    },
    {
      orderId: so5.id,
      productId: prodGanmao.id,
      productName: '感冒灵颗粒',
      quantity: 50,
      price: 12.5,
      amount: 625,
    },
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
