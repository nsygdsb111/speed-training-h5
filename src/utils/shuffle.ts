export const shuffle = <T>(items: readonly T[]): T[] => {
  const result = [...items];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[randomIndex]] = [result[randomIndex], result[index]];
  }

  return result;
};

export const createQuestionQueue = <T>(items: readonly T[], targetCount?: number): T[] => {
  if (items.length === 0) {
    return [];
  }

  if (!targetCount) {
    return shuffle(items);
  }

  const queue: T[] = [];
  while (queue.length < targetCount) {
    queue.push(...shuffle(items));
  }

  return queue.slice(0, targetCount);
};
