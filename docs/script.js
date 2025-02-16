submitToTableBtn.addEventListener('click', async () => {
    const notes = document.getElementById('notes').value;
    const data = {
        fields: {
            "日期": document.getElementById('currentDate').textContent,
            "上班时间": document.getElementById('startTime').textContent,
            "下班时间": document.getElementById('endTime').textContent,
            "备注": notes
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
            throw new Error(result.error);
        }

        document.getElementById('startTime').textContent = '--:--:--';
        document.getElementById('endTime').textContent = '--:--:--';
        document.getElementById('notes').value = '';
        startBtn.disabled = false;
        submitToGroupBtn.disabled = true;
        submitToTableBtn.disabled = true;
        alert('已提交到表格！');
        
    } catch (error) {
        console.error('Error:', error);
        alert(`提交失败：${error.message}`);
    }
}); 