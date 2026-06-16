const { api } = require('../../utils/request')
const { showError, showSuccess } = require('../../utils/util')

const STATUS_MAP = {
  draft: '草稿',
  pending: '待审核',
  approved: '已审核',
  delivered: '已出库',
  cancelled: '已取消',
}

const EDITABLE_STATUSES = ['draft']

Page({
  data: {
    id: null,
    readonly: false,
    orderNo: '',

    // Customer search
    customerKeyword: '',
    filteredCustomers: [],
    showCustomerResults: false,
    selectedCustomer: null,
    customerInitial: '',
    customerName: '',
    _allCustomers: [],

    // Warehouse
    warehouses: [],
    warehouseIndex: -1,
    warehouseName: '',
    selectedWarehouse: null,

    // Order info
    expectedDate: '',
    remark: '',
    statusCls: 'draft',
    statusText: '草稿',

    // Products list
    products: [],
    productKeyword: '',
    productSearchResults: [],
    showProductResults: false,

    // Items
    items: [],

    // Summary
    totalQuantity: 0,
    totalAmount: '0.00',

    // State
    submitting: false,
  },

  // ============================================================
  //  Lifecycle
  // ============================================================
  async onLoad(options) {
    await Promise.all([this.loadCustomers(), this.loadProducts(), this.loadWarehouses()])
    if (options.id) {
      this.setData({ id: options.id })
      await this.loadOrder(options.id)
    } else {
      // 新增订单，默认选中第一个仓库
      this.defaultWarehouse()
    }
  },

  async loadCustomers() {
    try {
      const res = await api.get('/customers', { page: 1, pageSize: 200 })
      this.data._allCustomers = res.list || []
    } catch (err) {
      console.error('[SalesForm] loadCustomers error:', err)
    }
  },

  async loadProducts() {
    try {
      const res = await api.get('/products', { page: 1, pageSize: 500 })
      this.setData({ products: res.list || [] })
    } catch (err) {
      console.error('[SalesForm] loadProducts error:', err)
    }
  },

  async loadWarehouses() {
    try {
      const res = await api.get('/warehouses', { page: 1, pageSize: 200 })
      this.setData({ warehouses: Array.isArray(res) ? res : (res.list || []) })
    } catch (err) {
      console.error('[SalesForm] loadWarehouses error:', err)
    }
  },

  defaultWarehouse() {
    const warehouses = this.data.warehouses || []
    if (warehouses.length > 0) {
      this.setData({
        warehouseIndex: 0,
        warehouseName: warehouses[0].name,
        selectedWarehouse: warehouses[0],
      })
    }
  },

  async loadOrder(id) {
    try {
      const order = await api.get(`/sales/${id}`)
      if (!order) { showError('订单不存在'); return }

      const allCustomers = this.data._allCustomers || []
      const customer = allCustomers.find(c => c.id === order.customerId)
      const status = order.status || 'draft'
      const readonly = !EDITABLE_STATUSES.includes(status)

      // Match warehouse from loaded list
      const warehouses = this.data.warehouses || []
      let warehouseIdx = -1
      let selWarehouse = null
      if (order.warehouseId) {
        warehouseIdx = warehouses.findIndex(w => w.id === order.warehouseId)
        if (warehouseIdx >= 0) {
          selWarehouse = warehouses[warehouseIdx]
        } else {
          selWarehouse = { id: order.warehouseId, name: order.warehouseName || '' }
        }
      }

      const items = (order.items || []).map(item => ({
        productId: item.productId,
        productName: item.productName,
        productSpec: item.productSpec,
        productUnit: item.productUnit,
        productManufacturer: item.productManufacturer || item.manufacturer || '',
        quantity: item.quantity,
        price: item.price,
        amount: item.amount,
      }))

      this.setData({
        orderNo: order.orderNo || '',
        selectedCustomer: customer || null,
        customerInitial: customer ? customer.name.charAt(0) : '',
        customerName: customer ? customer.name : '',
        customerKeyword: customer ? customer.name : '',
        warehouseIndex: warehouseIdx,
        warehouseName: selWarehouse ? selWarehouse.name : (order.warehouseName || ''),
        selectedWarehouse: selWarehouse,
        remark: order.remark || '',
        expectedDate: order.expectedDate || '',
        items,
        totalQuantity: order.totalQuantity || 0,
        totalAmount: (parseFloat(order.totalAmount) || 0).toFixed(2),
        readonly,
        statusCls: status,
        statusText: STATUS_MAP[status] || status,
      })
    } catch (err) {
      showError(err.message)
    }
  },

  // ============================================================
  //  Customer search
  // ============================================================
  onCustomerInput(e) {
    const keyword = e.detail.value
    const allCustomers = this.data._allCustomers || []
    const filtered = keyword
      ? allCustomers.filter(c => c.name.includes(keyword) || (c.contactPerson && c.contactPerson.includes(keyword)))
      : []
    this.setData({
      customerKeyword: keyword,
      filteredCustomers: filtered,
      showCustomerResults: keyword.length > 0,
      selectedCustomer: null,
    })
  },

  onCustomerFocus() {
    if (this.data.customerKeyword.length > 0) {
      this.onCustomerInput({ detail: { value: this.data.customerKeyword } })
    }
  },

  onCustomerBlur() {
    setTimeout(() => {
      this.setData({ showCustomerResults: false })
    }, 200)
  },

  onCustomerSelect(e) {
    const index = e.currentTarget.dataset.index
    const customer = this.data.filteredCustomers[index]
    this.setData({
      selectedCustomer: customer,
      customerInitial: customer.name.charAt(0),
      customerName: customer.name,
      customerKeyword: customer.name,
      showCustomerResults: false,
      filteredCustomers: [],
    })
  },

  onClearCustomer() {
    this.setData({
      selectedCustomer: null,
      customerKeyword: '',
      showCustomerResults: false,
      filteredCustomers: [],
    })
  },

  // ============================================================
  //  Warehouse
  // ============================================================
  onWarehouseChange(e) {
    const idx = parseInt(e.detail.value, 10)
    const warehouses = this.data.warehouses
    const wh = warehouses[idx] || null
    this.setData({
      warehouseIndex: idx,
      warehouseName: wh ? wh.name : '',
      selectedWarehouse: wh,
    })
  },

  // ============================================================
  //  Order info
  // ============================================================
  onDateChange(e) {
    this.setData({ expectedDate: e.detail.value })
  },

  onRemarkInput(e) {
    this.setData({ remark: e.detail.value })
  },

  // ============================================================
  //  Product search
  // ============================================================
  onItemProductSearchInput(e) {
    const keyword = e.detail.value
    this.setData({ productKeyword: keyword })
    if (keyword.length > 0 && this.data.products.length > 0) {
      const filtered = this.data.products.filter(p =>
        p.name.includes(keyword) || (p.spec && p.spec.includes(keyword))
      )
      this.setData({ productSearchResults: filtered, showProductResults: true })
    } else {
      this.setData({ productSearchResults: [], showProductResults: false })
    }
  },

  onItemProductSearchFocus() {
    if (this.data.productKeyword.length > 0) {
      this.onItemProductSearchInput({ detail: { value: this.data.productKeyword } })
    }
  },

  onItemProductSearchBlur() {
    setTimeout(() => {
      this.setData({ showProductResults: false })
    }, 250)
  },

  onItemProductSearchSelect(e) {
    const pIndex = parseInt(e.currentTarget.dataset.pindex)
    const product = this.data.productSearchResults[pIndex]
    if (!product) return

    // Duplicate check
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
  //  Item quantity / price
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

  onRemoveItem(e) {
    const index = e.currentTarget.dataset.index
    const items = [...this.data.items]
    items.splice(index, 1)
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

  // ============================================================
  //  Calc
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
  //  Validate & Submit
  // ============================================================
  validate() {
    if (!this.data.selectedCustomer) {
      wx.showToast({ title: '请选择客户', icon: 'none' })
      return false
    }
    if (this.data.warehouseIndex < 0) {
      wx.showToast({ title: '请选择仓库', icon: 'none' })
      return false
    }
    const items = this.data.items
    if (items.length === 0) {
      wx.showToast({ title: '请添加商品', icon: 'none' })
      return false
    }
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (!item.productId) {
        wx.showToast({ title: `第${i + 1}项未选择商品`, icon: 'none' })
        return false
      }
      if (!item.quantity || parseFloat(item.quantity) <= 0) {
        wx.showToast({ title: `第${i + 1}项数量无效`, icon: 'none' })
        return false
      }
      if (!item.price || parseFloat(item.price) <= 0) {
        wx.showToast({ title: `第${i + 1}项单价无效`, icon: 'none' })
        return false
      }
    }
    return true
  },

  buildSubmitData() {
    const warehouse = this.data.selectedWarehouse
    return {
      customerId: this.data.selectedCustomer.id,
      warehouseId: warehouse ? warehouse.id : null,
      warehouseName: warehouse ? warehouse.name : '',
      remark: this.data.remark,
      expectedDate: this.data.expectedDate || null,
      items: this.data.items.map(item => ({
        productId: item.productId,
        productName: item.productName,
        productSpec: item.productSpec,
        productUnit: item.productUnit,
        quantity: parseFloat(item.quantity),
        price: parseFloat(item.price),
      })),
    }
  },

  async onSaveDraft() {
    if (!this.validate()) return
    if (this.data.submitting) return
    this.setData({ submitting: true })
    try {
      const data = this.buildSubmitData()
      if (this.data.id) {
        await api.put(`/sales/${this.data.id}`, data)
      } else {
        await api.post('/sales', data)
      }
      showSuccess('保存成功')
      setTimeout(() => wx.navigateBack(), 1000)
    } catch (err) {
      showError(err.message)
    } finally {
      this.setData({ submitting: false })
    }
  },

  async onSubmit() {
    if (!this.validate()) return
    if (this.data.submitting) return
    this.setData({ submitting: true })
    try {
      const data = this.buildSubmitData()
      let order
      if (this.data.id) {
        order = await api.put(`/sales/${this.data.id}`, data)
      } else {
        order = await api.post('/sales', data)
      }
      // Submit for approval only when applicable
      if (!this.data.id || this.data.statusCls === 'draft') {
        await api.put(`/sales/${order.id}/status`, { status: 'pending' })
      }
      showSuccess('提交成功')
      setTimeout(() => wx.navigateBack(), 1000)
    } catch (err) {
      showError(err.message)
    } finally {
      this.setData({ submitting: false })
    }
  },

  // ============================================================
  //  Audit actions (readonly mode)
  // ============================================================
  async onApprove() {
    if (this.data.submitting) return
    this.setData({ submitting: true })
    try {
      await api.put(`/sales/${this.data.id}/status`, { status: 'approved' })
      showSuccess('审核通过')
      this.setData({
        statusCls: 'approved',
        statusText: STATUS_MAP.approved,
        submitting: false,
      })
    } catch (err) {
      showError(err.message)
      this.setData({ submitting: false })
    }
  },

  async onDeliver() {
    if (this.data.submitting) return
    this.setData({ submitting: true })
    try {
      await api.put(`/sales/${this.data.id}/status`, { status: 'delivered' })
      showSuccess('出库单已生成')
      setTimeout(() => {
        wx.redirectTo({ url: '/pages/outbound/list' })
      }, 1000)
    } catch (err) {
      showError(err.message)
      this.setData({ submitting: false })
    }
  },

  onBack() {
    wx.navigateBack()
  },

  async onWithdraw() {
    if (this.data.submitting) return
    this.setData({ submitting: true })
    try {
      await api.put('/sales/' + this.data.id + '/status', { status: 'draft' })
      showSuccess('已撤回')
      await this.loadOrder(this.data.id)
    } catch (err) {
      showError(err.message)
    } finally {
      this.setData({ submitting: false })
    }
  },
})
