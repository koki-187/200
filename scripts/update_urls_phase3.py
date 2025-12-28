#!/usr/bin/env python3
"""
Phase 3-1: URL補完スクリプト
千葉県と埼玉県のdata_source_urlをUPDATE文で更新
"""

import re

def extract_url_from_sql(sql_file):
    """SQLファイルからcity, data_source_urlを抽出"""
    url_map = {}
    
    with open(sql_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # INSERT OR REPLACE文からcityとdata_source_urlを抽出
    pattern = r"VALUES\s*\('([^']+)',\s*'([^']+)',\s*'[^']*',\s*'[^']*',\s*'[^']*',\s*'([^']*)',\s*'[^']*',\s*'VERIFIED'"
    matches = re.findall(pattern, content)
    
    for match in matches:
        prefecture = match[0]
        city = match[1]
        url = match[2]
        if url and url.strip():
            url_map[city] = url
    
    return url_map

def generate_update_sql(prefecture, url_map):
    """UPDATE SQLを生成"""
    sql_statements = []
    sql_statements.append(f"-- Phase 3-1: {prefecture}のURL補完")
    sql_statements.append(f"-- 対象: {len(url_map)}自治体")
    sql_statements.append("")
    
    for city, url in sorted(url_map.items()):
        # エスケープ処理
        city_escaped = city.replace("'", "''")
        url_escaped = url.replace("'", "''")
        
        sql = f"UPDATE building_regulations SET data_source_url = '{url_escaped}' WHERE prefecture = '{prefecture}' AND city = '{city_escaped}' AND verification_status = 'VERIFIED';"
        sql_statements.append(sql)
    
    return "\n".join(sql_statements)

def main():
    print("Phase 3-1: URL補完スクリプト実行中...")
    print()
    
    # 千葉県のURL抽出
    print("千葉県のURL情報を抽出中...")
    chiba_urls = extract_url_from_sql('scripts/chiba_27_municipalities_complete.sql')
    print(f"  抽出完了: {len(chiba_urls)}自治体")
    
    # 埼玉県のURL抽出
    print("埼玉県のURL情報を抽出中...")
    saitama_urls = extract_url_from_sql('scripts/saitama_37_municipalities_complete.sql')
    print(f"  抽出完了: {len(saitama_urls)}自治体")
    
    print()
    print("UPDATE SQL文を生成中...")
    
    # UPDATE SQL生成
    update_sql = []
    update_sql.append("-- Phase 3-1: URL補完UPDATE文")
    update_sql.append("-- 作成日時: 2025-12-28")
    update_sql.append("-- 対象: 千葉県27自治体 + 埼玉県37自治体")
    update_sql.append("")
    
    # 千葉県
    update_sql.append(generate_update_sql('千葉県', chiba_urls))
    update_sql.append("")
    
    # 埼玉県
    update_sql.append(generate_update_sql('埼玉県', saitama_urls))
    
    # ファイル出力
    output_file = 'scripts/update_urls_phase3.sql'
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write('\n'.join(update_sql))
    
    print(f"  生成完了: {output_file}")
    print()
    print("サマリ:")
    print(f"  千葉県: {len(chiba_urls)}自治体")
    print(f"  埼玉県: {len(saitama_urls)}自治体")
    print(f"  合計: {len(chiba_urls) + len(saitama_urls)}自治体")
    print()
    print("次のステップ:")
    print(f"  npx wrangler d1 execute real-estate-200units-db --remote --file={output_file}")

if __name__ == '__main__':
    main()
