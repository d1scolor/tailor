PRAGMA foreign_keys = ON;

UPDATE cloths
SET purpose = CASE purpose
  WHEN '服装' THEN 'garment'
  WHEN '手工' THEN 'craft'
  ELSE purpose
END;

UPDATE patterns
SET pattern_type = CASE pattern_type
  WHEN '纸质' THEN 'paper'
  WHEN '电子' THEN 'digital'
  ELSE pattern_type
END;

UPDATE tools
SET condition = CASE condition
  WHEN '正常' THEN 'good'
  WHEN '需维护' THEN 'maintenance'
  WHEN '已损坏' THEN 'broken'
  WHEN '已停用' THEN 'retired'
  ELSE condition
END;
