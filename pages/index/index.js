const { api } = require('../../utils/request')
const { showError, formatDate } = require('../../utils/util')

const app = getApp()

const WEEKDAY_MAP = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']

const PURCHASE_STATUS_TEXT = {
  draft: '草稿',
  pending: '待审核',
  approved: '已审核',
  received: '已入库',
  cancelled: '已取消'
}

const SALES_STATUS_TEXT = {
  draft: '草稿',
  pending: '待审核',
  approved: '已审核',
  delivered: '已出库',
  cancelled: '已取消'
}

function formatMoney(value) {
  const num = parseFloat(value)
  if (isNaN(num)) return '0.00'
  return num.toFixed(2)
}

function formatRelativeTime(isoString) {
  if (!isoString) return ''
  const date = new Date(isoString)
  if (isNaN(date.getTime())) return ''

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diffDays = Math.round((today - target) / 86400000)

  const hm = formatDate(date, 'HH:mm')
  if (diffDays === 0) return '今天 ' + hm
  if (diffDays === 1) return '昨天 ' + hm
  if (diffDays > 1 && diffDays < 7) return diffDays + '天前'
  return formatDate(date, 'MM-DD')
}

Page({
  data: {
    pageLoading: true,
    loaded: false,
    networkError: false,
    // 顶栏（预计算，避免 WXML || 链）
    todayDate: '',
    weekdayText: '',
    greeting: '',
    avatarUrl: '/images/avatar.png',
    // 消息未读红点
    unreadDotCls: 'unread-dot unread-dot-hidden',
    // 销售 Hero
    todaySalesDisplay: '0.00',
    salesCountText: '0 笔订单',
    purchaseText: '采购 ¥0.00',
    marginText: '毛利 ¥0.00',
    showTrend: false,
    trendCls: '',
    trendArrow: '',
    trendNumText: '0%',
    // KPI
    inventoryValueDisplay: '0.00',
    productCountText: '0 种商品',
    pendingChecks: 0,
    pendingWarnCls: '',
    customerCount: 0,
    // 订单
    orderTab: 'purchase',
    purchaseTabCls: 'orders-tab orders-tab-active',
    salesTabCls: 'orders-tab',
    currentOrders: [],
    showOrders: false,
    ordersEmptyText: '暂无采购订单',
    orderTabLabel: '采购'
  },

  onShow() {
    this.setHeaderInfo()
    this.loadDashboard()
    this.loadUnreadCount()
  },

  onRetry() {
    this.setData({ networkError: false })
    this.loadDashboard()
    this.loadUnreadCount()
  },

  onPullDownRefresh() {
    this.loadDashboard().then(function () { wx.stopPullDownRefresh() })
    this.loadUnreadCount()
  },

  setHeaderInfo() {
    var now = new Date()
    var hour = now.getHours()
    var greeting = '早上好'
    if (hour >= 12 && hour < 18) greeting = '下午好'
    else if (hour >= 18) greeting = '晚上好'

    var user = app.globalData.userInfo || {}
    var userName = user.name || user.username || '用户'

    this.setData({
      todayDate: formatDate(now, 'YYYY-MM-DD'),
      weekdayText: WEEKDAY_MAP[now.getDay()],
      greeting: greeting + '，' + userName,
      avatarUrl: user.avatar || '/images/avatar.png'
    })
  },

  async loadDashboard() {
    this.setData({ pageLoading: true })
    try {
      var results = await Promise.all([
        api.get('/inventory/overview'),
        api.get('/purchase', { page: 1, pageSize: 3 }),
        api.get('/sales', { page: 1, pageSize: 3 })
      ])

      var overviewRes = results[0]
      var purchaseRes = results[1]
      var salesRes = results[2]

      var purchaseList = this.normalizeOrders((purchaseRes && purchaseRes.list) || [], 'purchase')
      var salesList = this.normalizeOrders((salesRes && salesRes.list) || [], 'sales')

      var todaySales = parseFloat(overviewRes.todaySales) || 0
      var todayPurchase = parseFloat(overviewRes.todayPurchase) || 0
      var monthSales = parseFloat(overviewRes.monthSales) || 0
      var trend = parseFloat(overviewRes.salesTrend) || 0
      var trendAbs = Math.abs(trend)
      var pendingChecks = overviewRes.pendingChecks || 0

      var tab = this.data.orderTab
      this.setData({
        loaded: true,
        pageLoading: false,
        // Hero
        todaySalesDisplay: formatMoney(todaySales),
        salesCountText: (overviewRes.todaySalesCount || 0) + ' 笔订单',
        purchaseText: '今日采购 ¥' + formatMoney(todayPurchase),
        marginText: '本月销售 ¥' + formatMoney(monthSales),
        showTrend: trend !== 0,
        trendCls: trend > 0 ? 'trend trend-up' : 'trend trend-down',
        trendArrow: trend > 0 ? '↑' : '↓',
        trendNumText: trendAbs + '%',
        // KPI
        inventoryValueDisplay: formatMoney(overviewRes.inventoryValue),
        productCountText: (overviewRes.productCount || 0) + ' 种商品',
        pendingChecks: pendingChecks,
        pendingWarnCls: pendingChecks > 0 ? 'kpi-num kpi-num-warn' : 'kpi-num',
        customerCount: overviewRes.customerCount || 0,
        // 订单
        currentOrders: tab === 'purchase' ? purchaseList : salesList,
        showOrders: (tab === 'purchase' ? purchaseList : salesList).length > 0,
        ordersEmptyText: tab === 'purchase' ? '暂无采购订单' : '暂无销售订单',
        // 缓存
        recentPurchase: purchaseList,
        recentSales: salesList
      })
    } catch (err) {
      console.error('[Dashboard] load error:', err)
      this.setData({ pageLoading: false, networkError: true })
    }
  },

  normalizeOrders(list, type) {
    var statusMap = type === 'purchase' ? PURCHASE_STATUS_TEXT : SALES_STATUS_TEXT
    var partyField = type === 'purchase' ? 'supplier' : 'customer'
    return list.map(function (item) {
      var party = item[partyField]
      return {
        id: item.id,
        orderNo: item.orderNo || '-',
        status: item.status || 'draft',
        statusText: statusMap[item.status] || item.status || '-',
        partyName: (party && party.name) || '-',
        totalAmount: item.totalAmount || '0.00',
        timeText: formatRelativeTime(item.createdAt)
      }
    })
  },

  onSwitchTab(e) {
    var tab = e.currentTarget.dataset.tab
    if (tab === this.data.orderTab) return
    var orders = tab === 'purchase' ? this.data.recentPurchase : this.data.recentSales
    this.setData({
      orderTab: tab,
      purchaseTabCls: tab === 'purchase' ? 'orders-tab orders-tab-active' : 'orders-tab',
      salesTabCls: tab === 'sales' ? 'orders-tab orders-tab-active' : 'orders-tab',
      currentOrders: orders,
      showOrders: orders.length > 0,
      ordersEmptyText: orders.length === 0
        ? (tab === 'purchase' ? '暂无采购订单' : '暂无销售订单')
        : '',
      orderTabLabel: tab === 'purchase' ? '采购' : '销售'
    })
  },

  onGoMessage() {
    wx.navigateTo({ url: '/pages/message/message' })
  },

  onGoProduct() {
    wx.navigateTo({ url: '/pages/product/list' })
  },

  onGoWarehouse() {
    wx.navigateTo({ url: '/pages/warehouse/list' })
  },

  onGoMore() {
    wx.switchTab({ url: '/pages/mine/mine' })
  },

  loadUnreadCount() {
    var that = this
    api.get('/report/notifications', { unread: true, pageSize: 1 }).then(function (res) {
      var activeCount = (res && (res.activeCount !== undefined ? res.activeCount : res.total)) || 0
      that.setData({
        unreadDotCls: activeCount > 0 ? 'unread-dot' : 'unread-dot unread-dot-hidden'
      })
    }).catch(function (err) {
      console.warn('[Index] loadUnreadCount error:', err && err.message)
      // 请求失败时默认隐藏红点
      that.setData({
        unreadDotCls: 'unread-dot unread-dot-hidden'
      })
    })
  },

  onGoReport() {
    wx.switchTab({ url: '/pages/report/report' })
  },

  onGoStock() {
    wx.navigateTo({ url: '/pages/stock/stock' })
  },

  onGoCheck() {
    wx.navigateTo({ url: '/pages/check/check' })
  },

  onGoCustomer() {
    wx.navigateTo({ url: '/pages/customer/list' })
  },

  onQuickAction(e) {
    var type = e.currentTarget.dataset.type
    switch (type) {
      case 'purchase':
        wx.navigateTo({ url: '/pages/purchase/list' })
        break
      case 'sales':
        wx.navigateTo({ url: '/pages/sales/list' })
        break
      case 'check':
        wx.navigateTo({ url: '/pages/check/check' })
        break
      case 'scan':
        wx.scanCode({
          onlyFromCamera: false,
          scanType: ['barCode', 'qrCode'],
          success: function (res) {
            wx.navigateTo({ url: '/pages/stock/stock?keyword=' + encodeURIComponent(res.result) })
          }
        })
        break
      case 'inbound':
        wx.navigateTo({ url: '/pages/inbound/list' })
        break
      case 'outbound':
        wx.navigateTo({ url: '/pages/outbound/list' })
        break
    }
  },

  onViewAll() {
    var url = this.data.orderTab === 'purchase'
      ? '/pages/purchase/list'
      : '/pages/sales/list'
    wx.navigateTo({ url: url })
  },

  onOrderTap(e) {
    var id = e.currentTarget.dataset.id
    var type = e.currentTarget.dataset.type
    var url = type === 'purchase'
      ? '/pages/purchase/form?id=' + id
      : '/pages/sales/form?id=' + id
    wx.navigateTo({ url: url })
  }
})
