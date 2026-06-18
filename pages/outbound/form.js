const { api } = require('../../utils/request')
const { showError, showSuccess } = require('../../utils/util')

const STATUS_MAP = {
  pending: '待审核',
  approved: '已审核',
  cancelled: '已取消',
}

const EDITABLE_STATUSES = ['pending']

Page({
  data: {
    id: null,
    readonly: true,
    editing: false,
    orderNo: '',
    salesOrderNo: '',
    customerName: '',
    customerInitial: '',
    warehouseName: '',
    outboundDate: '',
    remark: '',
    statusCls: 'pending',
    statusText: '待审核',
    items: [],
    totalQuantity: 0,
    totalAmount: '0.00',
    submitting: false,
    fromSalesOrder: false, // 是否由销售订单生成（系统分配批次，不可编辑）
    // 客户搜索
    customerKeyword: '',
    filteredCustomers: [],
    showCustomerResults: false,
    selectedCustomer: null,
    _allCustomers: [],
    // 仓库
    warehouses: [],
    warehouseNames: [],
    warehouseIndex: -1,
    // 商品搜索
    productKeyword: '',
    productSearchResults: [],
    showProductResults: false,
    _allProducts: [],
    // 批次选择
    showBatchPicker: false,
    batchProduct: null,
    batchOptions: [],
  },

  async onLoad(options) {
    if (options.id) {
      this.setData({ id: options.id })
      await this.loadNote(options.id)
    } else {
      this.setData({ editing: true, readonly: false })
      this.loadDependencies()
    }
  },

  async loadDependencies() {
    try {
      const [customers, products, warehouses] = await Promise.all([
        api.get('/customers', { page: 1, pageSize: 200 }),
        api.get('/products', { page: 1, pageSize: 500 }),
        api.get('/warehouses', { page: 1, pageSize: 200 }),
      ])
      const productList = (Array.isArray(products) ? products : (products.list || [])).map(p => ({
        ...p,
        _unit: (p.unit && p.unit.name) || p._unit || '',
      }))
      this.setData({
        _allCustomers: Array.isArray(customers) ? customers : (customers.list || []),
        _allProducts: productList,
        warehouses: Array.isArray(warehouses) ? warehouses : (warehouses.list || []),
        warehouseNames: (Array.isArray(warehouses) ? warehouses : (warehouses.list || [])).map(w => w.name),
      })
    } catch (err) {
      console.error('[OutboundForm] loadDependencies error:', err)
    }
  },

  async loadNote(id) {
    try {
      const note = await api.get('/outbound/' + id)
      if (!note) { showError('出库单不存在'); return }

      const items = (note.items || []).map(item => ({
        productId: item.productId,
        productName: item.productName,
        productSpec: item.productSpec,
        productUnit: item.productUnit,
        productManufacturer: item.productManufacturer || '',
        quantity: item.quantity,
        price: item.price,
        amount: item.amount,
        batchNo: item.batchNo || '',
        productionDate: item.productionDate || '',
        expiryDate: item.expiryDate || '',
        locationCode: item.locationCode || '',
      }))

      const status = note.status || 'pending'
      const readonly = !EDITABLE_STATUSES.includes(status)

      this.setData({
        orderNo: note.orderNo || '',
        salesOrderNo: note.salesOrderNo || '',
        fromSalesOrder: !!note.salesOrderId,
        customerName: note.customerName || '',
        customerInitial: (note.customerName && note.customerName.charAt(0)) || '?',
        warehouseName: note.warehouseName || '',
        outboundDate: note.outboundDate || '',
        remark: note.remark || '',
        items,
        totalQuantity: note.totalQuantity || 0,
        totalAmount: (parseFloat(note.totalAmount) || 0).toFixed(2),
        readonly,
        editing: false,
        statusCls: status,
        statusText: STATUS_MAP[status] || status,
      })
    } catch (err) {
      showError(err.message)
    }
  },

  onDateChange(e) {
    this.setData({ outboundDate: e.detail.value })
  },

  onRemarkInput(e) {
    this.setData({ remark: e.detail.value })
  },

  // ===== 客户搜索 =====
  onCustomerInput(e) {
    const keyword = e.detail.value
    const all = this.data._allCustomers || []
    const filtered = keyword ? all.filter(c => c.name.includes(keyword)) : []
    this.setData({
      customerKeyword: keyword,
      filteredCustomers: filtered,
      showCustomerResults: keyword.length > 0,
    })
  },

  onCustomerFocus() {
    if (this.data.customerKeyword.length > 0) {
      this.onCustomerInput({ detail: { value: this.data.customerKeyword } })
    }
  },

  onCustomerBlur() {
    // 离开输入框时不隐藏搜索结果，允许用户滑动页面查看并选择
  },

  onCustomerSelect(e) {
    const index = e.currentTarget.dataset.index
    const customer = this.data.filteredCustomers[index]
    this.setData({
      selectedCustomer: customer,
      customerName: customer.name,
      customerInitial: customer.name.charAt(0),
      customerKeyword: customer.name,
      showCustomerResults: false,
      filteredCustomers: [],
    })
  },

  onClearCustomer() {
    this.setData({
      selectedCustomer: null,
      customerName: '',
      customerInitial: '',
      customerKeyword: '',
    })
  },

  // ===== 仓库选择 =====
  onWarehouseChange(e) {
    const idx = parseInt(e.detail.value)
    const wh = this.data.warehouses[idx]
    if (wh) {
      this.setData({ warehouseIndex: idx, warehouseName: wh.name })
    }
  },

  // ===== 商品搜索 =====
  onProductSearchInput(e) {
    const keyword = e.detail.value
    const all = this.data._allProducts || []
    const filtered = keyword ? all.filter(p => p.name.includes(keyword) || (p.code && p.code.includes(keyword))) : []
    this.setData({
      productKeyword: keyword,
      productSearchResults: filtered,
      showProductResults: keyword.length > 0,
    })
  },

  onProductSearchFocus() {
    if (this.data.productKeyword.length > 0) {
      this.onProductSearchInput({ detail: { value: this.data.productKeyword } })
    }
  },

  onProductSearchBlur() {
    // 离开输入框时不隐藏搜索结果，允许用户滑动页面查看并选择
  },

  onProductSearchSelect(e) {
    const pid = e.currentTarget.dataset.pid
    const product = this.data._allProducts.find(p => p.id === pid)
    if (!product) return
    if (this.data.items.some(item => item.productId === product.id)) {
      wx.showToast({ title: '商品已存在', icon: 'none' })
      return
    }
    this.setData({
      productKeyword: '',
      productSearchResults: [],
      showProductResults: false,
    })
    // 获取可用批次
    this.loadBatchesForProduct(product)
  },

  async loadBatchesForProduct(product) {
    try {
      const whName = this.data.warehouseName
      if (!whName) {
        wx.showToast({ title: '请先选择仓库', icon: 'none' })
        return
      }
      const whId = this.data.warehouses.find(w => w.name === whName)?.id
      if (!whId) return

      const res = await api.get('/inventory/product/' + product.id)
      const batches = (res && res.batches) || []
      if (batches.length === 0) {
        wx.showToast({ title: '该商品在所选仓库无可用批次', icon: 'none' })
        return
      }

      const unitName = product._unit || (product.unit && product.unit.name) || ''
      this.setData({
        batchProduct: product,
        batchOptions: batches
          .filter(b => String(b.warehouseId) === whId && b.quantity > 0)
          .map(b => ({ ...b, _unit: unitName })),
        showBatchPicker: true,
      })
    } catch (err) {
      console.error('[OutboundForm] loadBatches error:', err)
      wx.showToast({ title: '获取批次失败', icon: 'none' })
    }
  },

  async onBatchOptionTap(e) {
    const idx = e.currentTarget.dataset.index
    const batch = this.data.batchOptions[idx]
    const product = this.data.batchProduct
    if (!batch || !product) return

    // 查询当前客户该商品的上次出库单价
    const customerId = this.data.selectedCustomer?.id
    let lastPrice = 0
    if (customerId) {
      try {
        const res = await api.get('/outbound/last-price', { customerId, productId: product.id })
        lastPrice = res ?? 0
      } catch (_) {}
    }

    const items = [...this.data.items, {
      productId: product.id,
      productName: product.name,
      productSpec: product.spec || '',
      productUnit: product._unit || (product.unit && product.unit.name) || batch._unit || '',
      productManufacturer: product.manufacturer || '',
      quantity: 1,
      price: lastPrice,
      amount: '0.00',
      batchNo: batch.batchNo || '',
      productionDate: batch.productionDate || '',
      expiryDate: batch.expiryDate || '',
      locationCode: batch.locationCode || '',
    }]
    this.setData({
      items,
      batchProduct: null,
      batchOptions: [],
      showBatchPicker: false,
    })
    this.calcTotal()
  },

  onCloseBatchPicker() {
    this.setData({ showBatchPicker: false, batchProduct: null, batchOptions: [] })
  },

  onToggleEdit() {
    this.setData({ editing: !this.data.editing })
  },

  onItemQuantityInput(e) {
    const index = e.currentTarget.dataset.index
    const raw = e.detail.value
    const items = [...this.data.items]
    items[index].quantity = raw
    items[index].amount = ((parseFloat(raw) || 0) * parseFloat(items[index].price || 0)).toFixed(2)
    this.setData({ items })
    this.calcTotal()
  },

  onItemPriceInput(e) {
    const index = e.currentTarget.dataset.index
    const raw = e.detail.value
    const items = [...this.data.items]
    items[index].price = raw
    items[index].amount = ((parseFloat(raw) || 0) * (parseFloat(items[index].quantity) || 0)).toFixed(2)
    this.setData({ items })
    this.calcTotal()
  },

  onQtyDecrease(e) {
    const index = e.currentTarget.dataset.index
    const items = [...this.data.items]
    let qty = parseFloat(items[index].quantity) || 0
    qty = qty > 1 ? qty - 1 : 0
    items[index].quantity = qty
    items[index].amount = (qty * parseFloat(items[index].price || 0)).toFixed(2)
    this.setData({ items })
    this.calcTotal()
  },

  onQtyIncrease(e) {
    const index = e.currentTarget.dataset.index
    const items = [...this.data.items]
    let qty = parseFloat(items[index].quantity) || 0
    qty = qty + 1
    items[index].quantity = qty
    items[index].amount = (qty * parseFloat(items[index].price || 0)).toFixed(2)
    this.setData({ items })
    this.calcTotal()
  },

  onRemoveItem(e) {
    const index = e.currentTarget.dataset.index
    const items = [...this.data.items]
    items.splice(index, 1)
    this.setData({ items })
    this.calcTotal()
  },

  calcTotal() {
    const items = this.data.items
    let totalQuantity = 0
    let totalAmount = 0
    items.forEach(item => {
      totalQuantity += parseFloat(item.quantity) || 0
      totalAmount += parseFloat(item.amount) || 0
    })
    this.setData({ totalQuantity, totalAmount: totalAmount.toFixed(2) })
  },

  onBatchNoInput(e) {
    const index = e.currentTarget.dataset.index
    const items = [...this.data.items]
    items[index].batchNo = e.detail.value
    this.setData({ items })
  },

  onProductionDateChange(e) {
    const index = e.currentTarget.dataset.index
    const items = [...this.data.items]
    items[index].productionDate = e.detail.value
    this.setData({ items })
  },

  onExpiryDateChange(e) {
    const index = e.currentTarget.dataset.index
    const items = [...this.data.items]
    items[index].expiryDate = e.detail.value
    this.setData({ items })
  },

  onLocationCodeInput(e) {
    const index = e.currentTarget.dataset.index
    const items = [...this.data.items]
    items[index].locationCode = e.detail.value
    this.setData({ items })
  },

  async onSave() {
    if (this.data.submitting) return
    this.setData({ submitting: true })
    try {
      const items = this.data.items.map(item => ({
        productId: item.productId,
        productName: item.productName,
        productSpec: item.productSpec || '',
        productUnit: item.productUnit || '',
        productManufacturer: item.productManufacturer || '',
        quantity: parseFloat(item.quantity) || 0,
        price: parseFloat(item.price) || 0,
        batchNo: item.batchNo || '',
        productionDate: item.productionDate || '',
        expiryDate: item.expiryDate || '',
        locationCode: item.locationCode || '',
      }))
      if (this.data.id) {
        await api.put('/outbound/' + this.data.id, { remark: this.data.remark, outboundDate: this.data.outboundDate || null, items })
      } else {
        const result = await api.post('/outbound', { items, remark: this.data.remark, outboundDate: this.data.outboundDate || null })
        this.setData({ id: result.id })
      }
      showSuccess('保存成功')
      this.setData({ submitting: false, editing: false })
      await this.loadNote(this.data.id)
    } catch (err) {
      showError(err.message)
      this.setData({ submitting: false })
    }
  },

  async onSubmit() {
    if (this.data.submitting) return
    if (!this.data.selectedCustomer && !this.data.customerName) {
      wx.showToast({ title: '请选择客户', icon: 'none' })
      return
    }
    if (this.data.items.length === 0) {
      wx.showToast({ title: '请添加出库商品', icon: 'none' })
      return
    }
    this.setData({ submitting: true })
    try {
      const items = this.data.items.map(item => ({
        productId: item.productId, productName: item.productName, productSpec: item.productSpec || '',
        productUnit: item.productUnit || '', productManufacturer: item.productManufacturer || '',
        quantity: parseFloat(item.quantity) || 0, price: parseFloat(item.price) || 0,
        batchNo: item.batchNo || '', productionDate: item.productionDate || '',
        expiryDate: item.expiryDate || '', locationCode: item.locationCode || '',
      }))
      const payload = { items, remark: this.data.remark, outboundDate: this.data.outboundDate || null }
      let id = this.data.id
      if (id) {
        await api.put('/outbound/' + id, payload)
      } else {
        const result = await api.post('/outbound', payload)
        id = result.id
      }
      await api.put('/outbound/' + id + '/status', { status: 'approved' })
      showSuccess('提交成功')
      this.setData({ id, submitting: false, editing: false })
      await this.loadNote(id)
    } catch (err) {
      showError(err.message)
      this.setData({ submitting: false })
    }
  },

  async onApprove() {
    if (this.data.submitting) return
    this.setData({ submitting: true })
    try {
      await api.put('/outbound/' + this.data.id + '/status', { status: 'approved' })
      showSuccess('审核通过')
      this.setData({ submitting: false })
      await this.loadNote(this.data.id)
    } catch (err) {
      showError(err.message)
      this.setData({ submitting: false })
    }
  },

  onBack() {
    wx.navigateBack()
  },
})
