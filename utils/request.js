const config = require('../config/index')
const { storage } = require('./storage')
const mockHandler = config.useMock ? require('../mock/data').handle : null

// 请求去重 Map: key -> { promise, requestTask }
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

  // 去重：相同请求进行中的直接复用
  if (pendingRequests.has(requestKey)) {
    return pendingRequests.get(requestKey).promise
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
      const requestTask = wx.request({
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

          if ((res.statusCode === 200 || res.statusCode === 201) && res.data && res.data.code === 200) {
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
          // 请求被取消时静默处理
          if (err.errMsg && err.errMsg.indexOf('abort') !== -1) {
            pendingRequests.delete(requestKey)
            reject(new Error('请求已取消'))
            return
          }
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

      // 保存 requestTask 以便取消
      const entry = pendingRequests.get(requestKey)
      if (entry) {
        entry.requestTask = requestTask
      }
    }

    doRequest(0)
  })

  pendingRequests.set(requestKey, { promise: requestPromise, requestTask: null })
  return requestPromise
}

/**
 * 取消指定请求
 */
function cancelRequest(url, method = 'GET', data) {
  const key = getRequestKey(url, method, data)
  const entry = pendingRequests.get(key)
  if (entry) {
    if (entry.requestTask) {
      entry.requestTask.abort()
    }
    pendingRequests.delete(key)
  }
}

/**
 * 取消所有进行中的请求
 */
function cancelAllRequests() {
  pendingRequests.forEach((entry) => {
    if (entry.requestTask) {
      entry.requestTask.abort()
    }
  })
  pendingRequests.clear()
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

module.exports = { request, api, cancelRequest, cancelAllRequests }
