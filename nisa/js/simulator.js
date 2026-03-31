/**
 * シミュレーションエンジン
 * 
 * 計算式:
 *   月利 = (1 + 年利)^(1/12) - 1
 *   初期資金部分 = 初期資金 × (1 + 月利)^積立月数
 *   積立部分     = 毎月積立額 × (((1 + 月利)^積立月数 - 1) / 月利)
 *   平均ケース   = 初期資金部分 + 積立部分
 * 
 * ボラティリティ適用（平均ケース算出後に乗算）:
 *   上位5%  = 平均 × (1 + ボラ × 1.65)
 *   上位30% = 平均 × (1 + ボラ × 0.52)
 *   下位30% = 平均 × (1 - ボラ × 0.52)
 *   下位5%  = 平均 × (1 - ボラ × 1.65)
 * 
 * モンテカルロシミュレーション:
 *   年次リターン = 期待リターン + (ボラティリティ × 正規乱数)
 *   これを積立年数分繰り返し、5000回試行して分布を求める。
 */

/**
 * ボックス＝ミュラー法による正規乱数生成（平均0、標準偏差1）
 * @returns {number} 正規乱数
 */
function generateNormalRandom() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random(); 
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/**
 * モンテカルロシミュレーション実行（年ごとのパーセンタイル推移も含む）
 * @param {Object} params - シミュレーションパラメータ
 * @returns {Object} 完全なシミュレーション結果（旧simulateFund互換＋ヒストグラム対応）
 */
function runMonteCarloSimulation({ fund, initialInvestment, monthlyContribution, years, returnPeriod, trials = 5000 }) {
  const annualReturn = fund.returns[returnPeriod] / 100;
  const sigma = fund.volatility / 100;

  // 各年の全試行の資産額を保存する [year][trial]
  const yearlyValues = Array.from({ length: years + 1 }, () => []);

  // 0年目（初期値）は全て同じ
  for (let i = 0; i < trials; i++) {
    yearlyValues[0].push(initialInvestment);
  }

  for (let i = 0; i < trials; i++) {
    let currentAssets = initialInvestment;
    for (let y = 1; y <= years; y++) {
      // 毎年のランダムリターン（最低でも-95%の暴落制限）
      const randomReturn = Math.max(-0.95, annualReturn + (sigma * generateNormalRandom()));
      // 月次リターンへ変換
      const monthlyReturn = Math.pow(1 + randomReturn, 1 / 12) - 1;

      // 毎月 積立＆利回り適用
      for (let m = 0; m < 12; m++) {
        currentAssets += monthlyContribution;
        currentAssets *= (1 + monthlyReturn);
      }
      
      yearlyValues[y].push(currentAssets);
    }
  }

  // 年ごとのパーセンタイル推移を求める
  const yearlyByCase = { top5: [], top30: [], median: [], bot30: [], bot5: [] };

  for (let y = 0; y <= years; y++) {
    // 中央値などを取るためにソート
    yearlyValues[y].sort((a, b) => a - b);
    
    const principalAtYear = initialInvestment + monthlyContribution * (12 * y);
    
    const getPercentileOfArray = (arr, percent) => {
      const index = Math.max(0, Math.min(trials - 1, Math.floor((percent / 100) * trials)));
      return arr[index];
    };

    yearlyByCase.top5.push({
      year: y, value: Math.round(getPercentileOfArray(yearlyValues[y], 95)), principal: principalAtYear
    });
    yearlyByCase.top30.push({
      year: y, value: Math.round(getPercentileOfArray(yearlyValues[y], 70)), principal: principalAtYear
    });
    yearlyByCase.median.push({
      year: y, value: Math.round(getPercentileOfArray(yearlyValues[y], 50)), principal: principalAtYear
    });
    yearlyByCase.bot30.push({
      year: y, value: Math.round(getPercentileOfArray(yearlyValues[y], 30)), principal: principalAtYear
    });
    yearlyByCase.bot5.push({
      year: y, value: Math.round(getPercentileOfArray(yearlyValues[y], 5)), principal: principalAtYear
    });
  }

  const finalValues = yearlyValues[years]; // 最終年のソート済み配列
  const totalPrincipal = initialInvestment + monthlyContribution * (years * 12);

  // 最終結果（旧simulateFund互換形式）
  const finalResults = {};
  const casesConfig = [
    { key: "top5", label: "上位5%" },
    { key: "top30", label: "上位30%" },
    { key: "median", label: "中央値" },
    { key: "bot30", label: "下位30%" },
    { key: "bot5", label: "下位5%" }
  ];

  for (const c of casesConfig) {
    const finalValue = yearlyByCase[c.key][years].value;
    finalResults[c.key] = {
      label: c.label,
      value: finalValue,
      gain: finalValue - totalPrincipal,
      gainRate: totalPrincipal > 0
        ? ((finalValue - totalPrincipal) / totalPrincipal * 100).toFixed(1)
        : "0.0"
    };
  }

  // ヒストグラム用の生成処理（完全にすべての外れ値を維持し、高解像度のビンを設定）
  const minVal = finalValues[0];
  const maxVal = finalValues[trials - 1];

  // ビン幅を動的に決定。ボリュームゾーン（Q1〜Q3）を美しく描画するために基準スケールを算出
  const q1 = finalValues[Math.floor(trials * 0.25)];
  const q3 = finalValues[Math.floor(trials * 0.75)];
  let binWidth = 1000000; // デフォルト100万円幅

  if (q3 > q1) {
    binWidth = (q3 - q1) / 50; // ボリュームゾーンを約50分割する解像度
  }
  
  // 最大最小の幅に対しても最低150分割を保証する
  const minRequiredBins = 150;
  const overallWidth = (maxVal - minVal) / minRequiredBins;
  
  // より細かく、高解像度になる方のビン幅を採用
  binWidth = Math.min(binWidth, overallWidth);
  // ただし細かすぎると描画に負荷がかかるため下限（1万円）を設定
  binWidth = Math.max(10000, binWidth);

  // カットせずに全ての領域をカバーするビンの総数を計算
  const binCount = Math.ceil((maxVal - minVal) / binWidth) || 1;

  const histogram = Array(binCount).fill(0);
  const binLabels = [];
  
  for (let i = 0; i < binCount; i++) {
    binLabels.push(minVal + i * binWidth); 
  }

  for (let i = 0; i < trials; i++) {
    const val = finalValues[i];
    let binIndex = Math.floor((val - minVal) / binWidth);
    if (binIndex >= binCount) {
      binIndex = binCount - 1; // maxValは最後のビンに収納
    } else if (binIndex < 0) {
      binIndex = 0;
    }
    histogram[binIndex]++;
  }

  return {
    fundName: fund.name,
    isFangPlus: fund.isFangPlus,
    annualReturn: fund.returns[returnPeriod],
    volatility: fund.volatility,
    totalPrincipal,
    years,
    yearlyByCase, // グラフ描画用
    finalResults, // 比較テーブル用
    trials,
    histogram: {
      labels: binLabels,
      data: histogram,
      binWidth
    }
  };
}

/**
 * 2つのファンド結果の差額を計算
 */
function calcDifference(resultA, resultB) {
  const diff = {};
  
  const casesConfig = [
    { key: "top5", label: "上位5%" },
    { key: "top30", label: "上位30%" },
    { key: "median", label: "中央値" },
    { key: "bot30", label: "下位30%" },
    { key: "bot5", label: "下位5%" }
  ];

  for (const c of casesConfig) {
    const valA = resultA.finalResults[c.key].value;
    const valB = resultB.finalResults[c.key].value;
    diff[c.key] = {
      label: c.label,
      valueA: valA,
      valueB: valB,
      difference: valA - valB
    };
  }

  return {
    cases: diff,
    medianDiff:  diff.median.difference,
    top30Diff:   diff.top30.difference,
    bot30Diff:   diff.bot30.difference,
    top5Diff:    diff.top5.difference,
    bot5Diff:    diff.bot5.difference,
    yearlyDiff: {}
  };
}
