/**
 * 常量定义
 */

// 盘点状态
const CHECK_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  DONE: 'done'
}

const CHECK_STATUS_TEXT = {
  pending: '待盘点',
  in_progress: '进行中',
  done: '已完成'
}

// 页面路径
const PAGES = {
  INDEX: '/pages/index/index',
  CHECK: '/pages/check/check',
  MINE: '/pages/mine/mine',
  LOGIN: '/pages/login/login',
  RECORDS: '/pages/records/records',
  STOCK: '/pages/stock/stock'
}

module.exports = {
  CHECK_STATUS,
  CHECK_STATUS_TEXT,
  PAGES
}
