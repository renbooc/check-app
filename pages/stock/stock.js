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
      const list = (res.list || []).map(item => this.decorateWarnings(item))
      this.setData({
        stockList: list,
        total: res.total || 0,
        pageLoading: false
      })
    } catch (err) {
      console.error('[Stock] loadStockList error:', err)
      showError(err.message)
      this.setData({ pageLoading: false })
    }
  },

  // 计算库存预警标识
  decorateWarnings(item) {
    const warnings = { hasLowStock: false, hasExpiring: false, hasExpired: false }
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    // 库存偏低
    const minQty = item.product && item.product.minQuantity
    if (minQty > 0 && item.quantity < minQty) {
      warnings.hasLowStock = true
    }

    // 遍历批次检查效期
    const batches = item.batches || []
    for (const b of batches) {
      if (!b.expiryDate) continue
      const expiry = new Date(b.expiryDate)
      if (isNaN(expiry.getTime())) continue

      if (expiry < today) {
        warnings.hasExpired = true
      } else {
        const diffDays = Math.ceil((expiry - today) / 86400000)
        if (diffDays <= 90) {
          warnings.hasExpiring = true
        }
      }
    }

    return { ...item, ...warnings }
  },

  onItemTap(e) {
    const id = e.currentTarget.dataset.id
    const product = this.data.stockList.find(p => p.id === id)
    if (!product) return

    // 计算批次级预警
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const batches = (product.batches || []).map(b => {
      const warn = { _expired: false, _expiring: false }
      if (b.expiryDate) {
        const expiry = new Date(b.expiryDate)
        if (!isNaN(expiry.getTime())) {
          if (expiry < today) {
            warn._expired = true
          } else {
            const diffDays = Math.ceil((expiry - today) / 86400000)
            if (diffDays <= 90) warn._expiring = true
          }
        }
      }
      return { ...b, ...warn }
    })

    this.setData({
      showDetail: true,
      detailProduct: { ...product, batches }
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
