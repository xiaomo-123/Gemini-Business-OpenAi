const { selectAccount, prompt } = require("../selectAccount");
const config = require("../config");

// 从配置中获取 emailApiUrl，如果未配置则使用默认值
const { emailApiUrl } = config.getCredentials();
const EMAIL_LIST_URL = `${emailApiUrl}/api/email/list`;

/**
 * 确保 fetch API 可用
 */
function ensureFetchAvailable() {
    if (typeof globalThis.fetch !== "function") {
        throw new Error("当前 Node 版本不支持全局 fetch，请使用 Node 18+ 或自行 polyfill fetch");
    }
}

/**
 * 从邮件主题中提取验证码
 * @param {string} subject - 邮件主题
 * @returns {string|null} 验证码或 null
 */
function extractVerificationCode(subject) {
    // 匹配 "你的 ChatGPT 代码为 XXXXXX" 格式
    const match = subject.match(/(?:代码为|code is|código es)\s*(\d{6})/i);
    return match ? match[1] : null;
}

/**
 * 获取指定账号的最新邮件列表
 * @param {string} token - 已登录的会话令牌
 * @param {number} accountId - 账号ID
 * @param {number} size - 获取邮件数量（默认5）
 * @returns {Promise<Object>} 邮件列表数据
 */
async function fetchEmailList(token, accountId, size = 5) {
    ensureFetchAvailable();

    const url = `${EMAIL_LIST_URL}?accountId=${accountId}&emailId=0&timeSort=0&size=${size}&type=0`;

    const response = await fetch(url, {
        method: "GET",
        headers: {
            "Authorization": token,
        },
    });

    if (!response.ok) {
        throw new Error(`获取邮件列表失败，HTTP 状态码 ${response.status}`);
    }

    const payloadText = await response.text();
    let payload;
    try {
        payload = JSON.parse(payloadText);
    } catch (error) {
        throw new Error(`邮件列表响应无法解析为 JSON: ${error.message}`);
    }

    if (payload.code !== 200) {
        throw new Error(`获取邮件列表失败: ${payload.message || "未知错误"}`);
    }

    return payload.data;
}

/**
 * 查找最新的 ChatGPT 验证码邮件
 * @param {Array} emailList - 邮件列表
 * @returns {Object|null} 包含验证码和时间的对象，或 null
 */
function findLatestVerificationCode(emailList) {
    if (!emailList || emailList.length === 0) {
        return null;
    }

    // 遍历邮件列表，查找包含验证码的邮件
    for (const email of emailList) {
        const code = extractVerificationCode(email.subject);
        if (code) {
            return {
                code: code,
                time: email.createTime,
                subject: email.subject,
                from: email.name || email.sendEmail,
            };
        }
    }

    return null;
}

/**
 * 获取最新登录验证码（主函数）
 * @param {string} token - 已登录的会话令牌
 * @param {Object} rl - readline 接口（可选）
 */
async function getVerificationCode(token, rl = null) {
    if (!token) {
        throw new Error("缺少会话令牌，请确保已登录");
    }

    if (!rl) {
        throw new Error("缺少 readline 接口");
    }

    console.log("\n获取最新登录验证码");
    console.log("=".repeat(50));

    // 让用户选择账号
    const selectedAccount = await selectAccount(token, rl, true);

    if (!selectedAccount) {
        return; // 用户取消了操作
    }

    console.log(`\n正在获取 ${selectedAccount.email} 的最新邮件...`);

    // 获取邮件列表
    const emailData = await fetchEmailList(token, selectedAccount.accountId, 10);

    if (!emailData.list || emailData.list.length === 0) {
        console.log("\n❌ 该账号暂无邮件。");
        await prompt("\n按回车键返回主菜单...", rl);
        return;
    }

    // 查找验证码
    const verificationInfo = findLatestVerificationCode(emailData.list);

    if (!verificationInfo) {
        console.log("\n❌ 未找到 ChatGPT 验证码邮件。");
        console.log(`最新邮件主题: ${emailData.list[0].subject}`);
        console.log(`发件人: ${emailData.list[0].name || emailData.list[0].sendEmail}`);
        console.log(`时间: ${emailData.list[0].createTime}`);
        await prompt("\n按回车键返回主菜单...", rl);
        return;
    }

    // 显示验证码信息
    console.log("\n✓ 找到验证码！");
    console.log("=".repeat(50));
    console.log(`📧 验证码: ${verificationInfo.code}`);
    console.log(`⏰ 接收时间: ${verificationInfo.time}`);
    console.log(`📨 发件人: ${verificationInfo.from}`);
    console.log(`📝 主题: ${verificationInfo.subject}`);
    console.log("=".repeat(50));

    await prompt("\n按回车键返回主菜单...", rl);
}

module.exports = getVerificationCode;
