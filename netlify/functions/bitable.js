const fetch = require('node-fetch');

// 固定的配置
const CONFIG = {
    APP_ID: "cli_a7249c33d178500c",
    APP_SECRET: "gj5ERSbWa85rVLsHGLMFlevQeyioOyNx",
    BITABLE_APP_ID: "WpNmb3hN7aWmfwsHfLxcbgFtny9",
    TABLE_ID: "tblqV42gg6Vwu8MC",
    COLUMNS: {
        DATE: "日期",
        START_TIME: "上班时间",
        END_TIME: "下班时间",
        NOTES: "备注"
    }
};

// 添加 CORS 处理
const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

exports.handler = async function(event, context) {
    // 添加请求日志
    console.log('Request Method:', event.httpMethod);
    console.log('Request Headers:', event.headers);
    console.log('Request Body:', event.body);

    // 处理 OPTIONS 请求
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    if (event.httpMethod !== 'POST') {
        return { 
            statusCode: 405, 
            headers,
            body: 'Method Not Allowed' 
        };
    }

    try {
        // 1. 获取 tenant_access_token
        const tokenResponse = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                "app_id": CONFIG.APP_ID,
                "app_secret": CONFIG.APP_SECRET
            })
        });

        const tokenData = await tokenResponse.json();
        console.log('Token Response:', tokenData);

        if (tokenData.code !== 0) {
            throw new Error(`获取Token失败: ${tokenData.msg} (${tokenData.code})`);
        }

        // 2. 写入数据
        const requestData = JSON.parse(event.body);
        const apiUrl = `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.BITABLE_APP_ID}/tables/${CONFIG.TABLE_ID}/records`;

        // 使用新版 API 格式
        const tableResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${tokenData.tenant_access_token}`,
                'Content-Type': 'application/json',
                'X-Lark-App-Id': CONFIG.APP_ID  // 添加应用 ID
            },
            body: JSON.stringify({
                "record": {  // 使用 record 包装
                    "fields": requestData.fields
                }
            })
        });

        const responseData = await tableResponse.json();
        console.log('Write Response:', responseData);

        if (responseData.code !== 0) {
            // 获取错误详情
            const errorDetails = await fetch(`https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.BITABLE_APP_ID}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${tokenData.tenant_access_token}`,
                    'Content-Type': 'application/json',
                    'X-Lark-App-Id': CONFIG.APP_ID
                }
            }).then(res => res.json());

            console.error('Error Details:', {
                response: responseData,
                details: errorDetails,
                token: tokenData.tenant_access_token.substring(0, 10) + '...'
            });

            throw new Error(`写入失败: ${responseData.msg} (${responseData.code})`);
        }

        return {
            statusCode: 200,
            headers: {
                ...headers,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                success: true,
                data: responseData
            })
        };
    } catch (error) {
        console.error('Detailed Error:', error);
        return {
            statusCode: error.code || 500,
            headers: {
                ...headers,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                success: false,
                error: error.message,
                details: {
                    code: error.code,
                    msg: error.msg,
                    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
                }
            })
        };
    }
}; 