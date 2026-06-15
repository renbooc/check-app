const { api } = require('../../utils/request')
const { showError, showSuccess } = require('../../utils/util')

Page({
  data: {
    keyword: '',
    searched: false,
    list: [],
    page: 1,
    pageSize: 20,
    total: 0,
    loading: true,
    loaded: false,

    // 弹窗
    showModal: false,
    editingId: null,
    form: {
      code: '',
      name: '',
      contactPerson: '',
      phone: '',
      address: '',
      remark: ''
    }
  },

  onShow() {
    this.resetList()
  },

  onPullDownRefresh() {
    this.resetList().then(() => wx.stopPullDownRefresh())
  },

  onReachBottom() {
    if (this.data.list.length < this.data.total && !this.data.loading) {
      this.setData({ page: this.data.page + 1 })
      this.loadList(true)
    }
  },

  // ==================== 搜索 ====================

  onSearchInput(e) {
    this.setData({ keyword: e.detail.value })
  },

  onSearch() {
    this.setData({ searched: true })
    this.resetList()
  },

  onClearSearch() {
    this.setData({ keyword: '', searched: false })
    this.resetList()
  },

  // ==================== 数据 ====================

  async resetList() {
    this.setData({ page: 1, list: [], loading: true })
    await this.loadList(false)
  },

  async loadList(append) {
    try {
      const params = { page: this.data.page, pageSize: this.data.pageSize }
      if (this.data.keyword) params.keyword = this.data.keyword
      const res = await api.get('/suppliers', params)
      const enriched = (res.list || []).map(this.enrichItem.bind(this))
      this.setData({
        list: append ? [...this.data.list, ...enriched] : enriched,
        total: res.total || 0,
        loading: false,
        loaded: true,
      })
    } catch (err) {
      showError(err.message)
      this.setData({ loading: false, loaded: true })
    }
  },

  enrichItem(item) {
    return {
      ...item,
      initial: (item.name && item.name[0]) || '?',
      phone: item.phone || '',
    }
  },

  // ==================== 弹窗 ====================

  onAdd() {
    this.setData({
      showModal: true,
      editingId: null,
      form: { code: '', name: '', contactPerson: '', phone: '', address: '', remark: '' }
    })
  },

  async onEdit(e) {
    const id = e.currentTarget.dataset.id
    try {
      const item = await api.get('/suppliers/' + id)
      this.setData({
        showModal: true,
        editingId: id,
        form: {
          code: item.code || '',
          name: item.name || '',
          contactPerson: item.contactPerson || '',
          phone: item.phone || '',
          address: item.address || '',
          remark: item.remark || ''
        }
      })
    } catch (err) {
      showError(err.message)
    }
  },

  onCloseModal() {
    this.setData({ showModal: false })
  },

  onFormFieldInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ ['form.' + field]: e.detail.value })
  },

  async onSave() {
    const { form, editingId } = this.data
    if (!form.name.trim()) {
      wx.showToast({ title: '请输入供应商名称', icon: 'none' })
      return
    }
    try {
      if (editingId) {
        await api.put('/suppliers/' + editingId, form)
      } else {
        await api.post('/suppliers', form)
      }
      showSuccess('保存成功')
      this.setData({ showModal: false })
      this.resetList()
    } catch (err) {
      showError(err.message)
    }
  },

  async onDelete() {
    const { editingId } = this.data
    wx.showModal({
      title: '确认删除',
      content: '删除后不可恢复，确定要删除该供应商吗？',
      confirmColor: '#ff4d4f',
      success: async (res) => {
        if (res.confirm) {
          try {
            await api.del('/suppliers/' + editingId)
            showSuccess('删除成功')
            this.setData({ showModal: false })
            this.resetList()
          } catch (err) {
            showError(err.message)
          }
        }
      }
    })
  },
})
