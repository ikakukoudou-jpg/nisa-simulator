/**
 * アプリケーションUIロジック・グラフ描画
 * 
 * 投資信託比較シミュレーター
 * - 共通入力（初期入金額・毎月積立・積立年数）
 * - 2本のファンド選択
 * - リターン期間切替（3年/5年/10年/15年）
 * - 個別結果テーブル＋差額テーブル
 * - Chart.js グラフ（A / B / 差額の3本線、ケース切替）
 * - CSV読込対応
 */

let chartInstance = null;
let histogramChartInstance = null;
let lastResult = null; // グラフケース切替用に保持

// --- 初期化 ---
document.addEventListener("DOMContentLoaded", () => {
  const urlSavedState = restoreFromUrl();
  populateFundSelectors(urlSavedState);
  setupEventListeners();
  updateFundStats(); // 初期状態でライブステータスを表示
});

/**
 * URLパラメータから初期値を復元
 */
function restoreFromUrl() {
  const params = new URLSearchParams(window.location.search);
  if (params.has("initial")) document.getElementById("initial-investment").value = params.get("initial");
  if (params.has("monthly")) document.getElementById("monthly-contribution").value = params.get("monthly");
  if (params.has("years")) document.getElementById("investment-years").value = params.get("years");
  if (params.has("period")) document.getElementById("return-period").value = params.get("period");
  
  // 管理者モード判定
  if (params.get("admin") === "1") {
    const csvContainer = document.getElementById("csv-upload-container");
    if (csvContainer) csvContainer.style.display = "block";
  }

  return { a: params.get("a"), b: params.get("b") };
}

/**
 * ファンド選択プルダウンを構築
 */
function populateFundSelectors(urlState = null) {
  const selects = [document.getElementById("fund-a"), document.getElementById("fund-b")];
  const period = document.getElementById("return-period").value;

  // 現在の選択状態を保持
  const selectedA = selects[0].value;
  const selectedB = selects[1].value;

  for (const sel of selects) {
    // 既存オプションをクリア（最初のplaceholder以外）
    while (sel.options.length > 1) sel.remove(1);

    FUNDS.forEach((fund, idx) => {
      const opt = document.createElement("option");
      opt.value = idx;
      const ret = fund.returns[period];
      const vol = fund.volatility;
      opt.textContent = `${fund.name} (${ret}% / ${vol}%)`;
      sel.appendChild(opt);
    });

    // 末尾にカスタムオプションを追加
    const optCustom = document.createElement("option");
    optCustom.value = "custom";
    optCustom.textContent = "⚙️ カスタム（下の枠で手入力）";
    sel.appendChild(optCustom);
  }

  // 以前の選択状態を復元（URL優先、なければ既存選択、なければデフォルト）
  if (urlState && urlState.a !== null) {
    selects[0].value = urlState.a;
  } else if (selectedA !== "") {
    selects[0].value = selectedA;
  } else if (FUNDS.length >= 2) {
    selects[0].value = "0"; // オルカン
  }

  if (urlState && urlState.b !== null) {
    selects[1].value = urlState.b;
  } else if (selectedB !== "") {
    selects[1].value = selectedB;
  } else if (FUNDS.length >= 2) {
    selects[1].value = "1"; // S&P500
  }
}

/**
 * イベントリスナー設定
 */
function setupEventListeners() {
  // シミュレーション実行
  document.getElementById("run-simulation").addEventListener("click", executeSimulation);

  // グラフケース切替
  document.querySelectorAll('input[name="chart-case"]').forEach(radio => {
    radio.addEventListener("change", () => {
      if (lastResult) renderChart(lastResult, radio.value);
    });
  });

  // ファンド選択・期間変更時にステータスを更新
  document.getElementById("fund-a").addEventListener("change", updateFundStats);
  document.getElementById("fund-b").addEventListener("change", updateFundStats);
  document.getElementById("return-period").addEventListener("change", () => {
    populateFundSelectors(); // 選択肢のテキスト（リターン・リスク）も再生成する
    updateFundStats();
  });

  // CSV読込
  document.getElementById("csv-file-input").addEventListener("change", handleCSVUpload);

  // カスタム入力変更時ステータス反映
  const updateCustomStats = () => updateFundStats();
  document.getElementById("custom-return").addEventListener("input", updateCustomStats);
  document.getElementById("custom-volatility").addEventListener("input", updateCustomStats);
  document.getElementById("custom-name").addEventListener("input", updateCustomStats); // カスタム名変更時も更新

  // プリセットボタン
  document.querySelectorAll(".preset-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const preset = e.target.dataset.preset;
      const selA = document.getElementById("fund-a");
      const selB = document.getElementById("fund-b");
      let targetA = -1, targetB = -1;

      const findFund = (keyword) => FUNDS.findIndex(f => f.name.includes(keyword) || f.name.includes(keyword.replace("・", "")));

      // 簡易キーワードマッチング
      if (preset === "orcan-sp500") {
        targetA = findFund("オール・カントリー");
        targetB = findFund("S&P500");
      } else if (preset === "sp500-fangplus") {
        targetA = findFund("S&P500");
        targetB = findFund("FANG");
      } else if (preset === "orcan-8assets") {
        targetA = findFund("オール・カントリー");
        targetB = findFund("8資産均等");
      }

      if (targetA !== -1 && targetB !== -1) {
        selA.value = targetA;
        selB.value = targetB;
        updateFundStats();
        // プリセット選択後自動実行
        executeSimulation();
      } else {
        showToast("該当するファンドがCSVに見つかりませんでした。");
      }
    });
  });

  // Enterキーで実行
  document.querySelectorAll(".input-field").forEach(input => {
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") executeSimulation();
    });
  });
}

/**
 * 選択中ファンドのリスク・リターンを表示
 */
function updateFundStats() {
  const fundAIdx = document.getElementById("fund-a").value;
  const fundBIdx = document.getElementById("fund-b").value;
  const period = document.getElementById("return-period").value;

  const updateStats = (idx, elementId) => {
    const el = document.getElementById(elementId);
    if (idx === "") {
      el.innerHTML = "";
      return;
    }
    let ret, vol, name;
    if (idx === "custom") {
      name = document.getElementById("custom-name").value || "Custom Fund";
      ret = parseFloat(document.getElementById("custom-return").value) || 0;
      vol = parseFloat(document.getElementById("custom-volatility").value) || 0;
    } else {
      const fund = FUNDS[parseInt(idx)];
      name = fund.name;
      ret = fund.returns[period];
      vol = fund.volatility;
    }
    el.innerHTML = `<span>${name}</span><span class="divider"></span><span>リターン: <strong>${ret}%</strong></span><span class="divider"></span><span>リスク: <strong>${vol}%</strong></span>`;
  };

  updateStats(fundAIdx, "fund-a-stats");
  updateStats(fundBIdx, "fund-b-stats");
}

/**
 * CSV読込処理
 */
function handleCSVUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    const text = event.target.result;
    const parsed = parseCSV(text);
    if (parsed.length === 0) {
      showToast("CSVの読込に失敗しました。フォーマットを確認してください。");
      return;
    }
    FUNDS = parsed;
    populateFundSelectors();
    showToast(`✅ ${parsed.length}件のファンドデータを読込みました`);
  };
  reader.readAsText(file, "UTF-8");
}

/**
 * シミュレーション実行
 */
function executeSimulation() {
  const fundAIdx = document.getElementById("fund-a").value;
  const fundBIdx = document.getElementById("fund-b").value;

  if (fundAIdx === "" || fundBIdx === "") {
    showToast("投資信託AとBの両方を選択してください");
    return;
  }
  if (fundAIdx === fundBIdx) {
    showToast("異なる投資信託を選択してください");
    return;
  }

  // 万円→円に変換（小数第1位まで対応）
  const initialInvestment = Math.round((parseFloat(document.getElementById("initial-investment").value) || 0) * 10000);
  const monthlyContribution = Math.round((parseFloat(document.getElementById("monthly-contribution").value) || 0) * 10000);
  const years = parseInt(document.getElementById("investment-years").value) || 0;
  const returnPeriod = document.getElementById("return-period").value;

  if (initialInvestment <= 0 && monthlyContribution <= 0) {
    showToast("初期入金額または毎月積立額を入力してください");
    return;
  }
  if (years <= 0 || years > 50) {
    showToast("積立年数は1〜50年で入力してください");
    return;
  }

  const getSelectedFund = (idx) => {
    if (idx === "custom") {
      return {
        name: document.getElementById("custom-name").value || "Custom Fund",
        isFangPlus: false, // カスタムファンドはFANG+ではないと仮定
        volatility: parseFloat(document.getElementById("custom-volatility").value) || 0,
        returns: { [returnPeriod]: parseFloat(document.getElementById("custom-return").value) || 0 }
      };
    }
    return FUNDS[parseInt(idx)];
  };

  const fundA = getSelectedFund(fundAIdx);
  const fundB = getSelectedFund(fundBIdx);

  const resultA = runMonteCarloSimulation({ fund: fundA, initialInvestment, monthlyContribution, years, returnPeriod, trials: 5000 });
  const resultB = runMonteCarloSimulation({ fund: fundB, initialInvestment, monthlyContribution, years, returnPeriod, trials: 5000 });
  
  const diff = calcDifference(resultA, resultB);

  lastResult = { resultA, resultB, diff };

  renderResults(lastResult, { initialInvestment, monthlyContribution, years });

  // URLに状態を保存
  const url = new URL(window.location);
  url.searchParams.set("initial", document.getElementById("initial-investment").value || 0);
  url.searchParams.set("monthly", document.getElementById("monthly-contribution").value || 0);
  url.searchParams.set("years", years);
  url.searchParams.set("period", returnPeriod);
  url.searchParams.set("a", fundAIdx);
  url.searchParams.set("b", fundBIdx);
  // adminクエリがある場合は保持
  const adminParam = new URLSearchParams(window.location.search).get("admin");
  if (adminParam) {
    url.searchParams.set("admin", adminParam);
  }
  window.history.replaceState({}, "", url);

  // 自動要約テキストの生成
  generateSummaryText(resultA, resultB, diff, years);

  // 現在選択中のグラフケースで描画
  const selectedCase = document.querySelector('input[name="chart-case"]:checked').value;
  renderChart(lastResult, selectedCase);
  renderHistogramChart(resultA, resultB);

  // ローカル環境等での棒幅計算バグを防ぐための遅延アップデート
  setTimeout(() => {
    if (histogramChartInstance) histogramChartInstance.update();
  }, 100);

  document.getElementById("results-section").scrollIntoView({ behavior: "smooth" });
}

/**
 * 比較結果の自動要約テキストを生成
 */
function generateSummaryText(resA, resB, diffObj, years) {
  const box = document.getElementById("summary-box");
  const aName = resA.fundName;
  const bName = resB.fundName;

  const aMedian = resA.finalResults.median.value;
  const bMedian = resB.finalResults.median.value;
  const aBot5 = resA.finalResults.bot5.value;
  const bBot5 = resB.finalResults.bot5.value;
  const aTop5 = resA.finalResults.top5.value;
  const bTop5 = resB.finalResults.top5.value;

  const medianDiff = Math.abs(aMedian - bMedian);
  const medianWinner = aMedian > bMedian ? "A" : "B";
  const bot5Winner = aBot5 > bBot5 ? "A" : "B";
  const top5Winner = aTop5 > bTop5 ? "A" : "B";

  const shortName = (name) => name.length > 16 ? name.substring(0, 16) + "…" : name;
  const shortA = shortName(aName);
  const shortB = shortName(bName);

  let html = `<h4 style="margin-top:0; color:#1f2937; font-size:1.05em; font-weight:700;">💡 ${years}年後のシミュレーション比較要約</h4>
              <ul style="margin: 10px 0 0 0; padding-left: 20px; line-height: 1.7; color: #1f2937;">`;

  // 中央値
  html += `<li><strong>中央値（よくあるケース）</strong>では、<strong>${medianWinner === "A" ? `A: ${shortA}` : `B: ${shortB}`}</strong> の方が約 <strong>${formatCurrency(medianDiff)}</strong> 多い予測です。</li>`;

  // 下落耐性
  if (aBot5 !== bBot5) {
    html += `<li><strong>下落耐性（下位5%の暴落時など）</strong>においては、<strong>${bot5Winner === "A" ? `A: ${shortA}` : `B: ${shortB}`}</strong> の方が損失が小さく安定性が高い結果となりました。</li>`;
  } else {
    html += `<li>下位5%の最悪ケースにおける下落耐性は、両者でほぼ変わらない結果となりました。</li>`;
  }

  // 爆発力
  if (aTop5 !== bTop5) {
    html += `<li><strong>上振れの爆発力（上位5%の好調時）</strong>に関しては、<strong>${top5Winner === "A" ? `A: ${shortA}` : `B: ${shortB}`}</strong> の方がより大きく資産を伸ばす可能性があります。</li>`;
  }

  html += `</ul>`;
  box.innerHTML = html;
  box.style.display = "block";
}

/**
 * 数値を日本円フォーマットに変換
 */
function formatCurrency(value) {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 100000000) return sign + (abs / 100000000).toFixed(2) + "億円";
  if (abs >= 10000) return sign + (abs / 10000).toFixed(1) + "万円";
  return sign + abs.toLocaleString() + "円";
}

/**
 * 個別ファンド結果テーブルHTML生成
 */
function buildFundTable(result, label, colorClass) {
  const caseOrder = ["top5", "top30", "median", "bot30", "bot5"];
  const caseStyles = {
    top5: "case-top5", top30: "case-top30", median: "case-median",
    bot30: "case-bot30", bot5: "case-bot5"
  };

  let warning = "";
  if (result.isFangPlus) {
    warning = `<div class="fang-warning">⚠ 高成長期間を含むため将来再現保証ではありません</div>`;
  }

  let html = `
    <div class="result-block">
      <div class="result-block-header">
        <span class="result-badge ${colorClass}">${label}</span>
        <span class="result-fund-name">${result.fundName}</span>
      </div>
      <div class="result-meta">
        <span>元本: <strong>${formatCurrency(result.totalPrincipal)}</strong></span>
        <span>リターン: <strong>${result.annualReturn}%</strong></span>
        <span>リスク: <strong>${result.volatility}%</strong></span>
      </div>
      <table>
        <thead><tr><th>ケース</th><th>最終資産額</th><th>損益</th><th>損益率</th></tr></thead>
        <tbody>`;

  for (const key of caseOrder) {
    const r = result.finalResults[key];
    const gainClass = r.gain >= 0 ? "positive" : "negative";
    const highlight = key === "median" ? ' style="background: rgba(217, 119, 6, 0.06); font-weight: 600;"' : '';
    html += `
          <tr${highlight}>
            <td><span class="case-badge ${caseStyles[key]}">${r.label}</span></td>
            <td class="value">${formatCurrency(r.value)}</td>
            <td class="value ${gainClass}">${r.gain >= 0 ? "+" : ""}${formatCurrency(r.gain)}</td>
            <td class="value ${gainClass}">${r.gain >= 0 ? "+" : ""}${r.gainRate}%</td>
          </tr>`;
  }

  html += `
          <tr class="principal-row">
            <td><span class="case-badge case-principal">元本</span></td>
            <td class="value">${formatCurrency(result.totalPrincipal)}</td>
            <td class="value">—</td><td class="value">—</td>
          </tr>
        </tbody></table>
      ${warning}
    </div>`;
  return html;
}

/**
 * 差額テーブルHTML生成
 */
function buildDiffTable(diff, nameA, nameB) {
  const rows = [
    { key: "top5",   label: "上位5%" },
    { key: "top30",  label: "上位30%" },
    { key: "median", label: "中央値" },
    { key: "bot30",  label: "下位30%" },
    { key: "bot5",   label: "下位5%" }
  ];

  let html = `
    <div class="result-block diff-block">
      <div class="result-block-header">
        <span class="result-badge badge-diff diff-title">投資信託A・B の比較結果</span>
      </div>
      <div class="result-meta">
        <span>A: ${nameA}</span>
        <span>B: ${nameB}</span>
      </div>
      <table>
        <thead><tr><th>ケース</th><th>A 資産額</th><th>B 資産額</th><th>差額（AはBに比べ）</th></tr></thead>
        <tbody>`;

  for (const row of rows) {
    const d = diff.cases[row.key];
    const diffClass = d.difference >= 0 ? "positive" : "negative";
    const highlight = row.key === "median" ? ' style="background: rgba(217, 119, 6, 0.06); font-weight: 600;"' : '';
    html += `
          <tr${highlight}>
            <td><span class="case-badge case-${row.key}">${row.label}</span></td>
            <td class="value">${formatCurrency(d.valueA)}</td>
            <td class="value">${formatCurrency(d.valueB)}</td>
            <td class="value ${diffClass}">${d.difference >= 0 ? "+" : ""}${formatCurrency(d.difference)}</td>
          </tr>`;
  }

  html += `</tbody></table></div>`;
  return html;
}

/**
 * 結果レンダリング
 */
function renderResults({ resultA, resultB, diff }, inputs) {
  const section = document.getElementById("results-section");
  section.classList.add("visible");

  const placeholder = document.getElementById("initial-placeholder");
  if (placeholder) placeholder.style.display = "none";

  const conditionDisplay = document.getElementById("current-condition-display");
  if (conditionDisplay && inputs) {
    const initVal = inputs.initialInvestment / 10000;
    const monthVal = inputs.monthlyContribution / 10000;
    
    let parts = [];
    if (initVal > 0) parts.push(`初期入金${initVal}万円`);
    if (monthVal > 0) parts.push(`月${monthVal}万円`);
    parts.push(`${inputs.years}年`);
    
    conditionDisplay.textContent = `${parts.join('・')} 条件で試算中`;
    conditionDisplay.style.display = "block";
  }

  const tableEl = document.getElementById("results-table");
  let html = "";

  // 個別ファンド結果
  html += `<div class="results-grid">`;
  html += buildFundTable(resultA, "投資信託 A", "badge-fund-a");
  html += buildFundTable(resultB, "投資信託 B", "badge-fund-b");
  html += `</div>`;

  // 差額テーブル
  html += buildDiffTable(diff, resultA.fundName, resultB.fundName);

  tableEl.innerHTML = html;
}

/**
 * Chart.js グラフ描画
 * @param {Object} result - { resultA, resultB, diff }
 * @param {string} caseKey - "median" | "top30" | "bot30"
 */
function renderChart({ resultA, resultB }, caseKey) {
  const ctx = document.getElementById("simulation-chart").getContext("2d");
  if (chartInstance) chartInstance.destroy();

  const years = resultA.years;
  const labels = [];
  for (let y = 0; y <= years; y++) labels.push(`${y}年`);

  const dataA = resultA.yearlyByCase[caseKey].map(d => d.value);
  const dataB = resultB.yearlyByCase[caseKey].map(d => d.value);
  const dataPrincipal = resultA.yearlyByCase[caseKey].map(d => d.principal);

  const caseLabels = { median: "中央値ケース", top30: "上位30%ケース", bot30: "下位30%ケース" };
  const chartTitle = caseLabels[caseKey] || "中央値ケース";

  // ファンド名を短縮
  const shortName = (name) => name.length > 18 ? name.substring(0, 18) + "…" : name;

  chartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "元本",
          data: dataPrincipal,
          borderColor: "rgba(148, 163, 184, 0.5)",
          backgroundColor: "rgba(148, 163, 184, 0.06)",
          borderWidth: 2,
          fill: true,
          tension: 0,
          pointRadius: 0,
          pointHoverRadius: 3,
          borderDash: [5, 5],
          order: 3
        },
        {
          label: `A: ${shortName(resultA.fundName)}`,
          data: dataA,
          borderColor: "rgba(99, 102, 241, 1)",
          backgroundColor: "rgba(99, 102, 241, 0.06)",
          borderWidth: 2.5,
          fill: false,
          tension: 0.3,
          pointRadius: 1,
          pointHoverRadius: 5,
          order: 1
        },
        {
          label: `B: ${shortName(resultB.fundName)}`,
          data: dataB,
          borderColor: "rgba(16, 185, 129, 1)",
          backgroundColor: "rgba(16, 185, 129, 0.06)",
          borderWidth: 2.5,
          fill: false,
          tension: 0.3,
          pointRadius: 1,
          pointHoverRadius: 5,
          order: 2
        },
        {
          label: `A: 中央値`,
          data: resultA.yearlyByCase["median"].map(d => d.value),
          borderColor: "rgba(99, 102, 241, 0.3)",
          borderWidth: 1.5,
          borderDash: [4, 4],
          fill: false,
          tension: 0.3,
          pointRadius: 0,
          pointHoverRadius: 0,
          order: 4
        },
        {
          label: `B: 中央値`,
          data: resultB.yearlyByCase["median"].map(d => d.value),
          borderColor: "rgba(16, 185, 129, 0.3)",
          borderWidth: 1.5,
          borderDash: [4, 4],
          fill: false,
          tension: 0.3,
          pointRadius: 0,
          pointHoverRadius: 0,
          order: 5
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        title: {
          display: true,
          text: `資産推移（${chartTitle}）`,
          color: "#1e293b",
          font: { size: 14, weight: 600 },
          padding: { bottom: 16 }
        },
        legend: {
          position: "bottom",
          labels: {
            color: "#475569",
            padding: 14,
            usePointStyle: true,
            pointStyle: "circle",
            font: { size: 11 }
          }
        },
        tooltip: {
          backgroundColor: "rgba(255, 255, 255, 0.97)",
          titleColor: "#1e293b",
          bodyColor: "#334155",
          borderColor: "rgba(0,0,0,0.1)",
          borderWidth: 1,
          padding: { top: 12, bottom: 12, left: 14, right: 14 },
          displayColors: true,
          boxPadding: 4,
          filter: (tooltipItem) => {
            // 参照線（中央値の破線: datasetIndex 3, 4）はツールチップから除外
            return tooltipItem.datasetIndex <= 2;
          },
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${formatCurrency(ctx.raw)}`,
            afterBody: (tooltipItems) => {
              if (!tooltipItems) return [];
              let valA = null;
              let valB = null;
              for (const item of tooltipItems) {
                if (item.datasetIndex === 1) valA = item.raw;
                if (item.datasetIndex === 2) valB = item.raw;
              }
              if (typeof valA === "number" && typeof valB === "number") {
                const diff = valA - valB;
                const sign = diff >= 0 ? "+" : "";
                return ["", `━━━━━━━━━━━━━━━━`, `差額（AはBに比べ）: ${sign}${formatCurrency(diff)}`];
              }
              return [];
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: "rgba(0,0,0,0.05)" },
          ticks: { color: "#64748b", font: { size: 11 } }
        },
        y: {
          grid: { color: "rgba(0,0,0,0.05)" },
          ticks: {
            color: "#64748b",
            font: { size: 11 },
            callback: (v) => {
              const manVal = Math.round(v / 10000);
              return `${manVal}万円`;
            },
            maxTicksLimit: 9
          }
        }
      }
    }
  });
}

/**
 * モンテカルロ結果のヒストグラム描画
 *
 * 棒幅安定化: 両ファンドのビン幅のうち最小値をベースにし、
 * チャート描画幅に対してピクセル単位のbarThicknessを計算する。
 * 分布データ（ラベル・頻度・範囲）は一切変更しない。
 */
function renderHistogramChart(mcResultA, mcResultB) {
  const ctx = document.getElementById("histogram-chart").getContext("2d");
  if (histogramChartInstance) histogramChartInstance.destroy();

  // データを {x, y} 配列に変換
  const dataA = mcResultA.histogram.labels.map((val, idx) => ({
    x: val,
    y: mcResultA.histogram.data[idx]
  }));
  const dataB = mcResultB.histogram.labels.map((val, idx) => ({
    x: val,
    y: mcResultB.histogram.data[idx]
  }));

  // 両ファンドの全x値からx軸の実レンジを算出
  const allX = [...dataA.map(d => d.x), ...dataB.map(d => d.x)];
  const xMin = Math.min(...allX);
  const xMax = Math.max(...allX);

  // 両ファンドのビン幅のうち小さい方を基準にする
  const minBinWidth = Math.min(mcResultA.histogram.binWidth, mcResultB.histogram.binWidth);

  // ファンド名を短縮
  const shortName = (name) => name.length > 18 ? name.substring(0, 18) + "…" : name;

  histogramChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      datasets: [
        {
          label: `A: ${shortName(mcResultA.fundName)}`,
          data: dataA,
          backgroundColor: "rgba(99, 102, 241, 0.5)",
          borderColor: "rgba(99, 102, 241, 1)",
          borderWidth: 1,
          barPercentage: 0.9,
          categoryPercentage: 0.9,
          maxBarThickness: 40,
          minBarLength: 2,
          order: 2
        },
        {
          label: `B: ${shortName(mcResultB.fundName)}`,
          data: dataB,
          backgroundColor: "rgba(16, 185, 129, 0.5)",
          borderColor: "rgba(16, 185, 129, 1)",
          borderWidth: 1,
          barPercentage: 0.9,
          categoryPercentage: 0.9,
          maxBarThickness: 40,
          minBarLength: 2,
          order: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        title: {
          display: true,
          text: `未来資産分布（5000回試行）`,
          color: "#1e293b",
          font: { size: 14, weight: 600 },
          padding: { bottom: 16 }
        },
        legend: {
          position: "bottom",
          labels: {
            color: "#475569",
            padding: 14,
            usePointStyle: true,
            font: { size: 11 }
          }
        },
        tooltip: {
          backgroundColor: "rgba(255, 255, 255, 0.95)",
          titleColor: "#1e293b",
          bodyColor: "#334155",
          borderColor: "rgba(0,0,0,0.1)",
          borderWidth: 1,
          padding: 12,
          callbacks: {
            title: (items) => `資産額: ${formatCurrency(items[0].raw.x)} 付近`,
            label: (ctx) => `${ctx.dataset.label}: ${ctx.raw.y} 回`
          }
        }
      },
      scales: {
        x: {
          type: 'linear',
          min: xMin - minBinWidth * 0.5,
          max: xMax + minBinWidth * 1.5,
          offset: false,
          grid: { color: "rgba(0,0,0,0.05)" },
          ticks: { 
            color: "#64748b",
            font: { size: 11 },
            callback: (v) => {
              const manVal = Math.round(v / 10000);
              return `${manVal}万円`;
            },
            maxRotation: 0,
            minRotation: 0,
            maxTicksLimit: 9
          }
        },
        y: {
          title: {
            display: true,
            text: '頻度（回数）',
            color: "#475569"
          },
          grid: { color: "rgba(0,0,0,0.05)" },
          ticks: { color: "#64748b", font: { size: 11 } }
        }
      }
    }
  });
}

/**
 * トースト通知
 */
function showToast(message) {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add("show"));
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}
