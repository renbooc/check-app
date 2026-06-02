/**
 * Mock 数据 - 开发阶段使用
 * 模拟后端接口返回，保持与真实API相同的数据结构
 */
const { generateId } = require('../utils/util')

// ===== 基础数据 =====

const users = {
  admin: {
    id: 'user_001',
    name: '张三',
    role: '药房管理员',
    phone: '138****8888',
    avatar: '/images/avatar.png',
    storeId: 'store_001',
    storeName: '中心药房'
  }
}

const products = [
  {
    id: 'med_001',
    name: '感冒灵颗粒',
    code: '6901339800011',
    approvalNo: '国药准字Z20055711',
    spec: '10g*9袋',
    unit: '盒',
    manufacturer: '华润三九医药',
    stockCount: 120,
    location: 'A01-01-01',
    batchNo: '20240101',
    expiryDate: '2026-12-31',
    price: 12.5,
    image: '/images/product-sample.png'
  },
  {
    id: 'med_002',
    name: '阿莫西林胶囊',
    code: '6922266445021',
    approvalNo: '国药准字H44021351',
    spec: '0.5g*24粒',
    unit: '盒',
    manufacturer: '珠海联邦制药',
    stockCount: 85,
    location: 'A01-02-01',
    batchNo: '20240215',
    expiryDate: '2026-08-15',
    price: 8.9,
    image: '/images/product-sample.png'
  },
  {
    id: 'med_003',
    name: '布洛芬缓释胶囊',
    code: '6923287100013',
    approvalNo: '国药准字H20013062',
    spec: '0.3g*20粒',
    unit: '盒',
    manufacturer: '中美天津史克',
    stockCount: 200,
    location: 'A02-01-01',
    batchNo: '20240310',
    expiryDate: '2027-03-10',
    price: 18.6,
    image: '/images/product-sample.png'
  },
  {
    id: 'med_004',
    name: '复方板蓝根颗粒',
    code: '6903281004015',
    approvalNo: '国药准字Z44020849',
    spec: '15g*20袋',
    unit: '盒',
    manufacturer: '白云山制药',
    stockCount: 56,
    location: 'A02-02-01',
    batchNo: '20240420',
    expiryDate: '2026-10-20',
    price: 15.0,
    image: '/images/product-sample.png'
  },
  {
    id: 'med_005',
    name: '蒙脱石散',
    code: '6922045620017',
    approvalNo: '国药准字H20000690',
    spec: '3g*10袋',
    unit: '盒',
    manufacturer: '博福-益普生',
    stockCount: 45,
    location: 'B01-01-01',
    batchNo: '20240505',
    expiryDate: '2027-05-05',
    price: 25.8,
    image: '/images/product-sample.png'
  }
]

const suppliers = [
  {
    id: 'sup_001',
    name: '华润三九医药股份有限公司',
    contactPerson: '王经理',
    phone: '13800001111',
    address: '广东省深圳市龙华区',
    remark: '主要供应感冒类药品'
  },
  {
    id: 'sup_002',
    name: '珠海联邦制药股份有限公司',
    contactPerson: '李主任',
    phone: '13800002222',
    address: '广东省珠海市金湾区',
    remark: '抗生素类供应商'
  },
  {
    id: 'sup_003',
    name: '中美天津史克制药有限公司',
    contactPerson: '赵总',
    phone: '13800003333',
    address: '天津市西青区',
    remark: '解热镇痛类药品'
  },
  {
    id: 'sup_004',
    name: '广州白云山制药集团',
    contactPerson: '陈经理',
    phone: '13800004444',
    address: '广东省广州市白云区',
    remark: '中成药供应商'
  },
  {
    id: 'sup_005',
    name: '博福-益普生制药有限公司',
    contactPerson: '刘专员',
    phone: '13800005555',
    address: '天津市滨海新区',
    remark: '消化系统药品'
  },
  {
    id: 'sup_006',
    name: '云南白药集团股份有限公司',
    contactPerson: '周经理',
    phone: '13800006666',
    address: '云南省昆明市呈贡区',
    remark: '中药及保健品'
  }
]

// 盘点记录（可动态增长）
let checkRecords = [
  {
    id: 'rec_001',
    date: '2024-05-20',
    title: '全库盘点',
    status: 'done',
    statusText: '已完成',
    time: '2024-05-20 14:30',
    operator: '张三',
    types: 860,
    totalCount: 4200,
    diffCount: 12
  },
  {
    id: 'rec_002',
    date: '2024-05-18',
    title: 'A区盘点',
    status: 'done',
    statusText: '已完成',
    time: '2024-05-18 09:15',
    operator: '张三',
    types: 320,
    totalCount: 1580,
    diffCount: 5
  },
  {
    id: 'rec_003',
    date: '2024-05-15',
    title: '效期药品盘点',
    status: 'done',
    statusText: '已完成',
    time: '2024-05-15 16:00',
    operator: '李四',
    types: 128,
    totalCount: 640,
    diffCount: 3
  }
]

// 盘点明细（每条扫码记录）
let checkItems = []

// ===== 接口处理 =====

function handle(url, method, data) {
  console.log('[Mock]', method, url, data)

  // 登录
  if (url === '/auth/login' && method === 'POST') {
    return success({
      accessToken: 'mock_token_' + Date.now(),
      user: users.admin
    })
  }

  // 获取用户信息
  if (url === '/user/info' && method === 'GET') {
    return success(users.admin)
  }

  // 获取用户统计
  if (url === '/user/stats' && method === 'GET') {
    return success({
      taskCount: 12,
      accuracy: '86%',
      totalCount: 28
    })
  }

  // 获取首页概览数据
  if (url === '/inventory/overview' && method === 'GET') {
    return success({
      pendingTypes: 128,
      pendingCount: 2350,
      checkedTypes: 86,
      checkedCount: 1260
    })
  }

  // 获取盘点记录列表
  if (url === '/check/records' && method === 'GET') {
    const page = (data && data.page) || 1
    const pageSize = (data && data.pageSize) || 10
    const start = (page - 1) * pageSize
    const list = checkRecords.slice(start, start + pageSize)
    return success({
      list,
      total: checkRecords.length,
      page,
      pageSize
    })
  }

  // 获取商品列表/搜索
  if (url === '/products/search' && method === 'GET') {
    const keyword = (data && data.keyword) || ''
    let result = products
    if (keyword) {
      const kw = keyword.toLowerCase()
      result = products.filter(p =>
        p.name.toLowerCase().includes(kw) ||
        p.code.includes(kw) ||
        p.approvalNo.toLowerCase().includes(kw)
      )
    }
    return success({ list: result, total: result.length })
  }

  // 根据条码获取商品
  if (url === '/products/barcode' && method === 'GET') {
    const code = data && data.code
    const product = products.find(p => p.code === code)
    if (product) {
      return success(product)
    }
    return fail('未找到该商品')
  }

  // 获取供应商列表
  if (url === '/suppliers' && method === 'GET') {
    const keyword = (data && data.keyword) || ''
    let result = suppliers
    if (keyword) {
      const kw = keyword.toLowerCase()
      result = suppliers.filter(s =>
        s.name.toLowerCase().includes(kw) ||
        (s.contactPerson && s.contactPerson.includes(kw))
      )
    }
    const page = (data && data.page) || 1
    const pageSize = (data && data.pageSize) || 20
    return success({ list: result, total: result.length, page, pageSize })
  }

  // 获取商品列表（含分页）
  if (url === '/products' && method === 'GET') {
    const keyword = (data && data.keyword) || ''
    let result = products
    if (keyword) {
      const kw = keyword.toLowerCase()
      result = products.filter(p =>
        p.name.toLowerCase().includes(kw) ||
        p.code.includes(kw)
      )
    }
    return success({
      list: result.map(p => ({
        id: p.id,
        name: p.name,
        code: p.code,
        spec: p.spec,
        unit: { id: 'u1', name: p.unit },
        manufacturer: p.manufacturer,
        price: p.price
      })),
      total: result.length
    })
  }

  // 获取库存列表
  if (url === '/stock/list' && method === 'GET') {
    const keyword = (data && data.keyword) || ''
    let result = products
    if (keyword) {
      const kw = keyword.toLowerCase()
      result = products.filter(p =>
        p.name.toLowerCase().includes(kw) ||
        p.code.includes(kw)
      )
    }
    return success({
      list: result.map(p => ({
        id: p.id,
        name: p.name,
        code: p.code,
        spec: p.spec,
        unit: p.unit,
        stockCount: p.stockCount,
        location: p.location,
        expiryDate: p.expiryDate
      })),
      total: result.length
    })
  }

  // 保存盘点记录
  if (url === '/check/save' && method === 'POST') {
    const item = {
      id: generateId(),
      productId: data.productId,
      productName: data.productName,
      checkCount: data.checkCount,
      stockCount: data.stockCount,
      diff: data.checkCount - data.stockCount,
      location: data.location,
      batchNo: data.batchNo,
      remark: data.remark,
      createTime: new Date().toISOString(),
      operator: users.admin.name
    }
    checkItems.unshift(item)
    return success(item)
  }

  // 获取库位列表
  if (url === '/locations' && method === 'GET') {
    return success([
      { id: 'loc-1', code: 'A01-01-01', name: 'A区1层1列' },
      { id: 'loc-2', code: 'A01-01-02', name: 'A区1层2列' },
      { id: 'loc-3', code: 'A01-02-01', name: 'A区2层1列' },
      { id: 'loc-4', code: 'A01-02-02', name: 'A区2层2列' },
      { id: 'loc-5', code: 'A02-01-01', name: 'B区1层1列' },
      { id: 'loc-6', code: 'A02-01-02', name: 'B区1层2列' },
      { id: 'loc-7', code: 'A02-02-01', name: 'B区2层1列' },
      { id: 'loc-8', code: 'B01-01-01', name: 'C区1层1列' },
      { id: 'loc-9', code: 'B01-01-02', name: 'C区1层2列' },
      { id: 'loc-10', code: 'B01-02-01', name: 'C区2层1列' }
    ])
  }

  // 报表概览
  if (url === '/report/overview' && method === 'GET') {
    return success({
      todaySales: 12680.50,
      todaySalesCount: 38,
      todayPurchase: 7420.00,
      todayPurchaseCount: 15,
      turnoverRate: '1.8'
    })
  }

  // 销售排行 TOP5
  if (url === '/report/top-products' && method === 'GET') {
    return success({
      list: [
        { productId: '1', productName: '阿莫西林胶囊', productCode: '6901234567890', totalQuantity: 120, totalAmount: '3600.00' },
        { productId: '2', productName: '布洛芬缓释胶囊', productCode: '6909876543210', totalQuantity: 85, totalAmount: '2550.00' },
        { productId: '3', productName: '复方甘草片', productCode: '6905551234567', totalQuantity: 65, totalAmount: '1300.00' },
        { productId: '4', productName: '维生素C片', productCode: '6904321098765', totalQuantity: 48, totalAmount: '960.00' },
        { productId: '5', productName: '藿香正气水', productCode: '6907654321098', totalQuantity: 32, totalAmount: '640.00' }
      ]
    })
  }

  // 低库存预警
  if (url === '/report/low-stock' && method === 'GET') {
    return success({
      list: [
        { productId: '3', productName: '复方甘草片', productCode: '6905551234567', quantity: 15, minQuantity: 50 },
        { productId: '5', productName: '藿香正气水', productCode: '6907654321098', quantity: 8, minQuantity: 30 }
      ]
    })
  }

  // 默认
  return fail('接口不存在: ' + url)
}

function success(data) {
  return { success: true, data }
}

function fail(message) {
  return { success: false, message }
}

module.exports = { handle }
