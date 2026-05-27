// 全局变量
let startDateTime = null;
let endDateTime = null;

// 全局DOM元素引用
let startBtn = null;
let endBtn = null;
let submitToGroupBtn = null;
let submitToTableBtn = null;
let clearDataBtn = null;
let viewDataBtn = null;
let notesTextarea = null;

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOMContentLoaded - 页面开始加载');
    
    // 获取DOM元素
    startBtn = document.getElementById('startBtn');
    endBtn = document.getElementById('endBtn');
    submitToGroupBtn = document.getElementById('submitToGroupBtn');
        submitToTableBtn = document.getElementById('submitToTableBtn');
    clearDataBtn = document.getElementById('clearDataBtn');
    viewDataBtn = document.getElementById('viewDataBtn');
    notesTextarea = document.getElementById('notes');
    
    console.log('DOMContentLoaded - DOM元素获取完成:', {
        startBtn: !!startBtn,
        endBtn: !!endBtn,
        submitToGroupBtn: !!submitToGroupBtn,
        submitToTableBtn: !!submitToTableBtn
    });

    // 从本地存储加载数据
    loadFromLocalStorage();

    // 加载数据后立即根据全局变量状态设置按钮初始状态
    if (startBtn && endBtn) {
        if (startDateTime) {
            // 如果已有上班打卡记录，禁用上班按钮
            startBtn.disabled = true;
            endBtn.disabled = false;
            console.log('页面加载 - 根据startDateTime状态设置按钮:', { startBtnDisabled: true, endBtnDisabled: false, startDateTime: startDateTime });
        } else {
            // 否则启用上班按钮，禁用下班按钮
            startBtn.disabled = false;
            endBtn.disabled = true;
            console.log('页面加载 - 初始按钮状态:', { startBtnDisabled: false, endBtnDisabled: true, startDateTime: startDateTime });
        }
    }

    // 初始化微信消息自动保存功能

    // 绑定按钮事件 - 使用 click 事件（移动端浏览器自动将 click 转为 tap）
    if (startBtn) startBtn.addEventListener('click', handleStartClick);
    if (endBtn) endBtn.addEventListener('click', handleEndClick);
    if (submitToGroupBtn) submitToGroupBtn.addEventListener('click', handleSubmitToGroup);
    if (submitToTableBtn) submitToTableBtn.addEventListener('click', handleSubmitToTable);
    if (clearDataBtn) clearDataBtn.addEventListener('click', handleClearData);
    if (viewDataBtn) viewDataBtn.addEventListener('click', handleViewData);

    // 优化移动端键盘交互
    if (notesTextarea) {
        notesTextarea.addEventListener('focus', handleTextareaFocus);
        notesTextarea.addEventListener('blur', saveToLocalStorage);
    }
    
    console.log('DOMContentLoaded - 页面初始化完成');

    // 添加防止双击缩放
    document.addEventListener('dblclick', function(e) {
        e.preventDefault();
    });

    // 添加旋转屏幕监听，优化横屏体验
    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', handleResize);

    // 初始化时检查屏幕方向
    handleOrientationChange();
});

// 触摸事件处理辅助函数 - 防止默认行为并执行回调
function preventDefaultAndExecute(callback) {
    return function(e) {
        e.preventDefault();
        callback.apply(this, arguments);
    };
}

// 文本框获得焦点时的处理 - 优化移动端键盘弹出体验
function handleTextareaFocus() {
    // 延迟一点时间，确保键盘弹出
    setTimeout(() => {
        this.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
}

// 处理屏幕方向变化
function handleOrientationChange() {
    // 可以在这里添加根据屏幕方向调整UI的逻辑
    console.log('屏幕方向已更改为:', window.orientation);
    // 保存当前数据，防止方向改变时丢失
    if (startDateTime || endDateTime) {
        saveToLocalStorage();
    }
}

// 处理窗口大小变化
function handleResize() {
    // 确保在窗口大小变化时UI仍然正确显示
    // 这里可以添加特定的响应式调整逻辑
}

// 添加Toast通知功能
function showToast(message, type = 'info') {
    // 创建Toast容器（如果不存在）
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    
    // 创建Toast元素
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    // 添加到容器
    container.appendChild(toast);
    
    // 显示Toast
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // 自动关闭
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            container.removeChild(toast);
        }, 300);
    }, 3000);
}

// 验证并获取必要的DOM元素
function validateAndGetElements() {
    const startTime = document.getElementById('startTime').textContent;
    const endTime = document.getElementById('endTime').textContent;
    const notes = document.getElementById('notes').value;
    
    // 验证数据
    if (startTime === '--:--:--' || endTime === '--:--:--') {
        showToast('请先完成打卡！', 'error');
        return null;
    }
    
    return { startTime, endTime, notes };
}

// 发送API请求的通用函数
async function sendApiRequest(url, data, button) {
    // 添加加载状态
    const originalText = button.textContent;
    button.classList.add('loading');
    button.innerHTML = `<span class="spinner"></span>${originalText}`;
    button.disabled = true;
    
    try {
        // 尝试发送请求
        let response;
        try {
            // 使用 AbortController 实现 10 秒超时
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            try {
                response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data),
                    signal: controller.signal
                });
            } finally {
                clearTimeout(timeoutId);
            }
        } catch (networkError) {
            // 网络错误处理 - 提供离线模式
            console.error('网络连接错误:', networkError);
            
            // 保存数据到本地作为备用
            const backupKey = `api_backup_${Date.now()}`;
            localStorage.setItem(backupKey, JSON.stringify({
                timestamp: new Date(),
                url,
                data,
                status: 'pending'
            }));
            
            // 显示友好的错误提示
            showToast('无法连接到服务器，数据已保存到本地。请稍后再试，或检查网络连接。', 'error');
            return { 
                success: false, 
                offline: true,
                message: '网络连接失败，数据已保存' 
            };
        }

        // 检查响应状态
        if (!response.ok) {
            throw new Error(`服务器响应错误: ${response.status} ${response.statusText}`);
        }
        
        // 安全解析JSON
        let responseText;
        let result;
        
        try {
            responseText = await response.text();
            result = responseText ? JSON.parse(responseText) : {};
        } catch (parseError) {
            console.error('JSON解析错误:', parseError, '原始响应:', responseText);
            throw new Error('无法解析服务器响应: ' + (responseText || '空响应'));
        }
        
        // 移除加载状态
        button.classList.remove('loading');
        button.innerHTML = originalText;
        button.disabled = false;
        
        if (!result.success) {
            // 显示详细的错误信息
            const errorMsg = result.details ? 
                `错误: ${result.error}\n代码: ${result.details.code || '无'}\n消息: ${result.details.msg || '无'}` :
                result.error;
            throw new Error(errorMsg);
        }
        
        return result;
    } catch (error) {
        // 移除加载状态
        button.classList.remove('loading');
        button.innerHTML = originalText;
        button.disabled = false;
        
        console.error('Error Details:', error);
        showToast(`提交失败：${error.message}`, 'error');
        return null;
    }
}

// 处理上班打卡按钮点击
function handleStartClick() {
    console.log('handleStartClick - 打卡按钮点击事件触发', { currentStartDateTime: startDateTime });
    
    // 检查是否已有打卡记录，只有在没有打卡记录时才能执行打卡操作
    if (startDateTime !== null) {
        console.log('handleStartClick - 已有上班打卡记录，禁止重复打卡', { startDateTime: startDateTime });
        showToast('您已经打卡上班了！', 'info');
        
        // 再次强制禁用按钮，确保状态正确
        if (startBtn) {
            startBtn.disabled = true;
            console.log('handleStartClick - 强制禁用上班按钮');
        }
        return;
    }
    
    // 创建新的打卡时间
    startDateTime = new Date();
    console.log('handleStartClick - 创建新的打卡时间', { newStartDateTime: startDateTime });
    
    // 强制更新UI，确保下班按钮可用
    const startDateElement = document.getElementById('startDate');
    const startTimeElement = document.getElementById('startTime');
    
    if (startDateElement && startTimeElement && startBtn && endBtn) {
        // 更新日期和时间显示
        startDateElement.textContent = formatDate(startDateTime);
        startTimeElement.textContent = formatTime(startDateTime);
        
        // 使用全局变量禁用上班按钮，启用下班按钮
        startBtn.disabled = true;
        endBtn.disabled = false;
        
        // 增加日志记录以便调试
        console.log('handleStartClick - 上班打卡成功 - 按钮状态更新:', {
            startBtnDisabled: startBtn.disabled,
            endBtnDisabled: endBtn.disabled,
            startDateTime: startDateTime
        });
        
        // 保存到本地存储
        saveToLocalStorage();
        
        showToast('上班打卡成功！', 'success');
    } else {
        console.error('handleStartClick - 无法找到必要的DOM元素', {
            startDateElement: !!startDateElement,
            startTimeElement: !!startTimeElement,
            startBtn: !!startBtn,
            endBtn: !!endBtn
        });
        showToast('打卡失败，请刷新页面重试', 'error');
        // 重置状态
        startDateTime = null;
    }
}

// 处理下班打卡按钮点击
function handleEndClick() {
    endDateTime = new Date();
    
    // 计算正确的下班日期 - 处理跨天打卡情况
    const endDateElement = document.getElementById('endDate');
    const startDateElement = document.getElementById('startDate');
    
    if (startDateElement && endDateElement) {
        // 获取上班日期文本
        const startDateText = startDateElement.textContent;
        
        // 如果上班日期已设置（不是占位符），并且当前时间在凌晨0点到5点之间，
        // 则认为是跨天打卡，将下班日期设置为上班日期的下一天
        if (startDateText !== '----' && endDateTime.getHours() >= 0 && endDateTime.getHours() < 5) {
            // 解析上班日期
            const parts = startDateText.includes('/') ? startDateText.split('/') : startDateText.split('-');
            if (parts.length === 3) {
                const year = parseInt(parts[0]);
                const month = parseInt(parts[1]);
                const day = parseInt(parts[2]);
                
                // 创建上班日期对象并加1天
                const startDate = new Date(year, month - 1, day);
                const nextDay = new Date(startDate);
                nextDay.setDate(nextDay.getDate() + 1);
                
                // 更新UI显示和endDateTime变量
                endDateElement.textContent = formatDate(nextDay);
                
                // 记录日志
                console.log('检测到跨天打卡，自动调整下班日期:', {
                    startDate: formatDate(startDate),
                    calculatedEndDate: formatDate(nextDay)
                });
            }
        } else {
            // 正常情况下，使用当前日期
            endDateElement.textContent = formatDate(endDateTime);
        }
    }
    
    // 更新时间和按钮状态
    document.getElementById('endTime').textContent = formatTime(endDateTime);
    
    // 使用全局变量控制按钮状态
    if (startBtn) startBtn.disabled = true;
    if (submitToGroupBtn) submitToGroupBtn.disabled = false;
    if (submitToTableBtn) submitToTableBtn.disabled = false;
    
    // 增加日志记录以便调试
    console.log('下班打卡成功 - 按钮状态更新:', {
        startBtnDisabled: startBtn?.disabled,
        submitToGroupBtnDisabled: submitToGroupBtn?.disabled,
        submitToTableBtnDisabled: submitToTableBtn?.disabled,
        endDateTime: endDateTime
    });
    
    // 保存到本地存储
    saveToLocalStorage();
    
    showToast('下班打卡成功！', 'success');
}

// 处理飞书群提交按钮点击
async function handleSubmitToGroup() {
    const elements = validateAndGetElements();
    if (!elements) return;
    
    const { startTime, endTime, notes } = elements;
    const startDate = document.getElementById('startDate').textContent;
    const endDate = document.getElementById('endDate').textContent;
    
    // 构建文本格式的数据
    const data = {
        startDate,
        endDate,
        startTime,
        endTime,
        notes
    };
    
    // 增强日志记录，验证数据格式
    console.log('飞书群提交数据 - 文本格式验证:', {
        startDate: { value: startDate, type: typeof startDate },
        endDate: { value: endDate, type: typeof endDate },
        startTime: { value: startTime, type: typeof startTime },
        endTime: { value: endTime, type: typeof endTime }
    });
    
    // 优化API URL配置，适应不同的运行环境
    let apiUrl = '';
    
    try {
        // 检查是否在Netlify环境中运行
        if (window.location.hostname.includes('.netlify.app')) {
            // 生产环境 - 使用相对路径
            apiUrl = '/.netlify/functions/feishu';
        } else if (window.location.hostname === 'localhost') {
            // 本地开发环境 - 使用localhost
            apiUrl = `${window.location.protocol}//${window.location.hostname}:${window.location.port || 3000}/.netlify/functions/feishu`;
        } else {
            // 其他环境 - 尝试三种可能的本地开发端口
            const ports = [3000, 9000, 8888];
            for (const port of ports) {
                try {
                    // 先尝试连接判断是否可用
                    const testUrl = `http://localhost:${port}/.netlify/functions/feishu`;
                    await fetch(testUrl, { method: 'OPTIONS' });
                    apiUrl = testUrl;
                    break;
                } catch (e) {
                    // 端口不可用，继续尝试下一个
                    continue;
                }
            }
            
            // 如果没有找到可用端口，默认使用3000
            if (!apiUrl) {
                apiUrl = 'http://localhost:3000/.netlify/functions/feishu';
            }
        }
        
        console.log('使用的API URL:', apiUrl);
        const result = await sendApiRequest(apiUrl, data, document.getElementById('submitToGroupBtn'));
        
        if (result && result.success) {
            showToast('已提交到飞书群！', 'success');
        } else if (result && result.offline) {
            // 离线模式下，不要清除数据，让用户可以稍后重试
            console.log('离线模式 - 数据已保存');
        }
    } catch (error) {
        console.error('提交飞书群时发生异常:', error);
        showToast(`提交失败：${error.message || '未知错误'}`);
    }
}


// 处理多维表格提交按钮点击 - 根据飞书多维表格API文档优化
async function handleSubmitToTable() {
    console.log('=== 开始处理飞书多维表格提交 ===');
    
    // 先验证并获取必要元素
    const elements = validateAndGetElements();
    if (!elements) {
        console.log('=== 飞书多维表格提交处理提前结束：元素验证失败 ===');
        return;
    }
    
    const { startTime, endTime, notes } = elements;
    
    // 明确获取DOM元素
    const startDateElement = document.getElementById('startDate');
    const endDateElement = document.getElementById('endDate');
    const submitToTableBtn = document.getElementById('submitToTableBtn');
    
    console.log('表单元素状态:', {
        startDateElement: startDateElement ? '找到' : '未找到',
        endDateElement: endDateElement ? '找到' : '未找到',
        submitToTableBtn: submitToTableBtn ? '找到' : '未找到'
    });
    
    // 验证DOM元素存在性
    if (!startDateElement || !endDateElement || !submitToTableBtn) {
        console.error('无法找到必要的DOM元素');
        showToast('数据获取失败，请刷新页面重试', 'error');
        console.log('=== 飞书多维表格提交处理提前结束：DOM元素缺失 ===');
        return;
    }
    
    // 获取文本内容并转换为Date对象
    const startDateText = startDateElement.textContent;
    const endDateText = endDateElement.textContent;
    
    // 转换日期格式为飞书多维表格能够识别的格式
    function convertToBitableDate(dateText) {
        // 解析文本日期（假设格式为 'YYYY/MM/DD' 或 'YYYY-MM-DD'）
        const parts = dateText.includes('/') ? dateText.split('/') : dateText.split('-');
        if (parts.length !== 3) return dateText; // 如果格式不匹配，返回原始文本
        
        const year = parseInt(parts[0]);
        const month = parseInt(parts[1]);
        const day = parseInt(parts[2]);
        
        // 飞书多维表格识别的日期对象格式
        return {
            type: "date",
            value: {
                year: year,
                month: month,
                day: day
            }
        };
    }
    
    const startDate = convertToBitableDate(startDateText);
    const endDate = convertToBitableDate(endDateText);

    console.log('表单数据收集结果:', {
        日期: startDate,
        上班时间: startTime,
        下班时间: endTime,
        备注: notes || ''
    });
    
    // 增强数据验证
    const isStartDateValid = typeof startDate === 'string' ? startDate !== '----' : true;
    const isEndDateValid = typeof endDate === 'string' ? endDate !== '----' : true;
    
    if (!isStartDateValid || !isEndDateValid || 
        startTime === '--:--:--' || endTime === '--:--:--') {
        console.error('打卡数据不完整', { startDate, endDate, startTime, endTime });
        showToast('打卡数据不完整，请重新打卡！', 'error');
        console.log('=== 飞书多维表格提交处理提前结束：数据不完整 ===');
        return;
    }
    
    // 构建符合飞书多维表格API要求的数据格式
    const data = {
        "日期": startDate,
        "上班日期": startDate,  // 添加上班日期字段
        "下班日期": endDate,    // 添加下班日期字段
        "上班时间": startTime,
        "下班时间": endTime,
        "备注": notes || ''
    };
    
    console.log('准备发送的数据对象:', JSON.stringify(data, null, 2));
    
    // 禁用提交按钮防止重复提交
    submitToTableBtn.disabled = true;
    
    // 增强日志记录，验证数据格式
    console.log('多维表格提交数据 - 格式验证:', {
        "日期": { value: typeof startDate === 'object' ? JSON.stringify(startDate) : startDate, type: typeof startDate },
        "上班时间": { value: startTime, type: typeof startTime, length: startTime.length },
        "下班时间": { value: endTime, type: typeof endTime, length: endTime.length },
        "备注": { value: notes || '', type: typeof notes, length: (notes || '').length }
    });
    
    // 优化API URL配置，适应不同的运行环境
    let apiUrl = '';
    
    try {
        // 当前页面信息
        const currentHostname = window.location.hostname;
        const currentPort = window.location.port || '8888'; // 默认使用netlify dev常用端口
        const currentProtocol = window.location.protocol;
        
        console.log('当前页面环境信息:', {
            hostname: currentHostname,
            port: currentPort,
            protocol: currentProtocol
        });
        
        // 检查是否在Netlify环境中运行
        if (currentHostname.includes('.netlify.app')) {
            // 生产环境 - 使用相对路径
            apiUrl = '/.netlify/functions/bitable';
            console.log('检测到生产环境，使用相对路径API URL:', apiUrl);
        } else if (currentHostname === 'localhost') {
            // 本地开发环境 - 使用当前页面的端口
            apiUrl = `${currentProtocol}//${currentHostname}:${currentPort}/.netlify/functions/bitable`;
            console.log('检测到localhost环境，使用当前端口:', currentPort, 'API URL:', apiUrl);
        } else {
            // 其他环境 - 尝试多种可能的本地开发端口
            const ports = [currentPort, '8888', '3000', '9000'];
            console.log('尝试检测可用端口:', ports);
            
            for (const port of ports) {
                try {
                    // 先尝试连接判断是否可用
                    const testUrl = `http://localhost:${port}/.netlify/functions/bitable`;
                    console.log('尝试连接端口:', port, 'URL:', testUrl);
                    
                    // 使用timeout避免等待时间过长
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 1000);
                    
                    const response = await fetch(testUrl, {
                        method: 'OPTIONS',
                        signal: controller.signal
                    });
                    
                    clearTimeout(timeoutId);
                    
                    if (response.ok) {
                        apiUrl = testUrl;
                        console.log('成功连接到端口:', port, '使用该URL:', apiUrl);
                        break;
                    }
                } catch (e) {
                    console.log('端口不可用:', port, '错误:', e.message);
                    // 端口不可用，继续尝试下一个
                    continue;
                }
            }
            
            // 如果没有找到可用端口，使用默认值
            if (!apiUrl) {
                apiUrl = 'http://localhost:8888/.netlify/functions/bitable'; // netlify dev默认端口
                console.log('未找到可用端口，使用默认端口8888:', apiUrl);
            }
        }
        
        console.log('最终使用的API URL:', apiUrl);
        
        // 再次验证数据完整性后发送请求
        if (Object.values(data).some(value => {
            // 跳过对象类型的日期比较
            if (typeof value === 'object' && value !== null) return false;
            // 对于字符串类型，检查是否为空或占位符
            return !value || value === '----' || value === '--:--:--';
        })) {
            console.error('提交前发现不完整数据:', data);
            showToast('数据不完整，无法提交', 'error');
            console.log('=== 飞书多维表格提交处理提前结束：最终数据验证失败 ===');
            // 恢复按钮状态
            submitToTableBtn.disabled = false;
            return;
        }
        
        console.log('准备提交到多维表格的数据:', data);
        console.log('正在发送请求到:', apiUrl);
        console.log('请求数据大小:', new Blob([JSON.stringify(data)]).size, '字节');
        
        const result = await sendApiRequest(apiUrl, data, submitToTableBtn);
        
        if (result && result.success) {
            // 提取记录ID并显示成功消息
            const recordId = result.result?.data?.record?.record_id || '未知';
            console.log('多维表格提交成功，记录ID:', recordId);
            
            // 根据后端返回的details增强用户反馈
            if (result.details && result.details.msg) {
                showToast(result.details.msg, 'success');
            } else {
                showToast('已成功提交到飞书多维表格！', 'success');
            }
            
            // 清除本地存储并重置UI
            localStorage.removeItem('dailyWordData');
            resetUI();
        } else if (result && result.offline) {
            // 离线模式下，不要清除数据，让用户可以稍后重试
            console.log('离线模式 - 数据已保存');
            showToast('无法连接到服务器，数据已保存到本地。请稍后再试。', 'warning');
        } else {
            console.error('多维表格提交返回非成功结果:', result);
            // 即使返回结果不是success，也提供更友好的提示
            const errorMsg = result?.error || '提交失败，请稍后重试';
            showToast(errorMsg, 'error');
        }
    } catch (error) {
        console.error('提交多维表格时发生异常:', error);
        console.error('错误详情:', error.stack);
        
        // 根据错误类型提供不同的用户反馈
        if (error.message.includes('403')) {
            showToast('权限不足，无法提交到多维表格。请检查应用授权。', 'error');
        } else if (error.message.includes('429')) {
            showToast('提交过于频繁，请稍后再试。', 'error');
        } else if (error.message.includes('网络')) {
            showToast('网络连接失败，请检查网络设置后重试。', 'error');
        } else {
            showToast(`提交失败：${error.message || '未知错误'}`);
        }
    } finally {
        // 确保按钮状态恢复
        submitToTableBtn.disabled = false;
        console.log('=== 飞书多维表格提交处理完成 ===');
    }
}

// 处理清除数据按钮点击
function handleClearData() {
    if (confirm('确定要清除所有数据并刷新页面吗？')) {
        localStorage.removeItem('dailyWordData');
        location.reload();
    }
}

// 处理查看数据按钮点击
function handleViewData() {
    const data = localStorage.getItem('dailyWordData');
    if (data) {
        alert('存储的数据：\n' + data);
    } else {
        showToast('没有存储的数据', 'info');
    }
}

// 保存数据到本地存储
function saveToLocalStorage() {
    console.log('saveToLocalStorage - 开始保存数据到本地存储', {
        startDateTimeExists: !!startDateTime,
        endDateTimeExists: !!endDateTime
    });
    
    try {
        // 构建要保存的数据对象
        const data = {
            startDateTime: startDateTime ? startDateTime.toISOString() : null,
            endDateTime: endDateTime ? endDateTime.toISOString() : null,
            notes: notesTextarea ? notesTextarea.value : '',
            };
        
        console.log('saveToLocalStorage - 要保存的数据:', data);
        
        // 使用'dailyWordData'作为键名保存数据，确保与loadFromLocalStorage函数一致
        localStorage.setItem('dailyWordData', JSON.stringify(data));
        
        console.log('saveToLocalStorage - 数据保存成功');
    } catch (error) {
        console.error('saveToLocalStorage - 保存数据到本地存储时出错:', error);
        showToast('保存数据时出错', 'error');
    }
}


// 从本地存储加载数据
function loadFromLocalStorage() {
    console.log('loadFromLocalStorage - 开始从本地存储加载数据');
    
    try {
        const data = localStorage.getItem('dailyWordData');
        console.log('loadFromLocalStorage - 本地存储数据:', data ? '存在' : '不存在');
        
        if (data) {
            const parsedData = JSON.parse(data);
            console.log('loadFromLocalStorage - 解析后的数据:', parsedData);
            
            // 恢复日期时间数据
            if (parsedData.startDateTime) {
                startDateTime = new Date(parsedData.startDateTime);
                console.log('loadFromLocalStorage - 恢复上班打卡时间:', startDateTime);
            }
            
            if (parsedData.endDateTime) {
                endDateTime = new Date(parsedData.endDateTime);
                console.log('loadFromLocalStorage - 恢复下班打卡时间:', endDateTime);
            }
            
            // 恢复文本框内容
            if (notesTextarea && parsedData.notes) {
                notesTextarea.value = parsedData.notes;
            }
            
            
            // 更新UI显示
            const startDateElement = document.getElementById('startDate');
            const startTimeElement = document.getElementById('startTime');
            const endDateElement = document.getElementById('endDate');
            const endTimeElement = document.getElementById('endTime');
            
            if (startDateElement && startTimeElement) {
                startDateElement.textContent = startDateTime ? formatDate(startDateTime) : '----';
                startTimeElement.textContent = startDateTime ? formatTime(startDateTime) : '--:--:--';
            }
            
            if (endDateElement && endTimeElement) {
                endDateElement.textContent = endDateTime ? formatDate(endDateTime) : '----';
                endTimeElement.textContent = endDateTime ? formatTime(endDateTime) : '--:--:--';
            }
            
            // 使用全局变量更新按钮状态，确保即使在Netlify环境中也能正确设置
            if (startBtn && endBtn && submitToGroupBtn && submitToWechatBtn && submitToTableBtn) {
                if (startDateTime && !endDateTime) {
                    // 只有上班打卡记录
                    startBtn.disabled = true;
                    endBtn.disabled = false;
                    submitToGroupBtn.disabled = true;
                            submitToTableBtn.disabled = true;
                } else if (startDateTime && endDateTime) {
                    // 有完整的打卡记录
                    startBtn.disabled = true;
                    endBtn.disabled = true;
                    submitToGroupBtn.disabled = false;
                        submitToTableBtn.disabled = false;
                } else {
                    // 没有打卡记录
                    startBtn.disabled = false;
                    endBtn.disabled = true;
                    submitToGroupBtn.disabled = true;
                            submitToTableBtn.disabled = true;
                }
                
                console.log('loadFromLocalStorage - 按钮状态更新:', {
                    startBtnDisabled: startBtn.disabled,
                    endBtnDisabled: endBtn.disabled,
                    submitToGroupBtnDisabled: submitToGroupBtn.disabled
                });
            }
        } else {
            console.log('loadFromLocalStorage - 本地存储为空，初始化按钮状态');
            // 如果本地存储为空，确保按钮状态正确
            if (startBtn && endBtn && submitToGroupBtn && submitToWechatBtn && submitToTableBtn) {
                startBtn.disabled = false;
                endBtn.disabled = true;
                submitToGroupBtn.disabled = true;
                    submitToTableBtn.disabled = true;
            }
        }
    } catch (error) {
        console.error('loadFromLocalStorage - 从本地存储加载数据时出错:', error);
        showToast('加载保存的数据时出错', 'error');
        // 出错时重置按钮状态，确保应用仍然可用
        if (startBtn && endBtn) {
            startBtn.disabled = false;
            endBtn.disabled = true;
        }
    }
    
    console.log('loadFromLocalStorage - 数据加载完成');
}

// 重置UI状态
function resetUI() {
    console.log('resetUI - 开始重置UI状态');
    
    try {
        // 使用全局变量重置按钮状态
        if (startBtn) {
            startBtn.disabled = false;
        }
        if (endBtn) {
            endBtn.disabled = true;
        }
        if (submitToGroupBtn) {
            submitToGroupBtn.disabled = true;
        }
        if (submitToWechatBtn) {
        }
        if (submitToTableBtn) {
            submitToTableBtn.disabled = true;
        }
        
        // 更新UI显示
        const startDateElement = document.getElementById('startDate');
        const startTimeElement = document.getElementById('startTime');
        const endDateElement = document.getElementById('endDate');
        const endTimeElement = document.getElementById('endTime');
        
        if (startDateElement && startTimeElement) {
            startDateElement.textContent = '----';
            startTimeElement.textContent = '--:--:--';
        }
        
        if (endDateElement && endTimeElement) {
            endDateElement.textContent = '----';
            endTimeElement.textContent = '--:--:--';
        }
        
        // 重置全局变量
        startDateTime = null;
        endDateTime = null;
        
        // 清空文本框
        if (notesTextarea) {
            notesTextarea.value = '';
        }
        
        
        // 记录重置状态
        console.log('resetUI - UI状态重置成功，按钮状态:', {
            startBtnDisabled: startBtn ? startBtn.disabled : false,
            endBtnDisabled: endBtn ? endBtn.disabled : true,
            startDateTime: startDateTime,
            endDateTime: endDateTime
        });
        
        // 保存重置后的状态到本地存储
        saveToLocalStorage();
        
    } catch (error) {
        console.error('resetUI - 重置UI状态时出错:', error);
        showToast('重置界面时出错', 'error');
    }
}

// 格式化日期函数 - 固定宽度格式 YYYY/MM/DD
function formatDate(date) {
    if (!(date instanceof Date)) {
        return '----';
    }
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}/${month}/${day}`;
}

// 格式化时间函数
function formatTime(date) {
    if (!(date instanceof Date)) {
        return '--:--:--';
    }
    
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    
    return `${hours}:${minutes}:${seconds}`;
}