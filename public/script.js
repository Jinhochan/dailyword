let startDateTime = null;
let endDateTime = null;

// 添加本地存储功能
function saveToLocalStorage() {
    const data = {
        startDateTime: startDateTime ? startDateTime.getTime() : null,
        endDateTime: endDateTime ? endDateTime.getTime() : null,
        startTimeStr: document.getElementById('startTime').textContent,
        endTimeStr: document.getElementById('endTime').textContent,
        notes: document.getElementById('notes').value
    };
    localStorage.setItem('dakaData', JSON.stringify(data));
}

// 从本地存储加载数据
function loadFromLocalStorage() {
    const savedData = localStorage.getItem('dakaData');
    if (savedData) {
        const data = JSON.parse(savedData);
        if (data.startDateTime) {
            startDateTime = new Date(data.startDateTime);
            document.getElementById('startTime').textContent = data.startTimeStr;
            document.getElementById('startBtn').disabled = true;
            document.getElementById('endBtn').disabled = false;
        }
        if (data.endDateTime) {
            endDateTime = new Date(data.endDateTime);
            document.getElementById('endTime').textContent = data.endTimeStr;
            document.getElementById('endBtn').disabled = true;
            document.getElementById('submitToGroupBtn').disabled = false;
        }
        if (data.notes) {
            document.getElementById('notes').value = data.notes;
        }
    }
}

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
    loadFromLocalStorage(); // 加载保存的数据
    
    const startBtn = document.getElementById('startBtn');
    const endBtn = document.getElementById('endBtn');
    const submitToGroupBtn = document.getElementById('submitToGroupBtn');
    
    startBtn.addEventListener('click', () => {
        startDateTime = new Date();
        document.getElementById('startTime').textContent = formatTime(startDateTime);
        startBtn.disabled = true;
        endBtn.disabled = false;
        saveToLocalStorage();
    });
    
    endBtn.addEventListener('click', () => {
        endDateTime = new Date();
        document.getElementById('endTime').textContent = formatTime(endDateTime);
        endBtn.disabled = true;
        submitToGroupBtn.disabled = false;
        saveToLocalStorage();
    });
    
    submitToGroupBtn.addEventListener('click', async () => {
        const notes = document.getElementById('notes').value;
        const date = document.getElementById('currentDate').textContent;
        const startTime = document.getElementById('startTime').textContent;
        const endTime = document.getElementById('endTime').textContent;
        
        // 原始格式消息
        const originalMessage = `打卡记录\n日期：${date}\n上班时间：${startTime}\n下班时间：${endTime}\n备注：${notes}`;
        
        // Excel友好格式
        const excelMessage = `复制到Excel的格式：\n${date}\t${startTime}\t${endTime}\t${notes}`;
        
        const fullMessage = originalMessage + "\n\n" + excelMessage;
        
        try {
            // 使用 Netlify 函数发送消息
            const response = await fetch('/.netlify/functions/feishu', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: fullMessage
                })
            });

            const result = await response.json();
            
            if (result.error) {
                throw new Error(result.error);
            }

            // 发送成功后清除本地存储
            localStorage.removeItem('dakaData');
            
            // 重置界面
            startDateTime = null;
            endDateTime = null;
            document.getElementById('startTime').textContent = '--:--:--';
            document.getElementById('endTime').textContent = '--:--:--';
            document.getElementById('notes').value = '';
            startBtn.disabled = false;
            endBtn.disabled = true;
            submitToGroupBtn.disabled = true;
            
            alert('已发送到飞书群！');
        } catch (error) {
            console.error('Error details:', error);
            alert(`发送到飞书群失败：${error.message}`);
        }
    });
}); 