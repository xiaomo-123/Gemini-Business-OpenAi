const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

const GEMINI_CONFIG_PATH = path.resolve(__dirname, "../../gemini-mail.yaml");

/**
 * 确保 gemini-mail.yaml 配置文件存在
 */
function ensureGeminiConfigFile() {
    if (!fs.existsSync(GEMINI_CONFIG_PATH)) {
        throw new Error(`Gemini 配置文件缺失: ${GEMINI_CONFIG_PATH}`);
    }
}

/**
 * 规范化换行符为 Windows 格式
 */
function normalizeLineEndings(content) {
    return content.replace(/\r?\n/g, "\r\n");
}

/**
 * 加载 gemini-mail.yaml 配置文件
 */
function loadGeminiConfig() {
    ensureGeminiConfigFile();
    const raw = yaml.load(fs.readFileSync(GEMINI_CONFIG_PATH, "utf8")) || {};

    if (!raw.accounts) {
        throw new Error("gemini-mail.yaml 格式错误：缺少 accounts 字段");
    }

    if (!raw.accounts.parent) {
        throw new Error("gemini-mail.yaml 格式错误：缺少 parent 账号信息");
    }

    if (!raw.accounts.children || !Array.isArray(raw.accounts.children)) {
        raw.accounts.children = [];
    }

    return raw;
}

/**
 * 获取 Gemini 母号信息
 */
function getGeminiParentAccount() {
    const config = loadGeminiConfig();
    return config.accounts.parent;
}

/**
 * 获取 Gemini 子号列表
 */
function getGeminiChildrenAccounts() {
    const config = loadGeminiConfig();
    return config.accounts.children || [];
}

/**
 * 保存 Gemini 账号配置（包含 token 更新）
 */
function persistGeminiAccounts({ parent, children }) {
    const config = loadGeminiConfig();
    config.accounts = {
        parent,
        children,
    };

    const serialized = yaml.dump(config, { lineWidth: -1 });
    fs.writeFileSync(GEMINI_CONFIG_PATH, normalizeLineEndings(serialized), "utf8");
}

/**
 * 更新指定子号的 token
 * @param {string} email - 子号邮箱
 * @param {Object} tokens - token 对象，包含 csesidx, host_c_oses, secure_c_ses, team_id
 */
function updateChildToken(email, tokens) {
    const config = loadGeminiConfig();
    const child = config.accounts.children.find((c) => c.email === email);

    if (!child) {
        throw new Error(`未找到子号: ${email}`);
    }

    // 更新 4 个 token 字段
    child.tokens = {
        csesidx: tokens.csesidx || "",
        host_c_oses: tokens.host_c_oses || "",
        secure_c_ses: tokens.secure_c_ses || "",
        team_id: tokens.team_id || "",
    };
    child.lastUpdated = new Date().toISOString();

    persistGeminiAccounts({
        parent: config.accounts.parent,
        children: config.accounts.children,
    });
}

module.exports = {
    loadGeminiConfig,
    getGeminiParentAccount,
    getGeminiChildrenAccounts,
    persistGeminiAccounts,
    updateChildToken,
};
