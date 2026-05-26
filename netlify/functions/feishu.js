const fetch = require('node-fetch');

// 从环境变量获取飞书应用凭证
const APP_ID = process.env.FEISHU_APP_ID;
const APP_SECRET = process.env.FEISHU_APP_SECRET;
const CHAT_ID = process.env.FEISHU_CHAT_ID;

// 获取飞书访问令牌
async function getAccessToken() {
    try {
        console.log('正在获取访问令牌...');
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
        
        const text = await response.text();
        let data;
        try {
            data = text ? JSON.parse(text) : {};
        } catch (e) {
            console.error('解析访问令牌响应失败:', e, '原始响应:', text);
            throw new Error('无效的访问令牌响应格式');
        }
        console.log('获取令牌响应:', data);
        return data.tenant_access_token;
    } catch (error) {
        console.error('获取访问令牌失败:', error);
        throw error;
    }
}

// 发送消息到飞书群
async function sendMessage(message) {
    try {
        console.log('正在发送消息...');
        const webhookUrl = process.env.FEISHU_WEBHOOK_URL;
        if (!webhookUrl) throw new Error('未配置 FEISHU_WEBHOOK_URL 环境变量');
        const response = await fetch(webhookUrl, {
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
        
        // 检查响应是否为空或无效
        const text = await response.text();
        let result;
        try {
            result = text ? JSON.parse(text) : {};
        } catch (e) {
            console.error('解析响应JSON失败:', e, '原始响应:', text);
            throw new Error('无效的API响应格式');
        }
        console.log('发送消息响应:', result);
        
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
    // 设置统一的CORS头信息
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };
    
    // 添加 OPTIONS 请求处理
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 204,  // 使用204状态码更适合预检请求
            headers,
            body: ''
        };
    }
    
    // 只允许 POST 请求
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ success: false, error: 'Method Not Allowed' })
        };
    }

    try {
        console.log('开始处理请求...');
        // 安全解析请求体
        let data;
        try {
            data = JSON.parse(event.body || '{}');
        } catch (e) {
            console.error('解析请求体失败:', e);
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    success: false, 
                    error: 'Invalid JSON in request body',
                    details: { code: 400, msg: '请求体JSON格式无效' } 
                })
            };
        }
        
        // 兼容前端可能发送的不同数据格式
        let formattedData = data;
        if (data.fields) {
            formattedData = data.fields;
        }
        
        // 检查必要字段
        if (!formattedData.startDate && !formattedData.日期) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    success: false, 
                    error: 'text require', 
                    details: { code: 400, msg: '缺少必要的打卡信息' } 
                })
            };
        }
        
        // 构建消息内容
        const message = `
打卡信息：
上班日期：${formattedData.日期 || formattedData.startDate}
上班时间：${formattedData.上班时间 || formattedData.startTime}
下班时间：${formattedData.下班时间 || formattedData.endTime}
${formattedData.备注 || formattedData.notes ? `备注：${formattedData.备注 || formattedData.notes}` : ''}
        `.trim();
        
        const result = await sendMessage(message);
        console.log('发送消息成功:', result);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, result })
        };
    } catch (error) {
        console.error('飞书API错误:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                success: false, 
                error: error.message,
                details: { code: 500, msg: '服务器内部错误' }
            })
        };
    }
};