const { autoRefreshGeminiTokens } = require("./autoRefresh");
const { getCredentials } = require("../config");

/**
 * Gemini Business 自动刷新工具
 * 检测母号并自动刷新所有子号的 token
 * @param {string} token - 已登录的会话令牌
 */
async function geminiAutoRefresh(token) {
    try {
        // 获取当前登录的母号邮箱
        const { loginEmail } = getCredentials();

        console.log(`\n当前登录母号: ${loginEmail}`);

        // 执行自动刷新
        const result = await autoRefreshGeminiTokens(loginEmail, token);

        return result;
    } catch (error) {
        console.error(`\n❌ Gemini 自动刷新失败: ${error.message}`);
        throw error;
    }
}

module.exports = geminiAutoRefresh;
