const { api } = require('../../utils/request')
const { showError } = require('../../utils/util')

// 近效期阈值（天）
const NEAR_EXPIRY_DAYS = 90

Page({
  data: {
    activeTab: 'product',
    searchKeyword: '',
    searching: false,
    saving: false,
    product: null,
    searchResults: [],
    // 多批次盘点
    batches: [],          // [{ detailId, batchNo, productionDate, expiryDate, locationCode, stockCount, checkCount, diff, isNearExpiry, isExpired, isNew }]
    totalStock: 0,        // 汇总：系统总数
    totalCheck: 0,        // 汇总：盘点总数
    totalDiff: 0,         // 汇总：差异
    multiBatch: false,    // 是否多批次模式
    // 单批次模式字段（兼容）
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
  _searchTimer: null,

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
    const val = e.detail.value
    this.setData({ searchKeyword: val })
    // 按库位盘点 Tab 不做实时搜索
    if (this.data.activeTab !== 'product') return
    // 防抖实时搜索
    if (this._searchTimer) clearTimeout(this._searchTimer)
    if (!val.trim()) {
      this.setData({ searchResults: [], searching: false })
      return
    }
    this._searchTimer = setTimeout(() => {
      this.searchProduct(val.trim())
    }, 350)
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
    this.setData({ searching: true, searchResults: [] })
    try {
      const res = await api.get('/products/search', { keyword })
      const list = (res.list || []).map(p => ({
        ...p,
        nameInitial: (p.name || '').charAt(0).toUpperCase(),
        unitName: (p.unit && (p.unit.name || p.unit)) || '',
        manufacturer: p.manufacturer || ''
      }))
      // 始终显示候选列表，不再直接加载唯一结果
      this.setData({ searchResults: list, searching: false })
    } catch (err) {
      showError(err.message)
      this.setData({ searching: false })
    }
  },

  onSelectSearchResult(e) {
    const id = e.currentTarget.dataset.id
    const product = this.data.searchResults.find(p => p.id === id)
    if (product) {
      // 选中后清空候选列表，加载商品
      this.setData({ searchResults: [], searchKeyword: '' })
      this.loadProduct(product)
    }
  },

  onClearSearch() {
    this.setData({ searchKeyword: '', searchResults: [] })
  },

  async loadProduct(raw) {
    // 规范化字段：unit 是关联对象，提取 name 为 unitName 避免 [object Object]
    const unitName = (raw.unit && (raw.unit.name || raw.unit)) || raw.unitName || ''
    const name = raw.name || ''
    const product = {
      ...raw,
      unitName,
      name,
      nameInitial: name.charAt(0).toUpperCase(),
      manufacturer: raw.manufacturer || '',
      image: raw.image || '',
      stockCount: raw.stockCount || 0
    }

    // 加载该商品的全部批次库存
    try {
      const stockData = await api.get('/inventory/product/' + product.id)
      let batches = []
      if (stockData && stockData.batches && stockData.batches.length > 0) {
        batches = stockData.batches.map(b => this.normalizeBatch(b))
      }

      if (batches.length > 1) {
        // 多批次模式
        this.setData({
          product,
          batches,
          multiBatch: true,
          checkCount: 0,
          location: '',
          batchNo: '',
          expiryDate: '',
          remark: '',
          searching: false,
          searchResults: [],
          infoFoldOpen: false
        })
        this.recalcTotals()
      } else if (batches.length === 1) {
        // 单批次：回退到单批次模式，填充批次信息
        const b = batches[0]
        this.setData({
          product,
          batches,
          multiBatch: false,
          checkCount: b.stockCount,
          location: b.locationCode || product.location || '',
          batchNo: b.batchNo,
          expiryDate: b.expiryDate,
          remark: '',
          searching: false,
          searchResults: [],
          infoFoldOpen: false
        })
      } else {
        // 无批次记录：单批次模式，空批次
        this.setData({
          product,
          batches: [],
          multiBatch: false,
          checkCount: product.stockCount,
          location: product.location || '',
          batchNo: product.batchNo || '',
          expiryDate: product.expiryDate || '',
          remark: '',
          searching: false,
          searchResults: [],
          infoFoldOpen: false
        })
      }
    } catch (err) {
      // 批次加载失败时回退到单批次模式
      this.setData({
        product,
        batches: [],
        multiBatch: false,
        checkCount: product.stockCount,
        location: product.location || '',
        batchNo: product.batchNo || '',
        expiryDate: product.expiryDate || '',
        remark: '',
        searching: false,
        searchResults: [],
        infoFoldOpen: false
      })
    }
  },

  normalizeBatch(raw) {
    const now = new Date()
    const expiryDate = raw.expiryDate || ''
    let isNearExpiry = false
    let isExpired = false
    if (expiryDate) {
      const exp = new Date(expiryDate)
      const diffDays = Math.floor((exp - now) / 86400000)
      isExpired = diffDays < 0
      isNearExpiry = diffDays >= 0 && diffDays <= NEAR_EXPIRY_DAYS
    }
    const stockCount = raw.quantity || 0
    return {
      detailId: raw.id || '',
      batchNo: raw.batchNo || '',
      productionDate: raw.productionDate || '',
      expiryDate,
      locationCode: raw.locationCode || '',
      stockCount,
      checkCount: stockCount,  // 默认盘点数量等于系统数量
      diff: 0,
      isNearExpiry,
      isExpired,
      isNew: false
    }
  },

  recalcTotals() {
    const batches = this.data.batches
    let totalStock = 0
    let totalCheck = 0
    for (const b of batches) {
      totalStock += b.stockCount
      totalCheck += b.checkCount
      b.diff = b.checkCount - b.stockCount
    }
    this.setData({
      batches,
      totalStock,
      totalCheck,
      totalDiff: totalCheck - totalStock
    })
  },

  // ====== 多批次输入处理 ======

  onBatchCountInput(e) {
    const index = e.currentTarget.dataset.index
    const raw = String(e.detail.value)
    const matched = raw.match(/^\d+/)
    let val = matched ? parseInt(matched[0], 10) : 0
    if (isNaN(val) || val < 0) val = 0
    const batches = this.data.batches
    batches[index].checkCount = val
    this.setData({ batches })
    this.recalcTotals()
  },

  onBatchMinus(e) {
    const index = e.currentTarget.dataset.index
    const batches = this.data.batches
    if (batches[index].checkCount > 0) {
      batches[index].checkCount--
      this.setData({ batches })
      this.recalcTotals()
    }
  },

  onBatchPlus(e) {
    const index = e.currentTarget.dataset.index
    const batches = this.data.batches
    batches[index].checkCount++
    this.setData({ batches })
    this.recalcTotals()
  },

  onAddBatch() {
    const batches = this.data.batches
    batches.push({
      detailId: '',
      batchNo: '',
      productionDate: '',
      expiryDate: '',
      locationCode: this.data.location || '',
      stockCount: 0,
      checkCount: 0,
      diff: 0,
      isNearExpiry: false,
      isExpired: false,
      isNew: true
    })
    this.setData({ batches })
    this.recalcTotals()
  },

  onNewBatchNoInput(e) {
    const index = e.currentTarget.dataset.index
    const batches = this.data.batches
    batches[index].batchNo = e.detail.value
    this.setData({ batches })
  },

  onNewBatchExpiryInput(e) {
    const index = e.currentTarget.dataset.index
    const batches = this.data.batches
    batches[index].expiryDate = e.detail.value
    this.setData({ batches })
  },

  onRemoveBatch(e) {
    const index = e.currentTarget.dataset.index
    const batches = this.data.batches
    if (!batches[index].isNew) {
      showError('已有批次不可删除')
      return
    }
    batches.splice(index, 1)
    this.setData({ batches })
    this.recalcTotals()
  },

  // ====== 单批次模式处理（兼容） ======

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
    this.setData({ searching: true, product: null, batches: [] })
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
    const raw = String(e.detail.value)
    const matched = raw.match(/^\d+/)
    let val = matched ? parseInt(matched[0], 10) : 0
    if (isNaN(val) || val < 0) val = 0
    this.setData({ checkCount: val })
  },

  onSelectLocation() {
    api.get('/locations').then(locations => {
      const list = locations.map(l => ({
        code: l.code || l,
        name: l.name || l.code || l
      }))
      wx.showActionSheet({
        itemList: list.map(l => l.name),
        success: (res) => {
          this.setData({ location: list[res.tapIndex].code })
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

    if (this.data.multiBatch) {
      await this.saveMultiBatch()
    } else {
      await this.saveSingle()
    }
  },

  async saveSingle() {
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
      // 保存阶段不修正库存，提示前往审核
      this.showUndoToast(result, this.data.product.stockCount)
      wx.showModal({
        title: '已提交待审核',
        content: '盘点单 ' + (result.checkNo || '') + ' 已保存，审核通过后将修正库存。是否前往盘点记录审核？',
        confirmText: '去审核',
        cancelText: '继续盘点',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: '/pages/records/records' })
          }
        }
      })
    } catch (err) {
      showError(err.message || '保存失败')
    } finally {
      this.setData({ saving: false })
    }
  },

  async saveMultiBatch() {
    const batches = this.data.batches
    // 校验新增批次必须填写批号
    for (let i = 0; i < batches.length; i++) {
      const b = batches[i]
      if (b.isNew && !b.batchNo) {
        showError('第 ' + (i + 1) + ' 行新增批次请填写批号')
        return
      }
    }

    this.setData({ saving: true })
    try {
      const originalStockCount = this.data.totalStock
      const saveData = {
        productId: this.data.product.id,
        productName: this.data.product.name,
        remark: this.data.remark,
        items: batches.map(b => ({
          detailId: b.detailId || undefined,
          batchNo: b.batchNo,
          productionDate: b.productionDate || undefined,
          expiryDate: b.expiryDate || undefined,
          locationCode: b.locationCode,
          stockCount: b.stockCount,
          checkCount: b.checkCount
        }))
      }

      const result = await api.post('/check/save-batch', saveData)
      wx.vibrateShort({ type: 'heavy' })
      // 保存阶段不修正库存，提示前往审核
      this.showUndoToast(result, originalStockCount)
      wx.showModal({
        title: '已提交待审核',
        content: '盘点单 ' + (result.checkNo || '') + ' 已保存，审核通过后将修正库存。是否前往盘点记录审核？',
        confirmText: '去审核',
        cancelText: '继续盘点',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: '/pages/records/records' })
          }
        }
      })
    } catch (err) {
      showError(err.message || '保存失败')
    } finally {
      this.setData({ saving: false })
    }
  },

  showUndoToast(savedItem, originalStockCount) {
    if (this._undoTimer) clearTimeout(this._undoTimer)
    this.setData({
      lastSaved: { ...savedItem, stockCount: originalStockCount },
      showUndo: true
    })
    this._undoTimer = setTimeout(() => {
      this.setData({ showUndo: false })
      setTimeout(() => this.setData({ lastSaved: null }), 300)
    }, 5000)
  },

  async onUndo() {
    if (this._undoTimer) clearTimeout(this._undoTimer)
    const saved = this.data.lastSaved
    if (!saved || !saved.id) {
      this.setData({ showUndo: false, lastSaved: null })
      return
    }
    wx.showLoading({ title: '撤销中...', mask: true })
    try {
      // 撤销仅作废 pending 单据，库存未被修改无需回滚
      await api.del('/check/' + saved.id)
      this.setData({ showUndo: false, lastSaved: null })
      wx.hideLoading()
      wx.showToast({ title: '已撤销', icon: 'success' })
    } catch (err) {
      wx.hideLoading()
      showError(err.message || '撤销失败')
      this.setData({ showUndo: true })
    }
  },

  onContinueScan() {
    this.setData({
      product: null,
      remark: '',
      checkCount: 0,
      infoFoldOpen: false,
      searchResults: [],
      batches: [],
      multiBatch: false,
      totalStock: 0,
      totalCheck: 0,
      totalDiff: 0
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

  async searchLocation(locationCode) {
    this.setData({ searching: true, locationProducts: [] })
    try {
      const res = await api.get('/inventory', { locationCode })
      const locationProducts = (res.list || []).map(item => ({
        id: item.productId,
        name: item.product && item.product.name,
        spec: item.product && item.product.spec,
        unit: (item.product && item.product.unit && (item.product.unit.name || item.product.unit)) || '',
        stockCount: item.quantity,
        image: item.product && item.product.image,
        approvalNo: item.product && item.product.approvalNo,
        location: locationCode,
        batchNo: item.batches && item.batches[0] && item.batches[0].batchNo,
        expiryDate: item.batches && item.batches[0] && item.batches[0].expiryDate
      }))
      this.setData({ locationProducts, searching: false })
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
