const { api } = require('../../utils/request')
const { showError } = require('../../utils/util')

Page({
  data: {
    // 搜索
    keyword: '',
    searched: false,

    // 分类
    categories: [],
    activeCategory: '',

    // 列表
    list: [],
    page: 1,
    pageSize: 20,
    total: 0,

    // 状态
    loading: true,
    loaded: false,
  },

  onShow() {
    this.loadCategories()
    this.resetList()
  },

  onPullDownRefresh() {
    this.resetList().then(() => wx.stopPullDownRefresh())
  },

  onReachBottom() {
    if (this.data.list.length < this.data.total && !this.data.loading) {
      const nextPage = this.data.page + 1
      this.setData({ page: nextPage })
      this.loadList(true)
    }
  },

  // ==================== 搜索 ====================

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

  // ==================== 分类筛选 ====================

  onFilterCategory(e) {
    const cid = e.currentTarget.dataset.cid
    if (cid === this.data.activeCategory) return
    this.setData({ activeCategory: cid })
    this.resetList()
  },

  // ==================== 数据加载 ====================

  async loadCategories() {
    try {
      const res = await api.get('/categories')
      this.setData({ categories: res || [] })
    } catch (_) {
      // 静默失败，不影响列表加载
    }
  },

  async resetList() {
    this.setData({ page: 1, list: [], loading: true })
    await this.loadList(false)
  },

  async loadList(append) {
    try {
      const params = {
        page: this.data.page,
        pageSize: this.data.pageSize,
      }
      if (this.data.keyword) params.keyword = this.data.keyword
      if (this.data.activeCategory) params.categoryId = this.data.activeCategory

      const res = await api.get('/products', params)
      const rawList = res.list || []

      // 补充库存状态标记
      const enriched = rawList.map(this.enrichProduct.bind(this))

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

  // ==================== 数据处理 ====================

  enrichProduct(item) {
    // 从 unit 对象提取单位名称
    const unitName = (item.unit && item.unit.name) || item.unitName || ''
    // 从 category 对象提取分类名称
    const categoryName = (item.category && item.category.name) || item.categoryName || ''

    // 模拟库存状态（真实环境应从 inventory 接口获取）
    // 在产品列表暂缺库存数据时默认显示 normal
    const stockStatus = 'normal'
    const stockLabel = stockStatus === 'low' ? '库存不足'
      : stockStatus === 'out' ? '缺货'
      : '库存正常'

    return {
      ...item,
      unitName,
      categoryName,
      stockStatus,
      stockLabel,
    }
  },

  // ==================== 跳转 ====================

  onAdd() {
    wx.navigateTo({ url: '/pages/product/form' })
  },

  onEdit(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/product/form?id=' + id })
  },
})
