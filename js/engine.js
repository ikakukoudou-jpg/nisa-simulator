// Initialize App
document.addEventListener('DOMContentLoaded', () => {
  const savedDate = localStorage.getItem('movingDate');
  
  // Flatpickr初期化
  flatpickr("#moving-date", {
    locale: "ja",
    dateFormat: "Y/m/d",
    allowInput: true,
    minDate: "today",
    defaultDate: savedDate || null,
    onChange: function(selectedDates, dateStr, instance) {
      if (selectedDates.length > 0 && selectedDates[0] < new Date().setHours(0,0,0,0)) {
        alert('引越し予定日は今日以降の日付を入力してください。');
        instance.clear();
        return;
      }
      const conditionsContainer = document.querySelector('.conditions-container');
      if(dateStr) {
        localStorage.setItem('movingDate', dateStr);
        instance.element.classList.add('filled');
        conditionsContainer.classList.add('visible'); // 段階的開示で表示
      } else {
        localStorage.removeItem('movingDate');
        instance.element.classList.remove('filled');
        conditionsContainer.classList.remove('visible'); // 再度隠す
      }
      renderTasks(); // Re-calculate deadlines and update UI
    }
  });

  // 初回表示のCSSクラス適用・条件トグルの表示
  if (savedDate) {
    document.getElementById('moving-date').classList.add('filled');
    document.querySelector('.conditions-container').classList.add('visible');
  }

  // Load toggles from localStorage
  ['rental', 'internet', 'child', 'pet'].forEach(key => {
    const val = localStorage.getItem(`cond_${key}`);
    if (val === 'true') {
      const checkbox = document.getElementById(`cond-${key}`);
      if(checkbox) checkbox.checked = true;
    }
  });
  
  renderTasks();
});

function handleConditionChange() {
  ['rental', 'internet', 'child', 'pet'].forEach(key => {
    const checkbox = document.getElementById(`cond-${key}`);
    if(checkbox) {
      localStorage.setItem(`cond_${key}`, checkbox.checked);
    }
  });
  renderTasks();
}

function renderTasks() {
  const movingDateStr = localStorage.getItem('movingDate');

  // 1.5 アクティブな条件の取得
  const activeConditions = {};
  ['rental', 'internet', 'child', 'pet'].forEach(key => {
    const checkbox = document.getElementById(`cond-${key}`);
    activeConditions[key] = checkbox ? checkbox.checked : false;
  });

  // 2. タスクとデッドラインバッジの描画
  const appContent = document.getElementById('app-content');
  appContent.innerHTML = '';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const movingDate = movingDateStr ? new Date(movingDateStr) : null;

  CONCIERGE_DATA.phases.forEach((phase) => {
    const filteredTasks = phase.tasks.filter(task => {
      if (!task.condition) return true;
      return activeConditions[task.condition] === true;
    });

    if (filteredTasks.length === 0) return; // 条件に合致するタスクがなければフェーズごと非表示

    let deadlineStr = '<span class="deadline-badge pending">✨ 予定日を入れて計算</span>';
    let isOverdue = false;

    if (movingDate) {
      const deadlineDate = new Date(movingDate);
      
      if (phase.daysAfter !== undefined) {
         deadlineDate.setDate(deadlineDate.getDate() + phase.daysAfter);
      } else if (phase.daysBefore !== undefined) {
         deadlineDate.setDate(deadlineDate.getDate() - phase.daysBefore);
      }
      
      const m = deadlineDate.getMonth() + 1;
      const d = deadlineDate.getDate();
      
      // Check for uncompleted tasks in the active tasks only
      const hasUncompleted = filteredTasks.some(t => localStorage.getItem(t.id) !== 'true');

      if (today > deadlineDate && hasUncompleted) {
        isOverdue = true;
        deadlineStr = `<span class="deadline-badge">🚨 デッドライン超過：${m}月${d}日</span>`;
      } else {
        deadlineStr = `<span class="deadline-badge" style="background:var(--wood-dark);">期限：${m}月${d}日まで</span>`;
      }
    }

    const phaseSection = document.createElement('div');
    phaseSection.className = `phase-section ${isOverdue ? 'phase-overdue' : ''}`;

    const phaseHeader = document.createElement('div');
    phaseHeader.className = 'phase-header';
    
    phaseHeader.innerHTML = `
      <h2 class="phase-title">
        <span>${phase.phaseName}</span>
        ${deadlineStr}
      </h2>
    `;
    phaseSection.appendChild(phaseHeader);

    filteredTasks.forEach((task) => {
      const isChecked = localStorage.getItem(task.id) === 'true';

      const taskCard = document.createElement('label');
      // 動的挿入時にアニメーションするよう animate-enter を付与
      taskCard.className = `task-card animate-enter ${isChecked ? 'completed' : ''}`;
      taskCard.setAttribute('for', task.id);

      taskCard.innerHTML = `
        <div class="task-header">
          <input type="checkbox" id="${task.id}" class="task-checkbox" ${isChecked ? 'checked' : ''} onchange="toggleTask('${task.id}')">
          <div style="flex-grow: 1;">
            <h3 class="task-title">${task.title}</h3>
            <div class="task-body">
              <p class="task-desc">${task.description}</p>
              <div class="task-warning">
                <p class="critical-warning"><span class="highlight-orange">⚠️ 注意:</span> ${task.criticalWarning}</p>
                <p class="estimated-loss">💸 予想される損失: ${task.estimatedLoss}</p>
              </div>
            </div>
          </div>
        </div>
      `;
      phaseSection.appendChild(taskCard);
    });

    appContent.appendChild(phaseSection);
  });
}

function toggleTask(id) {
  const checkbox = document.getElementById(id);
  localStorage.setItem(id, checkbox.checked);
  
  // Re-render essentially handles completing a task that was "overdue" automatically
  // because it recalculates `isOverdue` based on `hasUncompleted`.
  renderTasks();
}

function copyToClipboard() {
  let text = "📋 引越し逆算スケジュール・状況\n\n";
  
  const movingDateStr = localStorage.getItem('movingDate');
  const movingDate = movingDateStr ? new Date(movingDateStr) : null;
  if (movingDateStr) {
    text += `📅 引越し予定日: ${movingDateStr}\n\n`;
  }

  // 現在のアクティブな条件（トグルの状態）を取得
  const activeConditions = {};
  ['rental', 'internet', 'child', 'pet'].forEach(key => {
    const checkbox = document.getElementById(`cond-${key}`);
    activeConditions[key] = checkbox ? checkbox.checked : false;
  });

  CONCIERGE_DATA.phases.forEach(phase => {
    // 条件に合致するタスクのみを抽出（画面表示と同期）
    const filteredTasks = phase.tasks.filter(task => {
      if (!task.condition) return true;
      return activeConditions[task.condition] === true;
    });

    if (filteredTasks.length === 0) return;

    // 各フェーズの期日（デッドライン）を計算
    let deadlineInfo = "";
    if (movingDate) {
      const deadlineDate = new Date(movingDate);
      if (phase.daysAfter !== undefined) {
         deadlineDate.setDate(deadlineDate.getDate() + phase.daysAfter);
      } else if (phase.daysBefore !== undefined) {
         deadlineDate.setDate(deadlineDate.getDate() - phase.daysBefore);
      }
      const m = deadlineDate.getMonth() + 1;
      const d = deadlineDate.getDate();
      deadlineInfo = ` (期限: ${m}月${d}日まで)`;
    } else {
      deadlineInfo = " (期限: 未設定)";
    }

    text += `【${phase.phaseName}】${deadlineInfo}\n`;
    filteredTasks.forEach(task => {
      const isChecked = localStorage.getItem(task.id) === 'true';
      text += `${isChecked ? '[x]' : '[ ]'} ${task.title}\n`;
    });
    text += "\n";
  });
  
  text += "🔗 https://mytool-lab.com/move/\n";

  navigator.clipboard.writeText(text).then(() => {
    alert("クリップボードに現在の状況をコピーしました！");
  }).catch(err => {
    alert("コピーに失敗しました。");
  });
}

// Modal Handle functions
function openModal(id) {
  document.getElementById(id).classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
  document.body.style.overflow = '';
}

function openResetModal() {
  openModal('modal-reset');
  const check = document.getElementById('reset-confirm-check');
  check.checked = false;
  handleResetCheck({ target: check });
}

function handleResetCheck(e) {
  const btn = document.getElementById('btn-execute-reset');
  btn.disabled = !e.target.checked;
}

function executeReset() {
  // 特定のタスクのIDのみを削除する（他のツールのデータ保護のため）
  CONCIERGE_DATA.phases.forEach(phase => {
    phase.tasks.forEach(task => {
      localStorage.removeItem(task.id);
    });
  });
  
  // トグルの状態をクリア
  ['rental', 'internet', 'child', 'pet'].forEach(key => {
    const checkbox = document.getElementById(`cond-${key}`);
    if(checkbox) checkbox.checked = false;
    localStorage.removeItem(`cond_${key}`);
  });

  // 予定日もクリア
  localStorage.removeItem('movingDate');
  const dateInput = document.getElementById('moving-date');
  if (dateInput && dateInput._flatpickr) {
    dateInput._flatpickr.clear();
    dateInput.classList.remove('filled');
  }

  closeModal('modal-reset');
  renderTasks();
  alert('すべてのタスク状況と引越し予定日をリセットしました。');
}

// ESCキーおよび背景クリックのイベント設定
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    ['modal-reset', 'modal-operator', 'modal-privacy', 'modal-contact'].forEach(id => {
      const modal = document.getElementById(id);
      if (modal && modal.classList.contains('active')) {
        closeModal(id);
      }
    });
  }
});
