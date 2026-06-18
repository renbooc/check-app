const { api } = require('../../utils/request')
const { showError, showSuccess } = require('../../utils/util')

const STATUS_MAP = {
  draft: '草稿',
  pending: '待审核',
  approved: '已审核',
  cancelled: '已取消',
}

const EDITABLE_STATUSES = ['draft', 'pending']

Page({
  data: {
    id: null,
    readonly: true,
    editing: false,
    orderNo: '',
    purchaseOrderNo: '',
    supplierName: '',
    supplierInitial: '',
    supplierKeyword: '',
    filteredSuppliers: [],
    showSupplierResults: false,
    selectedSupplier: null,
    supplierId: '',
    _allSuppliers: [],
    warehouses: [],
    warehouseIndex: -1,
    warehouseId: '',
    warehouseName: '',
    inboundDate: '',
    remark: '',
    productKeyword: '',
    productSearchResults: [],
    showProductResults: false,
    _allProducts: [],
    statusCls: 'draft',
    statusText: '草稿',
    items: [],
    totalQuantity: 0,
    totalAmount: '0.00',
    submitting: false,
  },

  async onLoad(options) {
    if (options.id) {
      this.setData({ id: options.id })
      this.loadDependencies()
      await this.loadNote(options.id)
    } else {
      this.setData({ editing: true, readonly: false })
      this.loadDependencies()
    }
  },

  async loadDependencies() {
    try {
      const [suppliers, products, warehouses] = await Promise.all([
        api.get('/suppliers', { page: 1, pageSize: 200 }),
        api.get('/products', { page: 1, pageSize: 500 }),
        api.get('/warehouses', { page: 1, pageSize: 200 }),
      ])
      this.setData({
        _allSuppliers: Array.isArray(suppliers) ? suppliers : (suppliers.list || []),
        _allProducts: Array.isArray(products) ? products : (products.list || []),
        warehouses: Array.isArray(warehouses) ? warehouses : (warehouses.list || []),
      })
    } catch (err) {
      console.error('[InboundForm] loadDependencies error:', err)
    }
  },

  async loadNote(id) {
    try {
      const note = await api.get('/inbound/' + id)
      if (!note) { showError('采购入库单不存在'); return }

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
        purchaseOrderNo: note.purchaseOrderNo || '',
        supplierId: note.supplierId || '',
        supplierName: note.supplierName || '',
        supplierInitial: (note.supplierName && note.supplierName.charAt(0)) || '?',
        warehouseId: note.warehouseId || '',
        warehouseName: note.warehouseName || '',
        inboundDate: note.inboundDate || '',
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

  // ============================================================
  //  头部字段
  // ============================================================
  onDateChange(e) {
    this.setData({ inboundDate: e.detail.value })
  },

  onRemarkInput(e) {
    this.setData({ remark: e.detail.value })
  },

  // ============================================================
  //  供应商搜索
  // ============================================================
  onSupplierInput(e) {
    const keyword = e.detail.value
    const all = this.data._allSuppliers || []
    const filtered = keyword ? all.filter(s => s.name.includes(keyword) || (s.contactPerson && s.contactPerson.includes(keyword))) : []
    this.setData({
      supplierKeyword: keyword,
      filteredSuppliers: filtered,
      showSupplierResults: keyword.length > 0,
    })
  },

  onSupplierFocus() {
    if (this.data.supplierKeyword.length > 0) {
      this.onSupplierInput({ detail: { value: this.data.supplierKeyword } })
    }
  },

  onSupplierBlur() {
    // 离开时不隐藏搜索结果，允许点击选择
  },

  onSupplierSelect(e) {
    const index = e.currentTarget.dataset.index
    const s = this.data.filteredSuppliers[index]
    this.setData({
      selectedSupplier: s,
      supplierId: s.id,
      supplierName: s.name,
      supplierInitial: s.name.charAt(0),
      supplierKeyword: s.name,
      showSupplierResults: false,
      filteredSuppliers: [],
    })
  },

  onWarehouseChange(e) {
    const idx = parseInt(e.detail.value)
    const wh = this.data.warehouses[idx]
    if (wh) {
      this.setData({ warehouseIndex: idx, warehouseName: wh.name })
    }
  },

  // ============================================================
  //  商品搜索
  // ============================================================
  onProductSearchInput(e) {
    const keyword = e.detail.value
    this.setData({ productKeyword: keyword })
    if (keyword.length > 0 && this.data._allProducts.length > 0) {
      const filtered = this.data._allProducts.filter(p =>
        p.name.includes(keyword) || (p.spec && p.spec.includes(keyword))
      )
      this.setData({ productSearchResults: filtered, showProductResults: true })
    } else {
      this.setData({ productSearchResults: [], showProductResults: false })
    }
  },

  onProductSearchFocus() {
    if (this.data.productKeyword.length > 0) {
      this.onProductSearchInput({ detail: { value: this.data.productKeyword } })
    }
  },

  onProductSearchBlur() {
    // 离开时不隐藏搜索结果，允许点击选择
  },

  onProductSearchSelect(e) {
    const pid = e.currentTarget.dataset.pid
    const product = this.data._allProducts.find(p => p.id === pid)
    if (!product) return
    if (this.data.items.some(item => item.productId === product.id)) {
      wx.showToast({ title: '商品已存在', icon: 'none' })
      return
    }
    const items = [...this.data.items, {
      productId: product.id,
      productName: product.name,
      productSpec: product.spec || '',
      productUnit: product.unit ? product.unit.name : '',
      productManufacturer: product.manufacturer || '',
      quantity: '',
      price: '',
      amount: '0.00',
      batchNo: '',
      productionDate: '',
      expiryDate: '',
      locationCode: '',
    }]
    this.setData({
      items,
      productKeyword: '',
      productSearchResults: [],
      showProductResults: false,
    })
    this.calcTotal()
  },

  // ============================================================
  //  商品编辑
  // ============================================================
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

  onRemoveItem(e) {
    const index = e.currentTarget.dataset.index
    const items = [...this.data.items]
    items.splice(index, 1)
    this.setData({ items })
    this.calcTotal()
  },

  // ============================================================
  //  计算
  // ============================================================
  calcTotal() {
    const items = this.data.items
    let totalQuantity = 0
    let totalAmount = 0
    items.forEach(item => {
      totalQuantity += parseFloat(item.quantity) || 0
      totalAmount += parseFloat(item.amount) || 0
    })
    this.setData({
      totalQuantity,
      totalAmount: totalAmount.toFixed(2),
    })
  },

  // ============================================================
  //  校验 & 保存
  // ============================================================
  validate() {
    const items = this.data.items
    if (items.length === 0) {
      wx.showToast({ title: '请添加入库商品', icon: 'none' })
      return false
    }
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (!item.quantity || parseFloat(item.quantity) <= 0) {
        wx.showToast({ title: `第${i + 1}项数量无效`, icon: 'none' })
        return false
      }
      if (!item.price || parseFloat(item.price) <= 0) {
        wx.showToast({ title: `第${i + 1}项单价无效`, icon: 'none' })
        return false
      }
      if (!item.batchNo) {
        wx.showToast({ title: `第${i + 1}项批号不能为空`, icon: 'none' })
        return false
      }
      if (!item.productionDate) {
        wx.showToast({ title: `第${i + 1}项生产日期不能为空`, icon: 'none' })
        return false
      }
      if (!item.expiryDate) {
        wx.showToast({ title: `第${i + 1}项有效期不能为空`, icon: 'none' })
        return false
      }
    }
    return true
  },

  buildSubmitData() {
    return {
      supplierId: this.data.supplierId || null,
      supplierName: this.data.supplierName || '',
      warehouseId: this.data.warehouseId || null,
      warehouseName: this.data.warehouseName || '',
      remark: this.data.remark,
      inboundDate: this.data.inboundDate || null,
      items: this.data.items.map(item => ({
        productId: item.productId,
        productName: item.productName,
        productSpec: item.productSpec || '',
        productUnit: item.productUnit || '',
        productManufacturer: item.productManufacturer || '',
        quantity: parseFloat(item.quantity),
        price: parseFloat(item.price),
        batchNo: item.batchNo || '',
        productionDate: item.productionDate || '',
        expiryDate: item.expiryDate || '',
        locationCode: item.locationCode || '',
      })),
    }
  },

  onToggleEdit() {
    this.setData({ editing: !this.data.editing })
  },

  async onSave() {
    if (this.data.submitting) return
    if (!this.validate()) return
    this.setData({ submitting: true })
    try {
      const data = this.buildSubmitData()
      if (this.data.id) {
        await api.put('/inbound/' + this.data.id, data)
      } else {
        const result = await api.post('/inbound', data)
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

  validateRequired() {
    const items = this.data.items
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (!item.batchNo) {
        wx.showToast({ title: `第${i + 1}项批号未录入，请点击编辑后填写`, icon: 'none', duration: 2000 })
        return false
      }
      if (!item.productionDate) {
        wx.showToast({ title: `第${i + 1}项生产日期未录入，请点击编辑后填写`, icon: 'none', duration: 2000 })
        return false
      }
      if (!item.expiryDate) {
        wx.showToast({ title: `第${i + 1}项有效期未录入，请点击编辑后填写`, icon: 'none', duration: 2000 })
        return false
      }
    }
    return true
  },

  async onApprove() {
    if (this.data.submitting) return
    if (!this.validateRequired()) return
    this.setData({ submitting: true })
    try {
      // 草稿→待审核→已审核（后端守卫不允许跳步）
      if (this.data.statusCls === 'draft') {
        await api.put('/inbound/' + this.data.id + '/status', { status: 'pending' })
      }
      await api.put('/inbound/' + this.data.id + '/status', { status: 'approved' })
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
