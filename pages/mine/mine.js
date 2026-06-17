const { api } = require('../../utils/request')
const app = getApp()

Page({
  data: {
    loading: true,
    userInfo: {},
    displayName: '未登录',
    avatarUrl: '/images/avatar.png',
    roleText: '操作员',
    stats: {
      productCount: 0,
      customerCount: 0,
      pendingChecks: 0
    },
    pendingChecks: 0
  },

  onShow() {
    const user = app.globalData.userInfo || {}
    const isAdmin = user.role === 'admin'
    const displayName = user.name || user.username || '未登录'
    this.setData({
      loading: false,
      userInfo: user,
      displayName: displayName,
      avatarUrl: user.avatar || '/images/icon-user.png',
      roleText: isAdmin ? '管理员' : '操作员'
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
        pendingChecks: pendingChecks
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

  onHelp() {
    wx.showToast({ title: '联系我们：support@rccjoy.com.cn', icon: 'none', duration: 3000 })
  },

  onLogout() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出当前账号吗？',
      confirmColor: '#F53F3F',
      confirmText: '退出',
      success: (res) => {
        if (res.confirm) {
          app.logout()
        }
      }
    })
  }
})
