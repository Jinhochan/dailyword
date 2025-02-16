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
        console.log('Starting API call with config:', {
            app_id: CONFIG.APP_ID,
            base_id: CONFIG.BITABLE_APP_ID,
            table_id: CONFIG.TABLE_ID
        });

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
        console.log('Token Response:', {
            code: tokenData.code,
            msg: tokenData.msg,
            hasToken: !!tokenData.tenant_access_token
        });

        if (tokenData.code !== 0) {
            throw new Error(`获取Token失败: ${tokenData.msg} (${tokenData.code})`);
        }

        // 2. 先获取 Base 信息
        const baseResponse = await fetch(`https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.BITABLE_APP_ID}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${tokenData.tenant_access_token}`,
                'Content-Type': 'application/json'
            }
        });

        const baseData = await baseResponse.json();
        console.log('Base Response:', {
            code: baseData.code,
            msg: baseData.msg,
            data: baseData.data
        });

        if (baseData.code !== 0) {
            throw new Error(`获取Base信息失败: ${baseData.msg} (${baseData.code})`);
        }

        // 3. 获取表格信息
        const tableResponse = await fetch(`https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.BITABLE_APP_ID}/tables/${CONFIG.TABLE_ID}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${tokenData.tenant_access_token}`,
                'Content-Type': 'application/json'
            }
        });

        const tableData = await tableResponse.json();
        console.log('Table Info:', tableData);

        if (tableData.code !== 0) {
            throw new Error(`获取表格信息失败: ${tableData.msg} (${tableData.code})`);
        }

        // 格式化请求数据
        const requestData = JSON.parse(event.body);
        const formattedFields = {
            fields: {
                "日期": requestData.fields["日期"] || '',
                "上班时间": requestData.fields["上班时间"] || '',
                "下班时间": requestData.fields["下班时间"] || '',
                "备注": requestData.fields["备注"] || ''
            }
        };

        console.log('Formatted Fields:', formattedFields);

        // 写入记录
        const writeResponse = await fetch(`https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.BITABLE_APP_ID}/tables/${CONFIG.TABLE_ID}/records`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${tokenData.tenant_access_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formattedFields)
        });

        // 检查响应状态
        if (!writeResponse.ok) {
            const text = await writeResponse.text();
            console.error('API Error Response:', {
                status: writeResponse.status,
                statusText: writeResponse.statusText,
                body: text
            });
            throw new Error(`API请求失败: ${writeResponse.status} ${writeResponse.statusText}`);
        }

        let writeData;
        try {
            writeData = await writeResponse.json();
        } catch (jsonError) {
            console.error('JSON Parse Error:', {
                error: jsonError,
                response: await writeResponse.text()
            });
            throw new Error('API响应格式错误');
        }

        console.log('Write Response:', writeData);

        if (writeData.code !== 0) {
            throw new Error(`写入失败: ${writeData.msg} (${writeData.code})`);
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
        console.error('Full Error Details:', {
            message: error.message,
            code: error.code,
            requestData: event.body,
            formattedData: formattedFields,
            stack: error.stack
        });

        // 检查是否是 JSON 解析错误
        const isJsonError = error.message.includes('invalid json');
        
        return {
            statusCode: isJsonError ? 502 : (error.code || 500),
            headers: {
                ...headers,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                success: false,
                error: isJsonError ? 'API响应格式错误' : error.message,
                details: {
                    code: error.code,
                    msg: error.message,
                    fields: formattedFields
                }
            })
        };
    }
}; 