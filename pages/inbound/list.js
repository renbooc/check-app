const { api } = require('../../utils/request')
const { showError } = require('../../utils/util')

Page({
  data: {
    keyword: '',
    searched: false,
    currentStatus: '',
    list: [],
    page: 1,
    pageSize: 20,
    total: 0,
    pendingCount: 0,
    loading: true,
    loaded: false,
  },

  onShow() {
    this.resetList()
    this.loadPendingCount()
  },

  onPullDownRefresh() {
    Promise.all([this.resetList(), this.loadPendingCount()]).then(() => wx.stopPullDownRefresh())
  },

  onReachBottom() {
    if (this.data.list.length < this.data.total && !this.data.loading) {
      this.setData({ page: this.data.page + 1 })
      this.loadList(true)
    }
  },

  onSearchInput(e) {
    this.setData({ keyword: e.detail.value })
  },

  onSearch() {
    this.setData({ searched: true })
    this.resetList()
  },

  onClearSearch() {
    this.setData({ keyword: '', searched: false })
    this.resetList()
  },

  onStatusFilter(e) {
    const status = e.currentTarget.dataset.status
    this.setData({ currentStatus: status, searched: true })
    this.resetList()
  },

  async loadPendingCount() {
    try {
      const res = await api.get('/inbound', { page: 1, pageSize: 1, status: 'pending' })
      this.setData({ pendingCount: res.total || 0 })
    } catch (_) {}
  },

  async resetList() {
    this.setData({ page: 1, list: [], loading: true })
    await this.loadList(false)
  },

  async loadList(append) {
    try {
      const params = { page: this.data.page, pageSize: this.data.pageSize }
      if (this.data.keyword) params.keyword = this.data.keyword
      if (this.data.currentStatus) params.status = this.data.currentStatus
      const res = await api.get('/inbound', params)
      const enriched = (res.list || []).map(this.enrichItem.bind(this))
      this.setData({
        list: append ? [...this.data.list, ...enriched] : enriched,
        total: res.total || 0,
        loading: false,
        loaded: true,
      })
    } catch (err) {
      showError(err.message)
      this.setData({ loading: false, loaded: true })
    }
  },

  enrichItem(item) {
    const status = item.status || 'draft'
    const supplierName = item.supplierName || item.supplier?.name || ''
    return {
      ...item,
      supplierName,
      initial: supplierName.charAt(0) || '?',
      statusCls: status,
      statusLabel: { draft: '草稿', pending: '待审核', approved: '已审核', cancelled: '已取消' }[status] || status,
    }
  },

  onView(e) {
    wx.navigateTo({ url: '/pages/inbound/form?id=' + e.currentTarget.dataset.id })
  },

  onCreate() {
    wx.navigateTo({ url: '/pages/inbound/form' })
  },

  onRefresh() {
    this.resetList()
    this.loadPendingCount()
  },
})
