const { api } = require('../../utils/request')
const { showError, showSuccess } = require('../../utils/util')

Page({
  data: {
    id: null,

    // Customer search
    customerKeyword: '',
    filteredCustomers: [],
    showCustomerResults: false,
    selectedCustomer: null,

    // Products list
    products: [],
    productKeyword: '',
    productSearchResults: [],
    showProductResults: false,

    remark: '',
    expectedDate: '',
    items: [],
    totalQuantity: 0,
    totalAmount: '0.00',
    submitting: false
  },

  async onLoad(options) {
    await Promise.all([this.loadCustomers(), this.loadProducts()])
    if (options.id) {
      this.setData({ id: options.id })
      await this.loadOrder(options.id)
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

  async loadOrder(id) {
    try {
      const order = await api.get(`/sales/${id}`)
      const allCustomers = this.data._allCustomers || []
      const customer = allCustomers.find(c => c.id === order.customerId)
      const products = this.data.products
      const items = (order.items || []).map(item => {
        return {
          productId: item.productId,
          productName: item.productName,
          productSpec: item.productSpec,
          productUnit: item.productUnit,
          quantity: item.quantity,
          price: item.price,
          amount: item.amount
        }
      })
      this.setData({
        selectedCustomer: customer || null,
        customerKeyword: customer ? customer.name : '',
        remark: order.remark || '',
        expectedDate: order.expectedDate || '',
        items,
        totalQuantity: order.totalQuantity || 0,
        totalAmount: (parseFloat(order.totalAmount) || 0).toFixed(2)
      })
    } catch (err) {
      showError(err.message)
    }
  },

  // ---- Customer search ----

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
      selectedCustomer: null
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
      customerKeyword: customer.name,
      showCustomerResults: false,
      filteredCustomers: []
    })
  },

  onClearCustomer() {
    this.setData({
      selectedCustomer: null,
      customerKeyword: '',
      showCustomerResults: false,
      filteredCustomers: []
    })
  },

  // ---- 统一商品搜索 ----

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
    const product = this.data.products[pIndex]
    if (!product) return

    const items = [...this.data.items, {
      productId: product.id,
      productName: product.name,
      productSpec: product.spec || '',
      productUnit: product.unit ? product.unit.name : '',
      quantity: '',
      price: '',
      amount: '0.00'
    }]

    this.setData({
      items,
      productKeyword: '',
      productSearchResults: [],
      showProductResults: false
    })
    this.calcTotal()
  },

  // ---- Item quantity / price ----

  onItemQuantityInput(e) {
    const index = e.currentTarget.dataset.index
    const quantity = parseFloat(e.detail.value) || 0
    const items = [...this.data.items]
    items[index].quantity = quantity
    items[index].amount = (quantity * parseFloat(items[index].price || 0)).toFixed(2)
    this.setData({ items })
    this.calcTotal()
  },

  onItemPriceInput(e) {
    const index = e.currentTarget.dataset.index
    const price = parseFloat(e.detail.value) || 0
    const items = [...this.data.items]
    items[index].price = price
    items[index].amount = ((items[index].quantity || 0) * price).toFixed(2)
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

  onRemarkInput(e) {
    this.setData({ remark: e.detail.value })
  },

  onDateChange(e) {
    this.setData({ expectedDate: e.detail.value })
  },

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
      totalAmount: totalAmount.toFixed(2)
    })
  },

  validate() {
    if (!this.data.selectedCustomer) {
      wx.showToast({ title: '请选择客户', icon: 'none' })
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
    return {
      customerId: this.data.selectedCustomer.id,
      remark: this.data.remark,
      expectedDate: this.data.expectedDate || null,
      items: this.data.items.map(item => ({
        productId: item.productId,
        productName: item.productName,
        productSpec: item.productSpec,
        productUnit: item.productUnit,
        quantity: parseFloat(item.quantity),
        price: parseFloat(item.price)
      }))
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
      await api.put(`/sales/${order.id}/status`, { status: 'pending' })
      showSuccess('提交成功')
      setTimeout(() => wx.navigateBack(), 1000)
    } catch (err) {
      showError(err.message)
    } finally {
      this.setData({ submitting: false })
    }
  }
})
