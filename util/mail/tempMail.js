const config = require("../config");

// 从配置中获取 emailApiUrl，如果未配置则使用默认值
const { emailApiUrl } = config.getCredentials();
const ACCOUNT_LIST_URL = `${emailApiUrl}/api/account/list?accountId=0&size=100`;

/**
 * 重新获取所有邮箱列表
 * @param {string} token - 已登录的会话令牌
 */
async function registerTempEmail(token) {
  if (!token) {
    throw new Error("缺少会话令牌，请确保已登录");
  }

  const credentials = config.getCredentials();

  console.log("正在获取邮箱列表...");
  const accountList = await fetchAccountList(token);
  const { parent, children } = splitAccounts(accountList, credentials.loginEmail);

  config.persistAccountsSnapshot({ parent, children });
  console.log(`✓ 已保存母号 ${parent.email} 和 ${children.length} 个子号到 temp-mail.yaml`);

  return {
    parent,
    children,
  };
}

function ensureFetchAvailable() {
  if (typeof globalThis.fetch !== "function") {
    throw new Error("当前 Node 版本不支持全局 fetch，请使用 Node 18+ 或自行 polyfill fetch");
  }
}

async function fetchAccountList(token) {
  ensureFetchAvailable();

  console.log("开始请求邮箱列表，使用 token:", token);
  const response = await fetch(ACCOUNT_LIST_URL, {
    headers: {
      Authorization: `${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`获取邮箱列表失败，HTTP 状态码 ${response.status}`);
  }

  const listText = await response.text();
  let payload;
  try {
    payload = JSON.parse(listText);
  } catch (error) {
    throw new Error(`邮箱列表响应无法解析为 JSON: ${error.message}`);
  }

  if (payload.code !== 200 || !Array.isArray(payload.data)) {
    throw new Error(`邮箱列表 API 返回异常: ${payload.message || "未知"}`);
  }

  return payload.data;
}

function splitAccounts(list, loginEmail) {
  const children = [];
  let parent = null;

  for (const item of list) {
    if (!parent && item.email === loginEmail) {
      parent = item;
      continue;
    }
    children.push(item);
  }

  if (!parent) {
    parent = {
      email: loginEmail,
      accountId: null,
      name: "",
      status: null,
      latestEmailTime: "",
      createTime: new Date().toISOString(),
    };
  }

  return { parent, children };
}

module.exports = registerTempEmail;
