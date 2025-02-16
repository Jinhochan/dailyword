submitToTableBtn.addEventListener('click', async () => {
    const notes = document.getElementById('notes').value;
    const currentDate = document.getElementById('currentDate').textContent;
    const startTime = document.getElementById('startTime').textContent;
    const endTime = document.getElementById('endTime').textContent;

    // 验证数据
    if (startTime === '--:--:--' || endTime === '--:--:--') {
        alert('请先完成打卡！');
        return;
    }

    const data = {
        fields: {
            "日期": currentDate,
            "上班时间": startTime,
            "下班时间": endTime,
            "备注": notes || ''
        }
    };
    
    try {
        const response = await fetch('/.netlify/functions/bitable', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        console.log('API Response:', result);

        if (!result.success) {
            // 显示详细的错误信息
            const errorMsg = result.details ? 
                `错误: ${result.error}\n代码: ${result.details.code || '无'}\n消息: ${result.details.msg || '无'}` :
                result.error;
            throw new Error(errorMsg);
        }

        // 重置表单
        document.getElementById('startTime').textContent = '--:--:--';
        document.getElementById('endTime').textContent = '--:--:--';
        document.getElementById('notes').value = '';
        startBtn.disabled = false;
        submitToGroupBtn.disabled = true;
        submitToTableBtn.disabled = true;
        alert('已提交到表格！');
        
    } catch (error) {
        console.error('Error Details:', error);
        alert(`提交失败：${error.message}`);
    }
}); 