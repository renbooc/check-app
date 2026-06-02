const BUILTIN_TYPES = ['success', 'success_no_circle', 'info', 'warn', 'waiting', 'cancel', 'download', 'search', 'clear']

Component({
  properties: {
    type: {
      type: String,
      value: 'info'
    },
    size: {
      type: Number,
      value: 20
    },
    color: {
      type: String,
      value: '#999999'
    }
  },

  data: {
    isBuiltin: false
  },

  attached() {
    this.setData({
      isBuiltin: BUILTIN_TYPES.indexOf(this.data.type) !== -1
    })
  }
})
