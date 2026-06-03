const { api } = require('../../utils/request')
const { showError } = require('../../utils/util')

const app = getApp()

Page({
  data: {
    phone: '',
    password: '',
    showPassword: false,
    loading: false,
    agreed: false
  },

  onLoad() {
    if (app.globalData.isLoggedIn) {
      wx.switchTab({ url: '/pages/index/index' })
    }
  },

  onPhoneInput(e) {
    this.setData({ phone: e.detail.value })
  },

  onPasswordInput(e) {
    this.setData({ password: e.detail.value })
  },

  togglePassword() {
    this.setData({ showPassword: !this.data.showPassword })
  },

  onToggleAgreement() {
    this.setData({ agreed: !this.data.agreed })
  },

  onViewPrivacy() {
    wx.showModal({
      title: '隐私政策',
      content: '我们重视您的隐私。本应用收集您的个人信息仅用于药品进销存管理目的，包括但不限于：商品管理、库存盘点、订单处理。我们不会将您的信息用于其他用途或分享给第三方。',
      showCancel: false
    })
  },

  onViewTerms() {
    wx.showModal({
      title: '用户协议',
      content: '使用本应用即表示您同意：1. 您将妥善保管账号信息；2. 您提供的信息真实准确；3. 您遵守相关法律法规；4. 我们有权在必要时更新协议内容。',
      showCancel: false
    })
  },

  async onLogin() {
    const { phone, password, agreed } = this.data

    if (!agreed) {
      showError('请先阅读并同意用户协议和隐私政策')
      return
    }

    if (!phone.trim()) {
      showError('请输入手机号')
      return
    }
    if (!/^1\d{10}$/.test(phone.trim())) {
      showError('请输入正确的手机号')
      return
    }
    if (!password.trim()) {
      showError('请输入密码')
      return
    }
    if (password.length < 6) {
      showError('密码不少于6位')
      return
    }

    this.setData({ loading: true })

    try {
      const res = await api.post('/auth/login', { phone: phone.trim(), password })
      app.login(res.user, res.accessToken)
      wx.switchTab({ url: '/pages/index/index' })
    } catch (err) {
      showError(err.message || '登录失败')
    } finally {
      this.setData({ loading: false })
    }
  }
})
