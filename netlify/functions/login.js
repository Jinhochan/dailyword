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

const APP_ID = process.env.FEISHU_APP_ID;       // = client_id
const APP_SECRET = process.env.FEISHU_APP_SECRET; // = client_secret
const REDIRECT_URI = 'https://bespoke-gecko-4ac4c3.netlify.app/';
const OPEN_BASE = 'https://open.feishu.cn';
const ACCOUNTS_BASE = 'https://accounts.feishu.cn';

// 默认请求的 scope（空格分隔）
// auth:user.id:read 是基础权限，contact 相关是通讯录
const DEFAULT_SCOPE = 'auth:user.id:read contact:user.base:readonly contact:contact.base:readonly';

function setCORS() {
    return {
        'Access-Control-Allow-Origin': REDIRECT_URI,
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    };
}

async function exchangeCode(code) {
    // 步骤 1：用 code 换 user_access_token
    // 端点：https://accounts.feishu.cn/oauth/v3/token (v3 版本)
    // Content-Type: application/x-www-form-urlencoded (RFC 标准，v3 也兼容 json)
    // 关键：用 client_id + client_secret（不是 app_id）
    const tokenResp = await fetch(ACCOUNTS_BASE + '/oauth/v3/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            client_id: APP_ID,
            client_secret: APP_SECRET,
            code: code,
            grant_type: 'authorization_code'
        })
    });

    const tokenData = await tokenResp.json();

    if (!tokenData.access_token) {
        return {
            ok: false,
            error: 'token exchange failed',
            detail: tokenData,
            http_status: tokenResp.status
        };
    }

    const userAccessToken = tokenData.access_token;

    // 步骤 2：用 user_access_token 拿用户信息
    // 端点：https://open.feishu.cn/open-apis/authen/v1/user_info
    // Header: Authorization: Bearer <user_access_token>
    const userResp = await fetch(OPEN_BASE + '/open-apis/authen/v1/user_info', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + userAccessToken
        }
    });

    const userData = await userResp.json();

    if (userData.code !== 0) {
        return {
            ok: false,
            error: 'user info failed',
            detail: userData,
            http_status: userResp.status
        };
    }

    const u = userData.data || {};
    return {
        ok: true,
        user: {
            user_id: u.open_id,            // 用 open_id 作为 user_id（user_id 字段需要额外权限）
            union_id: u.union_id,
            name: u.name,
            email: u.email,
            avatar_url: u.avatar_url,
            mobile: u.mobile,
            tenant_key: u.tenant_key,
            login_at: Date.now(),
            scopes: tokenData.scope || ''  // 记录本次授予的 scope
        }
    };
}

exports.handler = async (event, context) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: setCORS(), body: '' };
    }

    const headers = setCORS();
    headers['Content-Type'] = 'application/json';

    // 1. POST /login/exchange —— 前端 fetch 调（带 JSON body { code }）
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
        return { statusCode: 200, headers: headers, body: JSON.stringify(result.user) };
    }

    // 2. GET /login?code=xxx —— 飞书回调时浏览器直接跳这里（备选）
    //    实际用 redirect_uri 指向前端页面，飞书回调到前端，前端再 fetch 后端
    //    但保留这个端点作为兜底
    if (event.httpMethod === 'GET' && event.queryStringParameters && event.queryStringParameters.code) {
        const code = event.queryStringParameters.code;
        const result = await exchangeCode(code);
        if (!result.ok) {
            return { statusCode: 400, headers: headers, body: JSON.stringify(result) };
        }
        return { statusCode: 200, headers: headers, body: JSON.stringify(result.user) };
    }

    // 3. GET /login —— 返回配置（前端用来生成授权 URL）
    if (event.httpMethod === 'GET') {
        return { statusCode: 200, headers: headers, body: JSON.stringify({
            client_id: APP_ID,
            base_url: ACCOUNTS_BASE + '/open-apis/authen/v1/authorize',
            redirect_uri: REDIRECT_URI,
            scope: DEFAULT_SCOPE,
            status: 'ok'
        }) };
    }

    return { statusCode: 404, headers: headers, body: JSON.stringify({ error: 'Not Found' }) };
};
