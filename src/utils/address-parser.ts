/**
 * 住所解析ユーティリティ
 * v3.153.131 - 詳細住所（〇丁目・〇番地・〇号）の解析対応
 */

export interface ParsedAddress {
  prefecture: string;    // 都道府県
  city: string;          // 市区町村
  district?: string;     // 地区（任意）
  chome?: string;        // 丁目（任意）
  banchi?: number;       // 番地（任意）
  go?: number;           // 号（任意）
  full: string;          // 完全住所
}

/**
 * 住所から都道府県・市区町村・詳細住所を抽出
 * v3.153.131 - 〇丁目・〇番地・〇号レベルの解析対応
 */
export function parseDetailedAddress(address: string): ParsedAddress | null {
  // 一都三県のパターン（優先度順）
  const patterns = [
    // 東京都23区
    /^(東京都)([^市]+区)/,
    // 東京都市部（特定の市名を優先マッチ）
    /^(東京都)(立川市|武蔵野市|三鷹市|青梅市|府中市|昭島市|調布市|町田市|小金井市|小平市|日野市|東村山市|国分寺市|国立市|福生市|狛江市|東大和市|清瀬市|東久留米市|武蔵村山市|多摩市|稲城市|羽村市|あきる野市|西東京市)/,
    /^(東京都)([^市]+市)/,
    
    // 神奈川県の政令指定都市（横浜市・川崎市・相模原市の区）
    /^(神奈川県)(横浜市[^区]+区)/,
    /^(神奈川県)(川崎市[^区]+区)/,
    /^(神奈川県)(相模原市[^区]+区)/,
    // 神奈川県の市（特定の市名を優先マッチ）
    /^(神奈川県)(横須賀市|鎌倉市|逗子市|三浦市|葉山町|平塚市|藤沢市|茅ヶ崎市|寒川町|大磯町|二宮町|小田原市|秦野市|伊勢原市|南足柄市|中井町|大井町|松田町|山北町|開成町|箱根町|真鶴町|湯河原町|愛川町|清川村|厚木市|大和市|海老名市|座間市|綾瀬市|相模原市)/,
    /^(神奈川県)([^市]+市)/,
    /^(神奈川県)([^郡]+郡[^町]+町)/,
    
    // 埼玉県の政令指定都市（さいたま市の区）
    /^(埼玉県)(さいたま市[^区]+区)/,
    // 埼玉県の市（特定の市名を優先マッチ）
    /^(埼玉県)(川口市|蕨市|戸田市|朝霞市|志木市|和光市|新座市|富士見市|ふじみ野市|三郷市|八潮市|草加市|越谷市|春日部市|上尾市|桶川市|北本市|鴻巣市|行田市|熊谷市|深谷市|本庄市|東松山市|坂戸市|鶴ヶ島市|川越市|所沢市|飯能市|狭山市|入間市|日高市|秩父市|羽生市|加須市|久喜市|蓮田市|幸手市|白岡市|吉川市|さいたま市)/,
    /^(埼玉県)([^市]+市)/,
    /^(埼玉県)([^郡]+郡[^町]+町)/,
    
    // 千葉県の政令指定都市（千葉市の区）
    /^(千葉県)(千葉市[^区]+区)/,
    // 千葉県の市（特定の市名を優先マッチ、市川市を明示）
    /^(千葉県)(千葉市|市川市|船橋市|松戸市|野田市|茂原市|成田市|佐倉市|東金市|旭市|習志野市|柏市|勝浦市|市原市|流山市|八千代市|我孫子市|鴨川市|鎌ケ谷市|君津市|富津市|浦安市|四街道市|袖ケ浦市|八街市|印西市|白井市|富里市|南房総市|匝瑳市|香取市|山武市|いすみ市|大網白里市)/,
    /^(千葉県)([^市]+市)/,
    /^(千葉県)([^郡]+郡[^町]+町)/,
  ];

  let prefecture = '';
  let city = '';
  let remainingAddress = address;

  // 都道府県・市区町村を抽出
  for (const pattern of patterns) {
    const match = address.match(pattern);
    if (match) {
      prefecture = match[1];
      city = match[2];
      remainingAddress = address.substring(prefecture.length + city.length);
      break;
    }
  }

  if (!prefecture || !city) {
    return null;
  }

  // 詳細住所の抽出
  const result: ParsedAddress = {
    prefecture,
    city,
    full: address,
  };

  // 地区（町名）を抽出（例: "小岩", "千住", "赤塚"）
  const districtMatch = remainingAddress.match(/^([^0-9０-９一二三四五六七八九十丁目]+)/);
  if (districtMatch) {
    result.district = districtMatch[1];
    remainingAddress = remainingAddress.substring(result.district.length);
  }

  // 丁目を抽出（例: "1丁目", "2丁目"）
  const chomeMatch = remainingAddress.match(/^([0-9０-９一二三四五六七八九十]+)丁目/);
  if (chomeMatch) {
    result.chome = chomeMatch[1] + '丁目';
    remainingAddress = remainingAddress.substring(result.chome.length);
  }

  // 番地を抽出（例: "1-10", "1番地10号"）
  const banchiMatch = remainingAddress.match(/^([0-9０-９]+)/);
  if (banchiMatch) {
    result.banchi = parseInt(banchiMatch[1].replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0)));
  }

  // 号を抽出（例: "-10", "番地10号"）
  const goMatch = remainingAddress.match(/[-ー－]([0-9０-９]+)/);
  if (goMatch) {
    result.go = parseInt(goMatch[1].replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0)));
  }

  return result;
}

/**
 * 住所から都道府県・市区町村のみを抽出（互換性維持）
 */
export function parseAddress(address: string): { prefecture: string; city: string } | null {
  const parsed = parseDetailedAddress(address);
  if (!parsed) {
    return null;
  }
  return {
    prefecture: parsed.prefecture,
    city: parsed.city,
  };
}
