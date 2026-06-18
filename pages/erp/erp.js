const { api } = require('../../utils/request')
const { showError, showSuccess, formatDate } = require('../../utils/util')

Page({
  data: {
    activeTab: 'inbound',
    networkError: false,
    inventoryKeyword: '',
    inventoryList: [],
    inventoryPage: 1,
    inventoryTotal: 0,
    inboundKeyword: '',
    inboundList: [],
    inboundPage: 1,
    inboundTotal: 0,
    outboundKeyword: '',
    outboundList: [],
    outboundPage: 1,
    outboundTotal: 0,
  },

  onShow() {
    this.loadCurrentTab()
  },

  onRetry() {
    this.setData({ networkError: false })
    this.loadCurrentTab()
  },

  onPullDownRefresh() {
    this.resetCurrentTab()
    this.loadCurrentTab().then(() => wx.stopPullDownRefresh())
  },

  onReachBottom() {
    const tab = this.data.activeTab
    if (tab === 'purchaseReturn' || tab === 'salesReturn') return
    const listKey = tab + 'List'
    const totalKey = tab + 'Total'
    if (this.data[listKey] && this.data[listKey].length < this.data[totalKey]) {
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
    if (tab === 'purchaseReturn' || tab === 'salesReturn') return
    this.setData({ [tab + 'Page']: 1 })
  },

  loadCurrentTab(append) {
    const tab = this.data.activeTab
    switch (tab) {
      case 'inbound': return this.loadInbound(append)
      case 'outbound': return this.loadOutbound(append)
      case 'inventory': return this.loadInventory(append)
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
      this.setData({ networkError: true })
    }
  },

  async loadInbound(append) {
    try {
      const params = { page: this.data.inboundPage, pageSize: 20 }
      if (this.data.inboundKeyword) params.keyword = this.data.inboundKeyword
      const res = await api.get('/inbound', params)
      const list = (res.list || []).map(i => ({ ...i, createdAt: formatDate(i.createdAt, 'YYYY-MM-DD HH:mm:ss') }))
      this.setData({
        inboundList: append ? [...this.data.inboundList, ...list] : list,
        inboundTotal: res.total || 0
      })
    } catch (err) {
      showError(err.message)
      this.setData({ networkError: true })
    }
  },

  async loadOutbound(append) {
    try {
      const params = { page: this.data.outboundPage, pageSize: 20 }
      if (this.data.outboundKeyword) params.keyword = this.data.outboundKeyword
      const res = await api.get('/outbound', params)
      const list = (res.list || []).map(i => ({ ...i, createdAt: formatDate(i.createdAt, 'YYYY-MM-DD HH:mm:ss') }))
      this.setData({
        outboundList: append ? [...this.data.outboundList, ...list] : list,
        outboundTotal: res.total || 0
      })
    } catch (err) {
      showError(err.message)
      this.setData({ networkError: true })
    }
  },

  onInventorySearchInput(e) {
    this.setData({ inventoryKeyword: e.detail.value })
  },

  onInventorySearch() {
    this.setData({ inventoryPage: 1 })
    this.loadInventory()
  },

  onInboundSearchInput(e) {
    this.setData({ inboundKeyword: e.detail.value })
  },

  onInboundSearch() {
    this.setData({ inboundPage: 1 })
    this.loadInbound()
  },

  onViewInboundList() {
    wx.navigateTo({ url: '/pages/inbound/list' })
  },

  onInboundTap(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/inbound/form?id=' + id })
  },

  onOutboundSearchInput(e) {
    this.setData({ outboundKeyword: e.detail.value })
  },

  onOutboundSearch() {
    this.setData({ outboundPage: 1 })
    this.loadOutbound()
  },

  onViewOutboundList() {
    wx.navigateTo({ url: '/pages/outbound/list' })
  },

  onOutboundTap(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/outbound/form?id=' + id })
  },

  onAddProduct() {
    wx.navigateTo({ url: '/pages/product/form' })
  },

  onInventoryTap(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/product/detail?id=' + id })
  },
})
