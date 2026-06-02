const { api } = require('../../utils/request')
const { showError } = require('../../utils/util')

Page({
  data: {
    loading: false,
    keyword: '',
    list: [],
    page: 1,
    pageSize: 20,
    total: 0
  },

  onLoad() {
    this.loadList()
  },

  onPullDownRefresh() {
    this.setData({ page: 1 })
    this.loadList().then(() => wx.stopPullDownRefresh())
  },

  onReachBottom() {
    if (this.data.list.length < this.data.total) {
      this.setData({ page: this.data.page + 1 })
      this.loadList(true)
    }
  },

  onSearchInput(e) {
    this.setData({ keyword: e.detail.value })
  },

  onSearch() {
    this.setData({ page: 1 })
    this.loadList()
  },

  async loadList(append) {
    this.setData({ loading: true })
    try {
      const params = { page: this.data.page, pageSize: this.data.pageSize }
      if (this.data.keyword) params.keyword = this.data.keyword
      const res = await api.get('/sales', params)
      this.setData({
        list: append ? [...this.data.list, ...(res.list || [])] : (res.list || []),
        total: res.total || 0,
        loading: false
      })
    } catch (err) {
      showError(err.message)
      this.setData({ loading: false })
    }
  },

  onDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/sales/form?id=' + id })
  },

  onCreate() {
    wx.navigateTo({ url: '/pages/sales/form' })
  }
})
