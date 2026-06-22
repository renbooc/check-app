const { api } = require('../../utils/request')
const { showError } = require('../../utils/util')

Page({
  data: {
    pageLoading: true,
    loadingMore: false,
    searchKeyword: '',
    records: [],
    page: 1,
    pageSize: 10,
    total: 0,
    hasMore: true
  },

  onLoad() {
    this.loadRecords()
  },

  onPullDownRefresh() {
    this.setData({ page: 1, records: [], hasMore: true })
    this.loadRecords().then(() => {
      wx.stopPullDownRefresh()
    })
  },

  onReachBottom() {
    if (!this.data.hasMore || this.data.loadingMore) return
    this.loadMore()
  },

  onSearchInput(e) {
    this.setData({ searchKeyword: e.detail.value })
  },

  onSearch() {
    this.setData({ page: 1, records: [], hasMore: true })
    this.loadRecords()
  },

  onClearSearch() {
    this.setData({ searchKeyword: '', page: 1, records: [], hasMore: true })
    this.loadRecords()
  },

  async loadRecords() {
    this.setData({ pageLoading: true })
    try {
      const params = { page: 1, pageSize: this.data.pageSize }
      if (this.data.searchKeyword) {
        params.keyword = this.data.searchKeyword
      }
      const res = await api.get('/check/records', params)
      this.setData({
        records: res.list || [],
        total: res.total || 0,
        page: 1,
        hasMore: (res.list || []).length >= this.data.pageSize,
        pageLoading: false
      })
    } catch (err) {
      console.error('[Records] loadRecords error:', err)
      showError(err.message)
      this.setData({ pageLoading: false })
    }
  },

  async loadMore() {
    this.setData({ loadingMore: true })
    try {
      const nextPage = this.data.page + 1
      const params = { page: nextPage, pageSize: this.data.pageSize }
      if (this.data.searchKeyword) {
        params.keyword = this.data.searchKeyword
      }
      const res = await api.get('/check/records', params)
      const newList = res.list || []
      this.setData({
        records: [...this.data.records, ...newList],
        total: res.total || 0,
        page: nextPage,
        hasMore: newList.length >= this.data.pageSize,
        loadingMore: false
      })
    } catch (err) {
      console.error('[Records] loadMore error:', err)
      showError(err.message)
      this.setData({ loadingMore: false })
    }
  },

  onRecordTap(e) {
    const id = e.currentTarget.dataset.id
    const record = this.data.records.find(r => r.id === id)
    if (!record) return

    const items = record.items || []
    const itemList = items.map(item =>
      `${item.productName}：账面${item.stockQuantity} / 实盘${item.checkQuantity} / 差异${item.diffQuantity}`
    ).join('\n')

    const statusText = record.status === 'pending' ? '待审核' : record.status === 'approved' ? '已审核' : record.status === 'cancelled' ? '已撤销' : record.status

    // 待审核状态提供审核操作
    if (record.status === 'pending') {
      wx.showModal({
        title: `盘点单 ${record.checkNo}`,
        content: `状态：${statusText}\n盘点人：${record.operatorName}\n时间：${record.createdAt}\n品种数：${record.totalProducts}\n差异：${record.diffProducts}\n${itemList ? '\n明细：\n' + itemList : ''}`,
        confirmText: '审核通过',
        cancelText: '关闭',
        confirmColor: '#0077C2',
        success: (res) => {
          if (res.confirm) {
            this.approveRecord(id)
          }
        }
      })
    } else {
      wx.showModal({
        title: `盘点单 ${record.checkNo}`,
        content: `状态：${statusText}\n盘点人：${record.operatorName}\n时间：${record.createdAt}\n品种数：${record.totalProducts}\n差异：${record.diffProducts}\n${itemList ? '\n明细：\n' + itemList : ''}`,
        showCancel: false,
        confirmText: '知道了',
        confirmColor: '#0077C2'
      })
    }
  },

  async approveRecord(id) {
    wx.showLoading({ title: '审核中...', mask: true })
    try {
      await api.post('/check/' + id + '/approve')
      wx.hideLoading()
      wx.showToast({ title: '审核成功，库存已修正', icon: 'success' })
      // 刷新列表
      this.setData({ page: 1, records: [], hasMore: true })
      this.loadRecords()
    } catch (err) {
      wx.hideLoading()
      showError(err.message || '审核失败')
    }
  }
})
