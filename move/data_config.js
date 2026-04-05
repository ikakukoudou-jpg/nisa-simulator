// JSON Data extended with daysBefore for deadline calculation
const CONCIERGE_DATA = {
  "phases": [
    {
      "phaseName": "引越し1ヶ月前（物件決定〜退去連絡）",
      "daysBefore": 30,
      "tasks": [
        { "id": "task_move_001", "title": "引越し業者の手配（相見積もりと確定）", "description": "最低3社から見積もりを取り、業者と日時を確定させる。", "criticalWarning": "直前の手配になるとトラックの空き枠が消滅し、「繁忙期割増」や「特急料金」での契約を余儀なくされます。他社と比較して値切る時間も残されていないため、結果的に通常時の1.5倍〜2倍の費用を支払うリスクがあります。※2〜3月の繁忙期は『引越し難民』になるリスクが高いため、2〜3ヶ月前からの早めの手配を推奨します。", "estimatedLoss": "約3万円〜10万円の超過費用" },
        { "id": "task_move_002", "condition": "rental", "title": "旧居の退去連絡（解約通知）", "description": "管理会社または大家へ、退去予定日を正式に連絡する。", "criticalWarning": "解約通知が遅れると、すでに住んでいない旧居との「二重家賃」が日割りで発生し続けます。", "estimatedLoss": "約3,000円〜1万円 / 日の損失" },
        { "id": "task_move_003", "condition": "internet", "title": "ネット回線の移転・新規申込", "description": "プロバイダへ連絡し、新居での開通工事日を予約する。", "criticalWarning": "繁忙期は工事が「1ヶ月待ち」になることもあります。入居後に通信難民化し、スマホのギガ追加購入が連日発生します。", "estimatedLoss": "数千円〜1万円以上の通信費" }
      ]
    },
    {
      "phaseName": "引越し2週間前（インフラ・役所手続き）",
      "daysBefore": 14,
      "tasks": [
        { "id": "task_move_004", "title": "市区町村役場での「転出届」の提出", "description": "異なる市区町村へ引っ越す場合、旧居の役所で転出証明書を発行してもらう。", "criticalWarning": "引越し後14日以内に新居での手続きを完了しないと、住民基本台帳法違反となる可能性があります。※ここで取得する転出証明書がないと、新居での転入届（過料対象）が出せません。", "estimatedLoss": "手続きの遅延リスク" },
        { "id": "task_move_005", "title": "電気・ガス・水道の停止・開始手続き", "description": "各インフラ会社へ連絡する。（ガスは立ち会いが必要な場合あり）", "criticalWarning": "開始手続きを忘れると、引越し当日の夜に「電気がつかない」「お湯が出ずお風呂に入れない」最悪の初日を迎えます。", "estimatedLoss": "銭湯代・外食代の出費" },
        { "id": "task_move_006", "condition": "child", "title": "児童手当の住所変更・転校手続き", "description": "役所での手続きおよび学校への連絡等を行う。", "criticalWarning": "期限を過ぎると手当の受給が一時停止されたり、新学期の登校に支障が出ます。", "estimatedLoss": "受給遅れ・手続きの二度手間" }
      ]
    },
    {
      "phaseName": "引越し1週間前〜直前（各種変更手続き）",
      "daysBefore": 7,
      "tasks": [
        { "id": "task_move_007", "title": "郵便物の転送手続き（e転居）", "description": "旧住所宛の郵便物を新住所へ転送する手続きを行う。", "criticalWarning": "重要書類が旧居に届き続け、支払い遅延による損害金が発生したり、個人情報が漏洩する原因になります。", "estimatedLoss": "支払い遅延損害金＋情報漏洩リスク" },
        { "id": "task_move_008", "title": "旧居の火災保険の解約手続き", "description": "火災保険（家財保険）の解約・返戻金の手続きを行う。", "criticalWarning": "解約を忘れたまま放置すると、本来戻ってくるはずだった「未経過期間分の保険料」をドブに捨てることになります。", "estimatedLoss": "数千円〜数万円の返戻金の喪失" },
        { "id": "task_move_009", "condition": "pet", "title": "ペットの移動準備・新居の環境整備", "description": "移動用のケージ等を準備し、新居での居場所をあらかじめ決めておく。", "criticalWarning": "ペットは環境変化で体調を崩しやすいため、初日から落ち着ける静かな場所の確保が必要です。", "estimatedLoss": "通院費やストレスによる体調不良" }
      ]
    },
    {
      "phaseId": "phase_post_move",
      "phaseName": "引越し直後（14日以内）",
      "daysAfter": 14,
      "tasks": [
        { "id": "task_move_010", "title": "役所での転入届・マイナンバーカードの住所変更", "description": "新居の役所で転入・転居の手続きを行い、マイナンバーカードの住所変更を行う。", "criticalWarning": "引越し後14日を過ぎると、住民基本台帳法違反で最大5万円の過料が発生する可能性があります。", "estimatedLoss": "最大5万円の過料リスク" },
        { "id": "task_move_011", "title": "運転免許証・銀行口座の住所変更", "description": "警察署で免許証の住所変更、および各金融機関で手続きを行う。", "criticalWarning": "本人確認書類として使えなくなり、今後のあらゆる重要な契約手続きや郵便物の受け取りがストップします。", "estimatedLoss": "手続き進行の遅延・サービス停止" },
        { "id": "task_move_012", "condition": "pet", "title": "ペットの各種手続き・かかりつけ医の確保（※犬は登録変更必須）", "description": "市区町村役場での手続き（犬のみ）、および新居周辺の動物病院の確認", "criticalWarning": "犬の場合は狂犬病予防法により30日以内の住所変更が義務付けられています。また、猫やその他のペットも環境変化によるストレスで体調を崩しやすいため、早急に新居周辺の動物病院をリストアップしておくことが重要です。", "estimatedLoss": "法令違反の罰則リスク" }
      ]
    }
  ]
};
