const { api } = require('../../utils/request')
const app = getApp()

Page({
  data: {
    userInfo: {},
    displayName: '未登录',
    avatarUrl: '/images/avatar.png',
    stats: {
      productCount: 0,
      customerCount: 0,
      pendingChecks: 0
    },
    pendingChecksWarnCls: ''
  },

  onShow() {
    const user = app.globalData.userInfo || {}
    this.setData({
      userInfo: user,
      displayName: user.name || user.username || '未登录',
      avatarUrl: user.avatar || '/images/avatar.png',
      roleText: user.role === 'admin' ? '管理员' : '操作员'
    })
    this.loadUserStats()
  },

  async loadUserStats() {
    try {
      const res = await api.get('/inventory/overview')
      const pendingChecks = res.pendingChecks || res.pendingTypes || 0
      this.setData({
        stats: {
          productCount: res.productCount || 0,
          customerCount: res.customerCount || 0,
          pendingChecks: pendingChecks
        },
        pendingChecksWarnCls: pendingChecks > 0 ? 'stats-num stats-num-warn' : 'stats-num'
      })
    } catch (err) {
      console.warn('[Mine] stats load error:', err.message)
    }
  },

  onNavigate(e) {
    const url = e.currentTarget.dataset.url
    if (!url) return
    const tabBarPages = ['/pages/index/index', '/pages/erp/erp', '/pages/report/report', '/pages/mine/mine']
    if (tabBarPages.includes(url)) {
      wx.switchTab({ url })
    } else {
      wx.navigateTo({ url })
    }
  },

  onLogout() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出当前账号吗？',
      confirmColor: '#F53F3F',
      success: (res) => {
        if (res.confirm) {
          app.logout()
        }
      }
    })
  }
})
