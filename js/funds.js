/**
 * 投資信託データベース
 * 
 * CSVから読み込める構造。内部的にはオブジェクト配列で管理。
 * CSV列名: ファンド名,3年平均,5年平均,10年平均,15年平均,ボラティリティ
 * 
 * 毎年CSVを差し替えるだけで更新可能。
 * 更新優先: 3年平均 / 5年平均 / ボラティリティ
 * 10年・15年平均は急変させず微調整で管理。
 */

/** 初期CSVデータ（埋め込み） */
const DEFAULT_CSV = `ファンド名,3年平均,5年平均,10年平均,15年平均,ボラティリティ
eMAXIS Slim 全世界株式（オール・カントリー）,18,16,8,7,14
eMAXIS Slim 米国株式（S&P500）,20,18,9,8,16
SBI・V・S&P500インデックス・ファンド,19,17,9,8,16
eMAXIS Slim 国内株式（TOPIX）,13,11,6,5,18
eMAXIS Slim 国内株式（日経平均）,14,12,6,5,20
eMAXIS Slim 新興国株式インデックス,9,8,6,5,22
eMAXIS Slim バランス（8資産均等型）,7,6,4,4,9
楽天・全世界株式インデックス・ファンド,17,15,8,7,14
SMT 日本株式モメンタムファンド,21,18,10,8,24
iFreeNEXT FANG+インデックス,47.22,25.91,12,11,25.57`;

/**
 * CSVデータをパースしてファンド配列に変換
 * @param {string} csvText - CSVテキスト
 * @returns {Array} ファンドオブジェクトの配列
 */
function parseCSV(csvText) {
  const lines = csvText.trim().split("\n");
  if (lines.length < 2) return [];

  // ヘッダー行をスキップ
  const funds = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // CSVパース（ファンド名に括弧を含む可能性を考慮）
    const parts = line.split(",");
    if (parts.length < 6) continue;

    const name = parts[0].trim();
    const ret3y  = parseFloat(parts[1]);
    const ret5y  = parseFloat(parts[2]);
    const ret10y = parseFloat(parts[3]);
    const ret15y = parseFloat(parts[4]);
    const vol    = parseFloat(parts[5]);

    if (isNaN(ret3y) || isNaN(ret5y) || isNaN(ret10y) || isNaN(ret15y) || isNaN(vol)) continue;

    funds.push({
      name,
      returns: {
        "3y":  ret3y,
        "5y":  ret5y,
        "10y": ret10y,
        "15y": ret15y
      },
      volatility: vol,
      // FANG+系の注記フラグ
      isFangPlus: name.includes("FANG")
    });
  }

  return funds;
}

/** グローバルファンドデータ（初期データで初期化） */
let FUNDS = parseCSV(DEFAULT_CSV);
