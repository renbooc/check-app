const config = require('../../config/index')

Page({
  data: {
    version: ''
  },

  onLoad() {
    this.setData({ version: config.version || '2.0.0' })
  }
})
