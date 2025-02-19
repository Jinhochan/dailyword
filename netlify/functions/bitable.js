const fetch = require('node-fetch');

// 飞书应用凭证
const APP_ID = "cli_a7249c33d178500c";
const APP_SECRET = "gj5ERSbWa85rVLsHGLMFlevQeyioOyNx";
const APP_TOKEN = "WpNmb3hN7aWmfwsHfLxcbgFtny9";
const TABLE_ID = "tblqV42gg6Vwu8MC";
const USER_ID = "ou_560adde5070154c961cb81c4ceb40c65";

// 获取飞书访问令牌
async function getAccessToken() {
    try {
        console.log('正在获取访问令牌...');
        const response = await fetch('https://open.feishu.cn/open-apis/auth/v3/app_access_token/internal', {
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
        console.log('获取令牌响应:', data);

        if (data.code !== 0) {
            throw new Error(`获取访问令牌失败: ${data.msg}`);
        }
        return data.app_access_token;
    } catch (error) {
        console.error('获取访问令牌失败:', error);
        throw error;
    }
}

exports.handler = async function(event, context) {
    // 添加 OPTIONS 请求处理
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            body: ''
        };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: {
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ error: 'Method Not Allowed' })
        };
    }

    try {
        console.log('开始处理请求...');
        const accessToken = await getAccessToken();
        console.log('成功获取访问令牌:', accessToken);

        const { date, startTime, endTime, notes } = JSON.parse(event.body);
        
        // 构建请求体
        const requestBody = {
            fields: {
                "日期": date,
                "上班时间": startTime,
                "下班时间": endTime,
                "备注": notes || ''
            }
        };

        // 发送到多维表格
        const url = `https://open.feishu.cn/open-apis/bitable/v1/apps/${APP_TOKEN}/tables/${TABLE_ID}/records`;
        console.log('请求URL:', url);
        console.log('请求体:', JSON.stringify(requestBody, null, 2));

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        // 检查 HTTP 状态码
        if (!response.ok) {
            const errorText = await response.text();
            console.error('HTTP错误:', response.status, errorText);
            throw new Error(`HTTP错误: ${response.status} ${errorText}`);
        }

        const result = await response.json();
        console.log('多维表格响应:', result);

        if (result.code !== 0) {
            console.error('API错误:', result);
            throw new Error(`API错误: ${result.msg}`);
        }

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            body: JSON.stringify(result)
        };
    } catch (error) {
        console.error('处理请求失败:', {
            message: error.message,
            stack: error.stack,
            time: new Date().toISOString()
        });

        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            body: JSON.stringify({ 
                error: error.message,
                details: error.stack,
                time: new Date().toISOString()
            })
        };
    }
}; 