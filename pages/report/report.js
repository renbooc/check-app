const { api } = require('../../utils/request')
const { showError, formatDate } = require('../../utils/util')

Page({
  data: {
    // 日期选择
    activePeriod: 'month',
    dateRangeText: '',
    startDate: '',
    endDate: '',
    showCustom: false,
    customStart: '',
    customEnd: '',

    // 加载状态
    loading: true,

    // 报表数据
    report: {
      totalSales: '0.00',
      salesCount: 0,
      totalPurchase: '0.00',
      purchaseCount: 0,
      grossProfit: '0.00',
      profitRate: '0',
      turnoverRate: '0',
      topProducts: [],
      lowStockProducts: []
    }
  },

  onShow() {
    this.setPeriod('month')
  },

  onPullDownRefresh() {
    this.loadReport().then(() => wx.stopPullDownRefresh())
  },

  // 切换时间周期
  onSwitchPeriod(e) {
    const period = e.currentTarget.dataset.period
    if (period === 'custom') {
      this.setData({ showCustom: true })
      return
    }
    this.setData({ showCustom: false })
    this.setPeriod(period)
  },

  // 设置时间周期
  setPeriod(period) {
    const now = new Date()
    let start, end
    const today = formatDate(now, 'YYYY-MM-DD')

    switch (period) {
      case 'today':
        start = today
        end = today
        break
      case 'week':
        const dayOfWeek = now.getDay() || 7
        const weekStart = new Date(now)
        weekStart.setDate(now.getDate() - dayOfWeek + 1)
        start = formatDate(weekStart, 'YYYY-MM-DD')
        end = today
        break
      case 'month':
      default:
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        start = formatDate(monthStart, 'YYYY-MM-DD')
        end = today
        break
    }

    this.setData({
      activePeriod: period,
      startDate: start,
      endDate: end,
      dateRangeText: start === end ? start : start + ' ~ ' + end
    })
    this.loadReport()
  },

  // 自定义日期输入
  onCustomStartChange(e) {
    this.setData({ customStart: e.detail.value })
  },

  onCustomEndChange(e) {
    this.setData({ customEnd: e.detail.value })
  },

  onApplyCustomDate() {
    const { customStart, customEnd } = this.data
    if (!customStart || !customEnd) {
      showError('请选择起止日期')
      return
    }
    if (customStart > customEnd) {
      showError('开始日期不能晚于结束日期')
      return
    }
    this.setData({
      activePeriod: 'custom',
      startDate: customStart,
      endDate: customEnd,
      dateRangeText: customStart + ' ~ ' + customEnd,
      showCustom: false
    })
    this.loadReport()
  },

  onCancelCustom() {
    this.setData({ showCustom: false })
  },

  // 加载报表数据
  async loadReport() {
    this.setData({ loading: true })
    try {
      const params = {
        startDate: this.data.startDate,
        endDate: this.data.endDate
      }

      const [overviewRes, topRes, lowRes] = await Promise.all([
        api.get('/report/overview', params),
        api.get('/report/top-products', { limit: 5, ...params }),
        api.get('/report/low-stock')
      ])

      const totalSales = parseFloat(overviewRes.todaySales || 0)
      const totalPurchase = parseFloat(overviewRes.todayPurchase || 0)
      const grossProfit = totalSales - totalPurchase
      const profitRate = totalSales > 0 ? ((grossProfit / totalSales) * 100).toFixed(1) : '0'

      this.setData({
        loading: false,
        report: {
          totalSales: totalSales.toFixed(2),
          salesCount: overviewRes.todaySalesCount || 0,
          totalPurchase: totalPurchase.toFixed(2),
          purchaseCount: overviewRes.todayPurchaseCount || 0,
          grossProfit: grossProfit.toFixed(2),
          profitRate,
          turnoverRate: overviewRes.turnoverRate || '0',
          topProducts: topRes.list || [],
          lowStockProducts: lowRes.list || []
        }
      })
    } catch (err) {
      console.error('[Report] load error:', err)
      showError(err.message)
      this.setData({ loading: false })
    }
  }
})
