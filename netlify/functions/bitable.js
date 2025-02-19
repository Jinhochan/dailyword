const fetch = require('node-fetch');

// 从环境变量获取配置
const APP_ID = process.env.FEISHU_APP_ID;
const APP_SECRET = process.env.FEISHU_APP_SECRET;
const APP_TOKEN = process.env.BITABLE_APP_TOKEN;
const TABLE_ID = process.env.BITABLE_TABLE_ID;

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

// 发送数据到多维表格
async function sendToBitable(fields) {
    try {
        const accessToken = await getAccessToken();
        const response = await fetch(`https://open.feishu.cn/open-apis/bitable/v1/apps/${APP_TOKEN}/tables/${TABLE_ID}/records`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fields: fields
            })
        });
        
        const result = await response.json();
        if (result.code !== 0) {
            throw new Error(result.msg || '创建记录失败');
        }
        return result;
    } catch (error) {
        console.error('发送到多维表格失败:', error);
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
        const { date, startTime, endTime, notes } = JSON.parse(event.body);
        const result = await sendToBitable({
            "日期": date,
            "上班时间": startTime,
            "下班时间": endTime,
            "备注": notes
        });
        
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