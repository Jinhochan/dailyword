let startDateTime = null;
let endDateTime = null;

// 显示当前日期
function updateCurrentDate() {
    const now = new Date();
    const dateStr = now.toLocaleDateString('zh-CN');
    document.getElementById('currentDate').textContent = dateStr;
}

// 格式化时间
function formatTime(date) {
    return date.toLocaleTimeString('zh-CN');
}

// 初始化页面
document.addEventListener('DOMContentLoaded', () => {
    updateCurrentDate();
    
    const startBtn = document.getElementById('startBtn');
    const endBtn = document.getElementById('endBtn');
    const submitToGroupBtn = document.getElementById('submitToGroupBtn');
    const submitToTableBtn = document.getElementById('submitToTableBtn');
    
    startBtn.addEventListener('click', () => {
        startDateTime = new Date();
        document.getElementById('startTime').textContent = formatTime(startDateTime);
        startBtn.disabled = true;
        endBtn.disabled = false;
    });
    
    endBtn.addEventListener('click', () => {
        endDateTime = new Date();
        document.getElementById('endTime').textContent = formatTime(endDateTime);
        endBtn.disabled = true;
        submitToGroupBtn.disabled = false;
        submitToTableBtn.disabled = false;
    });
    
    submitToGroupBtn.addEventListener('click', async () => {
        const notes = document.getElementById('notes').value;
        const data = {
            date: document.getElementById('currentDate').textContent,
            startTime: document.getElementById('startTime').textContent,
            endTime: document.getElementById('endTime').textContent,
            notes: notes
        };
        
        try {
            // 发送到飞书机器人
            const botResponse = await fetch('https://open.feishu.cn/open-apis/bot/v2/hook/c128ef19-33c1-4dce-89d9-fb2145d9a53c', {
                method: 'POST',
                mode: 'no-cors',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    "msg_type": "text",
                    "content": {
                        "text": `打卡记录\n日期：${data.date}\n上班时间：${data.startTime}\n下班时间：${data.endTime}\n备注：${data.notes}`
                    }
                })
            });

            alert('已发送到飞书群！');
        } catch (error) {
            console.error('Error details:', error);
            alert(`发送到飞书群失败：${error.message}`);
        }
    });

    submitToTableBtn.addEventListener('click', async () => {
        const notes = document.getElementById('notes').value;
        const data = {
            date: document.getElementById('currentDate').textContent,
            startTime: document.getElementById('startTime').textContent,
            endTime: document.getElementById('endTime').textContent,
            notes: notes
        };
        
        try {
            // 通过 Netlify Function 发送到飞书多维表格
            const response = await fetch('/.netlify/functions/bitable', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    fields: {
                        "日期": data.date,
                        "上班时间": data.startTime,
                        "下班时间": data.endTime,
                        "备注": data.notes
                    }
                })
            });

            const responseData = await response.json();
            console.log('Response:', responseData);

            if (!response.ok) {
                throw new Error(`API错误: ${responseData.msg || '未知错误'}`);
            }

            document.getElementById('startTime').textContent = '--:--:--';
            document.getElementById('endTime').textContent = '--:--:--';
            document.getElementById('notes').value = '';
            startBtn.disabled = false;
            submitToGroupBtn.disabled = true;
            submitToTableBtn.disabled = true;
            alert('已提交到表格！');
            
        } catch (error) {
            console.error('Error details:', error);
            alert(`提交到表格失败：${error.message}\n请查看控制台了解详细信息`);
        }
    });
}); 