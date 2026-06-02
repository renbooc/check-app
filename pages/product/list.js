const { api } = require('../../utils/request')
const { showError } = require('../../utils/util')

Page({
  data: {
    keyword: '',
    list: [],
    page: 1,
    pageSize: 20,
    total: 0
  },

  onShow() {
    this.setData({ page: 1 })
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
    try {
      const params = { page: this.data.page, pageSize: this.data.pageSize }
      if (this.data.keyword) params.keyword = this.data.keyword
      const res = await api.get('/products', params)
      this.setData({
        list: append ? [...this.data.list, ...(res.list || [])] : (res.list || []),
        total: res.total || 0
      })
    } catch (err) {
      showError(err.message)
    }
  },

  onAdd() {
    wx.navigateTo({ url: '/pages/product/form' })
  },

  onEdit(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/product/form?id=' + id })
  }
})
