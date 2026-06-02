const config = require('./config/index')
const { storage } = require('./utils/storage')

App({
  onLaunch() {
    console.log('[App] onLaunch, env:', config.env, 'version:', config.version)
    this.checkLogin()
    this.initNetworkMonitor()
  },

  onShow(options) {
    console.log('[App] onShow, scene:', options.scene)
  },

  onHide() {
    console.log('[App] onHide')
  },

  onError(err) {
    console.error('[App] Global error:', err)
    this.reportError('onError', err)
  },

  onUnhandledRejection(res) {
    console.error('[App] Unhandled rejection:', res.reason)
    this.reportError('unhandledRejection', res.reason)
  },

  onPageNotFound(res) {
    console.error('[App] Page not found:', res.path)
    wx.redirectTo({ url: '/pages/index/index' })
  },

  globalData: {
    userInfo: null,
    isLoggedIn: false,
    isOnline: true,
    networkType: 'unknown'
  },

  checkLogin() {
    const token = storage.get('token')
    const userInfo = storage.get('userInfo')
    if (token && userInfo) {
      this.globalData.isLoggedIn = true
      this.globalData.userInfo = userInfo
    }
  },

  login(userInfo, token) {
    storage.set('token', token)
    storage.set('userInfo', userInfo)
    this.globalData.isLoggedIn = true
    this.globalData.userInfo = userInfo
  },

  logout() {
    storage.remove('token')
    storage.remove('userInfo')
    this.globalData.isLoggedIn = false
    this.globalData.userInfo = null
    wx.reLaunch({ url: '/pages/login/login' })
  },

  initNetworkMonitor() {
    wx.getNetworkType({
      success: (res) => {
        this.globalData.networkType = res.networkType
        this.globalData.isOnline = res.networkType !== 'none'
      }
    })

    wx.onNetworkStatusChange((res) => {
      const prevOnline = this.globalData.isOnline
      this.globalData.isOnline = res.isConnected
      this.globalData.networkType = res.networkType

      if (!prevOnline && res.isConnected) {
        console.log('[App] Network restored')
        wx.showToast({ title: '网络已恢复', icon: 'success', duration: 2000 })
      } else if (prevOnline && !res.isConnected) {
        console.log('[App] Network lost')
        wx.showToast({ title: '网络已断开', icon: 'none', duration: 2000 })
      }
    })
  },

  reportError(type, error) {
    if (!config.debug) {
      const errorInfo = {
        type,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : '',
        timestamp: Date.now(),
        appVersion: config.version,
        env: config.env
      }
      console.log('[App] Error report:', JSON.stringify(errorInfo))
    }
  }
})
