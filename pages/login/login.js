const { api } = require('../../utils/request')
const { showError } = require('../../utils/util')

const app = getApp()

Page({
  data: {
    phone: '',
    password: '',
    showPassword: false,
    loading: false
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

  async onLogin() {
    const { phone, password } = this.data

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
