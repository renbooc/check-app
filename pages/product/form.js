const { api } = require('../../utils/request')
const { showError, showSuccess } = require('../../utils/util')

Page({
  data: {
    editingId: null,
    submitting: false,
    // 表单字段 — 严格对应 Product 实体
    form: {
      name: '',
      code: '',
      spec: '',
      unitId: '',
      categoryId: '',
      approvalNo: '',
      manufacturer: '',
      price: '',
      minQuantity: '',
      remark: ''
    },
    // 单位 & 分类选项
    unitList: [],
    categoryList: [],
    unitNames: [],
    categoryNames: [],
    unitIndex: -1,
    categoryIndex: -1
  },

  onLoad(options) {
    this.loadOptions().then(() => {
      if (options.id) {
        this.setData({ editingId: options.id })
        this.loadProduct(options.id)
      }
    })
  },

  // 并行加载单位和分类选项
  async loadOptions() {
    try {
      const [units, categories] = await Promise.all([
        api.get('/units'),
        api.get('/categories')
      ])
      const unitList = units || []
      const categoryList = categories || []
      this.setData({
        unitList,
        categoryList,
        unitNames: unitList.map(u => u.name),
        categoryNames: categoryList.map(c => c.name)
      })
    } catch (err) {
      console.error('[ProductForm] loadOptions error:', err)
    }
  },

  async loadProduct(id) {
    try {
      const p = await api.get(`/products/${id}`)
      if (!p) {
        showError('商品不存在')
        return
      }

      const unitId = (p.unit && p.unit.id) ? p.unit.id : (p.unitId || '')
      const categoryId = (p.category && p.category.id) ? p.category.id : (p.categoryId || '')

      // 匹配 picker index
      const unitIndex = this.data.unitList.findIndex(u => u.id === unitId)
      const categoryIndex = this.data.categoryList.findIndex(c => c.id === categoryId)

      this.setData({
        form: {
          name: p.name || '',
          code: p.code || '',
          spec: p.spec || '',
          unitId,
          categoryId,
          approvalNo: p.approvalNo || '',
          manufacturer: p.manufacturer || '',
          price: p.price != null ? String(p.price) : '',
          minQuantity: p.minQuantity != null ? String(p.minQuantity) : '',
          remark: p.remark || ''
        },
        unitIndex,
        categoryIndex
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
      this.setData({
        unitIndex: idx,
        'form.unitId': unit.id
      })
    }
  },

  onCategoryChange(e) {
    const idx = parseInt(e.detail.value)
    const cat = this.data.categoryList[idx]
    if (cat) {
      this.setData({
        categoryIndex: idx,
        'form.categoryId': cat.id
      })
    }
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
        spec: form.spec.trim(),
        unitId: form.unitId || null,
        categoryId: form.categoryId || null,
        approvalNo: form.approvalNo.trim(),
        manufacturer: form.manufacturer.trim(),
        price: parseFloat(form.price) || 0,
        minQuantity: parseInt(form.minQuantity) || 0,
        remark: form.remark.trim()
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
  }
})
