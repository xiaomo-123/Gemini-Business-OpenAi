const config = require("../config");

// 从配置中获取 emailApiUrl，如果未配置则使用默认值
const { emailApiUrl } = config.getCredentials();
const CREATE_ACCOUNT_URL = `${emailApiUrl}/api/account/add`;

/**
 * 生成随机的邮箱名称（15位大小写字母+数字）
 */
function generateRandomName(length = 15) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * 确保 fetch API 可用
 */
function ensureFetchAvailable() {
    if (typeof globalThis.fetch !== "function") {
        throw new Error("当前 Node 版本不支持全局 fetch，请使用 Node 18+ 或自行 polyfill fetch");
    }
}

/**
 * 创建新的子号
 * @param {string} token - 已登录的会话令牌
 * @returns {Promise<Object>} 创建的账号信息
 */
async function createAccount(token) {
    if (!token) {
        throw new Error("缺少会话令牌，请确保已登录");
    }

    ensureFetchAvailable();

    const { defaultDomain } = config.getCredentials();
    const randomName = generateRandomName(15);
    const email = `${randomName}${defaultDomain}`;

    const requestPayload = {
        email: email,
        token: "",
    };

    console.log(`正在创建新子号: ${email}`);

    const response = await fetch(CREATE_ACCOUNT_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": token,
        },
        body: JSON.stringify(requestPayload),
    });

    if (!response.ok) {
        throw new Error(`创建子号请求失败，HTTP 状态码 ${response.status}`);
    }

    const payloadText = await response.text();
    let payload;
    try {
        payload = JSON.parse(payloadText);
    } catch (error) {
        throw new Error(`创建子号响应无法解析为 JSON: ${error.message}`);
    }

    if (payload.code !== 200 || !payload.data) {
        throw new Error(`创建子号失败: ${payload.message || "未知错误"}`);
    }

    const accountData = payload.data;
    console.log(`✓ 子号创建成功！`);
    console.log(`  - 邮箱: ${accountData.email}`);
    console.log(`  - 账号ID: ${accountData.accountId}`);
    console.log(`  - 创建时间: ${accountData.createTime}`);

    return accountData;
}

module.exports = createAccount;
