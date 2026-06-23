var api = require('../../utils/request').api
var util = require('../../utils/util')

// sourceType → 跳转路由映射
var ROUTE_MAP = {
  purchase:  { url: '/pages/purchase/form',  needId: true },
  sales:     { url: '/pages/sales/form',     needId: true },
  inbound:   { url: '/pages/inbound/form',   needId: true },
  outbound:  { url: '/pages/outbound/form',  needId: true },
  check:     { url: '/pages/check/check',    needId: false },
  low_stock: { url: '/pages/stock/stock',    needId: false },
}

Page({
  data: {
    loading: true,
    loaded: false,
    list: [],
    showEmpty: false,
    showMarkAll: false,
    emptyText: '暂无消息通知'
  },

  onShow: function () {
    this.loadMessages()
  },

  onPullDownRefresh: function () {
    var that = this
    this.loadMessages().then(function () {
      wx.stopPullDownRefresh()
    })
  },

  loadMessages: function () {
    var that = this
    that.setData({ loading: true })
    return api.get('/report/notifications', {}).then(function (res) {
      var rawList = (res && res.list) || []
      var list = rawList.map(function (item) {
        return {
          id: item.id,
          title: item.title || '',
          content: item.content || item.message || '',
          timeText: util.formatDate(item.createdAt, 'MM-DD HH:mm'),
          itemCls: item.isRead ? 'msg-item msg-read' : 'msg-item',
          dotCls: item.isRead ? 'dot-hidden' : 'msg-dot',
          typeCls: 'msg-type msg-type-' + (item.type || 'info'),
          sourceType: item.sourceType,
          sourceId: item.sourceId,
        }
      })
      that.setData({
        loading: false,
        loaded: true,
        list: list,
        showEmpty: list.length === 0,
        showMarkAll: list.length > 0
      })
    }).catch(function (err) {
      console.warn('[Message] load error:', err.message)
      that.setData({
        loading: false,
        loaded: true,
        list: [],
        showEmpty: true,
        showMarkAll: false,
        emptyText: '加载失败，请下拉刷新'
      })
    })
  },

  onItemTap: function (e) {
    var id = e.currentTarget.dataset.id
    var index = e.currentTarget.dataset.index
    var item = this.data.list[index]
    if (!item) return

    // 标记已读
    if (item.itemCls.indexOf('msg-read') === -1) {
      var update = {}
      update['list[' + index + '].itemCls'] = 'msg-item msg-read'
      update['list[' + index + '].dotCls'] = 'dot-hidden'
      this.setData(update)
      api.put('/report/notifications/' + id + '/read').catch(function () {})
    }

    // 根据来源类型跳转
    this.navigateBySource(item)
  },

  /** 根据 sourceType 跳转到对应单据页面 */
  navigateBySource: function (item) {
    var route = ROUTE_MAP[item.sourceType]
    if (!route) return

    var url = route.url
    if (route.needId && item.sourceId) {
      // sourceId 格式为 "purchase-uuid", "inbound-uuid" 等，提取 uuid 部分
      var bizId = item.sourceId.replace(/^[a-z_]+-/, '')
      url += '?id=' + bizId
    }
    wx.navigateTo({ url: url })
  },

  onMarkAllRead: function () {
    var that = this
    var updatedList = this.data.list.map(function (item) {
      return Object.assign({}, item, {
        itemCls: 'msg-item msg-read',
        dotCls: 'dot-hidden'
      })
    })
    that.setData({ list: updatedList })
    api.put('/report/notifications/read-all').catch(function () {})
  }
})
