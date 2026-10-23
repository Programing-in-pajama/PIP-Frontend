// 성분 이름 목록 ("암로디핀+로사르탄" → ['암로디핀', '로사르탄'])
export const getIngredients = (medication) =>
  (medication?.ingredientName ?? '').split('+').map((name) => name.trim()).filter(Boolean);

// 복용 약물 중 같은 성분이 2개 이상 약물에 들어 있는 경우를 찾아요.
// 반환: [{ ingredient: '암로디핀', medications: [약물, 약물] }, ...]
export function findDuplicateIngredients(medications = []) {
  const byIngredient = new Map();
  for (const medication of medications) {
    for (const ingredient of getIngredients(medication)) {
      if (!byIngredient.has(ingredient)) byIngredient.set(ingredient, []);
      byIngredient.get(ingredient).push(medication);
    }
  }
  return [...byIngredient]
    .filter(([, list]) => list.length > 1)
    .map(([ingredient, list]) => ({ ingredient, medications: list }));
}
