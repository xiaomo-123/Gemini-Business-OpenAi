这是一个基于Node.js和Puppeteer的自动化工具，
主要用于管理临时邮箱和Gemini Business账号。
它通过自动化登录、获取验证码、刷新token等操作，
实现了临时邮箱和Gemini Business账号的全生命周期管理，
并能将账号同步到Gemini Pool平台。

3. Gemini Business账号管理流程
1自动刷新Token流程：

验证当前登录的母号是否与配置文件一致
获取所有子号列表
对每个子号执行登录操作：
使用Puppeteer启动浏览器
访问Gemini登录页面
输入邮箱
从邮箱中获取验证码
输入验证码完成登录
获取4个token：secure_c_ses, host_c_oses, csesidx, team_id
更新配置文件中的token信息

2同步到Gemini Pool流程：

登录Gemini Pool平台
删除所有现有账号
从配置文件中读取刷新后的账号信息
将所有账号添加到Gemini Pool平台

1、邮箱管理模块获取子号列表
util/mail/tempMail.js -调用 registerTempEmail 函数：
2. 通过Gemini模块获取子号
从gemini-mail.yaml配置文件中读取子账号信息


1选择邮箱管理：

输入1选择"邮箱管理"
2创建子号（如果还没有）：

输入2选择"新建子号"
按提示创建所需的子号

3获取子号列表：
输入1选择"重新获取所有邮箱"
确保子号已正确保存到temp-mail.yaml

4切换到Gemini Business管理：
返回主菜单
输入3选择"Gemini Business 管理"

5添加子号到gemini-mail.yaml：
输入1选择"重置已注册的 Business 账号"
程序会显示temp-mail.yaml中的所有子号列表
输入要选择的子号序号（可以输入单个序号如1，或多个序号用逗号分隔如1,3,5）
确认后，选中的子号会被保存到gemini-mail.yaml
if (require.main === module) {
    // 如果直接运行此文件，则执行清理函数
    cleanInvalidAccounts()
        .then(() => console.log('清理完成'))
        .catch(err => console.error('清理失败:', err.message));
}
node cleanInvalidAccounts.js
