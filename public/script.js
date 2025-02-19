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
    console.log('开始加载本地存储数据');
    
    // 首先重置所有状态
    function resetAll() {
        console.log('重置所有状态');
        startDateTime = null;
        endDateTime = null;
        document.getElementById('startTime').textContent = '--:--:--';
        document.getElementById('endTime').textContent = '--:--:--';
        document.getElementById('notes').value = '';
        document.getElementById('startBtn').disabled = false;
        document.getElementById('endBtn').disabled = true;
        document.getElementById('submitToGroupBtn').disabled = true;
    }

    // 先重置所有状态
    resetAll();

    const savedData = localStorage.getItem('dakaData');
    console.log('保存的数据:', savedData);
    
    if (savedData) {
        const data = JSON.parse(savedData);
        const now = new Date(); // 获取当前实际时间
        
        // 检查是否是实际的今天
        if (data.startDateTime > now.getTime()) {
            console.log('数据时间在未来，清除存储');
            localStorage.removeItem('dakaData');
            return;
        }

        // 检查是否是今天的数据
        const today = new Date();
        const savedDate = new Date(data.startDateTime || data.endDateTime);
        
        if (today.toLocaleDateString() !== savedDate.toLocaleDateString()) {
            console.log('不是今天的数据，清除存储');
            localStorage.removeItem('dakaData');
            return;
        }

        // 只有是今天的实际数据才恢复状态
        if (data.startDateTime && data.startDateTime <= now.getTime()) {
            console.log('恢复开始时间:', data.startTimeStr);
            startDateTime = new Date(data.startDateTime);
            document.getElementById('startTime').textContent = data.startTimeStr;
            document.getElementById('startBtn').disabled = true;
            document.getElementById('endBtn').disabled = false;
        }

        if (data.endDateTime && data.endDateTime <= now.getTime()) {
            console.log('恢复结束时间:', data.endTimeStr);
            endDateTime = new Date(data.endDateTime);
            document.getElementById('endTime').textContent = data.endTimeStr;
            document.getElementById('endBtn').disabled = true;
            document.getElementById('submitToGroupBtn').disabled = false;
        }

        if (data.notes) {
            document.getElementById('notes').value = data.notes;
        }
    } else {
        console.log('没有保存的数据');
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
            let response;
            
            // 检查是否在本地开发环境
            if (window.location.protocol === 'file:' || window.location.hostname === 'localhost') {
                // 本地开发环境：直接调用飞书机器人
                response = await fetch('https://open.feishu.cn/open-apis/bot/v2/hook/c128ef19-33c1-4dce-89d9-fb2145d9a53c', {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        "msg_type": "text",
                        "content": {
                            "text": fullMessage
                        }
                    })
                });

                // 由于 no-cors 模式下无法读取响应，我们假设请求成功
                if (!response.ok && response.status !== 0) {
                    throw new Error('发送失败');
                }
            } else {
                // 生产环境：使用 Netlify 函数
                response = await fetch('/.netlify/functions/feishu', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        message: fullMessage
                    })
                });

                const result = await response.json();
                if (result.code !== 0 && !result.ok) {
                    throw new Error(result.msg || result.error || '发送失败');
                }
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

    // 添加调试按钮
    const debugDiv = document.createElement('div');
    debugDiv.style.marginTop = '20px';
    debugDiv.style.display = 'flex';
    debugDiv.style.gap = '12px';
    debugDiv.style.flexDirection = 'column'; // 改为纵向排列

    // 创建第一行按钮
    const firstRow = document.createElement('div');
    firstRow.style.display = 'flex';
    firstRow.style.gap = '12px';
    firstRow.innerHTML = `
        <button onclick="localStorage.removeItem('dakaData'); location.reload();" style="flex: 1; background-color: var(--ios-blue);">
            🗑️ 清除数据并刷新
        </button>
        <button onclick="console.log('当前存储数据:', localStorage.getItem('dakaData'))" style="flex: 1; background-color: var(--ios-blue);">
            🔍 查看存储数据
        </button>
    `;

    // 创建多维表格测试按钮
    const bitleTableButton = document.createElement('button');
    bitleTableButton.style.width = '100%';
    bitleTableButton.style.backgroundColor = '#34C759'; // iOS 绿色
    bitleTableButton.innerHTML = '📊 发送到多维表格';
    bitleTableButton.onclick = async () => {
        const notes = document.getElementById('notes').value;
        const date = document.getElementById('currentDate').textContent;
        const startTime = document.getElementById('startTime').textContent;
        const endTime = document.getElementById('endTime').textContent;
        
        try {
            const response = await fetch('/.netlify/functions/bitable', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    date,
                    startTime,
                    endTime,
                    notes
                })
            });

            const result = await response.json();
            if (result.error) {
                throw new Error(result.error);
            }
            
            alert('已发送到多维表格！');
        } catch (error) {
            console.error('Error details:', error);
            alert(`发送到多维表格失败：${error.message}`);
        }
    };

    // 组装所有按钮
    debugDiv.appendChild(firstRow);
    debugDiv.appendChild(bitleTableButton);
    document.querySelector('.container').appendChild(debugDiv);
}); 