const { api } = require("../../utils/request");
const { showError, showSuccess } = require("../../utils/util");

const STATUS_MAP = {
  draft: '草稿',
  pending: '待审核',
  approved: '已审核',
  received: '已入库',
  cancelled: '已取消',
};

const EDITABLE_STATUSES = ['draft']; // 只有草稿可编辑

Page({
  data: {
    id: null,
    readonly: false,
    orderNo: '',

    // 供应商
    supplierKeyword: "",
    filteredSuppliers: [],
    showSupplierResults: false,
    selectedSupplier: null,
    _allSuppliers: [],

    // 订单信息
    expectedDate: "",
    remark: "",
    statusCls: 'draft',
    statusText: '草稿',

    // 统一商品搜索
    productKeyword: "",
    productSearchResults: [],
    showProductResults: false,
    products: [],

    // 已添加商品行
    items: [],

    // 统计
    totalQuantity: 0,
    totalAmount: "0.00",

    // 状态
    submitting: false,
  },

  // ============================================================
  //  生命周期
  // ============================================================
  async onLoad(options) {
    await Promise.all([this.loadSuppliers(), this.loadProducts()]);
    if (options.id) {
      this.setData({ id: options.id });
      await this.loadOrder(options.id);
    }
  },

  async loadSuppliers() {
    try {
      const res = await api.get("/suppliers", { page: 1, pageSize: 200 });
      this.data._allSuppliers = res.list || [];
    } catch (err) {
      console.error("[PurchaseForm] loadSuppliers error:", err);
    }
  },

  async loadProducts() {
    try {
      const res = await api.get("/products", { page: 1, pageSize: 500 });
      this.setData({ products: res.list || [] });
    } catch (err) {
      console.error("[PurchaseForm] loadProducts error:", err);
    }
  },

  async loadOrder(id) {
    try {
      const order = await api.get(`/purchase/${id}`);
      if (!order) { showError('订单不存在'); return; }

      const allSuppliers = this.data._allSuppliers || [];
      const supplier = allSuppliers.find((s) => s.id === order.supplierId);
      const status = order.status || 'draft';
      const readonly = !EDITABLE_STATUSES.includes(status);

      const items = (order.items || []).map((item) => ({
        productId: item.productId,
        productName: item.productName,
        productSpec: item.productSpec,
        productUnit: item.productUnit,
        productManufacturer: item.productManufacturer || item.manufacturer || "",
        quantity: item.quantity,
        price: item.price,
        amount: item.amount,
      }));

      this.setData({
        orderNo: order.orderNo || '',
        selectedSupplier: supplier || null,
        supplierKeyword: supplier ? supplier.name : "",
        remark: order.remark || "",
        expectedDate: order.expectedDate || "",
        items,
        totalQuantity: order.totalQuantity || 0,
        totalAmount: (parseFloat(order.totalAmount) || 0).toFixed(2),
        readonly,
        statusCls: status,
        statusText: STATUS_MAP[status] || status,
      });
    } catch (err) {
      showError(err.message);
    }
  },

  // ============================================================
  //  供应商
  // ============================================================
  onSupplierInput(e) {
    const keyword = e.detail.value;
    const allSuppliers = this.data._allSuppliers || [];
    const filtered = keyword
      ? allSuppliers.filter(
          (s) =>
            s.name.includes(keyword) ||
            (s.contactPerson && s.contactPerson.includes(keyword)),
        )
      : [];
    this.setData({
      supplierKeyword: keyword,
      filteredSuppliers: filtered,
      showSupplierResults: keyword.length > 0,
      selectedSupplier: null,
    });
  },

  onSupplierFocus() {
    if (this.data.supplierKeyword.length > 0) {
      this.onSupplierInput({ detail: { value: this.data.supplierKeyword } });
    }
  },

  onSupplierBlur() {
    setTimeout(() => {
      this.setData({ showSupplierResults: false });
    }, 200);
  },

  onSupplierSelect(e) {
    const index = e.currentTarget.dataset.index;
    const supplier = this.data.filteredSuppliers[index];
    this.setData({
      selectedSupplier: supplier,
      supplierKeyword: supplier.name,
      showSupplierResults: false,
      filteredSuppliers: [],
    });
  },

  onClearSupplier() {
    this.setData({
      selectedSupplier: null,
      supplierKeyword: "",
      showSupplierResults: false,
      filteredSuppliers: [],
    });
  },

  // ============================================================
  //  订单信息
  // ============================================================
  onDateChange(e) {
    this.setData({ expectedDate: e.detail.value });
  },

  onRemarkInput(e) {
    this.setData({ remark: e.detail.value });
  },

  // ============================================================
  //  统一商品搜索
  // ============================================================
  onProductSearchInput(e) {
    const keyword = e.detail.value;
    this.setData({ productKeyword: keyword });
    if (keyword.length > 0 && this.data.products.length > 0) {
      const filtered = this.data.products.filter(
        (p) => p.name.includes(keyword) || (p.spec && p.spec.includes(keyword)),
      );
      this.setData({
        productSearchResults: filtered,
        showProductResults: true,
      });
    } else {
      this.setData({
        productSearchResults: [],
        showProductResults: false,
      });
    }
  },

  onProductSearchFocus() {
    if (this.data.productKeyword.length > 0) {
      this.onProductSearchInput({
        detail: { value: this.data.productKeyword },
      });
    }
  },

  onProductSearchBlur() {
    setTimeout(() => {
      this.setData({ showProductResults: false });
    }, 250);
  },

  onProductSearchSelect(e) {
    const pid = e.currentTarget.dataset.pid;
    const product = this.data.products.find(p => p.id === pid);
    if (!product) return;

    // 检查是否已添加
    if (this.data.items.some(item => item.productId === product.id)) {
      wx.showToast({ title: '商品已存在', icon: 'none' });
      return;
    }

    const items = [
      ...this.data.items,
      {
        productId: product.id,
        productName: product.name,
        productSpec: product.spec || "",
        productUnit: product.unit ? product.unit.name : "",
        productManufacturer: product.manufacturer || "",
        quantity: "",
        price: "",
        amount: "0.00",
      },
    ];

    this.setData({
      items,
      productKeyword: "",
      productSearchResults: [],
      showProductResults: false,
    });
    this.calcTotal();
  },

  // ============================================================
  //  数量 / 单价 / 删除
  // ============================================================
  onItemQuantityInput(e) {
    const index = e.currentTarget.dataset.index;
    const quantity = parseFloat(e.detail.value) || 0;
    const items = [...this.data.items];
    items[index].quantity = quantity;
    items[index].amount = (
      quantity * parseFloat(items[index].price || 0)
    ).toFixed(2);
    this.setData({ items });
    this.calcTotal();
  },

  onItemPriceInput(e) {
    const index = e.currentTarget.dataset.index;
    const price = parseFloat(e.detail.value) || 0;
    const items = [...this.data.items];
    items[index].price = price;
    items[index].amount = ((items[index].quantity || 0) * price).toFixed(2);
    this.setData({ items });
    this.calcTotal();
  },

  onQtyDecrease(e) {
    const index = e.currentTarget.dataset.index;
    const items = [...this.data.items];
    let qty = parseFloat(items[index].quantity) || 0;
    qty = qty > 1 ? qty - 1 : 0;
    items[index].quantity = qty;
    items[index].amount = (qty * parseFloat(items[index].price || 0)).toFixed(2);
    this.setData({ items });
    this.calcTotal();
  },

  onQtyIncrease(e) {
    const index = e.currentTarget.dataset.index;
    const items = [...this.data.items];
    let qty = parseFloat(items[index].quantity) || 0;
    qty = qty + 1;
    items[index].quantity = qty;
    items[index].amount = (qty * parseFloat(items[index].price || 0)).toFixed(2);
    this.setData({ items });
    this.calcTotal();
  },

  onRemoveItem(e) {
    const index = e.currentTarget.dataset.index;
    const items = [...this.data.items];
    items.splice(index, 1);
    this.setData({ items });
    this.calcTotal();
  },

  calcTotal() {
    const items = this.data.items;
    let totalQuantity = 0;
    let totalAmount = 0;
    items.forEach((item) => {
      totalQuantity += parseFloat(item.quantity) || 0;
      totalAmount += parseFloat(item.amount) || 0;
    });
    this.setData({
      totalQuantity,
      totalAmount: totalAmount.toFixed(2),
    });
  },

  // ============================================================
  //  校验 & 提交
  // ============================================================
  validate() {
    if (!this.data.selectedSupplier) {
      wx.showToast({ title: "请选择供应商", icon: "none" });
      return false;
    }
    const items = this.data.items;
    if (items.length === 0) {
      wx.showToast({ title: "请添加商品", icon: "none" });
      return false;
    }
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.quantity || parseFloat(item.quantity) <= 0) {
        wx.showToast({ title: `第${i + 1}项数量无效`, icon: "none" });
        return false;
      }
      if (!item.price || parseFloat(item.price) <= 0) {
        wx.showToast({ title: `第${i + 1}项单价无效`, icon: "none" });
        return false;
      }
    }
    return true;
  },

  buildSubmitData() {
    return {
      supplierId: this.data.selectedSupplier.id,
      remark: this.data.remark,
      expectedDate: this.data.expectedDate || null,
      items: this.data.items.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        productSpec: item.productSpec,
        productUnit: item.productUnit,
        quantity: parseFloat(item.quantity),
        price: parseFloat(item.price),
      })),
    };
  },

  async onSaveDraft() {
    if (!this.validate()) return;
    if (this.data.submitting) return;
    this.setData({ submitting: true });
    try {
      const data = this.buildSubmitData();
      if (this.data.id) {
        await api.put(`/purchase/${this.data.id}`, data);
      } else {
        await api.post("/purchase", data);
      }
      showSuccess("保存成功");
      setTimeout(() => wx.navigateBack(), 1000);
    } catch (err) {
      showError(err.message);
    } finally {
      this.setData({ submitting: false });
    }
  },

  async onSubmit() {
    if (!this.validate()) return;
    if (this.data.submitting) return;
    this.setData({ submitting: true });
    try {
      const data = this.buildSubmitData();
      let order;
      if (this.data.id) {
        order = await api.put(`/purchase/${this.data.id}`, data);
      } else {
        order = await api.post("/purchase", data);
      }
      // 只有草稿状态的订单才提交审核
      if (!this.data.id || this.data.statusCls === 'draft') {
        await api.put(`/purchase/${order.id}/status`, { status: "pending" });
      }
      showSuccess("提交成功");
      setTimeout(() => wx.navigateBack(), 1000);
    } catch (err) {
      showError(err.message);
    } finally {
      this.setData({ submitting: false });
    }
  },

  onBack() {
    wx.navigateBack();
  },
});
