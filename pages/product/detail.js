const { api } = require('../../utils/request')
const { showError } = require('../../utils/util')

const LOG_TYPE_MAP = {
  purchase_in: { label: '入库', title: '采购入库', tagClass: 'in', qtyClass: 'plus' },
  sales_out:   { label: '出库', title: '销售出库', tagClass: 'out', qtyClass: 'minus' },
  check:       { label: '调整', title: '盘点调整', tagClass: 'adj', qtyClass: 'plus' },
  adjust:      { label: '调整', title: '手动调整', tagClass: 'adj', qtyClass: 'plus' }
}

Page({
  data: {
    pageLoading: true,
    productId: null,
    product: null,
    inventory: null,
    warehouses: [],
    logs: [],
    stockAmount: '0.00',
    isLowStock: false,
    statusLabel: '',
    statusClass: ''
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ productId: options.id })
      this.loadData()
    }
  },

  async loadData() {
    this.setData({ pageLoading: true })
    try {
      const [product, invRes] = await Promise.all([
        api.get(`/products/${this.data.productId}`),
        api.get(`/inventory/product/${this.data.productId}`)
      ])

      if (!product) {
        showError('商品不存在')
        setTimeout(() => wx.navigateBack(), 1200)
        return
      }

      // 关联对象取 .name
      const unitName = (product.unit && product.unit.name) ? product.unit.name : ''
      const categoryName = (product.category && product.category.name) ? product.category.name : ''
      const price = parseFloat(product.price) || 0

      // 库存解构
      const inv = (invRes && invRes.inventory) ? invRes.inventory : null
      const rawLogs = (invRes && invRes.logs) ? invRes.logs.slice(0, 8) : []
      const quantity = inv ? (inv.quantity || 0) : 0
      const warehouses = (inv && inv.warehouses) ? inv.warehouses : []
      const stockAmount = (quantity * price).toFixed(2)
      const minQty = product.minQuantity || 0
      const isLowStock = minQty > 0 && quantity <= minQty

      // 日志预处理：WXML 只做渲染，不做计算
      const logs = rawLogs.map(log => {
        const meta = LOG_TYPE_MAP[log.type] || { label: '其他', title: log.type, tagClass: 'adj', qtyClass: 'plus' }
        const absQty = Math.abs(log.changeQuantity || 0)
        const prefix = log.type === 'sales_out' ? '-' : '+'
        return {
          ...log,
          tagLabel: meta.label,
          tagTitle: meta.title,
          tagClass: meta.tagClass,
          qtyClass: meta.qtyClass,
          qtyDisplay: prefix + absQty,
          timeDisplay: (log.createdAt || '').replace('T', ' ').substring(0, 16)
        }
      })

      this.setData({
        product: { ...product, unitName, categoryName, price: price.toFixed(2) },
        inventory: inv,
        warehouses,
        logs,
        stockAmount,
        isLowStock,
        statusLabel: isLowStock ? '库存偏低' : (quantity > 0 ? '库存正常' : '暂无库存'),
        statusClass: isLowStock ? 'status-low' : (quantity > 0 ? 'status-ok' : 'status-empty'),
        pageLoading: false
      })
    } catch (err) {
      console.error('[ProductDetail] loadData error:', err)
      showError(err.message)
      this.setData({ pageLoading: false })
    }
  },

  onEdit() {
    wx.navigateTo({ url: '/pages/product/form?id=' + this.data.productId })
  },

  goBack() {
    wx.navigateBack()
  }
})
