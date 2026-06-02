const { api } = require('../../utils/request')
const { showError } = require('../../utils/util')

Page({
  data: {
    pageLoading: true,
    searchKeyword: '',
    stockList: [],
    total: 0,
    showDetail: false,
    detailProduct: null
  },

  onLoad(options) {
    if (options && options.keyword) {
      this.setData({ searchKeyword: options.keyword })
    }
    this.loadStockList()
  },

  onPullDownRefresh() {
    this.loadStockList().then(() => {
      wx.stopPullDownRefresh()
    })
  },

  onSearchInput(e) {
    this.setData({ searchKeyword: e.detail.value })
  },

  onSearch() {
    this.loadStockList()
  },

  onClearSearch() {
    this.setData({ searchKeyword: '' })
    this.loadStockList()
  },

  async loadStockList() {
    this.setData({ pageLoading: true })
    try {
      const params = {}
      if (this.data.searchKeyword) {
        params.keyword = this.data.searchKeyword
      }
      const res = await api.get('/stock/list', params)
      this.setData({
        stockList: res.list || [],
        total: res.total || 0,
        pageLoading: false
      })
    } catch (err) {
      console.error('[Stock] loadStockList error:', err)
      showError(err.message)
      this.setData({ pageLoading: false })
    }
  },

  onItemTap(e) {
    const id = e.currentTarget.dataset.id
    const product = this.data.stockList.find(p => p.id === id)
    if (!product) return

    this.setData({
      showDetail: true,
      detailProduct: product
    })
  },

  onCloseDetail() {
    this.setData({
      showDetail: false,
      detailProduct: null
    })
  },

  onGoCheck() {
    this.setData({ showDetail: false, detailProduct: null })
    wx.navigateTo({ url: '/pages/check/check' })
  },

  onScanCode() {
    wx.scanCode({
      onlyFromCamera: false,
      scanType: ['barCode', 'qrCode'],
      success: (res) => {
        this.setData({ searchKeyword: res.result })
        this.loadStockList()
      },
      fail: (err) => {
        if (err.errMsg && err.errMsg.indexOf('cancel') === -1) {
          showError('扫码失败')
        }
      }
    })
  }
})
