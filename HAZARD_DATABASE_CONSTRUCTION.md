# ハザード情報データベース構築ドキュメント

## 📚 プロジェクト概要

**プロジェクト名**: 200棟土地仕入れ管理システム - ハザード情報データベース  
**バージョン**: v3.153.123（NG条件強化版）  
**最終更新**: 2025-12-17  
**目的**: 一都三県の全ハザード情報をローカルD1データベースに構築し、融資NG条件を厳格に適用

---

## 🎯 実装方針の変更履歴

### **v3.153.121**: 初期実装
- リスクチェックボタン廃止
- ローカルDBからハザード情報自動表示
- 7つの融資NG条件を定義

### **v3.153.122**: 柔軟化（後に取り止め）
- NG条件を「要調査」扱いに柔軟化
- 調査指示を自動生成
- 備考欄必須化

### **v3.153.123**: NG条件強化（現行版）
- **方針転換**: NG条件緩和を取り止め
- **完全NG扱い**: 該当物件は案件作成不可
- **説明文統一**: 金融機関の判断基準に基づく明確な説明

---

## 🚫 7つの融資NG条件（厳格版）

| No. | NG条件 | 説明文（金融機関基準） |
|-----|--------|---------------------|
| 1 | **市街化調整区域** | 市街化を抑制すべき区域のため、原則として建築が制限されます |
| 2 | **防火地域** | 建築コストが高くなるため、対象外としています |
| 3 | **崖地域** | 地盤の安定性や擁壁工事費用の問題から、対象外としています |
| 4 | **10m以上の浸水** | 浸水想定区域（10m以上）は融資制限の対象となります |
| 5 | **ハザードマップ** | 土砂災害警戒区域・特別警戒区域は金融機関融資NGとなります |
| 6 | **河川隣接** | 河川に隣接する土地は洪水リスクが高く、対象外としています |
| 7 | **家屋倒壊エリア** | 家屋倒壊等氾濫想定区域は融資制限の対象となります |

---

## 🗄️ データベース構造

### **1. hazard_info テーブル**
```sql
CREATE TABLE hazard_info (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  prefecture TEXT NOT NULL,              -- 都道府県
  city TEXT NOT NULL,                    -- 市区町村
  hazard_type TEXT NOT NULL,             -- flood/landslide/tsunami/liquefaction
  risk_level TEXT NOT NULL,              -- high/medium/low/none
  description TEXT,                      -- リスク説明
  affected_area TEXT,                    -- 影響範囲
  data_source TEXT,                      -- データソース
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
);
```
**推定レコード数**: 5,000件（212市区町村 × 4種類 × 平均6エリア）

### **2. zoning_restrictions テーブル**
```sql
CREATE TABLE zoning_restrictions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  prefecture TEXT NOT NULL,
  city TEXT NOT NULL,
  is_urbanization_control_area INTEGER DEFAULT 0,  -- 市街化調整区域
  urbanization_note TEXT,
  is_fire_prevention_area INTEGER DEFAULT 0,       -- 0:なし/1:防火/2:準防火
  fire_prevention_note TEXT,
  loan_decision TEXT DEFAULT 'OK',                 -- OK/NG
  loan_reason TEXT
);
```
**推定レコード数**: 500件（212市区町村 × 平均2-3エリア）

### **3. geography_risks テーブル**
```sql
CREATE TABLE geography_risks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  prefecture TEXT NOT NULL,
  city TEXT NOT NULL,
  district TEXT,
  is_cliff_area INTEGER DEFAULT 0,                 -- 崖地域
  cliff_height REAL,
  cliff_note TEXT,
  is_river_adjacent INTEGER DEFAULT 0,             -- 河川隣接
  river_name TEXT,
  river_distance REAL,
  is_building_collapse_area INTEGER DEFAULT 0,     -- 家屋倒壊エリア
  collapse_type TEXT,                               -- 氾濫流/河岸侵食
  max_flood_depth REAL,                            -- 最大浸水深
  is_over_10m_flood INTEGER DEFAULT 0,             -- 10m以上浸水
  loan_decision TEXT DEFAULT 'OK',                 -- OK/NG
  loan_reason TEXT
);
```
**推定レコード数**: 30,000件（高リスクエリアの詳細データ）

### **4. loan_restrictions テーブル**
```sql
CREATE TABLE loan_restrictions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  prefecture TEXT NOT NULL,
  city TEXT NOT NULL,
  restriction_type TEXT NOT NULL,                  -- flood_restricted/landslide_restricted
  is_restricted INTEGER DEFAULT 0,
  restriction_details TEXT,
  data_source TEXT
);
```

---

## 📊 対象エリア（一都三県）

### **東京都（62市区町村）**
- **23区**: 千代田区、中央区、港区、新宿区、文京区、台東区、墨田区、江東区、品川区、目黒区、大田区、世田谷区、渋谷区、中野区、杉並区、豊島区、北区、荒川区、板橋区、練馬区、足立区、葛飾区、江戸川区
- **市部**: 八王子市、立川市、武蔵野市、三鷹市、青梅市、府中市、昭島市、調布市、町田市、小金井市、小平市、日野市、東村山市、国分寺市、国立市、福生市、狛江市、東大和市、清瀬市、東久留米市、武蔵村山市、多摩市、稲城市、羽村市、あきる野市、西東京市
- **郡部**: 西多摩郡（瑞穂町、日の出町、檜原村、奥多摩町）、島嶼部等

### **神奈川県（33市町村）**
- **横浜市（18区）**: 鶴見区、神奈川区、西区、中区、南区、保土ケ谷区、磯子区、金沢区、港北区、戸塚区、港南区、旭区、緑区、瀬谷区、栄区、泉区、青葉区、都筑区
- **川崎市（7区）**: 川崎区、幸区、中原区、高津区、多摩区、宮前区、麻生区
- **その他市**: 相模原市、横須賀市、平塚市、鎌倉市、藤沢市、小田原市、茅ヶ崎市、逗子市、三浦市、秦野市、厚木市、大和市、伊勢原市、海老名市、座間市、南足柄市、綾瀬市
- **郡部**: 三浦郡（葉山町）、高座郡（寒川町）、中郡（大磯町、二宮町）、足柄上郡（中井町、大井町、松田町、山北町、開成町）、足柄下郡（箱根町、真鶴町、湯河原町）、愛甲郡（愛川町、清川村）

### **埼玉県（63市町村）**
- **さいたま市（10区）**: 西区、北区、大宮区、見沼区、中央区、桜区、浦和区、南区、緑区、岩槻区
- **その他市**: 川越市、熊谷市、川口市、行田市、秩父市、所沢市、飯能市、加須市、本庄市、東松山市、春日部市、狭山市、羽生市、鴻巣市、深谷市、上尾市、草加市、越谷市、蕨市、戸田市、入間市、朝霞市、志木市、和光市、新座市、桶川市、久喜市、北本市、八潮市、富士見市、三郷市、蓮田市、坂戸市、幸手市、鶴ヶ島市、日高市、吉川市、ふじみ野市、白岡市
- **郡部**: 北足立郡（伊奈町）、入間郡（三芳町、毛呂山町、越生町）、比企郡（滑川町、嵐山町、小川町、川島町、吉見町、鳩山町、ときがわ町）、秩父郡（横瀬町、皆野町、長瀞町、小鹿野町）、児玉郡（美里町、神川町、上里町）、大里郡（寄居町）、南埼玉郡（宮代町）、北葛飾郡（杉戸町、松伏町）

### **千葉県（54市町村）**
- **千葉市（6区）**: 中央区、花見川区、稲毛区、若葉区、緑区、美浜区
- **その他市**: 銚子市、市川市、船橋市、館山市、木更津市、松戸市、野田市、茂原市、成田市、佐倉市、東金市、旭市、習志野市、柏市、勝浦市、市原市、流山市、八千代市、我孫子市、鴨川市、鎌ケ谷市、君津市、富津市、浦安市、四街道市、袖ケ浦市、八街市、印西市、白井市、富里市、南房総市、匝瑳市、香取市、山武市、いすみ市、大網白里市
- **郡部**: 印旛郡（酒々井町、栄町）、香取郡（神崎町、多古町、東庄町）、山武郡（九十九里町、芝山町、横芝光町）、長生郡（一宮町、睦沢町、長生村、白子町、長柄町、長南町）、夷隅郡（大多喜町、御宿町）、安房郡（鋸南町）

**合計**: 212市区町村

---

## 🔄 データ収集フロー

### **Phase 1: 国交省API経由でのデータ収集**
```javascript
// scripts/collect-hazard-data.js
// 1. 市区町村リストを読み込み
// 2. 各市区町村について国交省APIを呼び出し
// 3. ハザード情報を取得（洪水、土砂災害、津波、液状化）
// 4. D1データベースに投入
```

### **Phase 2: ファクトチェック**
```javascript
// scripts/fact-check.js
// 1. 複数データソース（国交省、都道府県、市区町村）からデータ取得
// 2. データの矛盾を検出
// 3. confidence_level を設定（high/medium/low）
// 4. 矛盾データは手動確認リストに追加
```

### **Phase 3: データ投入**
```sql
-- migrations/0034_hazard_data.sql
-- 1. 収集済みデータを一括INSERT
-- 2. インデックス最適化
-- 3. データ整合性チェック
```

---

## 🚀 API仕様

### **GET /api/hazard-db/info?address={住所}**

**リクエスト例**:
```
GET /api/hazard-db/info?address=東京都渋谷区恵比寿1-1-1
```

**レスポンス例（NG条件該当時）**:
```json
{
  "success": true,
  "data": {
    "location": {
      "prefecture": "東京都",
      "city": "渋谷区",
      "address": "東京都渋谷区恵比寿1-1-1"
    },
    "hazards": [
      {
        "type": "flood",
        "type_name": "洪水浸水想定",
        "risk_level": "high",
        "risk_level_text": "高リスク",
        "description": "荒川氾濫時、3.0～5.0mの浸水が想定されます",
        "affected_area": "恵比寿駅周辺エリア",
        "data_source": "国土交通省ハザードマップ"
      }
    ],
    "loan": {
      "judgment": "NG",
      "judgment_text": "融資不可（金融機関基準）",
      "ng_conditions": [
        {
          "type": "urbanization_control",
          "name": "市街化調整区域",
          "description": "市街化を抑制すべき区域のため、原則として建築が制限されます"
        },
        {
          "type": "fire_prevention",
          "name": "防火地域",
          "description": "建築コストが高くなるため、対象外としています"
        }
      ],
      "restrictions": {
        "zoning": [...],
        "geography": [...]
      }
    },
    "note": "⚠️ この物件は融資NG条件に該当するため、案件作成はできません。",
    "timestamp": "2025-12-17T19:30:00.000Z"
  }
}
```

---

## 📝 フロントエンド実装

### **ハザード情報の表示（global-functions.js）**
```javascript
// v3.153.123: NG条件厳格化
function displayHazardInfo(hazardData) {
  const { loan } = hazardData;
  
  if (loan.judgment === 'NG') {
    // 赤色の完全NGバナー表示
    // NG条件を画像の説明文で表示
    // 案件作成ボタンを無効化
    window._loanDecisionNG = true;
  }
}
```

### **案件作成時のバリデーション（index.tsx）**
```javascript
// v3.153.123: 融資NG時は案件作成不可
if (window._loanDecisionNG) {
  showMessage('この物件は融資NG条件に該当するため、案件作成はできません。', 'error');
  return;  // 案件作成を中止
}
```

---

## 🎯 今後の拡張予定

### **Phase 4: 追加データベース**
1. **条例データベース**: 駐車場附置義務、ワンルーム規制
2. **収支計算DB**: 賃料相場、建築費、融資基準
3. **買主別基準DB**: Felix、GA Technologies等の判定基準

### **Phase 5: 高度な分析機能**
1. **P/L計算**: 利回り自動計算（>6.5%）
2. **市場価格評価**: 5段階評価（大幅割安～大幅割高）
3. **融資適合性判定**: オリックス（>7%）、スルガ（>8%）

---

## 📚 参考資料

- 国土交通省ハザードマップポータルサイト: https://disaportal.gsi.go.jp/
- 国土交通省不動産情報ライブラリ: https://www.reinfolib.mlit.go.jp/
- MLIT API仕様書: 内部資料参照

---

**最終更新者**: AI Assistant  
**最終更新日**: 2025-12-17  
**ドキュメントバージョン**: v1.0.0
