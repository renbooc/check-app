/**
 * 通用工具函数
 */

/**
 * 格式化日期
 */
function formatDate(date, fmt) {
  if (typeof date === 'string' || typeof date === 'number') {
    date = new Date(date)
  }
  if (!fmt) fmt = 'YYYY-MM-DD HH:mm'
  const map = {
    'YYYY': date.getFullYear(),
    'MM': String(date.getMonth() + 1).padStart(2, '0'),
    'DD': String(date.getDate()).padStart(2, '0'),
    'HH': String(date.getHours()).padStart(2, '0'),
    'mm': String(date.getMinutes()).padStart(2, '0'),
    'ss': String(date.getSeconds()).padStart(2, '0')
  }
  let result = fmt
  Object.keys(map).forEach(key => {
    result = result.replace(key, map[key])
  })
  return result
}

/**
 * 格式化数字（千分位）
 */
function formatNumber(num) {
  if (num === null || num === undefined) return '0'
  return Number(num).toLocaleString()
}

/**
 * 防抖
 */
function debounce(fn, delay) {
  let timer = null
  return function (...args) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      fn.apply(this, args)
      timer = null
    }, delay)
  }
}

/**
 * 节流
 */
function throttle(fn, interval) {
  let lastTime = 0
  return function (...args) {
    const now = Date.now()
    if (now - lastTime >= interval) {
      fn.apply(this, args)
      lastTime = now
    }
  }
}

/**
 * 显示全局错误提示
 */
function showError(msg) {
  wx.showToast({
    title: msg || '操作失败',
    icon: 'none',
    duration: 2500
  })
}

/**
 * 显示全局成功提示
 */
function showSuccess(msg) {
  wx.showToast({
    title: msg || '操作成功',
    icon: 'success',
    duration: 2000
  })
}

/**
 * 生成唯一ID
 */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
}

module.exports = {
  formatDate,
  formatNumber,
  debounce,
  throttle,
  showError,
  showSuccess,
  generateId
}
