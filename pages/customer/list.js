const { api } = require('../../utils/request')
const { showError, showSuccess } = require('../../utils/util')

const STATUS_VALUES = ['active', 'discontinued_sales', 'void']
const STATUS_NAMES = ['正常', '已停销', '已作废']

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

    showModal: false,
    editingId: null,
    form: {
      code: '',
      status: 'active',
      name: '',
      contactPerson: '',
      phone: '',
      address: '',
      remark: '',
    },
    statusNames: STATUS_NAMES,
    statusIndex: 0,
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

  async resetList() {
    this.setData({ page: 1, list: [], loading: true })
    await this.loadList(false)
  },

  async loadList(append) {
    try {
      const params = { page: this.data.page, pageSize: this.data.pageSize }
      if (this.data.keyword) params.keyword = this.data.keyword
      const res = await api.get('/customers', params)
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
    const status = item.status || 'active'
    return {
      ...item,
      initial: (item.name && item.name[0]) || '?',
      phone: item.phone || '',
      statusCls: status,
      statusLabel: { active: '正常', discontinued_sales: '已停销', void: '已作废' }[status] || '正常',
    }
  },

  onAdd() {
    this.setData({
      showModal: true,
      editingId: null,
      form: { code: '', status: 'active', name: '', contactPerson: '', phone: '', address: '', remark: '' },
      statusIndex: 0,
    })
  },

  async onEdit(e) {
    const id = e.currentTarget.dataset.id
    try {
      const item = await api.get('/customers/' + id)
      const status = item.status || 'active'
      this.setData({
        showModal: true,
        editingId: id,
        form: {
          code: item.code || '',
          status,
          name: item.name || '',
          contactPerson: item.contactPerson || '',
          phone: item.phone || '',
          address: item.address || '',
          remark: item.remark || '',
        },
        statusIndex: Math.max(0, STATUS_VALUES.indexOf(status)),
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

  onStatusChange(e) {
    const idx = parseInt(e.detail.value)
    this.setData({ statusIndex: idx, 'form.status': STATUS_VALUES[idx] })
  },

  async onSave() {
    const { form, editingId } = this.data
    if (!form.name.trim()) {
      wx.showToast({ title: '请输入客户名称', icon: 'none' })
      return
    }
    try {
      const payload = { ...form }
      if (editingId) {
        await api.put('/customers/' + editingId, payload)
      } else {
        await api.post('/customers', payload)
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
      content: '删除后不可恢复，确定要删除该客户吗？',
      confirmColor: '#ff4d4f',
      success: async (res) => {
        if (res.confirm) {
          try {
            await api.del('/customers/' + editingId)
            showSuccess('删除成功')
            this.setData({ showModal: false })
            this.resetList()
          } catch (err) {
            showError(err.message)
          }
        }
      },
    })
  },
})
