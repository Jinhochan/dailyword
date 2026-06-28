const fetch = require('node-fetch');

// 从环境变量获取飞书应用凭证
const APP_ID = process.env.FEISHU_APP_ID;
const APP_SECRET = process.env.FEISHU_APP_SECRET;
const APP_TOKEN = process.env.BITABLE_APP_TOKEN || 'WpNmb3hN7aWmfwsHfLxcbgFtny9';
const TABLE_ID = process.env.BITABLE_TABLE_ID || 'tblqV42gg6Vwu8MC';

// 错误码映射（根据飞书多维表格API文档）
const BITABLE_ERROR_CODES = {
    0: '请求成功',
    10001: '应用已被禁用',
    10002: '应用未获得授权',
    10013: 'API调用次数超限',
    11001: '访问令牌无效或过期',
    11010: '应用没有操作权限',
    11011: '当前操作不支持',
    11012: '参数无效',
    11013: '系统内部错误',
    11014: '调用频率过高',
    13002: '多维表格不存在',
    13003: '多维表格表不存在',
    13004: '记录不存在',
    13005: '字段不存在',
    13006: '权限不足',
    13007: '记录数超出限制',
    13008: '字段值不合法'
};

// 字段映射配置 - 解决FieldNameNotFound问题
const FIELD_MAPPINGS = {
    "日期": "上班日期",
    "上班日期": "上班日期",
    "下班日期": "下班日期",
    "上班时间": "上班时间",
    "下班时间": "下班时间",
    "备注": "备注",
    "垫资记录": "垫资记录",
    "垫资总额": "垫资总额",
    "垫资次数": "垫资次数"
};

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

        if (data.code !== 0) {
            const errorMsg = BITABLE_ERROR_CODES[data.code] || '获取访问令牌失败: ' + data.msg;
            throw new Error(errorMsg);
        }
        return data.tenant_access_token;
    } catch (error) {
        console.error('获取访问令牌失败:', error);
        throw error;
    }
}

// 处理多维表格记录创建请求
async function createBitableRecord(accessToken, fields) {
    const url = 'https://open.feishu.cn/open-apis/bitable/v1/apps/' + APP_TOKEN + '/tables/' + TABLE_ID + '/records';

    console.log('请求多维表格URL:', url);
    console.log('当前APP_TOKEN:', APP_TOKEN);
    console.log('当前TABLE_ID:', TABLE_ID);
    console.log('请求体字段详细信息(转换前):', {
        字段名称: Object.keys(fields),
        字段值: fields,
        字段数量: Object.keys(fields).length
    });

    // 使用字段映射转换字段名
    const mappedFields = {};
    for (const [key, value] of Object.entries(fields)) {
        const mappedKey = FIELD_MAPPINGS[key] || key;
        mappedFields[mappedKey] = value;
    }

    // 添加必填的'人员'字段默认值
    if (!mappedFields['人员']) {
        mappedFields['人员'] = '打卡用户';
    }

    console.log('请求体字段详细信息(转换后):', {
        字段名称: Object.keys(mappedFields),
        字段值: mappedFields,
        字段数量: Object.keys(mappedFields).length
    });

    const requestBody = { fields: mappedFields };
    console.log('发送的完整请求体:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + accessToken,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
    });

    console.log('多维表格API响应状态码:', response.status);

    const text = await response.text();
    console.log('多维表格API原始响应文本:', text);

    let result;
    try {
        result = text ? JSON.parse(text) : {};
    } catch (e) {
        console.error('解析多维表格响应失败:', e, '原始响应:', text);
        throw new Error('无效的多维表格API响应格式');
    }

    console.log('多维表格响应解析后:', result);

    if (result.code !== 0) {
        const errorMsg = BITABLE_ERROR_CODES[result.code] || '多维表格操作失败: ' + (result.msg || '未知错误');
        console.error('多维表格操作失败详情:', {
            code: result.code,
            message: result.msg,
            requestBody: requestBody,
            accessTokenUsed: accessToken ? '已提供' : '未提供',
            timestamp: new Date().toISOString()
        });
        throw new Error(errorMsg);
    }

    return result;
}

exports.handler = async function(event, context) {
    console.log('=== 多维表格函数入口 ===');
    console.log('时间:', new Date().toISOString());
    console.log('接收到新的多维表格提交请求');
    console.log('请求方法:', event.httpMethod);
    console.log('请求路径:', event.path);

    // 统一的CORS头
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    // 处理预检请求
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 204,
            headers,
            body: ''
        };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ success: false, error: 'Method Not Allowed' })
        };
    }

    try {
        console.log('开始处理多维表格提交请求...');

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
        if (!formattedData['日期'] && !formattedData.startDate) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'Missing required field',
                    details: { code: 11012, msg: '缺少必要的日期字段' }
                })
            };
        }

        // 构建标准字段格式 - 包含垫资字段
        const fields = {
            "日期": formattedData['日期'] || formattedData.startDate,
            "上班日期": formattedData['上班日期'] || formattedData['日期'] || formattedData.startDate,
            "下班日期": formattedData['下班日期'] || formattedData['日期'] || formattedData.endDate,
            "上班时间": formattedData['上班时间'] || formattedData.startTime,
            "下班时间": formattedData['下班时间'] || formattedData.endTime,
            "备注": formattedData['备注'] || formattedData.notes || '',
            "垫资记录": formattedData['垫资记录'] || '',
            "垫资总额": formattedData['垫资总额'] || '',
            "垫资次数": formattedData['垫资次数'] || 0
        };

        // 确保数据类型正确
        for (const [key, value] of Object.entries(fields)) {
            if (value === undefined || value === null) {
                fields[key] = '';
            } else if (typeof value !== 'string' && typeof value !== 'object' && typeof value !== 'number') {
                fields[key] = String(value);
            }
        }

        // 处理日期字段
        const dateFields = ['日期', '上班日期', '下班日期'];
        for (const field of dateFields) {
            if (fields[field] && typeof fields[field] === 'object' && fields[field].type === 'date' && fields[field].value) {
                const v = fields[field].value;
                fields[field] = v.year + '-' + v.month + '-' + v.day;
                console.log('转换' + field + '为文本:', fields[field]);
            } else if (fields[field] && typeof fields[field] !== 'string') {
                try {
                    const date = new Date(fields[field]);
                    if (!isNaN(date.getTime())) {
                        fields[field] = date.toISOString().split('T')[0];
                    }
                } catch (e) {
                    fields[field] = String(fields[field]);
                }
            }
        }

        // 确保垫资次数为数字
        if (fields['垫资次数']) {
            fields['垫资次数'] = parseInt(fields['垫资次数']) || 0;
        }

        console.log('最终提交字段:', JSON.stringify(fields, null, 2));

        try {
            const accessToken = await getAccessToken();
            console.log('成功获取访问令牌，开始创建多维表格记录...');

            const result = await createBitableRecord(accessToken, fields);

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    result,
                    details: {
                        code: 0,
                        msg: '记录创建成功',
                        recordId: result.data?.record?.record_id || '未知'
                    }
                })
            };
        } catch (apiError) {
            console.error('多维表格API调用失败:', apiError);

            let statusCode = 500;
            let errorCode = 13013;

            if (apiError.message.includes('权限') || apiError.message.includes('禁用')) {
                statusCode = 403;
                errorCode = 11010;
            } else if (apiError.message.includes('参数') || apiError.message.includes('不合法')) {
                statusCode = 400;
                errorCode = 11012;
            } else if (apiError.message.includes('频率')) {
                statusCode = 429;
                errorCode = 11014;
            }

            return {
                statusCode,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: apiError.message,
                    details: {
                        code: errorCode,
                        msg: apiError.message
                    }
                })
            };
        }
    } catch (error) {
        console.error('处理请求失败:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: error.message || '处理请求时发生未知错误',
                details: { code: 11013, msg: '服务器内部错误' }
            })
        };
    }
};
