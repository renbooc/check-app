const { api } = require('../../utils/request')
const { showError, showSuccess } = require('../../utils/util')

const STATUS_VALUES = ['active', 'inactive']
const STATUS_NAMES = ['正常', '停用']

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
      name: '',
      address: '',
      isActive: true,
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
      const page = this.data.page
      const res = await api.get('/warehouses', { page, pageSize: 20, all: 'true' })
      const raw = Array.isArray(res) ? res : (res.list || [])
      const enriched = raw.map(this.enrichItem.bind(this))
      this.setData({
        list: append ? [...this.data.list, ...enriched] : enriched,
        total: res.total || enriched.length,
        loading: false,
        loaded: true,
      })
    } catch (err) {
      showError(err.message)
      this.setData({ loading: false, loaded: true })
    }
  },

  enrichItem(item) {
    const active = item.isActive !== false
    return {
      ...item,
      initial: (item.name && item.name[0]) || '?',
      statusCls: active ? 'active' : 'inactive',
      statusLabel: active ? '正常' : '停用',
    }
  },

  onAdd() {
    this.setData({
      showModal: true,
      editingId: null,
      form: { name: '', address: '', isActive: true },
      statusIndex: 0,
    })
  },

  async onEdit(e) {
    const id = e.currentTarget.dataset.id
    try {
      const item = await api.get('/warehouses/' + id)
      const active = item.isActive !== false
      this.setData({
        showModal: true,
        editingId: id,
        form: {
          name: item.name || '',
          address: item.address || '',
          isActive: active,
        },
        statusIndex: active ? 0 : 1,
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
    this.setData({
      statusIndex: idx,
      'form.isActive': idx === 0,
    })
  },

  async onSave() {
    const { form, editingId } = this.data
    if (!form.name.trim()) {
      wx.showToast({ title: '请输入仓库名称', icon: 'none' })
      return
    }
    try {
      const payload = { ...form }
      if (editingId) {
        await api.put('/warehouses/' + editingId, payload)
      } else {
        await api.post('/warehouses', payload)
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
      content: '删除后不可恢复，确定要删除该仓库吗？',
      confirmColor: '#ff4d4f',
      success: async (res) => {
        if (res.confirm) {
          try {
            await api.del('/warehouses/' + editingId)
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
