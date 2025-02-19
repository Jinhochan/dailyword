const fetch = require('node-fetch');

// 飞书应用凭证
const APP_ID = "cli_a7249c33d178500c";
const APP_SECRET = "gj5ERSbWa85rVLsHGLMFlevQeyioOyNx";
const APP_TOKEN = "WpNmb3hN7aWmfwsHfLxcbgFtny9";
const TABLE_ID = "tblqV42gg6Vwu8MC";

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
        if (data.code !== 0) {
            throw new Error(data.msg || '获取访问令牌失败');
        }
        return data.tenant_access_token;
    } catch (error) {
        console.error('获取访问令牌失败:', error);
        throw error;
    }
}

exports.handler = async function(event, context) {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method Not Allowed' })
        };
    }

    try {
        // 获取访问令牌
        const accessToken = await getAccessToken();
        
        // 解析请求数据
        const { date, startTime, endTime, notes } = JSON.parse(event.body);

        // 发送到多维表格
        const response = await fetch(`https://open.feishu.cn/open-apis/bitable/v1/apps/${APP_TOKEN}/tables/${TABLE_ID}/records`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fields: {
                    "日期": date,
                    "上班时间": startTime,
                    "下班时间": endTime,
                    "备注": notes
                }
            })
        });

        const result = await response.json();
        if (result.code !== 0) {
            throw new Error(result.msg || '创建记录失败');
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
        console.error('Error:', error);
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