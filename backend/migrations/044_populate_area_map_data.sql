-- Populate initial area map configuration data
-- This includes area numbers ①-⑮ with Google Maps URLs and city-wide areas ㊵, ㊶

INSERT INTO area_map_config (area_number, google_map_url, city_name, is_active) VALUES
  ('①', 'https://maps.app.goo.gl/6SUp2oApoATE4R336', NULL, true),
  ('②', 'https://maps.app.goo.gl/3tXJJ3zPDhAXnxJk9', NULL, true),
  ('③', 'https://maps.app.goo.gl/9CvuwKdgGCpM7kiT7', NULL, true),
  ('④', 'https://maps.app.goo.gl/FAh59DdyR3Xrpn2d7', NULL, true),
  ('⑤', NULL, NULL, false), -- Not specified in requirements
  ('⑥', 'https://maps.app.goo.gl/LWcdvysji8MzrC4a6', NULL, true),
  ('⑦', 'https://maps.app.goo.gl/s5RNPErktbAB3xxs7', NULL, true),
  ('⑧', 'https://maps.app.goo.gl/4UJ6Dcfniv5HnJV67', NULL, true),
  ('⑨', 'https://maps.app.goo.gl/RFxMmCWuqNBw1UR87', NULL, true),
  ('⑩', 'https://maps.app.goo.gl/LQrdiaZjij6R69fx9', NULL, true),
  ('⑪', 'https://maps.app.goo.gl/Lia3s1spu2giyaBJ9', NULL, true),
  ('⑫', 'https://maps.app.goo.gl/qkaDsYW4HFpx9x8x9', NULL, true),
  ('⑬', 'https://maps.app.goo.gl/hPndBk6HxPvdfFBz9', NULL, true),
  ('⑭', 'https://maps.app.goo.gl/ZWYbTxb2Dnq6B6ka8', NULL, true),
  ('⑮', 'https://maps.app.goo.gl/rAMak435w8Q33qJo8', NULL, true),
  ('㊵', NULL, '大分市', true), -- City-wide: All of Oita City
  ('㊶', NULL, '別府市', true)  -- City-wide: All of Beppu City
ON CONFLICT (area_number) DO NOTHING;

-- Verify data insertion
DO $$
DECLARE
  record_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO record_count FROM area_map_config WHERE is_active = true;
  RAISE NOTICE 'Inserted % active area map configurations', record_count;
END $$;
