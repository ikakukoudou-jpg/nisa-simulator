/**
 * 退職・失業時の大損回避タイムラインツール
 * メインスクリプト (main.js)
 */

// ==========================================
// 0. LocalStorage キー定義（他ツールとの衝突防止）
// ==========================================
const LS_KEY_DATE = 'taisyoku_baseDate';
const LS_KEY_NEXT_JOB = 'taisyoku_nextJob';
const LS_KEY_HEALTH = 'taisyoku_healthCondition';
const LS_KEY_FREELANCE = 'taisyoku_freelance';
const LS_KEY_SPOUSE = 'taisyoku_hasSpouse';
const LS_TASK_PREFIX = 'task_';

// ==========================================
// 1. 休日判定と翌営業日計算関数の実装
// ==========================================

// 日付が土日か判定する関数
function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6; // 0: 日曜, 6: 土曜
}

// 翌営業日（平日）まで日付を進める関数
function getNextBusinessDay(date) {
  let nextDate = new Date(date);
  while (isWeekend(nextDate)) {
    nextDate.setDate(nextDate.getDate() + 1);
  }
  return nextDate;
}

// ==========================================
// 2. 期限計算メインロジックの実装
// ==========================================

/**
 * タスクの最終期限日を算出する関数
 * @param {Date} baseDate - 退職日（Day 0）
 * @param {number} relativeDays - 基準日からの相対日数
 * @param {string} deadlineRule - 休日処理ルール
 * @returns {Date} 算出された期限となる日付
 */
function calculateTaskDeadline(baseDate, relativeDays, deadlineRule) {
  let targetDate = new Date(baseDate);

  switch (deadlineRule) {
    case "strict":
      // 休日は考慮しない（絶対期限）
      targetDate.setDate(targetDate.getDate() + relativeDays);
      break;

    case "nextBusinessDay":
    case "postmarkValid":
      // baseDate + relativeDays で算出した日が土日の場合、翌営業日に繰り越す
      targetDate.setDate(targetDate.getDate() + relativeDays);
      targetDate = getNextBusinessDay(targetDate);
      break;

    case "helloWork":
      // 退職日をまず「最初の平日」にシフトし（新たなDay0）、そこに日数を足す（繰り越しなし）
      targetDate = getNextBusinessDay(targetDate);
      targetDate.setDate(targetDate.getDate() + relativeDays);
      break;

    default:
      // デフォルトフォールバック
      targetDate.setDate(targetDate.getDate() + relativeDays);
      break;
  }

  return targetDate;
}

// ==========================================
// 3. UI（バッジ・ラベル）の出し分けロジック
// ==========================================

/**
 * ルールに応じたバッジのHTML文字列を生成する関数
 * @param {string} deadlineRule - 休日処理ルール
 * @returns {string} バッジ用HTML文字列
 */
function getBadgeHtml(deadlineRule) {
  switch (deadlineRule) {
    case "nextBusinessDay":
      return '<span class="badge badge-danger">窓口必着</span>';
    case "postmarkValid":
      return '<span class="badge badge-success">当日消印有効</span>';
    case "helloWork":
      return '<span class="badge badge-info">ハローワーク指定</span>';
    default:
      return ''; // strictなどの場合は特にバッジを表示しない
  }
}

// ==========================================
// 4. 表示条件のフィルタリングとレンダリング
// ==========================================

/**
 * ユーザー条件に合致するタスクのみを抽出するフィルタリング関数
 * @param {Array} tasks - data-config.jsのタスク配列
 * @param {Object} userConditions - ユーザーの入力状況 例: { nextJob: "no", freelance: true, ... }
 * @returns {Array} 条件に合致したタスク配列
 */
function filterTasks(tasks, userConditions) {
  return tasks.filter(task => {
    // タスクに条件が設定されていない場合は常に表示
    if (!task.conditions || Object.keys(task.conditions).length === 0) {
      return true;
    }

    // すべての条件を満たすかチェック
    for (const key in task.conditions) {
      const conditionValue = task.conditions[key];
      
      // timing（時制）の特別処理: "BEFORE", "TODAY", "AFTER" のいずれかがマッチするか
      if (key === 'timing') {
        if (!conditionValue.includes(userConditions.retirementState)) {
          return false;
        }
        continue; // timing条件をクリアしたら次の条件へ
      }

      const userValue = userConditions[key];

      // 値が配列で指定されている場合 (例: ["no", "undecided"])
      if (Array.isArray(conditionValue)) {
        if (!conditionValue.includes(userValue)) {
          return false;
        }
      } 
      // 値が単一の場合 (例: true / false)
      else {
        if (conditionValue !== userValue) {
          return false;
        }
      }
    }
    return true; // 全条件をクリア
  });
}

/**
 * DOMにタスク一覧を描画するためのメイン関数（HTML側から呼び出す想定）
 * @param {Date} retirementDate - ユーザーが入力した退職日
 * @param {Object} userConditions - ユーザーが入力した条件オブジェクト
 * @param {HTMLElement} container - 描画先のDOMコンテナ
 */
function renderTimeline(retirementDate, userConditions, container) {
  // グローバル変数 taskData の存在チェック
  if (typeof taskData === 'undefined') {
    console.error("タスクデータが見つかりません。data-config.js が正しく読み込まれているか確認してください。");
    return;
  }

  // 1. 条件によるフィルタリング
  const activeTasks = filterTasks(taskData, userConditions);

  // 2. フェーズごとのグループ化用オブジェクトの準備
  const phaseNames = {
    1: "フェーズ1：退職前の準備",
    2: "フェーズ2：退職当日",
    3: "フェーズ3：退職直後の手続き",
    4: "フェーズ4：給付・申請フェーズ",
    5: "フェーズ5：長期の対応"
  };

  const groupedTasks = {
    1: [], 2: [], 3: [], 4: [], 5: []
  };

  // 3. 各タスクを振り分け
  activeTasks.forEach(task => {
    // phaseプロパティがない場合のフォールバック（保険）
    let phaseId = task.phase;
    if (!phaseId) {
      if (task.relativeDays < 0) phaseId = 1;
      else if (task.relativeDays === 0) phaseId = 2;
      else if (task.relativeDays <= 14) phaseId = 3;
      else if (task.relativeDays <= 31) phaseId = 4;
      else phaseId = 5;
    }
    if (groupedTasks[phaseId]) {
      groupedTasks[phaseId].push(task);
    }
  });

  // 4. コンテナをクリア
  container.innerHTML = '';

  // 「退職後14日以上経過」の判定フラグ
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = (today - retirementDate) / (1000 * 60 * 60 * 24);
  const isPast14Days = diffDays >= 14;

  // 5. フェーズごとに描画
  for (let i = 1; i <= 5; i++) {
    const tasksInPhase = groupedTasks[i];
    if (tasksInPhase.length === 0) continue;

    // フェーズ内のタスクを日付順にソート（同日の場合は procedure → warning の順）
    tasksInPhase.sort((a, b) => {
      const dateA = calculateTaskDeadline(retirementDate, a.relativeDays, a.deadlineRule);
      const dateB = calculateTaskDeadline(retirementDate, b.relativeDays, b.deadlineRule);
      const timeDiff = dateA.getTime() - dateB.getTime();
      
      if (timeDiff !== 0) {
        return timeDiff;
      }
      
      // 同じ日付の場合は warning が後に来るようにソート
      const rankA = a.type === 'warning' ? 1 : 0;
      const rankB = b.type === 'warning' ? 1 : 0;
      return rankA - rankB;
    });

    // フェーズ見出しの生成
    const phaseHeader = document.createElement('h2');
    phaseHeader.textContent = phaseNames[i];
    phaseHeader.style.marginTop = "32px";
    phaseHeader.style.marginBottom = "16px";
    phaseHeader.style.borderBottom = "2px solid var(--primary-color, #00bcd4)";
    phaseHeader.style.paddingBottom = "8px";
    phaseHeader.style.color = "var(--primary-dark, #009eb3)";

    // もし退職日当日（TODAY）で、フェーズ2ならアクセントカラーで強調
    if (i === 2 && userConditions.retirementState === "TODAY") {
      phaseHeader.style.color = "#DD6B20";
      phaseHeader.style.borderBottom = "2px solid #DD6B20";
      phaseHeader.innerHTML += ' <span style="font-size:0.75em; background:#DD6B20; color:#fff; padding:4px 8px; border-radius:4px; vertical-align:middle; margin-left:8px;">本日実行</span>';
    }

    container.appendChild(phaseHeader);

    // タスクを描画
    tasksInPhase.forEach(task => {
      const deadlineDate = calculateTaskDeadline(retirementDate, task.relativeDays, task.deadlineRule);
      let badgeHtml = getBadgeHtml(task.deadlineRule);
      
      // 【アラート追加】14日以上前の退職日かつ、フェーズ3（退職直後の手続き）なら警告バッジを上書き・追加
      if (isPast14Days && i === 3) {
         badgeHtml += ' <span class="badge badge-danger" style="background:#8b0000; font-size: 0.9em; animation: pulse 1s infinite alternate;">至急：期限超過の恐れ</span>';
      }
      
      // 【アラート追加】傷病手当金ルートの「注意事項対象期間 (Day -3 ～ Day 0)」の特別表示
      if (task.conditions && task.conditions.healthCondition === true && task.relativeDays >= -3 && task.relativeDays <= 0) {
        badgeHtml += ' <span style="background-color:#2b6cb0; color:#fff; font-size: 0.85em; padding: 4px 8px; border-radius: 4px; vertical-align: middle; margin-left: 8px;">ℹ️ 療養に関する注意期間</span>';
      }

      // YYYY年MM月DD日 (曜) 形式にフォーマット
      const daysStr = ["日", "月", "火", "水", "木", "金", "土"];
      const formattedDate = `${deadlineDate.getFullYear()}年${deadlineDate.getMonth() + 1}月${deadlineDate.getDate()}日 (${daysStr[deadlineDate.getDay()]})`;

      // アクションを促すドキュメント・トリガーボタン（離職票催促の時）
      let toggleHtml = '';
      if (task.id === "demand_separation_notice") {
        toggleHtml = `
          <div style="margin-top: 16px; padding-top: 16px; border-top: 1px dashed #ccc;">
            <button type="button" class="btn-toggle-action" style="background:#f39c12; color:#fff; border:none; padding:10px 16px; border-radius:4px; font-weight:bold; cursor:pointer; width:100%; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">未着の場合のアクションを見る</button>
            <div class="toggle-content" style="display:none; margin-top:12px; background:#fff3cd; padding:16px; border-radius:4px; border-left:4px solid #f39c12; color:#856404; font-size:0.95em;">
              <strong>【催促アクション用テンプレート】</strong><br>
              会社（人事・総務担当者）へ電話またはメールで以下のように至急お伝えください。<br><br>
              <div style="background:#fff; padding:12px; border:1px solid #ffeeba; border-radius:4px; color:#333; font-family:serif;">
                「ハローワークでの失業保険手続きや、国民健康保険への切り替えに必要なため、『離職票』および『社会保険資格喪失証明書』等の書類一式の発送目安を至急教えていただけますでしょうか。」
              </div>
            </div>
          </div>
        `;
      }

      // タスク要素の生成
      const isChecked = localStorage.getItem(`task_${task.id}`) === 'true';
      const taskElement = document.createElement('div');
      let cardClass = task.type === 'warning' ? 'warning-card' : 'procedure-card';
      if (task.isCritical) {
        cardClass = 'critical-card';
      }
      taskElement.className = `task-card ${cardClass} ${isChecked ? 'completed' : ''}`;
      taskElement.id = `card-${task.id}`;
      
      taskElement.innerHTML = `
        <div class="task-header">
          <input type="checkbox" id="check-${task.id}" class="task-checkbox" ${isChecked ? 'checked' : ''} onchange="toggleTask('${task.id}')">
          <div style="flex-grow: 1;">
            <div class="task-date-header" style="font-size: 1.1em; font-weight: bold; margin-bottom: 4px;">
              ${formattedDate} ${badgeHtml}
            </div>
            <h3 class="task-title" style="margin: 0 0 8px 0; color: #333;">${task.title}</h3>
          </div>
        </div>
        <div style="margin-left: 34px;">
          <p style="margin: 0 0 12px 0; color: #666;">${task.description}</p>
          
          ${task.lossWarning ? `<div style="${task.isCritical ? 'color: #c0392b; background: #fdf2f2; border-left: 4px solid #c0392b;' : 'color: #C05621; background: #FFFAF0; border-left: 4px solid #DD6B20;'} padding: 8px; border-radius: 4px; margin-bottom: 8px; font-weight: bold;">${task.lossWarning}</div>` : ''}
          ${task.benefitInfo ? `<div style="color: #5cb85c; background: #f0fdf4; padding: 8px; border-radius: 4px; margin-bottom: 8px; font-weight: bold;">${task.benefitInfo}</div>` : ''}
          
          <div style="background: #f9f9f9; padding: 8px; border-radius: 4px; color: #444; font-size: 0.9em;">
            <strong>行動先 / 手続き場所：</strong> ${task.actionPlace}
          </div>
          ${toggleHtml}
        </div>
      `;

      // トリガーボタンのイベントリスナー追加
      const toggleBtn = taskElement.querySelector('.btn-toggle-action');
      if (toggleBtn) {
        toggleBtn.addEventListener('click', (e) => {
          const content = e.target.nextElementSibling;
          if (content.style.display === "none" || content.style.display === "") {
            content.style.display = "block";
            e.target.style.display = "none";
          }
        });
      }

      container.appendChild(taskElement);
    });
  }
}

// ==========================================
// 5. LocalStorage への条件保存・復元ヘルパー
// ==========================================

/**
 * 現在のフォーム入力状態をLocalStorageに自動保存する関数
 */
function saveFormToStorage() {
  const baseDate = document.getElementById('base-date').value;
  if (baseDate) {
    localStorage.setItem(LS_KEY_DATE, baseDate);
  }
  
  const nextJobEl = document.querySelector('input[name="nextJob"]:checked');
  if (nextJobEl) localStorage.setItem(LS_KEY_NEXT_JOB, nextJobEl.value);
  
  const healthEl = document.querySelector('input[name="healthCondition"]:checked');
  if (healthEl) localStorage.setItem(LS_KEY_HEALTH, healthEl.value);
  
  const freelanceEl = document.querySelector('input[name="freelance"]:checked');
  if (freelanceEl) localStorage.setItem(LS_KEY_FREELANCE, freelanceEl.value);
  
  const spouseEl = document.querySelector('input[name="hasSpouse"]:checked');
  if (spouseEl) localStorage.setItem(LS_KEY_SPOUSE, spouseEl.value);
}

/**
 * LocalStorageからフォーム入力状態を復元する関数
 * @returns {boolean} 退職日が復元できた場合にtrueを返す
 */
function restoreFormFromStorage() {
  let hasDate = false;

  const savedDate = localStorage.getItem(LS_KEY_DATE);
  if (savedDate) {
    document.getElementById('base-date').value = savedDate;
    hasDate = true;
  }

  const savedNextJob = localStorage.getItem(LS_KEY_NEXT_JOB);
  if (savedNextJob) {
    const radio = document.querySelector(`input[name="nextJob"][value="${savedNextJob}"]`);
    if (radio) radio.checked = true;
  }

  const savedHealth = localStorage.getItem(LS_KEY_HEALTH);
  if (savedHealth) {
    const radio = document.querySelector(`input[name="healthCondition"][value="${savedHealth}"]`);
    if (radio) radio.checked = true;
  }

  const savedFreelance = localStorage.getItem(LS_KEY_FREELANCE);
  if (savedFreelance) {
    const radio = document.querySelector(`input[name="freelance"][value="${savedFreelance}"]`);
    if (radio) radio.checked = true;
  }

  const savedSpouse = localStorage.getItem(LS_KEY_SPOUSE);
  if (savedSpouse) {
    const radio = document.querySelector(`input[name="hasSpouse"][value="${savedSpouse}"]`);
    if (radio) radio.checked = true;
  }

  return hasDate;
}

/**
 * タスクのチェック状態（task_*キー）のみをLocalStorageから全消去する関数
 */
function clearTaskCheckStates() {
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith(LS_TASK_PREFIX)) {
      localStorage.removeItem(key);
    }
  });
}

/**
 * 本ツールに関連するLocalStorageキーをすべて消去する関数（完全リセット）
 */
function clearAllToolStorage() {
  clearTaskCheckStates();
  localStorage.removeItem(LS_KEY_DATE);
  localStorage.removeItem(LS_KEY_NEXT_JOB);
  localStorage.removeItem(LS_KEY_HEALTH);
  localStorage.removeItem(LS_KEY_FREELANCE);
  localStorage.removeItem(LS_KEY_SPOUSE);
}

// ==========================================
// 6. タイムライン生成の共通トリガー関数
// ==========================================

/**
 * フォームの現在の値からタイムラインを生成・描画する共通関数
 * @param {Object} options - オプション
 * @param {boolean} options.scroll - 生成後にスクロールするかどうか
 */
function triggerTimelineGeneration(options = { scroll: true }) {
  const baseDateString = document.getElementById("base-date").value;
  if (!baseDateString) return;

  const retirementDate = new Date(baseDateString);
  if (isNaN(retirementDate.getTime())) return;

  // 退職日状態の判定: "BEFORE", "TODAY", "AFTER"
  const todayForCheck = new Date();
  todayForCheck.setHours(0, 0, 0, 0);
  
  let retirementState = "AFTER";
  if (retirementDate > todayForCheck) {
    retirementState = "BEFORE";
  } else if (retirementDate.getTime() === todayForCheck.getTime()) {
    retirementState = "TODAY";
  }

  const isFutureRetirement = retirementState === "BEFORE";

  const userAnswers = {
    nextJob: document.querySelector('input[name="nextJob"]:checked').value,
    healthCondition: document.querySelector('input[name="healthCondition"]:checked').value === "true",
    freelance: document.querySelector('input[name="freelance"]:checked').value === "true",
    hasSpouse: document.querySelector('input[name="hasSpouse"]:checked').value === "true",
    isFutureRetirement: isFutureRetirement,
    retirementState: retirementState,
    retirementMonth: retirementDate.getMonth() + 1
  };

  const containerOut = document.getElementById("timeline-container");
  const listContainer = document.getElementById("timeline-list");
  
  renderTimeline(retirementDate, userAnswers, listContainer);

  containerOut.style.display = "block";
  containerOut.classList.remove("fade-in");
  void containerOut.offsetWidth;
  containerOut.classList.add("fade-in");
  
  if (options.scroll) {
    containerOut.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // フォーム状態をLocalStorageに自動保存
  saveFormToStorage();
}

// ==========================================
// 7. UI イベントハンドリング (フォーム連携)
// ==========================================

document.addEventListener("DOMContentLoaded", () => {

  // Flatpickrの初期化設定
  const fpInstance = flatpickr("#base-date", {
    locale: "ja",
    dateFormat: "Y/m/d",
    allowInput: true,
    disableMobile: true,
    defaultDate: localStorage.getItem(LS_KEY_DATE) || null,
    onChange: function(selectedDates, dateStr, instance) {
      if (!dateStr) return;

      const oldDate = localStorage.getItem(LS_KEY_DATE);

      // 日付が実際に変わっていない場合は何もしない
      if (oldDate === dateStr) return;

      // すでにタイムラインが生成済みで、かつチェック済みタスクが1つ以上ある場合のみ確認
      const timelineContainer = document.getElementById('timeline-container');
      const isTimelineVisible = timelineContainer && timelineContainer.style.display !== 'none';
      const hasCheckedTasks = Object.keys(localStorage).some(
        key => key.startsWith(LS_TASK_PREFIX) && localStorage.getItem(key) === 'true'
      );

      if (isTimelineVisible && hasCheckedTasks) {
        const confirmed = window.confirm(
          "退職日を変更すると、現在のタスクのチェック状態がすべてリセットされます。\n変更してもよろしいですか？"
        );
        if (!confirmed) {
          // キャンセル：元の日付に戻す
          instance.setDate(oldDate, false); // falseでonChangeを再発火させない
          return;
        }
      }

      // 日付変更を確定：チェック状態をクリアして新しい日付を保存
      if (oldDate && oldDate !== dateStr) {
        clearTaskCheckStates();
      }
      localStorage.setItem(LS_KEY_DATE, dateStr);
    }
  });

  // 日付の自動スラッシュ補完 (スマホテンキー入力サポート)
  const dateInput = document.getElementById('base-date');
  if (dateInput) {
    dateInput.addEventListener('input', function(e) {
      if (e.inputType === 'deleteContentBackward') return;
      let v = this.value.replace(/\D/g, '');
      if (v.length >= 6) {
        this.value = v.substring(0, 4) + '/' + v.substring(4, 6) + '/' + v.substring(6, 8);
      } else if (v.length >= 4) {
        this.value = v.substring(0, 4) + '/' + v.substring(4);
      } else {
        this.value = v;
      }
    });
  }

  // ラジオボタンの変更を監視して自動保存
  const radioNames = ['nextJob', 'healthCondition', 'freelance', 'hasSpouse'];
  radioNames.forEach(name => {
    document.querySelectorAll(`input[name="${name}"]`).forEach(radio => {
      radio.addEventListener('change', () => {
        saveFormToStorage();
      });
    });
  });

  // 「スケジュールを作成」ボタンのイベント
  const generateBtn = document.getElementById("generate-btn");
  if (generateBtn) {
    generateBtn.addEventListener("click", () => {
      const baseDateString = document.getElementById("base-date").value;
      if (!baseDateString) {
        alert("Q1. 退職（予定）日を入力してください。");
        return;
      }
      const retirementDate = new Date(baseDateString);
      if (isNaN(retirementDate.getTime())) {
        alert("正しい日付を入力してください。");
        return;
      }
      triggerTimelineGeneration({ scroll: true });
    });
  }

  // 「入力をすべてリセット」ボタンのイベント
  const resetBtn = document.getElementById("reset-btn");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      if (confirm("入力した条件とタスクのチェック状態をすべてリセットして、最初からやり直しますか？")) {
        clearAllToolStorage();
        location.reload();
      }
    });
  }

  // ページロード時の自動復元
  const hasRestoredDate = restoreFormFromStorage();
  if (hasRestoredDate) {
    // 保存済みデータがある場合、タイムラインを自動表示（スクロールなし）
    triggerTimelineGeneration({ scroll: false });
  }
});

// ==========================================
// 8. モーダルの開閉制御（グローバル関数）
// ==========================================

window.openModal = function(modalId) {
  const overlay = document.getElementById('modal-overlay');
  const body = document.getElementById('modal-body');
  const dataId = modalId.replace('modal-', 'data-');
  const content = document.getElementById(dataId);
  if (content) {
    body.innerHTML = content.innerHTML;
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }
};

window.closeModal = function() {
  document.getElementById('modal-overlay').style.display = 'none';
  document.body.style.overflow = 'auto';
};

// ==========================================
// 9. タスクの完了状態をトグル（グローバル関数）
// ==========================================

window.toggleTask = function(taskId) {
  const checkbox = document.getElementById(`check-${taskId}`);
  const card = document.getElementById(`card-${taskId}`);
  const isChecked = checkbox.checked;
  
  localStorage.setItem(`task_${taskId}`, isChecked);
  
  if (isChecked) {
    card.classList.add('completed');
  } else {
    card.classList.remove('completed');
  }
};

// ==========================================
// 10. クリップボードに現在のタイムラインをコピー（グローバル関数）
// ==========================================

window.copyToClipboard = function() {
  const retirementDateInput = document.getElementById('base-date');
  if (!retirementDateInput.value) {
    alert("タイムラインを作成してからコピーしてください。");
    return;
  }

  // taskDataとretirementDateからプレーンテキストを直接構築する
  // （DOM走査ではなくデータソースから生成し、HTMLタグの混入を完全に排除）
  const retirementDate = new Date(retirementDateInput.value);
  if (isNaN(retirementDate.getTime())) {
    alert("退職日が正しくありません。");
    return;
  }

  const daysStr = ["日", "月", "火", "水", "木", "金", "土"];
  const separator = "----------------------------------";

  // 現在のフォーム条件を再取得してフィルタリング
  const todayForCheck = new Date();
  todayForCheck.setHours(0, 0, 0, 0);
  let retirementState = "AFTER";
  if (retirementDate > todayForCheck) {
    retirementState = "BEFORE";
  } else if (retirementDate.getTime() === todayForCheck.getTime()) {
    retirementState = "TODAY";
  }

  const userAnswers = {
    nextJob: document.querySelector('input[name="nextJob"]:checked').value,
    healthCondition: document.querySelector('input[name="healthCondition"]:checked').value === "true",
    freelance: document.querySelector('input[name="freelance"]:checked').value === "true",
    hasSpouse: document.querySelector('input[name="hasSpouse"]:checked').value === "true",
    isFutureRetirement: retirementState === "BEFORE",
    retirementState: retirementState,
    retirementMonth: retirementDate.getMonth() + 1
  };

  const activeTasks = filterTasks(taskData, userAnswers);
  if (activeTasks.length === 0) {
    alert("表示されているタスクがありません。");
    return;
  }

  // 各タスクに計算済み日付を付与してソート
  const tasksWithDates = activeTasks.map(task => {
    const deadline = calculateTaskDeadline(retirementDate, task.relativeDays, task.deadlineRule);
    return { ...task, calculatedDate: deadline };
  });
  tasksWithDates.sort((a, b) => a.calculatedDate.getTime() - b.calculatedDate.getTime());

  // ヘッダー構築
  let text = "";
  text += "退職・失業手続きタイムライン（チェックリスト）\n\n";
  text += "退職日: " + retirementDateInput.value + "\n";
  text += separator + "\n";

  // 日付見出し型でテキスト生成
  let currentDateKey = "";
  let isFirstTaskInDate = true;

  tasksWithDates.forEach(task => {
    const d = task.calculatedDate;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dayOfWeek = daysStr[d.getDay()];
    const dateKey = `${y}/${m}/${day}`;

    // 日付が変わったら日付見出しを出力
    if (dateKey !== currentDateKey) {
      text += "\n" + separator + "\n";
      text += "▼ " + dateKey + " (" + dayOfWeek + ") 頃まで\n";
      text += separator + "\n";
      currentDateKey = dateKey;
      isFirstTaskInDate = true;
    }

    // 同じ日付内でタスクが続く場合は空行で区切る
    if (!isFirstTaskInDate) {
      text += "\n";
    }

    // チェック状態を取得
    const isChecked = localStorage.getItem(`task_${task.id}`) === 'true';
    const status = isChecked ? "[x]" : "[ ]";

    // タイトルからHTMLタグを除去（プレーンテキスト化）
    const cleanTitle = task.title.replace(/<[^>]*>/g, '');
    text += status + " " + cleanTitle + "\n";

    isFirstTaskInDate = false;
  });

  // フッター構築
  text += "\n" + separator + "\n";
  text += "https://mytool-lab.com/taisyoku/\n";

  // クリップボードへの書き込み実行
  navigator.clipboard.writeText(text).then(() => {
    alert("タイムラインの状況をコピーしました！\nLINEやスマホのメモ帳に貼り付けて活用してください。");
  }).catch(err => {
    console.error("Copy failed", err);
    alert("コピーに失敗しました。お使いのブラウザでは制限されている可能性があります。");
  });
};
