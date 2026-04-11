var taskData = [
  // ■ 導入：ガイドタスク
  {
    id: "guide_starting_point",
    phase: 1,
    conditions: { timing: ["BEFORE", "TODAY", "AFTER"] },
    relativeDays: -60,
    deadlineRule: "strict",
    type: "procedure",
    title: "【最初に確認】現在の状況に応じて、以下から開始してください",
    description: "この一覧は、退職時に必要となる手続きを時系列で整理したものです。上から順に確認することで、必要な対応を漏れなく進めることができます。",
    note: "・すでに退職している方 → 「健康保険の切り替え」または「離職票の確認」から\n・これから退職する方 → 「退職前の手続き（住民税・通院等）」から",
    lossWarning: "・すでに退職している方 → 「健康保険の切り替え」または「離職票の確認」から\n・これから退職する方 → 「退職前の手続き（住民税・通院等）」から",
    benefitInfo: null,
    actionPlace: "チェックリスト全体"
  },

  // ■ 起点タスク：すべての土台
  {
    id: "check_essential_docs",
    phase: 1,
    conditions: { timing: ["BEFORE", "TODAY", "AFTER"] },
    relativeDays: -40,
    deadlineRule: "strict",
    type: "procedure",
    isCritical: true,
    title: "【最優先】退職時に会社から受け取る書類の確認",
    description: "離職票、雇用保険被保険者証、年金手帳、源泉徴収票など。これらの書類がないと、以降のすべての手続き（失業保険、健康保険、年金）がストップします。",
    note: "※ここがすべてのスタート地点です。退職日に必ず会社と受け取り方法（手渡しか郵送か）を確認してください。",
    lossWarning: "※ここがすべてのスタート地点です。退職日に必ず会社と受け取り方法（手渡しか郵送か）を確認してください。",
    benefitInfo: null,
    actionPlace: "現職の会社（人事・総務担当）"
  },

  // ■ フェーズ1：退職前の準備
  {
    id: "use_paid_leave",
    phase: 1,
    conditions: { timing: ["BEFORE", "TODAY"] },
    relativeDays: -30,
    deadlineRule: "strict",
    type: "procedure",
    title: "有給休暇の計画的な消化の推奨",
    description: "未使用の有給休暇は退職とともに消滅し、原則として買い取りの対象にはなりません。引き継ぎ日程を調整し、確実な消化をご検討ください。",
    lossWarning: "【留意点】買取りは原則不可のため、退職日を過ぎた有休は法的に消滅します。",
    benefitInfo: null,
    actionPlace: "現職の会社（上司・人事担当）"
  },
  {
    id: "lump_sum_resident_tax",
    phase: 1,
    conditions: { retirementMonth: [6, 7, 8, 9, 10, 11, 12], nextJob: ["no", "undecided"] },
    relativeDays: -20,
    deadlineRule: "strict",
    type: "procedure",
    title: "住民税の一括徴収手続き（6月～12月退職の場合）",
    description: "退職後の普通徴収（ご自身での支払い）による一時的な支出増加を防ぐため、最後の給与や退職金から一括で納付する手続きをおすすめします。",
    lossWarning: "【留意点】手続きを行わない場合、退職後にまとまった額の納付書が自宅に届くことになります。",
    benefitInfo: "【メリット】無収入期間における一時的な資金の流出を平準化できます。",
    actionPlace: "現職の会社（人事・経理担当部署）"
  },
  {
    id: "collect_documents",
    phase: 1,
    conditions: { timing: ["BEFORE", "TODAY"] },
    relativeDays: -7,
    deadlineRule: "strict",
    type: "procedure",
    title: "退職関連書類の受け取りスケジュールの確認",
    description: "「離職票」「雇用保険被保険者証」「源泉徴収票」「年金手帳」などの必須書類について、事前に人事担当者と発送日と送付先を確認しておくことが推奨されます。",
    lossWarning: "【リスク】到着が遅れると、雇用保険の手続きや転職先での社会保険手続きに遅れが生じる可能性があります。",
    benefitInfo: null,
    actionPlace: "現職の会社（人事・総務担当部署）"
  },
  {
    id: "sickness_benefit_prep",
    phase: 1,
    conditions: { healthCondition: true, nextJob: ["no", "undecided"], timing: ["BEFORE", "TODAY"] },
    relativeDays: -4,
    deadlineRule: "strict",
    type: "warning",
    isCritical: true,
    title: "【最重要】退職日より4日以上前に医療機関を受診してください",
    description: "傷病手当金の対象となるには、退職前に連続した休養期間（待期3日間）と医師の診断が必要です。<br><br><span class='risk-arrow'>→ 未受診のまま退職した場合：</span><br><strong>傷病手当金（給与の約2/3・最長1年6ヶ月）の受給対象外となる可能性があります。</strong><br><span class='risk-note'>※退職後の受診では対象になりません。</span>（※この制度は自動適用されません。退職日以前に医師の証明が必要です。退職後の申請では手遅れになる可能性があります）（※この期限を過ぎると手続きできなくなります）※原則として、少額でも『給与・報酬が発生する行為』はすべて出勤扱いまたは受給対象外と判断される可能性があります。",
    lossWarning: null,
    benefitInfo: null,
    actionPlace: "通院先（心療内科や各種専門医）"
  },
  {
    id: "return_company_items",
    phase: 1,
    conditions: { timing: ["BEFORE", "TODAY"] },
    relativeDays: -4,
    deadlineRule: "strict",
    type: "procedure",
    title: "健康保険証・貸与品の返却手続き",
    description: "貸与品等は、療養期間に入る前の本日までに返却するか、郵送での返却手続きを手配しておくことが推奨されます。",
    lossWarning: "【留意点】療養期間（退職前3日間および退職日）にご自身でオフィスへ出向いて手続き等を行うと、労務可能と判断されるケースがあるため、郵送等の活用をご検討ください。",
    benefitInfo: null,
    actionPlace: "現職の会社（人事部への郵送・私物引き取り手配）"
  },
  {
    id: "sickness_silence_start",
    phase: 1,
    conditions: { healthCondition: true, nextJob: ["no", "undecided"], timing: ["BEFORE", "TODAY"] },
    relativeDays: -3,
    deadlineRule: "strict",
    type: "warning",
    title: "【最重要】本日より会社への業務連絡を停止してください",
    description: "傷病手当金の待期期間および受給権確定日にあたります。<br><br><span class='risk-arrow'>→ 業務連絡（メールやチャット）を行った場合：</span><br><strong>「労務可能（働ける状態）」とみなされ、給付要件を満たさなくなるケースがあります。</strong><br><span class='risk-note'>※引き継ぎ等は事前に済ませ、療養に専念してください。</span>（※この制度は自動適用されません。退職日以前に医師の証明が必要です。退職後の申請では手遅れになる可能性があります）※原則として、少額でも『給与・報酬が発生する行為』はすべて出勤扱いまたは受給対象外と判断される可能性があります。",
    lossWarning: null,
    benefitInfo: null,
    actionPlace: "自宅（療養への専念）"
  },

  // ■ フェーズ2：退職当日（運命のDay 0）
  {
    id: "warn_day_zero_silence",
    phase: 2,
    conditions: { healthCondition: true, nextJob: ["no", "undecided"], timing: ["BEFORE", "TODAY"] },
    relativeDays: 0,
    deadlineRule: "strict",
    type: "warning",
    isCritical: true,
    title: "【最重要】退職日当日は出勤・就労をしないでください",
    description: "継続給付（退職後も手当をもらい続ける）の必須条件です。<br><br><span class='risk-arrow'>→ 出勤扱いとなった場合：</span><br><strong>継続給付の対象外となり、退職後の傷病手当金が受け取れなくなるケースがあります。</strong><br><span class='risk-note'>※「挨拶のみ」の短時間出勤でも無効になる可能性があります。</span>（※この制度は自動適用されません。退職日以前に医師の証明が必要です。退職後の申請では手遅れになる可能性があります）※原則として、少額でも『給与・報酬が発生する行為』はすべて出勤扱いまたは受給対象外と判断される可能性があります。",
    lossWarning: null,
    benefitInfo: null,
    actionPlace: "自宅での療養（完全な遮断）"
  },

  // ■ フェーズ3：退職直後の手続き
  {
    id: "sickness_retro_check",
    phase: 3,
    conditions: { healthCondition: true, timing: ["AFTER"] },
    relativeDays: 1,
    deadlineRule: "strict",
    type: "warning",
    isCritical: true,
    title: "【重要確認】傷病手当金の受給要件の振り返り",
    description: "すでに退職済みの場合、在職中の行動によって給付の可否が決まっています。①『退職日より前に医師の診察を受けていたか』、②『退職日を含め、直前4日間以上連続して休んでいた（当日の出勤・業務連絡なし）か』をご確認ください。（※この制度は自動適用されません。退職日以前に医師の証明が必要です。退職後の申請では手遅れになる可能性があります）※原則として、少額でも『給与・報酬が発生する行為』はすべて出勤扱いまたは受給対象外と判断される可能性があります。",
    lossWarning: "【致命的リスク】これらを満たしていない状態で退職した場合、事後申請を行っても対象外となるケースがあり、受給権を完全に喪失している可能性があります。",
    benefitInfo: null,
    actionPlace: "要件確認（満たさない場合は失業保険ルートへの早期切り替えが必要）"
  },
  {
    id: "check_blank_period",
    phase: 3,
    conditions: { nextJob: ["yes"] },
    relativeDays: 1, // 退職翌日
    deadlineRule: "strict",
    type: "warning",
    title: "【内定者向け】社会保険の手続きに関する確認",
    description: "退職日の翌日に入社せず、1日でも期間が空く場合は、その月の国民年金および国民健康保険への加入義務が生じます。",
    lossWarning: "【留意点】月末退職でない場合や空白期間が生じる場合は、1ヶ月分の保険料が発生します。",
    benefitInfo: null,
    actionPlace: "新入先の会社との入社日の確認"
  },
  {
    id: "dependent_spouse",
    phase: 3,
    conditions: { hasSpouse: true, nextJob: ["no", "undecided"] },
    relativeDays: 5,
    deadlineRule: "nextBusinessDay",
    type: "procedure",
    title: "配偶者の健康保険（被扶養者）への加入手続き",
    description: "雇用保険（失業手当）の受給制限期間等で収入がない場合は、配偶者の被扶養者となることで社会保険料の負担を抑えられる可能性があります。",
    lossWarning: "【留意点】手続きを行わない場合、国民健康保険・国民年金への各自加入と保険料の支払いが必要となります。",
    benefitInfo: "【メリット】扶養期間中は公的保険料の負担が軽減されます。",
    actionPlace: "配偶者の勤務先（人事・労務担当）"
  },
  {
    id: "health_insurance_switch",
    phase: 3,
    conditions: { nextJob: ["no", "undecided"] },
    relativeDays: 14,
    deadlineRule: "strict",
    type: "warning",
    title: "【要確認】国民健康保険、または任意継続の加入手続き",
    description: "退職後14日以内に健康保険の切り替えが必要です。<br><br><span class='risk-arrow'>→ 任意継続を希望し、退職後20日を過ぎた場合：</span><br><strong>いかなる理由でも任意継続への加入が認められなくなります。</strong><br><span class='risk-note'>※任意継続の手続きは「20日以内必着」です。</span>（※この期限を過ぎると手続きできなくなります）",
    lossWarning: null,
    benefitInfo: null,
    actionPlace: "ご自身の住所を管轄する健康保険協会、または市区町村"
  },
  {
    id: "pension_exemption",
    phase: 3,
    conditions: { nextJob: ["no", "undecided"] },
    relativeDays: 14,
    deadlineRule: "nextBusinessDay",
    type: "procedure",
    title: "国民年金「退職（失業）による特例免除」の申請",
    description: "退職した事実を証明する書類（離職票等）を用いて、国民年金の保険料免除や納付猶予の特例申請を行うことが可能です。（※未納のまま放置すると将来の年金額だけでなく障害年金の受給資格にも影響しますが、自動的には免除されません）※これらの制度は自動適用されません。自身で申請を行わない限り適用されないためご注意ください。",
    lossWarning: "【リスク】未納のまま放置し障害を負った場合、障害年金の受給要件を満たさなくなる可能性があります。",
    benefitInfo: "【メリット】全額免除が適用されると保険料の支払いがなくなり、将来の年金受給額には国庫負担分が反映されます。",
    actionPlace: "市区町村の国民年金窓口 または マイナポータル（電子申請）"
  },

  // ■ フェーズ4：給付・申請
  {
    id: "demand_separation_notice",
    phase: 4,
    conditions: { nextJob: ["no", "undecided"] },
    relativeDays: 10,
    deadlineRule: "strict",
    type: "procedure",
    title: "雇用保険手続きに必要な「離職票」の到着確認",
    description: "退職後10日〜14日程度経過しても離職票が届かない場合、所轄のハローワークでの雇用保険手続き（求職の申し込み）が開始できません。（※申請のタイミングにより、受給開始時期や総額に大きな差が出る仕組みになっています）",
    lossWarning: "【留意点】書類の受領が遅れることで、失業手当の受給開始時期も連動して遅れることになります。",
    benefitInfo: null,
    actionPlace: "必要に応じた元勤務先への確認連絡"
  },
  {
    id: "apply_unemployment_benefit",
    phase: 4,
    conditions: { healthCondition: false, nextJob: ["no", "undecided"] },
    relativeDays: 15,
    deadlineRule: "helloWork",
    type: "procedure",
    title: "ハローワークでの「求職の申し込み」手続き",
    description: "離職票を受領後、管轄のハローワークにて雇用保険の受給手続きを行います。（※申請のタイミングにより、受給開始時期や総額に大きな差が出る仕組みになっています）※原則として、少額でも『給与・報酬が発生する行為』はすべて出勤扱いまたは受給対象外と判断される可能性があります。",
    lossWarning: "【留意点】手続きの開始が遅れると、給付金の受け取りもその分遅くなります。",
    benefitInfo: null,
    actionPlace: "管轄のハローワーク"
  },
  {
    id: "health_condition_backup",
    phase: 4,
    conditions: { healthCondition: true, nextJob: ["no", "undecided"] },
    relativeDays: 31,
    deadlineRule: "nextBusinessDay",
    type: "procedure",
    title: "雇用保険の「受給期間の延長申請」の検討",
    description: "傷病手当金が認定されなかった場合や、体調が回復した場合に備え、ハローワークで受給期間（通常1年）を最長3年延長する手続きを行っておくことが推奨されます。（※この期限を過ぎると手続きできなくなります）",
    lossWarning: "【リスク】延長手続きを行わずに通常の受給期間（1年）が経過した場合、雇用保険の基本手当を受給できなくなる可能性があります。",
    benefitInfo: "【メリット】療養期間が長期化しても、要件を満たした際に受給できる権利を保持できます。",
    actionPlace: "管轄のハローワーク（郵送や電子申請も可）"
  },
  {
    id: "freelance_open_notification",
    phase: 4,
    conditions: { freelance: true, nextJob: ["no", "undecided"] },
    relativeDays: 45,
    deadlineRule: "postmarkValid",
    type: "procedure",
    title: "再就職手当の要件を考慮した「開業日」の確認",
    description: "独立・起業により雇用保険から「再就職手当」を受給する場合、自己都合退職による「給付制限」期間中に事業を開始（開業届の提出等）すると支給の対象外となります。（※この期限を過ぎると手続きできなくなります）",
    lossWarning: "【留意点】開業届の提出日や事業開始日が制限期間内に含まれていると、受給要件を満たさないためご注意ください。",
    benefitInfo: "【要件確認】制限期間の経過後に開業手続きを行うことで、再就職手当申請の第一段階をクリアできます。",
    actionPlace: "税務署（開業届） および ハローワーク"
  },

  // ■ フェーズ5：長期・事後処理
  {
    id: "tax_return_preparation",
    phase: 5,
    conditions: { nextJob: ["no", "undecided"] },
    relativeDays: 60,
    deadlineRule: "strict",
    type: "procedure",
    title: "翌年の確定申告に向けた準備",
    description: "年内に再就職しなかった場合は年末調整が行われないため、ご自身での確定申告が必要になります。源泉徴収票など証明となる書類を大切に保管しておいてください。（※給与から天引きされた税金は、自身で申告しない限り戻ってきません）",
    lossWarning: "【留意点】確定申告を行うことで、在職中に納めていた所得税が還付される可能性がありますが、申告しないと還付されません。",
    benefitInfo: "【メリット】手続きを行うことで、控除に基づいた還付金を受け取れる可能性があります。",
    actionPlace: "翌年2月〜：国税庁ウェブサイト または 管轄の税務署"
  }
];
