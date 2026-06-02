/**
 * 本地存储管理
 * 统一前缀、过期机制、异常处理
 */
const config = require('../config/index')

const PREFIX = config.storagePrefix || 'app_'

const storage = {
  set(key, value, expireMinutes) {
    const data = {
      value,
      createTime: Date.now(),
      expireTime: expireMinutes ? Date.now() + expireMinutes * 60 * 1000 : null
    }
    try {
      wx.setStorageSync(PREFIX + key, JSON.stringify(data))
    } catch (e) {
      console.error('[Storage] set error:', key, e)
    }
  },

  get(key) {
    try {
      const raw = wx.getStorageSync(PREFIX + key)
      if (!raw) return null
      const data = JSON.parse(raw)
      if (data.expireTime && Date.now() > data.expireTime) {
        this.remove(key)
        return null
      }
      return data.value
    } catch (e) {
      console.error('[Storage] get error:', key, e)
      return null
    }
  },

  remove(key) {
    try {
      wx.removeStorageSync(PREFIX + key)
    } catch (e) {
      console.error('[Storage] remove error:', key, e)
    }
  },

  clear() {
    try {
      wx.clearStorageSync()
    } catch (e) {
      console.error('[Storage] clear error:', e)
    }
  }
}

module.exports = { storage }
