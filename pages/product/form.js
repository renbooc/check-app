const { api } = require('../../utils/request')
const { showError, showSuccess } = require('../../utils/util')

const STATUS_LIST = [
  { value: 'active', label: '正常' },
  { value: 'discontinued_sales', label: '已停销' },
  { value: 'discontinued_purchase', label: '已停采' },
  { value: 'void', label: '已作废' },
]
const STATUS_VALUES = STATUS_LIST.map(s => s.value)
const STATUS_NAMES = STATUS_LIST.map(s => s.label)

Page({
  data: {
    editingId: null,
    submitting: false,
    form: {
      name: '',
      code: '',
      status: 'active',
      spec: '',
      unitId: '',
      categoryId: '',
      approvalNo: '',
      manufacturer: '',
      price: '',
      minQuantity: '',
      remark: '',
    },
    unitList: [],
    categoryList: [],
    unitNames: [],
    categoryNames: [],
    unitIndex: -1,
    categoryIndex: -1,
    statusNames: STATUS_NAMES,
    statusIndex: 0,
  },

  onLoad(options) {
    this.loadOptions().then(() => {
      if (options.id) {
        this.setData({ editingId: options.id })
        this.loadProduct(options.id)
      }
    })
  },

  async loadOptions() {
    try {
      const [units, categories] = await Promise.all([
        api.get('/units'),
        api.get('/categories'),
      ])
      this.setData({
        unitList: units || [],
        categoryList: categories || [],
        unitNames: (units || []).map(u => u.name),
        categoryNames: (categories || []).map(c => c.name),
      })
    } catch (err) {
      console.error('[ProductForm] loadOptions error:', err)
    }
  },

  async loadProduct(id) {
    try {
      const p = await api.get(`/products/${id}`)
      if (!p) { showError('商品不存在'); return }

      const unitId = (p.unit && p.unit.id) ? p.unit.id : (p.unitId || '')
      const categoryId = (p.category && p.category.id) ? p.category.id : (p.categoryId || '')
      const status = p.status || 'active'
      const statusIndex = Math.max(0, STATUS_VALUES.indexOf(status))

      this.setData({
        form: {
          name: p.name || '',
          code: p.code || '',
          status,
          spec: p.spec || '',
          unitId,
          categoryId,
          approvalNo: p.approvalNo || '',
          manufacturer: p.manufacturer || '',
          price: p.price != null ? String(p.price) : '',
          minQuantity: p.minQuantity != null ? String(p.minQuantity) : '',
          remark: p.remark || '',
        },
        unitIndex: this.data.unitList.findIndex(u => u.id === unitId),
        categoryIndex: this.data.categoryList.findIndex(c => c.id === categoryId),
        statusIndex,
      })
    } catch (err) {
      showError(err.message)
    }
  },

  onFieldInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ [`form.${field}`]: e.detail.value })
  },

  onUnitChange(e) {
    const idx = parseInt(e.detail.value)
    const unit = this.data.unitList[idx]
    if (unit) {
      this.setData({ unitIndex: idx, 'form.unitId': unit.id })
    }
  },

  onCategoryChange(e) {
    const idx = parseInt(e.detail.value)
    const cat = this.data.categoryList[idx]
    if (cat) {
      this.setData({ categoryIndex: idx, 'form.categoryId': cat.id })
    }
  },

  onStatusChange(e) {
    const idx = parseInt(e.detail.value)
    this.setData({
      statusIndex: idx,
      'form.status': STATUS_VALUES[idx],
    })
  },

  async onSubmit() {
    const { form, editingId } = this.data

    if (!form.name.trim()) {
      wx.showToast({ title: '请输入商品名称', icon: 'none' })
      return
    }

    this.setData({ submitting: true })
    try {
      const payload = {
        name: form.name.trim(),
        code: form.code.trim(),
        status: form.status,
        spec: form.spec.trim(),
        unitId: form.unitId || null,
        categoryId: form.categoryId || null,
        approvalNo: form.approvalNo.trim(),
        manufacturer: form.manufacturer.trim(),
        price: parseFloat(form.price) || 0,
        minQuantity: parseInt(form.minQuantity) || 0,
        remark: form.remark.trim(),
      }

      if (editingId) {
        await api.put(`/products/${editingId}`, payload)
      } else {
        await api.post('/products', payload)
      }
      showSuccess('保存成功')
      setTimeout(() => wx.navigateBack(), 1000)
    } catch (err) {
      showError(err.message)
    } finally {
      this.setData({ submitting: false })
    }
  },
})
