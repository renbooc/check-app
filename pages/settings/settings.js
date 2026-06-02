const { showSuccess } = require('../../utils/util')
const config = require('../../config/index')

Page({
  data: {
    serverUrl: '',
    version: ''
  },

  onLoad() {
    this.setData({
      serverUrl: config.baseUrl || '未配置',
      version: config.version || '2.0.0'
    })
  },

  onClearCache() {
    wx.showModal({
      title: '清除缓存',
      content: '确定要清除本地缓存数据吗？',
      success: (res) => {
        if (res.confirm) {
          wx.clearStorageSync()
          showSuccess('缓存已清除')
        }
      }
    })
  }
})
