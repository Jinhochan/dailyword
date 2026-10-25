// 全局变量
let startDateTime = null;
let endDateTime = null;

// 消费记录数组
let advanceRecords = [];

// 项目类型清单（分组：内部 / 学校）
var PROJECT_GROUPS = [
    {
        "group": "内部",
        "items": [
            "送礼",
            "电信",
            "代购",
            "京东改价",
            "改照片",
            "报表"
        ]
    },
    {
        "group": "学校",
        "items": [
            "吉华",
            "龙创",
            "科技城",
            "立雪",
            "龙小",
            "教科院",
            "龙岗中专",
            "罗外",
            "罗幼",
            "怡景",
            "金翠园",
            "粤海城",
            "平湖",
            "道远",
            "龙初",
            "华景园",
            "龙高",
            "知新",
            "宝龙外"
        ]
    }
];

// 已选项目类型（数组，多选）
let selectedProject = [];

// 提交锁 - 防止重复提交
let isSubmitting = false;

// 提交状态跟踪
let submittedTargets = {
    group: false,
    table: false
};

// 全局DOM元素引用
let startBtn = null;
let endBtn = null;
let submitToGroupBtn = null;
let submitToTableBtn = null;
let clearDataBtn = null;
let viewDataBtn = null;
let notesTextarea = null;
let addAdvanceBtn = null;
let advanceAmountInput = null;
let advancePurposeInput = null;
let projectGrid = null;
let advanceListEl = null;
let advanceTotalEl = null;
let offlineQueueBtn = null;
let offlineQueueCount = 0;

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    // 获取DOM元素
    startBtn = document.getElementById('startBtn');
    endBtn = document.getElementById('endBtn');
    submitToGroupBtn = document.getElementById('submitToGroupBtn');
    submitToTableBtn = document.getElementById('submitToTableBtn');
    clearDataBtn = document.getElementById('clearDataBtn');
    viewDataBtn = document.getElementById('viewDataBtn');
    notesTextarea = document.getElementById('notes');
    addAdvanceBtn = document.getElementById('addAdvanceBtn');
    advanceAmountInput = document.getElementById('advanceAmount');
    advancePurposeInput = document.getElementById('advancePurpose');
    projectGrid = document.getElementById('projectGrid');
    advanceListEl = document.getElementById('advanceList');
    advanceTotalEl = document.getElementById('advanceTotal');
    offlineQueueBtn = document.getElementById('offlineQueueBtn');

    // 显示今天的日期
    const todayEl = document.getElementById('todayDate');
    if (todayEl) {
        const now = new Date();
        const days = ['日', '一', '二', '三', '四', '五', '六'];
        todayEl.textContent = now.getMonth() + 1 + '月' + now.getDate() + '日 周' + days[now.getDay()];
    }

    // 从本地存储加载数据
    loadFromLocalStorage();

    // 设置按钮初始状态
    if (startBtn && endBtn) {
        if (startDateTime) {
            startBtn.disabled = true;
            endBtn.disabled = false;
            var startCard = document.getElementById('startCard');
            if (startCard) startCard.classList.add('active');
        } else {
            startBtn.disabled = false;
            endBtn.disabled = true;
        }
    }

    // 绑定按钮事件
    if (startBtn) startBtn.addEventListener('click', handleStartClick);
    if (endBtn) endBtn.addEventListener('click', handleEndClick);
    if (submitToGroupBtn) submitToGroupBtn.addEventListener('click', handleSubmitToGroup);
    if (submitToTableBtn) submitToTableBtn.addEventListener('click', handleSubmitToTable);
    if (clearDataBtn) clearDataBtn.addEventListener('click', handleClearData);
    if (viewDataBtn) viewDataBtn.addEventListener('click', handleViewData);
    if (offlineQueueBtn) offlineQueueBtn.addEventListener('click', handleRetryOfflineQueue);

    // 消费按钮事件
    if (addAdvanceBtn) addAdvanceBtn.addEventListener('click', handleAddAdvance);
    if (advanceAmountInput) {
        advanceAmountInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') { e.preventDefault(); advancePurposeInput.focus(); }
        });
    }
    if (advancePurposeInput) {
        advancePurposeInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') { e.preventDefault(); handleAddAdvance(); }
        });
    }

    // 备注自动保存
    if (notesTextarea) {
        notesTextarea.addEventListener('blur', saveToLocalStorage);
    }

    // 工具面板折叠
    var toolsToggle = document.getElementById('toolsToggle');
    var toolsContent = document.getElementById('toolsContent');
    if (toolsToggle && toolsContent) {
        toolsToggle.addEventListener('click', function() {
            this.classList.toggle('open');
            toolsContent.classList.toggle('show');
        });
    }

    // 初始化项目类型选择器（多选）
    initProjects();

    // 渲染消费列表
    renderAdvanceList();

    // 检查离线队列
    checkOfflineQueue();

    // 防止双击缩放
    document.addEventListener('dblclick', function(e) { e.preventDefault(); });

    // 旋转屏幕时保存数据
    window.addEventListener('orientationchange', function() {
        if (startDateTime || endDateTime) saveToLocalStorage();
    });

    // 页面可见性变化时检查离线队列
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
            checkOfflineQueue();
        }
    });
});

// ============ 项目类型选择（多选） ============

function getSelectedProjects() {
    var cbs = document.querySelectorAll('input.project-cb:checked');
    var arr = [];
    for (var i = 0; i < cbs.length; i++) {
        arr.push(cbs[i].value);
    }
    return arr;
}

function initProjects() {
    if (!projectGrid) return;
    var html = '';
    for (var g = 0; g < PROJECT_GROUPS.length; g++) {
        var grp = PROJECT_GROUPS[g];
        html += '<div class="project-group">';
        html += '<div class="project-group-title">' + grp.group + '</div>';
        html += '<div class="project-group-items">';
        for (var i = 0; i < grp.items.length; i++) {
            var name = grp.items[i];
            html += '<label class="project-chip"><input type="checkbox" class="project-cb" value="' + name.replace(/"/g, '&quot;') + '"><span>' + name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</span></label>';
        }
        html += '</div>';
        html += '</div>';
    }
    projectGrid.innerHTML = html;
    var cbs = projectGrid.querySelectorAll('input.project-cb');
    for (var j = 0; j < cbs.length; j++) {
        cbs[j].addEventListener('change', function() {
            selectedProject = getSelectedProjects();
            updateProjectHint();
            saveToLocalStorage();
        });
    }
    if (selectedProject && selectedProject.length) {
        for (var k = 0; k < selectedProject.length; k++) {
            var cb = projectGrid.querySelector('input.project-cb[value="' + selectedProject[k].replace(/"/g, '&quot;') + '"]');
            if (cb) cb.checked = true;
        }
    }
    updateProjectHint();
}

function updateProjectHint() {
    var hint = document.getElementById('projectHint');
    if (!hint) return;
    hint.textContent = selectedProject.length ? ('已选：' + selectedProject.join('、')) : '';
}

// ============ 消费管理 ============

function handleAddAdvance() {
    var amountStr = advanceAmountInput.value.trim();
    var purpose = advancePurposeInput.value.trim();

    if (!amountStr || parseFloat(amountStr) === 0 || isNaN(parseFloat(amountStr))) {
        showToast('请输入有效金额', 'error');
        advanceAmountInput.focus();
        return;
    }

    var amount = parseFloat(amountStr);
    advanceRecords.push({
        amount: amount,
        purpose: purpose || '未填写',
        time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    });

    advanceAmountInput.value = '';
    advancePurposeInput.value = '';
    advanceAmountInput.focus();

    renderAdvanceList();
    saveToLocalStorage();
    showToast('消费已添加: ¥' + amount.toFixed(2), 'success');
}

function handleDeleteAdvance(index) {
    advanceRecords.splice(index, 1);
    renderAdvanceList();
    saveToLocalStorage();
    showToast('已删除', 'info');
}

function renderAdvanceList() {
    if (!advanceListEl) return;

    if (advanceRecords.length === 0) {
        advanceListEl.innerHTML = '<div class="advance-empty">暂无消费记录</div>';
    } else {
        var html = '';
        for (var i = 0; i < advanceRecords.length; i++) {
            var r = advanceRecords[i];
            html += '<div class="advance-item">'
                + '<div class="advance-item-info">'
                + '<span class="advance-item-amount">¥' + r.amount.toFixed(2) + '</span>'
                + '<span class="advance-item-purpose">' + escapeHtml(r.purpose) + '</span>'
                + '<span class="advance-item-time">' + r.time + '</span>'
                + '</div>'
                + '<button class="advance-item-delete" onclick="handleDeleteAdvance(' + i + ')">×</button>'
                + '</div>';
        }
        advanceListEl.innerHTML = html;
    }

    // 更新总额
    var total = 0;
    for (var j = 0; j < advanceRecords.length; j++) {
        total += advanceRecords[j].amount;
    }
    if (advanceTotalEl) {
        advanceTotalEl.textContent = '¥' + total.toFixed(2);
    }
}

function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getAdvanceSummaryText() {
    if (advanceRecords.length === 0) return '';
    var total = 0;
    var lines = '';
    for (var i = 0; i < advanceRecords.length; i++) {
        var r = advanceRecords[i];
        total += r.amount;
        lines += '  ' + (i + 1) + '. ¥' + r.amount.toFixed(2) + ' - ' + r.purpose + ' (' + r.time + ')\n';
    }
    lines += '  消费合计: ¥' + total.toFixed(2);
    return lines;
}

function getAdvanceSummaryForTable() {
    if (advanceRecords.length === 0) return '';
    var total = 0;
    var lines = '';
    for (var i = 0; i < advanceRecords.length; i++) {
        var r = advanceRecords[i];
        total += r.amount;
        lines += (i + 1) + '. ¥' + r.amount.toFixed(2) + ' - ' + r.purpose + ' (' + r.time + ')\n';
    }
    lines += '合计: ¥' + total.toFixed(2);
    return lines;
}

// ============ Toast 通知 ============

function showToast(message, type) {
    type = type || 'info';
    var container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    var toast = document.createElement('div');
    toast.className = 'toast ' + type;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(function() { toast.classList.add('show'); }, 10);
    setTimeout(function() {
        toast.classList.remove('show');
        setTimeout(function() { container.removeChild(toast); }, 300);
    }, 3000);
}

// ============ 验证 ============

function validateAndGetElements() {
    var startTime = document.getElementById('startTime').textContent;
    var endTime = document.getElementById('endTime').textContent;
    var notes = document.getElementById('notes').value;
    if (startTime === '--:--' || endTime === '--:--') {
        showToast('请先完成打卡！', 'error');
        return null;
    }
    return { startTime: startTime, endTime: endTime, notes: notes };
}

// ============ 离线队列管理 ============

function getOfflineQueue() {
    var queue = [];
    var keys = [];
    for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (key && key.indexOf('api_backup_') === 0) {
            keys.push(key);
        }
    }
    keys.sort();
    for (var j = 0; j < keys.length; j++) {
        try {
            var item = JSON.parse(localStorage.getItem(keys[j]));
            if (item && item.status === 'pending') {
                item._key = keys[j];
                queue.push(item);
            }
        } catch (e) {
            // 清除损坏的数据
            localStorage.removeItem(keys[j]);
        }
    }
    return queue;
}

function checkOfflineQueue() {
    var queue = getOfflineQueue();
    offlineQueueCount = queue.length;
    updateOfflineQueueUI();
}

function updateOfflineQueueUI() {
    var offlineSection = document.getElementById('offlineQueueSection');
    if (!offlineQueueBtn) return;
    if (offlineQueueCount > 0) {
        offlineQueueBtn.style.display = '';
        offlineQueueBtn.textContent = '待重试 (' + offlineQueueCount + ')';
        if (offlineSection) offlineSection.style.display = '';
    } else {
        offlineQueueBtn.style.display = 'none';
        if (offlineSection) offlineSection.style.display = 'none';
    }
}

async function handleRetryOfflineQueue() {
    var queue = getOfflineQueue();
    if (queue.length === 0) {
        showToast('没有待重试的数据', 'info');
        return;
    }

    if (isSubmitting) {
        showToast('正在处理中，请稍候', 'info');
        return;
    }

    isSubmitting = true;
    var successCount = 0;
    var failCount = 0;

    showToast('开始重试 ' + queue.length + ' 条待提交数据...', 'info');

    for (var i = 0; i < queue.length; i++) {
        var item = queue[i];
        try {
            var response = await fetch(item.url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(item.data)
            });

            if (response.ok) {
                var result = await response.json();
                if (result.success) {
                    localStorage.removeItem(item._key);
                    successCount++;
                } else {
                    failCount++;
                }
            } else {
                failCount++;
            }
        } catch (e) {
            failCount++;
        }
    }

    isSubmitting = false;
    checkOfflineQueue();

    if (successCount > 0 && failCount === 0) {
        showToast('全部重试成功！共 ' + successCount + ' 条', 'success');
    } else if (successCount > 0) {
        showToast('部分成功：' + successCount + ' 成功，' + failCount + ' 失败', 'info');
    } else {
        showToast('重试失败，请检查网络后重试', 'error');
    }
}

// ============ API 请求 ============

async function sendApiRequest(url, data, button) {
    if (isSubmitting) {
        showToast('正在处理中，请稍候', 'info');
        return null;
    }

    isSubmitting = true;
    var originalText = button.textContent;
    button.classList.add('loading');
    button.innerHTML = '<span class="spinner"></span>' + originalText;
    button.disabled = true;

    try {
        var response;
        try {
            var controller = new AbortController();
            var timeoutId = setTimeout(function() { controller.abort(); }, 15000);
            response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
                signal: controller.signal
            });
            clearTimeout(timeoutId);
        } catch (networkError) {
            console.error('网络连接错误:', networkError);
            // 保存到离线队列
            var backupKey = 'api_backup_' + Date.now();
            localStorage.setItem(backupKey, JSON.stringify({
                timestamp: new Date().toISOString(),
                url: url,
                data: data,
                status: 'pending'
            }));
            checkOfflineQueue();
            // 重置按钮状态
            button.classList.remove('loading');
            button.innerHTML = originalText;
            button.disabled = false;
            isSubmitting = false;
            showToast('网络连接失败，数据已保存到待重试队列', 'error');
            return { success: false, offline: true, message: '网络连接失败' };
        }

        if (!response.ok) {
            throw new Error('服务器响应错误: ' + response.status + ' ' + response.statusText);
        }

        var responseText;
        var result;
        try {
            responseText = await response.text();
            result = responseText ? JSON.parse(responseText) : {};
        } catch (parseError) {
            console.error('JSON解析错误:', parseError);
            throw new Error('无法解析服务器响应');
        }

        // 重置按钮状态
        button.classList.remove('loading');
        button.innerHTML = originalText;
        button.disabled = false;
        isSubmitting = false;

        if (!result.success) {
            var errorMsg = result.details
                ? (result.error + ' (代码: ' + (result.details.code || '无') + ', ' + (result.details.msg || '无') + ')')
                : (result.error || '未知错误');
            throw new Error(errorMsg);
        }

        return result;
    } catch (error) {
        // 重置按钮状态
        button.classList.remove('loading');
        button.innerHTML = originalText;
        button.disabled = false;
        isSubmitting = false;
        console.error('Error:', error);
        showToast('提交失败：' + error.message, 'error');
        return null;
    }
}

// ============ 打卡 ============

function handleStartClick() {
    if (startDateTime !== null) {
        showToast('您已经打卡上班了！', 'info');
        if (startBtn) startBtn.disabled = true;
        return;
    }
    startDateTime = new Date();
    var startDateEl = document.getElementById('startDate');
    var startTimeEl = document.getElementById('startTime');
    if (startDateEl && startTimeEl && startBtn && endBtn) {
        startDateEl.textContent = formatDate(startDateTime);
        startTimeEl.textContent = formatTime(startDateTime);
        startBtn.disabled = true;
        endBtn.disabled = false;
        var startCard = document.getElementById('startCard');
        if (startCard) startCard.classList.add('active');
        saveToLocalStorage();
        showToast('上班打卡成功！', 'success');
    } else {
        showToast('打卡失败，请刷新页面重试', 'error');
        startDateTime = null;
    }
}

function handleEndClick() {
    endDateTime = new Date();
    var endDateEl = document.getElementById('endDate');
    var startDateEl = document.getElementById('startDate');
    if (startDateEl && endDateEl) {
        var startDateText = startDateEl.textContent;
        if (startDateText !== '\u00a0' && startDateText !== '----' && endDateTime.getHours() >= 0 && endDateTime.getHours() < 8) {
            var parts = startDateText.indexOf('/') > -1 ? startDateText.split('/') : startDateText.split('-');
            if (parts.length === 3) {
                var nextDay = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                nextDay.setDate(nextDay.getDate() + 1);
                endDateEl.textContent = formatDate(nextDay);
            }
        } else {
            endDateEl.textContent = formatDate(endDateTime);
        }
    }
    document.getElementById('endTime').textContent = formatTime(endDateTime);
    var endCard = document.getElementById('endCard');
    if (endCard) endCard.classList.add('active');

    if (startBtn) startBtn.disabled = true;
    if (endBtn) endBtn.disabled = true;
    if (submitToGroupBtn) submitToGroupBtn.disabled = false;
    if (submitToTableBtn) submitToTableBtn.disabled = false;

    // 计算工作时长
    if (startDateTime) {
        var diff = endDateTime - startDateTime;
        var hours = Math.floor(diff / 3600000);
        var mins = Math.floor((diff % 3600000) / 60000);
        var durationBar = document.getElementById('durationBar');
        var durationValue = document.getElementById('durationValue');
        if (durationBar && durationValue) {
            durationValue.textContent = hours + '小时' + mins + '分钟';
            durationBar.style.display = '';
        }
    }

    saveToLocalStorage();
    showToast('下班打卡成功！', 'success');
}

// ============ 飞书群提交 ============

async function handleSubmitToGroup() {
    if (isSubmitting) {
        showToast('正在处理中，请稍候', 'info');
        return;
    }

    var elements = validateAndGetElements();
    if (!elements) return;
    if (!selectedProject || !selectedProject.length) {
        showToast('请先选择项目类型', 'error');
        if (projectGrid) projectGrid.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
    }
    var startDateText = document.getElementById('startDate').textContent;
    var endDateText = document.getElementById('endDate').textContent;

    // 构建消息内容
    var message = '打卡信息：\n';
    message += '上班日期：' + startDateText + '\n';
    if (selectedProject && selectedProject.length) {
        message += '\u{1f3eb}项目类型：' + selectedProject.join('、') + '\n';
    }
    message += '上班时间：' + elements.startTime + '\n';
    message += '下班时间：' + elements.endTime + '\n';
    if (elements.notes) {
        message += '备注：' + elements.notes + '\n';
    }

    // 追加消费信息
    var advanceText = getAdvanceSummaryText();
    if (advanceText) {
        message += '\n💰消费：\n' + advanceText;
    }

    var data = {
        startDate: startDateText,
        projectType: selectedProject.join('、'),
        endDate: endDateText,
        startTime: elements.startTime,
        endTime: elements.endTime,
        notes: elements.notes,
        message: message,
        advanceRecords: advanceRecords,
        advanceTotal: advanceRecords.reduce(function(sum, r) { return sum + r.amount; }, 0)
    };

    var apiUrl = '';
    if (window.location.hostname.indexOf('.netlify.app') > -1) {
        apiUrl = '/.netlify/functions/feishu';
    } else if (window.location.hostname === 'localhost') {
        apiUrl = window.location.protocol + '//' + window.location.hostname + ':' + (window.location.port || 3000) + '/.netlify/functions/feishu';
    } else {
        apiUrl = 'http://localhost:3000/.netlify/functions/feishu';
    }

    var result = await sendApiRequest(apiUrl, data, document.getElementById('submitToGroupBtn'));

    if (result && result.success) {
        submittedTargets.group = true;
        // 显示详细成功信息
        var detailMsg = '已发送到飞书群！';
        if (result.details && result.details.msg) {
            detailMsg = result.details.msg;
        }
        showToast(detailMsg, 'success');
        // 标记按钮为已提交状态
        document.getElementById('submitToGroupBtn').classList.add('submitted');
        document.getElementById('submitToGroupBtn').textContent = '已发送 ✓';
        // 检查是否两个目标都已提交
        checkAllSubmitted();
    }
}

// ============ 多维表格提交 ============

async function handleSubmitToTable() {
    if (isSubmitting) {
        showToast('正在处理中，请稍候', 'info');
        return;
    }

    var elements = validateAndGetElements();
    if (!elements) return;
    if (!selectedProject || !selectedProject.length) {
        showToast('请先选择项目类型', 'error');
        if (projectGrid) projectGrid.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
    }
    var startDateText = document.getElementById('startDate').textContent;
    var endDateText = document.getElementById('endDate').textContent;

    // 计算消费总额
    var advanceTotal = 0;
    for (var i = 0; i < advanceRecords.length; i++) {
        advanceTotal += advanceRecords[i].amount;
    }

    var data = {
        '项目类型': selectedProject,
        '日期': { type: 'date', value: convertToBitableDate(startDateText) },
        '上班日期': { type: 'date', value: convertToBitableDate(startDateText) },
        '下班日期': { type: 'date', value: convertToBitableDate(endDateText) },
        '上班时间': elements.startTime,
        '下班时间': elements.endTime,
        '备注': elements.notes || '',
        '消费记录': getAdvanceSummaryForTable(),
        '消费总额': advanceTotal > 0 ? advanceTotal.toFixed(2) : '',
        '消费次数': advanceRecords.length
    };

    var apiUrl = '';
    if (window.location.hostname.indexOf('.netlify.app') > -1) {
        apiUrl = '/.netlify/functions/bitable';
    } else if (window.location.hostname === 'localhost') {
        apiUrl = window.location.protocol + '//' + window.location.hostname + ':' + (window.location.port || 3000) + '/.netlify/functions/bitable';
    } else {
        apiUrl = 'http://localhost:3000/.netlify/functions/bitable';
    }

    var result = await sendApiRequest(apiUrl, data, document.getElementById('submitToTableBtn'));

    if (result && result.success) {
        submittedTargets.table = true;
        // 显示详细成功信息
        var detailMsg = '已提交到多维表格！';
        if (result.details && result.details.msg) {
            detailMsg = result.details.msg;
        }
        showToast(detailMsg, 'success');
        // 标记按钮为已提交状态
        document.getElementById('submitToTableBtn').classList.add('submitted');
        document.getElementById('submitToTableBtn').textContent = '已提交 ✓';
        // 检查是否两个目标都已提交
        checkAllSubmitted();
    }
}

function checkAllSubmitted() {
    if (submittedTargets.group && submittedTargets.table) {
        // 两个目标都提交成功，清除本地数据
        localStorage.removeItem('dailyWordData');
        showToast('所有提交完成！', 'success');
    }
}

function convertToBitableDate(dateText) {
    var parts = dateText.indexOf('/') > -1 ? dateText.split('/') : dateText.split('-');
    if (parts.length !== 3) return dateText;
    return { year: parseInt(parts[0]), month: parseInt(parts[1]), day: parseInt(parts[2]) };
}

// ============ 工具 ============

function handleClearData() {
    localStorage.removeItem('dailyWordData');
    // 清除所有离线队列数据
    var keysToRemove = [];
    for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (key && key.indexOf('api_backup_') === 0) {
            keysToRemove.push(key);
        }
    }
    for (var j = 0; j < keysToRemove.length; j++) {
        localStorage.removeItem(keysToRemove[j]);
    }
    resetUI();
    checkOfflineQueue();
    showToast('数据已清除', 'info');
}

function handleViewData() {
    try {
        var data = localStorage.getItem('dailyWordData');
        var offlineData = getOfflineQueue();
        var info = '';

        if (data) {
            var parsed = JSON.parse(data);
            info += '【当前打卡数据】\n' + JSON.stringify(parsed, null, 2);
        } else {
            info += '【当前打卡数据】\n无\n';
        }

        if (offlineData.length > 0) {
            info += '\n【待重试数据】\n' + offlineData.length + ' 条';
            for (var i = 0; i < offlineData.length; i++) {
                info += '\n  ' + (i + 1) + '. ' + offlineData[i].timestamp;
            }
        } else {
            info += '\n【待重试数据】\n无';
        }

        alert(info);
    } catch (e) {
        alert('读取数据失败: ' + e.message);
    }
}

// ============ 本地存储 ============

function saveToLocalStorage() {
    try {
        var data = {
            startDateTime: startDateTime ? startDateTime.toISOString() : null,
            endDateTime: endDateTime ? endDateTime.toISOString() : null,
            notes: notesTextarea ? notesTextarea.value : '',
            advanceRecords: advanceRecords,
            selectedProject: selectedProject
        };
        localStorage.setItem('dailyWordData', JSON.stringify(data));
    } catch (e) {
        console.error('保存数据失败:', e);
    }
}

function loadFromLocalStorage() {
    try {
        var data = localStorage.getItem('dailyWordData');
        if (data) {
            var parsed = JSON.parse(data);
            if (parsed.startDateTime) {
                startDateTime = new Date(parsed.startDateTime);
                document.getElementById('startDate').textContent = formatDate(startDateTime);
                document.getElementById('startTime').textContent = formatTime(startDateTime);
            }
            if (parsed.endDateTime) {
                endDateTime = new Date(parsed.endDateTime);
                document.getElementById('endDate').textContent = formatDate(endDateTime);
                document.getElementById('endTime').textContent = formatTime(endDateTime);
            }
            if (notesTextarea && parsed.notes) {
                notesTextarea.value = parsed.notes;
            }
            if (parsed.selectedProject) {
                // 兼容旧版本：字符串 → 数组
                if (Array.isArray(parsed.selectedProject)) {
                    selectedProject = parsed.selectedProject;
                } else if (typeof parsed.selectedProject === "string" && parsed.selectedProject) {
                    selectedProject = parsed.selectedProject.split(/[、,]/);
                } else {
                    selectedProject = [];
                }
            }
            // 恢复消费记录
            if (parsed.advanceRecords && Array.isArray(parsed.advanceRecords)) {
                advanceRecords = parsed.advanceRecords;
            }
            if (startBtn && endBtn) {
                if (startDateTime && endDateTime) {
                    startBtn.disabled = true;
                    endBtn.disabled = true;
                    submitToGroupBtn.disabled = false;
                    submitToTableBtn.disabled = false;
                    var startCard = document.getElementById('startCard');
                    var endCard = document.getElementById('endCard');
                    if (startCard) startCard.classList.add('active');
                    if (endCard) endCard.classList.add('active');
                    // 计算时长
                    var diff = endDateTime - startDateTime;
                    var hours = Math.floor(diff / 3600000);
                    var mins = Math.floor((diff % 3600000) / 60000);
                    var durationBar = document.getElementById('durationBar');
                    var durationValue = document.getElementById('durationValue');
                    if (durationBar && durationValue) {
                        durationValue.textContent = hours + '小时' + mins + '分钟';
                        durationBar.style.display = '';
                    }
                } else if (startDateTime) {
                    startBtn.disabled = true;
                    endBtn.disabled = false;
                    var sc = document.getElementById('startCard');
                    if (sc) sc.classList.add('active');
                } else {
                    startBtn.disabled = false;
                    endBtn.disabled = true;
                    submitToGroupBtn.disabled = true;
                    submitToTableBtn.disabled = true;
                }
            }
        }
    } catch (e) {
        console.error('加载数据失败:', e);
    }
}

// ============ 重置UI ============

function resetUI() {
    if (startBtn) startBtn.disabled = false;
    if (endBtn) endBtn.disabled = true;
    if (submitToGroupBtn) {
        submitToGroupBtn.disabled = true;
        submitToGroupBtn.classList.remove('submitted');
        submitToGroupBtn.textContent = '飞书群';
    }
    if (submitToTableBtn) {
        submitToTableBtn.disabled = true;
        submitToTableBtn.classList.remove('submitted');
        submitToTableBtn.textContent = '多维表格';
    }
    document.getElementById('startDate').textContent = '\u00a0';
    document.getElementById('startTime').textContent = '--:--';
    document.getElementById('endDate').textContent = '\u00a0';
    document.getElementById('endTime').textContent = '--:--';
    var startCard = document.getElementById('startCard');
    var endCard = document.getElementById('endCard');
    if (startCard) startCard.classList.remove('active');
    if (endCard) endCard.classList.remove('active');
    var durationBar = document.getElementById('durationBar');
    if (durationBar) durationBar.style.display = 'none';
    startDateTime = null;
    endDateTime = null;
    submittedTargets = { group: false, table: false };
    if (notesTextarea) notesTextarea.value = '';
    // 清空消费记录
    advanceRecords = [];
    renderAdvanceList();
    // 清空项目类型
    selectedProject = [];
    if (projectGrid) {
        var cbs = projectGrid.querySelectorAll('input.project-cb');
        for (var i = 0; i < cbs.length; i++) cbs[i].checked = false;
    }
    updateProjectHint();
    saveToLocalStorage();
}

// ============ 格式化 ============

function formatDate(date) {
    if (!(date instanceof Date)) return '----';
    var y = date.getFullYear();
    var m = (date.getMonth() + 1).toString().padStart(2, '0');
    var d = date.getDate().toString().padStart(2, '0');
    return y + '/' + m + '/' + d;
}

function formatTime(date) {
    if (!(date instanceof Date)) return '--:--';
    var h = date.getHours().toString().padStart(2, '0');
    var m = date.getMinutes().toString().padStart(2, '0');
    return h + ':' + m;
}




// ========== 飞书登录（OAuth 流程）==========
const FEISHU_LOGIN_API = 'https://bespoke-gecko-4ac4c3.netlify.app/.netlify/functions/login';

// 管理员白名单（user_id）
const ADMIN_USER_IDS = ['ou_f1bea8fb03ae624d56c5cbc61fb7ca04'];

function getLoginState() {
    try {
        const s = JSON.parse(localStorage.getItem('feishu_login') || 'null');
        if (!s) return null;
        if (Date.now() - s.login_at > 24 * 3600 * 1000) {
            localStorage.removeItem('feishu_login');
            return null;
        }
        return s;
    } catch(e) { return null; }
}

function setLoginState(u) {
    localStorage.setItem('feishu_login', JSON.stringify(u));
}

function logout() {
    if (!confirm('确认退出登录？')) return;
    localStorage.removeItem('feishu_login');
    renderLoginUI();
}

function renderLoginUI() {
    const u = getLoginState();
    const bar = document.getElementById('loginBar');
    const wrap = document.querySelector('.login-btn-wrap');
    if (!bar || !wrap) return;

    if (u) {
        bar.style.display = 'flex';
        wrap.style.display = 'none';
        const nameEl = document.getElementById('loginName');
        const roleEl = document.getElementById('loginRole');
        const avatarEl = document.getElementById('loginAvatar');
        if (nameEl) nameEl.textContent = u.name || u.user_id;
        if (roleEl) {
            const isAdmin = ADMIN_USER_IDS.includes(u.user_id);
            roleEl.textContent = isAdmin ? '管理员' : '普通用户';
            roleEl.className = 'login-role ' + (isAdmin ? 'admin' : 'user');
        }
        if (avatarEl) {
            if (u.avatar_url) {
                avatarEl.innerHTML = '<img src="' + u.avatar_url + '" style="width:28px;height:28px;border-radius:50%;">';
            } else {
                avatarEl.textContent = (u.name || '?').slice(0, 1);
                avatarEl.style.background = '#2B6CB0';
                avatarEl.style.color = '#fff';
                avatarEl.style.display = 'flex';
                avatarEl.style.alignItems = 'center';
                avatarEl.style.justifyContent = 'center';
                avatarEl.style.borderRadius = '50%';
            }
        }
    } else {
        bar.style.display = 'none';
        wrap.style.display = 'block';
    }
}

function isAdmin(userId) {
    return ADMIN_USER_IDS.includes(userId);
}

function getLoginConfig() {
    return fetch(FEISHU_LOGIN_API, { method: 'GET' })
        .then(r => r.json())
        .catch(e => { console.warn('login config fetch failed', e); return null; });
}

async function startFeishuLogin() {
    const config = await getLoginConfig();
    if (!config || !config.app_id) {
        alert('无法获取登录配置，请稍后重试');
        return;
    }
    const authUrl = config.base_url + '?' + new URLSearchParams({
        app_id: config.app_id,
        redirect_uri: config.redirect_uri,
        state: Date.now().toString(36)  // 防 CSRF
    });
    console.log('跳转飞书授权:', authUrl);
    window.location.href = authUrl;
}

async function handleCallbackCode() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (!code) return false;

    // 调后端 exchange API
    try {
        const r = await fetch(FEISHU_LOGIN_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: code })
        });
        if (!r.ok) {
            const err = await r.json().catch(() => ({}));
            console.error('login exchange failed', r.status, err);
            alert('登录失败：' + (err.error || r.status) + '，请重试');
        } else {
            const u = await r.json();
            console.log('login success:', u);
            setLoginState(u);
        }
    } catch(e) {
        console.error('login exchange error', e);
        alert('登录出错，请重试');
    }
    // 清理 URL 里的 code（防泄露）
    const cleanUrl = window.location.pathname + window.location.hash;
    window.history.replaceState(null, '', cleanUrl);
    return true;
}

// 启动时：先处理回调 code，再渲染 UI
document.addEventListener('DOMContentLoaded', async () => {
    const hadCode = await handleCallbackCode();
    renderLoginUI();
    if (hadCode) {
        setTimeout(() => alert('✅ 登录成功'), 200);
    }
});

// 让 submitCheckIn 附带 user_id
const _origSubmit = window.submitCheckIn;
if (typeof _origSubmit === 'function') {
    window.submitCheckIn = async function() {
        const u = getLoginState();
        if (u) {
            window.currentLoginUser = {
                user_id: u.user_id,
                name: u.name,
                role: isAdmin(u.user_id) ? 'admin' : 'user'
            };
        }
        return _origSubmit.call(this);
    };
}
