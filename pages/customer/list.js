const { api } = require('../../utils/request')
const { showError, showSuccess } = require('../../utils/util')

Page({
  data: {
    loading: false,
    keyword: '',
    list: [],
    page: 1,
    pageSize: 20,
    total: 0,
    showModal: false,
    editingId: null,
    form: {
      name: '',
      contactPerson: '',
      contactPhone: '',
      address: '',
      remark: ''
    }
  },

  onLoad() {
    this.loadList()
  },

  onPullDownRefresh() {
    this.setData({ page: 1 })
    this.loadList().then(() => wx.stopPullDownRefresh())
  },

  onReachBottom() {
    if (this.data.list.length < this.data.total) {
      this.setData({ page: this.data.page + 1 })
      this.loadList(true)
    }
  },

  onSearchInput(e) {
    this.setData({ keyword: e.detail.value })
  },

  onSearch() {
    this.setData({ page: 1 })
    this.loadList()
  },

  async loadList(append) {
    this.setData({ loading: true })
    try {
      const params = { page: this.data.page, pageSize: this.data.pageSize }
      if (this.data.keyword) params.keyword = this.data.keyword
      const res = await api.get('/customers', params)
      this.setData({
        list: append ? [...this.data.list, ...(res.list || [])] : (res.list || []),
        total: res.total || 0,
        loading: false
      })
    } catch (err) {
      showError(err.message)
      this.setData({ loading: false })
    }
  },

  onAdd() {
    this.setData({
      showModal: true,
      editingId: null,
      form: { name: '', contactPerson: '', contactPhone: '', address: '', remark: '' }
    })
  },

  async onEdit(e) {
    const id = e.currentTarget.dataset.id
    try {
      const customer = await api.get(`/customers/${id}`)
      this.setData({
        showModal: true,
        editingId: id,
        form: {
          name: customer.name || '',
          contactPerson: customer.contactPerson || '',
          contactPhone: customer.contactPhone || '',
          address: customer.address || '',
          remark: customer.remark || ''
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
    const form = { ...this.data.form, [field]: e.detail.value }
    this.setData({ form })
  },

  async onSave() {
    const { form, editingId } = this.data
    if (!form.name.trim()) {
      wx.showToast({ title: '请输入客户名称', icon: 'none' })
      return
    }

    try {
      if (editingId) {
        await api.put(`/customers/${editingId}`, form)
      } else {
        await api.post('/customers', form)
      }
      showSuccess('保存成功')
      this.setData({ showModal: false })
      this.setData({ page: 1 })
      this.loadList()
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
            await api.del(`/customers/${editingId}`)
            showSuccess('删除成功')
            this.setData({ showModal: false })
            this.loadList()
          } catch (err) {
            showError(err.message)
          }
        }
      }
    })
  }
})
