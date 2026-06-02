const config = require('../config/index')
const { storage } = require('./storage')
const mockHandler = config.useMock ? require('../mock/data').handle : null

const pendingRequests = new Map()

function getRequestKey(url, method, data) {
  return `${method}:${url}:${JSON.stringify(data || {})}`
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function request(options) {
  const { url, method = 'GET', data, showLoading = false, retryCount = 0 } = options
  const maxRetries = config.maxRetries || 2

  if (showLoading) {
    wx.showLoading({ title: '加载中...', mask: true })
  }

  const requestKey = getRequestKey(url, method, data)

  if (pendingRequests.has(requestKey)) {
    return pendingRequests.get(requestKey)
  }

  const requestPromise = new Promise((resolve, reject) => {
    // Mock 模式：直接返回模拟数据
    if (mockHandler) {
      if (showLoading) wx.hideLoading()
      const result = mockHandler(url, method, data)
      pendingRequests.delete(requestKey)
      if (result.success) {
        resolve(result.data)
      } else {
        reject(new Error(result.message || '请求失败'))
      }
      return
    }

    function doRequest(attempt) {
      const token = storage.get('token')
      wx.request({
        url: config.baseUrl + url,
        method,
        data,
        timeout: config.requestTimeout,
        header: {
          'Content-Type': 'application/json',
          'Authorization': token ? ('Bearer ' + token) : ''
        },
        success(res) {
          if (showLoading) wx.hideLoading()

          if (res.statusCode === 200 && res.data.code === 200) {
            pendingRequests.delete(requestKey)
            resolve(res.data.data)
          } else if (res.statusCode === 401 || (res.data && res.data.code === 401)) {
            pendingRequests.delete(requestKey)
            storage.remove('token')
            storage.remove('userInfo')
            wx.reLaunch({ url: '/pages/login/login' })
            reject(new Error('登录已过期'))
          } else if (res.statusCode >= 500 && attempt < maxRetries) {
            console.warn(`[API] retry ${attempt + 1}/${maxRetries}:`, url)
            sleep(config.retryDelay * (attempt + 1)).then(() => {
              doRequest(attempt + 1)
            })
          } else {
            pendingRequests.delete(requestKey)
            const errMsg = (res.data && res.data.message) || '请求失败'
            reject(new Error(errMsg))
          }
        },
        fail(err) {
          if (showLoading) wx.hideLoading()
          if (attempt < maxRetries) {
            console.warn(`[API] network retry ${attempt + 1}/${maxRetries}:`, url)
            sleep(config.retryDelay * (attempt + 1)).then(() => {
              doRequest(attempt + 1)
            })
          } else {
            pendingRequests.delete(requestKey)
            reject(new Error('网络连接失败，请检查网络'))
          }
        }
      })
    }
    doRequest(0)
  })

  pendingRequests.set(requestKey, requestPromise)
  return requestPromise
}

const api = {
  get(url, data, options = {}) {
    return request({ url, method: 'GET', data, ...options })
  },
  post(url, data, options = {}) {
    return request({ url, method: 'POST', data, ...options })
  },
  put(url, data, options = {}) {
    return request({ url, method: 'PUT', data, ...options })
  },
  del(url, data, options = {}) {
    return request({ url, method: 'DELETE', data, ...options })
  }
}

module.exports = { request, api }
