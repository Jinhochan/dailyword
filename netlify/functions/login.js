// 飞书 OAuth 登录（Netlify Functions）
// GET  /login?code=xxx     —— 用 code 换 user_id（飞书回调时浏览器直接跳这里）
// POST /login/exchange     —— 同上，前端 fetch 调用
// GET  /login              —— 返回 {app_id, base_url, redirect_uri} 供前端生成授权 URL
//
// 回调域名（飞书后台配置）：https://bespoke-gecko-4ac4c3.netlify.app/
// 飞书回调 redirect_uri：  https://bespoke-gecko-4ac4c3.netlify.app/  （前端页面本身）

const APP_ID = process.env.FEISHU_APP_ID;
const APP_SECRET = process.env.FEISHU_APP_SECRET;
const REDIRECT_URI = 'https://bespoke-gecko-4ac4c3.netlify.app/';
const FEISHU_BASE = 'https://open.feishu.cn';

function setCORS() {
    return {
        'Access-Control-Allow-Origin': REDIRECT_URI,
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    };
}

async function getTenantToken() {
    const resp = await fetch(FEISHU_BASE + '/open-apis/auth/v3/tenant_access_token/internal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ app_id: APP_ID, app_secret: APP_SECRET })
    });
    const d = await resp.json();
    if (!d.tenant_access_token) {
        throw new Error('tenant token failed: ' + JSON.stringify(d));
    }
    return d.tenant_access_token;
}

async function exchangeCode(code) {
    const token = await getTenantToken();

    // 1. 用 code 换 access_token
    const codeResp = await fetch(FEISHU_BASE + '/open-apis/authen/v1/access_token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({ grant_type: 'authorization_code', code: code })
    });
    const codeData = await codeResp.json();

    if (codeData.code !== 0) {
        return { ok: false, error: 'code exchange failed', detail: codeData };
    }

    const accessToken = codeData.data.access_token;

    // 2. 用 access_token 拿 user_info
    const userResp = await fetch(FEISHU_BASE + '/open-apis/authen/v1/user_info', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + accessToken
        }
    });
    const userData = await userResp.json();

    if (userData.code !== 0) {
        return { ok: false, error: 'user info failed', detail: userData };
    }

    const u = userData.data || {};
    return {
        ok: true,
        user: {
            user_id: u.user_id,
            union_id: u.union_id,
            name: u.name,
            email: u.email,
            avatar_url: u.avatar_url,
            mobile: u.mobile,
            tenant_key: u.tenant_key,
            login_at: Date.now()
        }
    };
}

exports.handler = async (event, context) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: setCORS(), body: '' };
    }

    const headers = setCORS();

    // 1. GET /login?code=xxx —— 飞书回调，浏览器直接跳这里
    if (event.httpMethod === 'GET' && event.queryStringParameters && event.queryStringParameters.code) {
        const code = event.queryStringParameters.code;
        const result = await exchangeCode(code);

        if (!result.ok) {
            return { statusCode: 400, headers: headers, body: JSON.stringify(result) };
        }

        // 返回 JSON（前端 fetch 用），同时加 Content-Type
        headers['Content-Type'] = 'application/json';
        return { statusCode: 200, headers: headers, body: JSON.stringify(result.user) };
    }

    // 2. POST /login/exchange —— 前端 fetch 调（带 JSON body { code }）
    if (event.httpMethod === 'POST' && event.path === '/.netlify/functions/login') {
        let body;
        try {
            body = JSON.parse(event.body || '{}');
        } catch(e) {
            return { statusCode: 400, headers: headers, body: JSON.stringify({ error: 'invalid JSON body' }) };
        }
        const code = body.code;
        if (!code) {
            return { statusCode: 400, headers: headers, body: JSON.stringify({ error: 'code required' }) };
        }
        const result = await exchangeCode(code);
        if (!result.ok) {
            return { statusCode: 400, headers: headers, body: JSON.stringify(result) };
        }
        headers['Content-Type'] = 'application/json';
        return { statusCode: 200, headers: headers, body: JSON.stringify(result.user) };
    }

    // 3. GET /login —— 返回配置
    if (event.httpMethod === 'GET') {
        headers['Content-Type'] = 'application/json';
        return { statusCode: 200, headers: headers, body: JSON.stringify({
            app_id: APP_ID,
            base_url: FEISHU_BASE + '/open-apis/authen/v1/authorize',
            redirect_uri: REDIRECT_URI,
            status: 'ok'
        }) };
    }

    return { statusCode: 404, headers: headers, body: JSON.stringify({ error: 'Not Found' }) };
};
