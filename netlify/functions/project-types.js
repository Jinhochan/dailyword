// 飞书多维表格「项目类型」字段选项读取（Netlify Functions）
// 用途：网页端动态显示项目类型选项。在飞书多维表格里给「项目类型」字段增删选项后，网页刷新即自动同步。
// 请求方式：GET，返回 { success: true, options: ["送礼", ...], updatedAt: "..." }

const APP_ID = process.env.FEISHU_APP_ID;
const APP_SECRET = process.env.FEISHU_APP_SECRET;
const APP_TOKEN = process.env.BITABLE_APP_TOKEN || 'WpNmb3hN7aWmfwsHfLxcbgFtny9';
const TABLE_ID = process.env.BITABLE_TABLE_ID || 'tblqV42gg6Vwu8MC';
const PROJECT_FIELD_NAME = process.env.PROJECT_FIELD_NAME || '项目类型';

async function getAccessToken() {
    const response = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ app_id: APP_ID, app_secret: APP_SECRET })
    });
    const text = await response.text();
    let data;
    try {
        data = text ? JSON.parse(text) : {};
    } catch (e) {
        throw new Error('无效的访问令牌响应格式');
    }
    if (data.code !== 0) {
        throw new Error('获取访问令牌失败: ' + (data.msg || data.code));
    }
    return data.tenant_access_token;
}

exports.handler = async function(event) {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=60'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers, body: '' };
    }
    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, headers, body: JSON.stringify({ success: false, error: 'Method Not Allowed' }) };
    }

    try {
        const accessToken = await getAccessToken();
        const url = 'https://open.feishu.cn/open-apis/bitable/v1/apps/' + APP_TOKEN + '/tables/' + TABLE_ID + '/fields?page_size=100';
        const resp = await fetch(url, { headers: { Authorization: 'Bearer ' + accessToken } });
        const text = await resp.text();
        let data;
        try {
            data = text ? JSON.parse(text) : {};
        } catch (e) {
            throw new Error('无效的字段列表响应格式');
        }
        if (data.code !== 0) {
            throw new Error('读取字段失败: ' + (data.msg || data.code));
        }

        const items = (data.data && data.data.items) || [];
        const field = items.find(function(f) { return f.field_name === PROJECT_FIELD_NAME; });
        if (!field) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ success: false, error: '多维表格中找不到字段「' + PROJECT_FIELD_NAME + '」' })
            };
        }

        const options = (field.property && field.property.options) || [];
        const names = [];
        for (const opt of options) {
            const name = (opt && opt.name ? String(opt.name) : '').trim();
            if (!name) continue;
            if (names.indexOf(name) > -1) continue; // 去重（表里可能存在同名重复选项）
            names.push(name);
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                field: field.field_name,
                uiType: field.ui_type,
                options: names,
                updatedAt: new Date().toISOString()
            })
        };
    } catch (error) {
        console.error('读取项目类型选项失败:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ success: false, error: error.message || '读取项目类型选项失败' })
        };
    }
};
