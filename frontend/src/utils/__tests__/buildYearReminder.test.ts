import { hasBuildingAgeInComment, shouldRemindBuildYear } from '../buildYearReminder';

describe('site S building year reminder', () => {
  test.each([
    '★築後年数:築後5年くらい',
    '築後年数\t築後17年くらい',
    '築後 ３０ 年くらい',
  ])('recognizes building age in %s', (comment) => {
    expect(hasBuildingAgeInComment(comment)).toBe(true);
    expect(shouldRemindBuildYear('S', comment, null)).toBe(true);
  });

  test.each(['★築後年数:', '築後年数：', '新築も視野', '築年数:15年', ''])
    ('does not alert for missing or unrelated building age: %s', (comment) => {
      expect(shouldRemindBuildYear('S', comment, null)).toBe(false);
    });

  it('only applies to site S and disappears when the year is entered', () => {
    const comment = '築後年数:築後5年くらい';
    expect(shouldRemindBuildYear('L', comment, null)).toBe(false);
    expect(shouldRemindBuildYear('S', comment, 2021)).toBe(false);
    expect(shouldRemindBuildYear('S', comment, '2021')).toBe(false);
    expect(shouldRemindBuildYear('S', comment, '   ')).toBe(true);
  });
});
