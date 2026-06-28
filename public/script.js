// 全局变量
let startDateTime = null;
let endDateTime = null;

// 消费记录数组
let advanceRecords = [];

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
let advanceListEl = null;
let advanceTotalEl = null;

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
    advanceListEl = document.getElementById('advanceList');
    advanceTotalEl = document.getElementById('advanceTotal');

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

    // 渲染垫资列表
    renderAdvanceList();

    // 防止双击缩放
    document.addEventListener('dblclick', function(e) { e.preventDefault(); });

    // 旋转屏幕时保存数据
    window.addEventListener('orientationchange', function() {
        if (startDateTime || endDateTime) saveToLocalStorage();
    });
});

// ============ 消费管理 ============

function handleAddAdvance() {
    var amountStr = advanceAmountInput.value.trim();
    var purpose = advancePurposeInput.value.trim();

    if (!amountStr || parseFloat(amountStr) <= 0) {
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

// ============ API 请求 ============

async function sendApiRequest(url, data, button) {
    var originalText = button.textContent;
    button.classList.add('loading');
    button.innerHTML = '<span class="spinner"></span>' + originalText;
    button.disabled = true;
    try {
        var response;
        try {
            var controller = new AbortController();
            var timeoutId = setTimeout(function() { controller.abort(); }, 10000);
            response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
                signal: controller.signal
            });
            clearTimeout(timeoutId);
        } catch (networkError) {
            console.error('网络连接错误:', networkError);
            var backupKey = 'api_backup_' + Date.now();
            localStorage.setItem(backupKey, JSON.stringify({ timestamp: new Date(), url: url, data: data, status: 'pending' }));
            showToast('网络连接失败，数据已保存到本地', 'error');
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
        button.classList.remove('loading');
        button.innerHTML = originalText;
        button.disabled = false;
        if (!result.success) {
            var errorMsg = result.details ? ('错误: ' + result.error + '\n代码: ' + (result.details.code || '无') + '\n消息: ' + (result.details.msg || '无')) : result.error;
            throw new Error(errorMsg);
        }
        return result;
    } catch (error) {
        button.classList.remove('loading');
        button.innerHTML = originalText;
        button.disabled = false;
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
    var elements = validateAndGetElements();
    if (!elements) return;
    var startDateText = document.getElementById('startDate').textContent;
    var endDateText = document.getElementById('endDate').textContent;

    // 构建消息内容
    var message = '打卡信息：\n';
    message += '上班日期：' + startDateText + '\n';
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
        showToast('已发送到飞书群！', 'success');
        localStorage.removeItem('dailyWordData');
        resetUI();
    }
}

// ============ 多维表格提交 ============

async function handleSubmitToTable() {
    var elements = validateAndGetElements();
    if (!elements) return;
    var startDateText = document.getElementById('startDate').textContent;
    var endDateText = document.getElementById('endDate').textContent;

    // 计算消费总额
    var advanceTotal = 0;
    for (var i = 0; i < advanceRecords.length; i++) {
        advanceTotal += advanceRecords[i].amount;
    }

    var data = {
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
        showToast('已提交到多维表格！', 'success');
        localStorage.removeItem('dailyWordData');
        resetUI();
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
    resetUI();
    showToast('数据已清除', 'info');
}

function handleViewData() {
    try {
        var data = localStorage.getItem('dailyWordData');
        if (data) {
            var parsed = JSON.parse(data);
            alert('存储的数据:\n' + JSON.stringify(parsed, null, 2));
        } else {
            alert('没有存储的数据');
        }
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
            advanceRecords: advanceRecords
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
    if (submitToGroupBtn) submitToGroupBtn.disabled = true;
    if (submitToTableBtn) submitToTableBtn.disabled = true;
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
    if (notesTextarea) notesTextarea.value = '';
    // 清空消费记录
    advanceRecords = [];
    renderAdvanceList();
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
