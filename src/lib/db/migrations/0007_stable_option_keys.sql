PRAGMA foreign_keys = ON;

UPDATE cloths
SET material_type = CASE material_type
  WHEN '棉' THEN 'cotton'
  WHEN '亚麻' THEN 'linen'
  WHEN '羊毛' THEN 'wool'
  WHEN '丝绸' THEN 'silk'
  WHEN '粘胶' THEN 'viscose'
  WHEN '聚酯纤维' THEN 'polyester'
  WHEN '尼龙' THEN 'nylon'
  WHEN '牛仔布' THEN 'denim'
  WHEN '帆布' THEN 'canvas'
  WHEN '针织' THEN 'knit'
  WHEN '法兰绒' THEN 'flannel'
  WHEN '皮革' THEN 'leather'
  WHEN '混纺' THEN 'blend'
  WHEN '其他' THEN 'other'
  ELSE material_type
END;

UPDATE tools
SET category = CASE category
  WHEN '剪裁工具' THEN 'cutting'
  WHEN '测量工具' THEN 'measuring'
  WHEN '缝纫机配件' THEN 'sewingMachineAccessories'
  WHEN '手缝工具' THEN 'handSewing'
  WHEN '熨烫工具' THEN 'pressing'
  WHEN '标记工具' THEN 'marking'
  WHEN '收纳工具' THEN 'storage'
  WHEN '维修保养' THEN 'maintenance'
  WHEN '其他' THEN 'other'
  ELSE category
END;
