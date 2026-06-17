const { api } = require('../../utils/request')
const { showError, showSuccess } = require('../../utils/util')

const STATUS_MAP = {
  pending: '待审核',
  approved: '已审核',
  cancelled: '已取消',
}

const EDITABLE_STATUSES = ['pending']

Page({
  data: {
    id: null,
    readonly: true,
    editing: false,
    orderNo: '',
    salesOrderNo: '',
    supplierName: '',
    customerName: '',
    customerInitial: '',
    warehouseName: '',
    outboundDate: '',
    remark: '',
    statusCls: 'pending',
    statusText: '待审核',
    items: [],
    totalQuantity: 0,
    totalAmount: '0.00',
    submitting: false,
  },

  async onLoad(options) {
    if (options.id) {
      this.setData({ id: options.id })
      await this.loadNote(options.id)
    }
  },

  async loadNote(id) {
    try {
      const note = await api.get('/outbound/' + id)
      if (!note) { showError('出库单不存在'); return }

      const items = (note.items || []).map(item => ({
        productId: item.productId,
        productName: item.productName,
        productSpec: item.productSpec,
        productUnit: item.productUnit,
        productManufacturer: item.productManufacturer || '',
        quantity: item.quantity,
        price: item.price,
        amount: item.amount,
        batchNo: item.batchNo || '',
        productionDate: item.productionDate || '',
        expiryDate: item.expiryDate || '',
        locationCode: item.locationCode || '',
      }))

      const status = note.status || 'pending'
      const readonly = !EDITABLE_STATUSES.includes(status)

      this.setData({
        orderNo: note.orderNo || '',
        salesOrderNo: note.salesOrderNo || '',
        customerName: note.customerName || '',
        supplierName: note.customerName || '',
        customerInitial: (note.customerName && note.customerName.charAt(0)) || '?',
        warehouseName: note.warehouseName || '',
        outboundDate: note.outboundDate || '',
        remark: note.remark || '',
        items,
        totalQuantity: note.totalQuantity || 0,
        totalAmount: (parseFloat(note.totalAmount) || 0).toFixed(2),
        readonly,
        editing: false,
        statusCls: status,
        statusText: STATUS_MAP[status] || status,
      })
    } catch (err) {
      showError(err.message)
    }
  },

  onDateChange(e) {
    this.setData({ outboundDate: e.detail.value })
  },

  onRemarkInput(e) {
    this.setData({ remark: e.detail.value })
  },

  onToggleEdit() {
    this.setData({ editing: !this.data.editing })
  },

  onItemQuantityInput(e) {
    const index = e.currentTarget.dataset.index
    const raw = e.detail.value
    const items = [...this.data.items]
    items[index].quantity = raw
    items[index].amount = ((parseFloat(raw) || 0) * parseFloat(items[index].price || 0)).toFixed(2)
    this.setData({ items })
    this.calcTotal()
  },

  onItemPriceInput(e) {
    const index = e.currentTarget.dataset.index
    const raw = e.detail.value
    const items = [...this.data.items]
    items[index].price = raw
    items[index].amount = ((parseFloat(raw) || 0) * (parseFloat(items[index].quantity) || 0)).toFixed(2)
    this.setData({ items })
    this.calcTotal()
  },

  onQtyDecrease(e) {
    const index = e.currentTarget.dataset.index
    const items = [...this.data.items]
    let qty = parseFloat(items[index].quantity) || 0
    qty = qty > 1 ? qty - 1 : 0
    items[index].quantity = qty
    items[index].amount = (qty * parseFloat(items[index].price || 0)).toFixed(2)
    this.setData({ items })
    this.calcTotal()
  },

  onQtyIncrease(e) {
    const index = e.currentTarget.dataset.index
    const items = [...this.data.items]
    let qty = parseFloat(items[index].quantity) || 0
    qty = qty + 1
    items[index].quantity = qty
    items[index].amount = (qty * parseFloat(items[index].price || 0)).toFixed(2)
    this.setData({ items })
    this.calcTotal()
  },

  onRemoveItem(e) {
    const index = e.currentTarget.dataset.index
    const items = [...this.data.items]
    items.splice(index, 1)
    this.setData({ items })
    this.calcTotal()
  },

  calcTotal() {
    const items = this.data.items
    let totalQuantity = 0
    let totalAmount = 0
    items.forEach(item => {
      totalQuantity += parseFloat(item.quantity) || 0
      totalAmount += parseFloat(item.amount) || 0
    })
    this.setData({ totalQuantity, totalAmount: totalAmount.toFixed(2) })
  },

  onBatchNoInput(e) {
    const index = e.currentTarget.dataset.index
    const items = [...this.data.items]
    items[index].batchNo = e.detail.value
    this.setData({ items })
  },

  onProductionDateChange(e) {
    const index = e.currentTarget.dataset.index
    const items = [...this.data.items]
    items[index].productionDate = e.detail.value
    this.setData({ items })
  },

  onExpiryDateChange(e) {
    const index = e.currentTarget.dataset.index
    const items = [...this.data.items]
    items[index].expiryDate = e.detail.value
    this.setData({ items })
  },

  onLocationCodeInput(e) {
    const index = e.currentTarget.dataset.index
    const items = [...this.data.items]
    items[index].locationCode = e.detail.value
    this.setData({ items })
  },

  async onSave() {
    if (this.data.submitting) return
    this.setData({ submitting: true })
    try {
      await api.put('/outbound/' + this.data.id, {
        remark: this.data.remark,
        outboundDate: this.data.outboundDate || null,
      })
      showSuccess('保存成功')
      this.setData({ submitting: false, editing: false })
      await this.loadNote(this.data.id)
    } catch (err) {
      showError(err.message)
      this.setData({ submitting: false })
    }
  },

  async onApprove() {
    if (this.data.submitting) return
    this.setData({ submitting: true })
    try {
      await api.put('/outbound/' + this.data.id + '/status', { status: 'approved' })
      showSuccess('审核通过')
      this.setData({ submitting: false })
      await this.loadNote(this.data.id)
    } catch (err) {
      showError(err.message)
      this.setData({ submitting: false })
    }
  },

  onBack() {
    wx.navigateBack()
  },
})
