/** SUUMO（サイト S）のコメントに築後年数の具体的な回答があるか。 */
export const hasBuildingAgeInComment = (comments?: string | null): boolean => {
  if (!comments) return false;
  return /築後\s*[0-9０-９]+\s*年/.test(comments);
};

export const shouldRemindBuildYear = (
  site: string | null | undefined,
  comments: string | null | undefined,
  buildYear: number | string | null | undefined,
): boolean =>
  site?.trim() === 'S' &&
  (buildYear == null || String(buildYear).trim() === '') &&
  hasBuildingAgeInComment(comments);
