-- Check employee initials
SELECT 
  name,
  email,
  initials,
  is_active
FROM employees
WHERE is_active = true
ORDER BY name;
