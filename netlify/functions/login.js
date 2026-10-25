// 飞书 OAuth 登录（Netlify Functions）
// 参考：https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/authen-v1/login-overview
//
// 流程：
// 1. 前端跳 https://accounts.feishu.cn/open-apis/authen/v1/authorize?client_id=&redirect_uri=&response_type=code&scope=
// 2. 飞书回调到 redirect_uri，URL 带 ?code=xxx&state=yyy
// 3. 前端 fetch POST /login/exchange { code }
// 4. 后端调 https://accounts.feishu.cn/oauth/v3/token 用 code 换 user_access_token
// 5. 后端用 user_access_token 调 GET https://open.feishu.cn/open-apis/authen/v1/user_info
// 6. 返回 user_id / name / avatar_url 给前端

// 兼容多种环境变量名（防拼写错误）
const APP_ID = process.env.FEISHU_APP_ID || process.env.LARK_APP_ID || process.env.CLIENT_ID;
const APP_SECRET = process.env.FEISHU_APP_SECRET || process.env.LARK_APP_SECRET || process.env.CLIENT_SECRET || process.env.APP_SECRET;
const REDIRECT_URI = 'https://bespoke-gecko-4ac4c3.netlify.app/';
const OPEN_BASE = 'https://open.feishu.cn';
const ACCOUNTS_BASE = 'https://accounts.feishu.cn';

// 默认请求的 scope（空格分隔）
const DEFAULT_SCOPE = 'auth:user.id:read contact:user.base:readonly contact:contact.base:readonly';

function setCORS() {
    return {
        'Access-Control-Allow-Origin': REDIRECT_URI,
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    };
}

// 诊断：返回配置情况（脱敏）
function getDiagnostics() {
    return {
        app_id_set: !!APP_ID,
        app_id: APP_ID,
        app_secret_set: !!APP_SECRET,
        app_secret_length: APP_SECRET ? APP_SECRET.length : 0,
        app_secret_preview: APP_SECRET ? APP_SECRET.slice(0, 4) + '...' + APP_SECRET.slice(-4) : null,
        env_keys: Object.keys(process.env).filter(k => /feishu|lark|client|secret|app/.test(k.toLowerCase())),
        node_version: process.version,
        function: 'login'
    };
}

async function exchangeCode(code) {
    // 步骤 1：用 code 换 user_access_token
    // 注意：飞书 OAuth v3 token 端点要求 body 里必须带 redirect_uri，
    // 且必须和授权请求时用的一致，否则报 20063 invalid_request
    const tokenResp = await fetch(ACCOUNTS_BASE + '/oauth/v3/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            client_id: APP_ID,
            client_secret: APP_SECRET,
            code: code,
            redirect_uri: REDIRECT_URI,
            grant_type: 'authorization_code'
        })
    });

    const rawText = await tokenResp.text();
    let tokenData;
    try {
        tokenData = JSON.parse(rawText);
    } catch(e) {
        tokenData = { raw: rawText.slice(0, 500) };
    }

    if (!tokenData.access_token) {
        return {
            ok: false,
            step: 'token_exchange',
            error: 'token exchange failed',
            http_status: tokenResp.status,
            detail: tokenData,
            diagnosis: getDiagnostics()
        };
    }

    const userAccessToken = tokenData.access_token;

    // 步骤 2：用 user_access_token 拿用户信息
    const userResp = await fetch(OPEN_BASE + '/open-apis/authen/v1/user_info', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + userAccessToken
        }
    });

    const userText = await userResp.text();
    let userData;
    try {
        userData = JSON.parse(userText);
    } catch(e) {
        userData = { raw: userText.slice(0, 500) };
    }

    if (userData.code !== 0) {
        return {
            ok: false,
            step: 'user_info',
            error: 'user info failed',
            http_status: userResp.status,
            detail: userData,
            diagnosis: getDiagnostics()
        };
    }

    const u = userData.data || {};
    return {
        ok: true,
        user: {
            user_id: u.open_id,
            union_id: u.union_id,
            name: u.name,
            email: u.email,
            avatar_url: u.avatar_url,
            mobile: u.mobile,
            tenant_key: u.tenant_key,
            login_at: Date.now(),
            scopes: tokenData.scope || ''
        }
    };
}

exports.handler = async (event, context) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: setCORS(), body: '' };
    }

    const headers = setCORS();
    headers['Content-Type'] = 'application/json';

    // 1. GET /login/diag —— 诊断端点（看环境变量是否配置）
    if (event.httpMethod === 'GET' && event.path === '/.netlify/functions/login' && event.queryStringParameters && event.queryStringParameters.diag) {
        return { statusCode: 200, headers: headers, body: JSON.stringify(getDiagnostics()) };
    }

    // 2. POST /login/exchange —— 前端 fetch 调（带 JSON body { code }）
    if (event.httpMethod === 'POST' && event.path === '/.netlify/functions/login') {
        let body;
        try {
            body = JSON.parse(event.body || '{}');
        } catch(e) {
            return { statusCode: 400, headers: headers, body: JSON.stringify({ error: 'invalid JSON body', diagnosis: getDiagnostics() }) };
        }
        const code = body.code;
        if (!code) {
            return { statusCode: 400, headers: headers, body: JSON.stringify({ error: 'code required', diagnosis: getDiagnostics() }) };
        }

        const result = await exchangeCode(code);
        if (!result.ok) {
            return { statusCode: 400, headers: headers, body: JSON.stringify(result) };
        }
        return { statusCode: 200, headers: headers, body: JSON.stringify(result.user) };
    }

    // 3. GET /login?code=xxx —— 飞书回调时浏览器直接跳这里（备选）
    if (event.httpMethod === 'GET' && event.queryStringParameters && event.queryStringParameters.code) {
        const code = event.queryStringParameters.code;
        const result = await exchangeCode(code);
        if (!result.ok) {
            return { statusCode: 400, headers: headers, body: JSON.stringify(result) };
        }
        return { statusCode: 200, headers: headers, body: JSON.stringify(result.user) };
    }

    // 4. GET /login —— 返回配置
    if (event.httpMethod === 'GET') {
        return { statusCode: 200, headers: headers, body: JSON.stringify({
            client_id: APP_ID,
            base_url: ACCOUNTS_BASE + '/open-apis/authen/v1/authorize',
            redirect_uri: REDIRECT_URI,
            scope: DEFAULT_SCOPE,
            status: APP_ID && APP_SECRET ? 'ok' : 'env_missing'
        }) };
    }

    return { statusCode: 404, headers: headers, body: JSON.stringify({ error: 'Not Found' }) };
};
