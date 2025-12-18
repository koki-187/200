SELECT 
  prefecture || ' ' || city AS location,
  verification_status,
  confidence_level,
  COALESCE(development_guideline, 'なし') AS guideline,
  CASE 
    WHEN development_guideline_url IS NOT NULL AND development_guideline_url != '' THEN 'URL有'
    ELSE 'URL無'
  END AS url_status,
  CASE apartment_construction_feasible
    WHEN 0 THEN 'NG'
    WHEN 1 THEN 'OK'
    ELSE '未設定'
  END AS apartment_status
FROM building_regulations 
WHERE verification_status = 'VERIFIED'
ORDER BY prefecture, city;
