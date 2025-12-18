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
    // 東京都市部
    /^(東京都)([^市]+市)/,
    
    // 神奈川県の政令指定都市（横浜市・川崎市・相模原市の区）
    /^(神奈川県)(横浜市[^区]+区)/,
    /^(神奈川県)(川崎市[^区]+区)/,
    /^(神奈川県)(相模原市[^区]+区)/,
    // 神奈川県の市
    /^(神奈川県)([^市]+市)/,
    /^(神奈川県)([^郡]+郡[^町]+町)/,
    
    // 埼玉県の政令指定都市（さいたま市の区）
    /^(埼玉県)(さいたま市[^区]+区)/,
    // 埼玉県の市
    /^(埼玉県)([^市]+市)/,
    /^(埼玉県)([^郡]+郡[^町]+町)/,
    
    // 千葉県の政令指定都市（千葉市の区）
    /^(千葉県)(千葉市[^区]+区)/,
    // 千葉県の市
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
