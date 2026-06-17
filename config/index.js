const ENV_MAP = {
  dev: {
    // baseUrl: "http://localhost:3000",
    baseUrl: "https://api.rccjoy.com.cn",
    env: "development",
    debug: true,
  },
  test: {
    baseUrl: "https://api.rccjoy.com.cn",
    env: "testing",
    debug: true,
  },
  prod: {
    baseUrl: "https://api.rccjoy.com.cn",
    env: "production",
    debug: false,
  },
};

function detectEnv() {
  const accountInfo = wx.getAccountInfoSync ? wx.getAccountInfoSync() : null;
  if (accountInfo && accountInfo.miniProgram) {
    const envVersion = accountInfo.miniProgram.envVersion;
    if (envVersion === "release") return "prod";
    if (envVersion === "trial") return "test";
  }
  return "dev";
}

const currentEnv = detectEnv();

module.exports = Object.assign({}, ENV_MAP[currentEnv], {
  appName: "药品进销存ERP",
  version: "2.0.0",
  useMock: false,
  storagePrefix: "erp_app_",
  requestTimeout: 15000,
  maxRetries: 2,
  retryDelay: 1000,
});
