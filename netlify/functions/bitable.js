const fetch = require('node-fetch');

// 固定的配置
const CONFIG = {
    APP_ID: "cli_a7249c33d178500c",
    APP_SECRET: "gj5ERSbWa85rVLsHGLMFlevQeyioOyNx",
    BITABLE_APP_ID: "WpNmb3hN7aWmfwsHfLxcbgFtny9",
    TABLE_ID: "tblqV42gg6Vwu8MC"
};

// 添加 CORS 处理
const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
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
        // 1. 获取 token
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
        
        if (tokenData.code !== 0) {
            throw new Error(`获取Token失败: ${tokenData.msg}`);
        }

        // 2. 写入数据
        const requestData = JSON.parse(event.body);
        const writeResponse = await fetch(`https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.BITABLE_APP_ID}/tables/${CONFIG.TABLE_ID}/records`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${tokenData.tenant_access_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fields: requestData.fields
            })
        });

        const writeData = await writeResponse.json();
        
        if (writeData.code !== 0) {
            throw new Error(`写入失败: ${writeData.msg}`);
        }

        return {
            statusCode: 200,
            headers: {
                ...headers,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                success: true,
                data: writeData
            })
        };

    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers: {
                ...headers,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                success: false,
                error: error.message
            })
        };
    }
}; 