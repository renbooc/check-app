const { api } = require('../../utils/request')
const { showError } = require('../../utils/util')

Page({
  data: {
    activeTab: 'product',
    searchKeyword: '',
    searching: false,
    saving: false,
    product: null,
    checkCount: 0,
    location: '',
    batchNo: '',
    expiryDate: '',
    remark: '',
    lastSaved: null,
    showUndo: false,
    locations: [],
    locationLoading: false,
    selectedLocation: '',
    locationProducts: [],
    infoFoldOpen: false
  },

  _undoTimer: null,

  onLoad() {
    console.log('[Check] onLoad')
  },

  onSwitchTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ activeTab: tab })
    if (tab === 'location' && this.data.locations.length === 0) {
      this.loadLocations()
    }
  },

  onSearchInput(e) {
    this.setData({ searchKeyword: e.detail.value })
  },

  onSearch() {
    const keyword = this.data.searchKeyword.trim()
    if (!keyword) {
      showError('请输入搜索内容')
      return
    }
    if (this.data.activeTab === 'product') {
      this.searchProduct(keyword)
    } else {
      this.searchLocation(keyword)
    }
  },

  async searchProduct(keyword) {
    this.setData({ searching: true, product: null })
    try {
      const res = await api.get('/products/search', { keyword })
      if (res.list && res.list.length > 0) {
        this.loadProduct(res.list[0])
      } else {
        showError('未找到匹配商品')
        this.setData({ searching: false })
      }
    } catch (err) {
      showError(err.message)
      this.setData({ searching: false })
    }
  },

  loadProduct(product) {
    this.setData({
      product,
      checkCount: product.stockCount,
      location: product.location,
      batchNo: product.batchNo,
      expiryDate: product.expiryDate,
      remark: '',
      searching: false,
      infoFoldOpen: false
    })
  },

  onScanCode() {
    wx.scanCode({
      onlyFromCamera: false,
      scanType: ['barCode', 'qrCode'],
      success: (res) => {
        console.log('[Check] scan result:', res.result)
        wx.vibrateShort({ type: 'medium' })
        this.setData({ searchKeyword: res.result })
        this.loadProductByCode(res.result)
      },
      fail: (err) => {
        if (err.errMsg && err.errMsg.indexOf('cancel') === -1) {
          showError('扫码失败，请检查相机权限')
          this.handlePermissionDenied()
        }
      }
    })
  },

  async loadProductByCode(code) {
    this.setData({ searching: true, product: null })
    try {
      const product = await api.get('/products/barcode', { code })
      this.loadProduct(product)
      wx.vibrateShort({ type: 'light' })
    } catch (err) {
      showError(err.message || '未找到该商品')
      this.setData({ searching: false })
    }
  },

  handlePermissionDenied() {
    wx.showModal({
      title: '需要相机权限',
      content: '扫码功能需要使用相机，请在设置中开启相机权限',
      confirmText: '去设置',
      success(res) {
        if (res.confirm) {
          wx.openSetting()
        }
      }
    })
  },

  onCountMinus() {
    let count = this.data.checkCount
    if (count > 0) {
      count--
      this.setData({ checkCount: count })
    }
  },

  onCountPlus() {
    let count = this.data.checkCount
    count++
    this.setData({ checkCount: count })
  },

  onCountInput(e) {
    let val = parseInt(e.detail.value, 10)
    if (isNaN(val) || val < 0) val = 0
    this.setData({ checkCount: val })
  },

  onSelectLocation() {
    api.get('/locations').then(locations => {
      const codes = locations.map(l => l.code || l)
      wx.showActionSheet({
        itemList: codes,
        success: (res) => {
          this.setData({ location: codes[res.tapIndex] })
        }
      })
    }).catch(() => {
      showError('获取库位失败')
    })
  },

  onRemarkInput(e) {
    this.setData({ remark: e.detail.value })
  },

  async onSave() {
    if (!this.data.product) {
      showError('请先选择商品')
      return
    }
    if (this.data.checkCount < 0) {
      showError('盘点数量不能为负数')
      return
    }
    if (!this.data.location) {
      showError('请选择库位')
      return
    }

    this.setData({ saving: true })

    try {
      const saveData = {
        productId: this.data.product.id,
        productName: this.data.product.name,
        checkCount: this.data.checkCount,
        stockCount: this.data.product.stockCount,
        location: this.data.location,
        batchNo: this.data.batchNo,
        remark: this.data.remark
      }

      const result = await api.post('/check/save', saveData)
      wx.vibrateShort({ type: 'heavy' })
      this.showUndoToast(result)
      wx.showToast({ title: '保存成功', icon: 'success' })
    } catch (err) {
      showError(err.message || '保存失败')
    } finally {
      this.setData({ saving: false })
    }
  },

  showUndoToast(savedItem) {
    if (this._undoTimer) clearTimeout(this._undoTimer)

    this.setData({ lastSaved: savedItem, showUndo: true })

    this._undoTimer = setTimeout(() => {
      this.setData({ showUndo: false })
      setTimeout(() => this.setData({ lastSaved: null }), 300)
    }, 5000)
  },

  onUndo() {
    if (this._undoTimer) clearTimeout(this._undoTimer)
    console.log('[Check] undo:', this.data.lastSaved)
    this.setData({ showUndo: false, lastSaved: null })
    wx.showToast({ title: '已撤销', icon: 'success' })
  },

  onContinueScan() {
    this.setData({
      product: null,
      searchKeyword: '',
      remark: '',
      checkCount: 0,
      infoFoldOpen: false
    })
    this.onScanCode()
  },

  async loadLocations() {
    this.setData({ locationLoading: true })
    try {
      const locations = await api.get('/locations')
      this.setData({ locations, locationLoading: false })
    } catch (err) {
      showError(err.message)
      this.setData({ locationLoading: false })
    }
  },

  onLocationTap(e) {
    const location = e.currentTarget.dataset.location
    this.setData({ selectedLocation: location })
    this.searchLocation(location)
  },

  async searchLocation(keyword) {
    this.setData({ searching: true, locationProducts: [] })
    try {
      const res = await api.get('/products/search', { keyword })
      this.setData({
        locationProducts: res.list || [],
        searching: false
      })
    } catch (err) {
      showError(err.message)
      this.setData({ searching: false })
    }
  },

  onLocationProductTap(e) {
    const id = e.currentTarget.dataset.id
    const product = this.data.locationProducts.find(p => p.id === id)
    if (product) {
      this.loadProduct(product)
    }
  },

  onToggleInfoFold() {
    this.setData({ infoFoldOpen: !this.data.infoFoldOpen })
  }
})
