const config = require("../config");
const { selectAccount, prompt } = require("../selectAccount");
const readline = require("readline");

// 从配置中获取 emailApiUrl，如果未配置则使用默认值
const { emailApiUrl } = config.getCredentials();
const DELETE_ACCOUNT_URL = `${emailApiUrl}/api/account/delete`;

/**
 * 确保 fetch API 可用
 */
function ensureFetchAvailable() {
    if (typeof globalThis.fetch !== "function") {
        throw new Error("当前 Node 版本不支持全局 fetch，请使用 Node 18+ 或自行 polyfill fetch");
    }
}

/**
 * 创建 readline 接口的辅助函数
 */
function createReadlineInterface() {
    return readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
}

/**
 * 执行删除账号的 API 请求
 * @param {string} token - 已登录的会话令牌
 * @param {number} accountId - 要删除的账号ID
 */
async function performDelete(token, accountId) {
    ensureFetchAvailable();

    const url = `${DELETE_ACCOUNT_URL}?accountId=${accountId}`;

    console.log(`正在删除账号 ID: ${accountId}...`);

    const response = await fetch(url, {
        method: "DELETE",
        headers: {
            "Authorization": token,
        },
    });

    if (!response.ok) {
        throw new Error(`删除账号请求失败，HTTP 状态码 ${response.status}`);
    }

    const payloadText = await response.text();
    let payload;
    try {
        payload = JSON.parse(payloadText);
    } catch (error) {
        throw new Error(`删除账号响应无法解析为 JSON: ${error.message}`);
    }

    if (payload.code !== 200) {
        throw new Error(`删除账号失败: ${payload.message || "未知错误"}`);
    }

    return payload;
}

/**
 * 手动输入邮箱地址进行删除
 */
async function deleteByManualInput(token, rl) {
    const email = await prompt("\n请输入要删除的邮箱地址: ", rl);

    if (!email) {
        console.log("邮箱地址不能为空。");
        return null;
    }

    // 从配置文件中查找对应的账号ID
    const accounts = config.getStoredAccounts();
    const children = accounts.children || [];
    const foundAccount = children.find(child => child.email === email);

    if (!foundAccount) {
        throw new Error(`未找到邮箱 ${email} 对应的账号`);
    }

    return foundAccount;
}

/**
 * 确认删除
 */
async function confirmDelete(account, rl) {
    console.log(`\n准备删除账号: ${account.email} (ID: ${account.accountId})`);
    const confirm = await prompt(
        `⚠️  确认要删除吗？(y/n): `,
        rl
    );

    if (confirm.toLowerCase() !== "y" && confirm.toLowerCase() !== "yes") {
        console.log("已取消删除操作。");
        return false;
    }
    return true;
}

/**
 * 删除子号主函数
 * @param {string} token - 已登录的会话令牌
 * @param {Object} rl - readline 接口（可选，如果不提供则创建新的）
 */
async function deleteAccount(token, rl = null) {
    if (!token) {
        throw new Error("缺少会话令牌，请确保已登录");
    }

    // 如果没有传入 readline 接口，则创建一个新的
    const shouldCloseRl = !rl;
    if (!rl) {
        rl = createReadlineInterface();
    }

    try {
        console.log("\n删除子号 - 请选择操作方式：");
        console.log("  1. 同步子号列表（推荐）");
        console.log("  2. 手动输入邮箱");
        console.log("  0. 取消");

        const choice = await prompt("\n请选择: ", rl);

        let accountToDelete = null;

        if (choice === "1") {
            // 使用共享的 selectAccount 函数
            accountToDelete = await selectAccount(token, rl, true);
        } else if (choice === "2") {
            accountToDelete = await deleteByManualInput(token, rl);
        } else if (choice === "0") {
            console.log("已取消删除操作。");
            return;
        } else {
            throw new Error("无效的选择");
        }

        if (!accountToDelete) {
            return; // 用户取消了操作
        }

        // 统一进行二次确认
        const confirmed = await confirmDelete(accountToDelete, rl);
        if (!confirmed) {
            return;
        }

        // 执行删除
        await performDelete(token, accountToDelete.accountId);

        console.log(`✓ 子号删除成功！`);
        console.log(`  - 邮箱: ${accountToDelete.email}`);
        console.log(`  - 账号ID: ${accountToDelete.accountId}`);

    } finally {
        // 只有在函数内部创建的 readline 接口才需要关闭
        if (shouldCloseRl) {
            rl.close();
        }
    }
}

module.exports = deleteAccount;

