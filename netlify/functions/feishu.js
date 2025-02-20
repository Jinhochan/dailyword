const fetch = require('node-fetch');

// 从环境变量获取飞书应用凭证
const APP_ID = process.env.FEISHU_APP_ID;
const APP_SECRET = process.env.FEISHU_APP_SECRET;
const CHAT_ID = process.env.FEISHU_CHAT_ID;

// 获取飞书访问令牌
async function getAccessToken() {
    try {
        const response = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                "app_id": APP_ID,
                "app_secret": APP_SECRET
            })
        });
        
        const data = await response.json();
        return data.tenant_access_token;
    } catch (error) {
        console.error('获取访问令牌失败:', error);
        throw error;
    }
}

// 发送消息到飞书群
async function sendMessage(message) {
    try {
        const response = await fetch('https://open.feishu.cn/open-apis/bot/v2/hook/c128ef19-33c1-4dce-89d9-fb2145d9a53c', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                "msg_type": "text",  // 必须指定消息类型
                "content": {
                    "text": message
                }
            })
        });
        
        const result = await response.json();
        if (result.code !== 0) {
            throw new Error(result.msg || '发送消息失败');
        }
        return result;
    } catch (error) {
        console.error('发送消息失败:', error);
        throw error;
    }
}

exports.handler = async function(event, context) {
    // 只允许 POST 请求
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method Not Allowed' })
        };
    }

    try {
        const { message } = JSON.parse(event.body);
        const result = await sendMessage(message);
        
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            body: JSON.stringify(result)
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            body: JSON.stringify({ error: error.message })
        };
    }
}; 