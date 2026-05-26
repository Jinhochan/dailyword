const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    // 定义统一的CORS头
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };
    
    // 添加 OPTIONS 请求处理
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 204, // 使用204状态码更适合预检请求
            headers: corsHeaders,
            body: ''
        };
    }
    
    // 只允许 POST 请求
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: corsHeaders,
            body: JSON.stringify({ success: false, error: 'Method Not Allowed' })
        };
    }

    try {
        // 安全解析请求体
        let data;
        try {
            data = JSON.parse(event.body || '{}');
        } catch (e) {
            console.error('解析请求体失败:', e);
            return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type'
                },
                body: JSON.stringify({ 
                    success: false, 
                    error: 'Invalid JSON in request body',
                    details: { code: 400, msg: '请求体JSON格式无效' } 
                })
            };
        }
        
        // 检查必要字段
        if (!data.startDate || !data.startTime || !data.endTime) {
            return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type'
                },
                body: JSON.stringify({ 
                    success: false, 
                    error: 'text require', 
                    details: { code: 400, msg: '缺少必要的打卡信息' } 
                })
            };
        }
        
        // 构建消息内容
        const title = '打卡通知';
        const message = `
### 打卡信息
- 上班日期：${data.startDate}
- 上班时间：${data.startTime}
- 下班时间：${data.endTime}
${data.notes ? `- 备注：${data.notes}` : ''}
        `.trim();
        
        // 从环境变量获取Server酱的SEND_KEY
        const SEND_KEY = process.env.SERVER_CHAN_SEND_KEY;
        if (!SEND_KEY) throw new Error("未配置 SERVER_CHAN_SEND_KEY 环境变量");
        
        // 构建推送URL
        const url = `https://sctapi.ftqq.com/${SEND_KEY}.send`;
        
        // 构建表单数据
        const params = new URLSearchParams();
        params.append('title', title);
        params.append('desp', message);
        
        // 发送推送请求
        const response = await fetch(url, {
            method: 'POST',
            body: params,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        
        // 安全解析响应
        const text = await response.text();
        let result;
        try {
            result = text ? JSON.parse(text) : {};
        } catch (e) {
            console.error('解析响应JSON失败:', e, '原始响应:', text);
            throw new Error('无效的API响应格式');
        }
        
        if (result.code !== 0) {
            throw new Error(result.message || '发送微信推送失败');
        }
        
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            body: JSON.stringify({ success: true, result })
        };
    } catch (error) {
        console.error('发送微信推送失败:', error);
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            body: JSON.stringify({ 
                success: false, 
                error: error.message,
                details: { code: 500, msg: '服务器内部错误' }
            })
        };
    }
};