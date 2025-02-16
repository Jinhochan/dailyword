const { App } = require('@feishuapi/sdk');

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const { date, startTime, endTime, notes } = req.body;

    try {
        const app = new App({
            appId: process.env.FEISHU_APP_ID,
            appSecret: process.env.FEISHU_APP_SECRET,
        });

        await app.bitable.record.create({
            appToken: process.env.FEISHU_APP_TOKEN,
            tableId: process.env.FEISHU_TABLE_ID,
            fields: {
                "日期": date,
                "上班时间": startTime,
                "下班时间": endTime,
                "备注": notes
            }
        });

        res.status(200).json({ message: 'Success' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
} 