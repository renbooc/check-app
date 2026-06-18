const { api } = require('../../utils/request')
const { showError } = require('../../utils/util')

const STATUS_MAP = {
  draft: '草稿',
  pending: '待审核',
  approved: '已审核',
  received: '已入库',
  cancelled: '已取消',
}

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
      const res = await api.get('/purchase', { page: 1, pageSize: 1, status: 'pending' })
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
      const res = await api.get('/purchase', params)
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
    const supplier = item.supplier || {}
    return {
      ...item,
      initial: (supplier.name && supplier.name[0]) || '?',
      supplierName: supplier.name || '-',
      statusCls: status,
      statusLabel: STATUS_MAP[status] || status,
    }
  },

  onDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/purchase/form?id=' + id })
  },

  onCreate() {
    wx.navigateTo({ url: '/pages/purchase/form' })
  },

  async onQuickReceive(e) {
    const id = e.currentTarget.dataset.id
    try {
      await api.put(`/purchase/${id}/status`, { status: 'received' })
      wx.showToast({ title: '入库单已生成', icon: 'success' })
      this.resetList()
      this.loadPendingCount()
    } catch (err) {
      showError(err.message)
    }
  },
})
