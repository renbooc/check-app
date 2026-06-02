const { api } = require('../../utils/request')
const { showError, showSuccess } = require('../../utils/util')

Page({
  data: {
    activeTab: 'purchase',
    purchaseKeyword: '',
    purchaseList: [],
    purchasePage: 1,
    purchaseTotal: 0,
    salesKeyword: '',
    salesList: [],
    salesPage: 1,
    salesTotal: 0,
    inventoryKeyword: '',
    inventoryList: [],
    inventoryPage: 1,
    inventoryTotal: 0
  },

  onShow() {
    this.loadCurrentTab()
  },

  onPullDownRefresh() {
    this.resetCurrentTab()
    this.loadCurrentTab().then(() => wx.stopPullDownRefresh())
  },

  onReachBottom() {
    const tab = this.data.activeTab
    const listKey = tab + 'List'
    const totalKey = tab + 'Total'
    if (this.data[listKey].length < this.data[totalKey]) {
      const pageKey = tab + 'Page'
      this.setData({ [pageKey]: this.data[pageKey] + 1 })
      this.loadCurrentTab(true)
    }
  },

  onTabChange(e) {
    const tab = e.currentTarget.dataset.tab
    if (tab === this.data.activeTab) return
    this.setData({ activeTab: tab })
    this.loadCurrentTab()
  },

  resetCurrentTab() {
    const tab = this.data.activeTab
    this.setData({ [tab + 'Page']: 1 })
  },

  loadCurrentTab(append) {
    const tab = this.data.activeTab
    switch (tab) {
      case 'purchase': return this.loadPurchase(append)
      case 'sales': return this.loadSales(append)
      case 'inventory': return this.loadInventory(append)
    }
  },

  async loadPurchase(append) {
    try {
      const params = { page: this.data.purchasePage, pageSize: 20 }
      if (this.data.purchaseKeyword) params.keyword = this.data.purchaseKeyword
      const res = await api.get('/purchase', params)
      this.setData({
        purchaseList: append ? [...this.data.purchaseList, ...(res.list || [])] : (res.list || []),
        purchaseTotal: res.total || 0
      })
    } catch (err) {
      showError(err.message)
    }
  },

  async loadSales(append) {
    try {
      const params = { page: this.data.salesPage, pageSize: 20 }
      if (this.data.salesKeyword) params.keyword = this.data.salesKeyword
      const res = await api.get('/sales', params)
      this.setData({
        salesList: append ? [...this.data.salesList, ...(res.list || [])] : (res.list || []),
        salesTotal: res.total || 0
      })
    } catch (err) {
      showError(err.message)
    }
  },

  async loadInventory(append) {
    try {
      const params = { page: this.data.inventoryPage, pageSize: 20 }
      if (this.data.inventoryKeyword) params.keyword = this.data.inventoryKeyword
      const res = await api.get('/inventory', params)
      this.setData({
        inventoryList: append ? [...this.data.inventoryList, ...(res.list || [])] : (res.list || []),
        inventoryTotal: res.total || 0
      })
    } catch (err) {
      showError(err.message)
    }
  },

  onPurchaseSearchInput(e) {
    this.setData({ purchaseKeyword: e.detail.value })
  },

  onPurchaseSearch() {
    this.setData({ purchasePage: 1 })
    this.loadPurchase()
  },

  onSalesSearchInput(e) {
    this.setData({ salesKeyword: e.detail.value })
  },

  onSalesSearch() {
    this.setData({ salesPage: 1 })
    this.loadSales()
  },

  onInventorySearchInput(e) {
    this.setData({ inventoryKeyword: e.detail.value })
  },

  onInventorySearch() {
    this.setData({ inventoryPage: 1 })
    this.loadInventory()
  },

  onAddPurchase() {
    wx.navigateTo({ url: '/pages/purchase/form' })
  },

  onAddSales() {
    wx.navigateTo({ url: '/pages/sales/form' })
  },

  onAddProduct() {
    wx.navigateTo({ url: '/pages/product/form' })
  },

  onPurchaseTap(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/purchase/form?id=' + id })
  },

  onSalesTap(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/sales/form?id=' + id })
  },

  onInventoryTap(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/product/detail?id=' + id })
  },

  async onConfirmReceipt(e) {
    const id = e.currentTarget.dataset.id
    try {
      await api.put(`/purchase/${id}/status`, { status: 'received' })
      showSuccess('已确认入库')
      this.loadCurrentTab()
    } catch (err) {
      showError(err.message)
    }
  },

  async onConfirmDelivery(e) {
    const id = e.currentTarget.dataset.id
    try {
      await api.put(`/sales/${id}/status`, { status: 'delivered' })
      showSuccess('已确认出库')
      this.loadCurrentTab()
    } catch (err) {
      showError(err.message)
    }
  }
})
