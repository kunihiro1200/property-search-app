-- Migration 024: スタッフのイニシャルを修正
-- KK → K, YY → Y のように修正

UPDATE employees SET initials = 'K' WHERE email = 'tomoko.kunihiro@ifoo-oita.com';
UPDATE employees SET initials = 'Y' WHERE email = 'yuuko.yamamoto@ifoo-oita.com';
UPDATE employees SET initials = 'I' WHERE email = 'hiromitsu-kakui@ifoo-oita.com';
UPDATE employees SET initials = 'U' WHERE email = 'tenma.ura@ifoo-oita.com';
UPDATE employees SET initials = 'R' WHERE email = 'yurine.kimura@ifoo-oita.com';
UPDATE employees SET initials = 'H' WHERE email = 'naomi.hirose@ifoo-oita.com';
-- 生、久、事務、業者はそのまま
