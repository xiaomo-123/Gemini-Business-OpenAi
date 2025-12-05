const axios = require('axios');
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');

const GEMINI_MAIL_FILE = path.join(__dirname, '../../gemini-mail.yaml');

/**
 * 从 gemini-mail.yaml 读取配置
 */
function loadGeminiMailConfig() {
    try {
        const fileContent = fs.readFileSync(GEMINI_MAIL_FILE, 'utf8');
        return yaml.load(fileContent);
    } catch (error) {
        throw new Error(`读取 gemini-mail.yaml 失败: ${error.message}`);
    }
}

/**
 * 保存更新后的账户列表
 */
function saveGeminiMailConfig(data) {
    try {
        const yamlContent = yaml.dump(data, {
            indent: 2,
            lineWidth: -1,
            noRefs: true
        });
        fs.writeFileSync(GEMINI_MAIL_FILE, yamlContent, 'utf8');
    } catch (error) {
        throw new Error(`保存 gemini-mail.yaml 失败: ${error.message}`);
    }
}

/**
 * 登录 Gemini Pool 平台
 */
async function loginGeminiPool(password, poolUrl) {
    try {
        const response = await axios.post(`${poolUrl}/api/auth/login`, {
            password: password
        });

        if (response.data && response.data.token) {
            return response.data.token;
        } else {
            throw new Error('登录响应中没有 token');
        }
    } catch (error) {
        throw new Error(`登录失败: ${error.message}`);
    }
}

/**
 * 获取平台上的所有账户
 */
async function getPoolAccounts(adminToken, poolUrl) {
    try {
        const response = await axios.get(`${poolUrl}/api/accounts`, {
            headers: {
                'x-admin-token': adminToken
            }
        });

        if (response.data && response.data.accounts) {
            return response.data.accounts;
        } else {
            throw new Error('获取账户列表失败');
        }
    } catch (error) {
        throw new Error(`获取账户列表失败: ${error.message}`);
    }
}

/**
 * 测试单个账户是否可用
 */
async function testAccount(accountId, adminToken, poolUrl) {
    try {
        const response = await axios.get(`${poolUrl}/api/accounts/${accountId}/test`, {
            headers: {
                'x-admin-token': adminToken
            }
        });

        return response.data && response.data.success === true;
    } catch (error) {
        return false;
    }
}

/**
 * 删除账户
 */
async function deleteAccount(accountId, adminToken, poolUrl) {
    try {
        const response = await axios.delete(`${poolUrl}/api/accounts/${accountId}`, {
            headers: {
                'x-admin-token': adminToken
            }
        });

        // 检查多种成功情况：success 为 true，或者 HTTP 状态码为 2xx
        return (response.data && response.data.success === true) || 
               (response.status >= 200 && response.status < 300);
    } catch (error) {
        // 如果是 404 错误（账户不存在），也视为删除成功
        if (error.response && error.response.status === 404) {
            return true;
        }
        console.error(`  删除账户 ${accountId} 时出错: ${error.message}`);
        return false;
    }
}

/**
 * 检查并去除失效账户
 */
async function cleanInvalidAccounts() {
    try {
        console.log('正在读取配置...');
        const config = loadGeminiMailConfig();
        const poolUrl = config.poolApiUrl || 'https://mgs.ccode.vip';
        const password = config.password;

        if (!password) {
            throw new Error('gemini-mail.yaml 中未配置密码');
        }

        console.log('正在登录 Gemini Pool 平台...');
        const adminToken = await loginGeminiPool(password, poolUrl);
        console.log('登录成功！');

        console.log('\n正在获取平台账户列表...');
        const accounts = await getPoolAccounts(adminToken, poolUrl);
        console.log(`找到 ${accounts.length} 个平台账户`);

        if (accounts.length === 0) {
            console.log('平台上没有账户');
            return;
        }

        console.log('\n开始检测账户有效性...');
        let validCount = 0;
        let invalidCount = 0;

        for (const account of accounts) {
            const accountId = account.id;
            console.log(`\n检测账户 ID ${accountId}...`);

            const isValid = await testAccount(accountId, adminToken, poolUrl);

            if (isValid) {
                console.log(`✓ 账户 ${accountId} 可用`);
                validCount++;
            } else {
                console.log(`✗ 账户 ${accountId} 不可用，正在删除...`);
                const deleted = await deleteAccount(accountId, adminToken, poolUrl);
                if (deleted) {
                    console.log(`✓ 账户 ${accountId} 已删除`);
                    invalidCount++;
                } else {
                    console.log(`✗ 账户 ${accountId} 删除失败`);
                }
            }

            // 添加小延迟避免请求过快
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        console.log('\n=== 清理完成 ===');
        console.log(`存活账户: ${validCount}/${accounts.length}`);
        console.log(`已删除: ${invalidCount} 个无效账户`);

    } catch (error) {
        console.error('清理失败:', error.message);
        throw error;
    }
}

module.exports = cleanInvalidAccounts;
