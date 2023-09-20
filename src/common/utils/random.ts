export const getRandomNumbersFromArray = (arr: number[], count: number): number[] => {
  const result: number[] = [];

  if (count >= arr.length) {
    return arr;
  }

  while (result.length < count) {
    const randomIndex = Math.floor(Math.random() * arr.length);
    const randomNumber = arr[randomIndex];

    if (!result.includes(randomNumber)) {
      result.push(randomNumber);
    }
  }

  return result;
};

export const getRandomNumber = (length: number): number => {
  return Math.floor(Math.random() * length);
};

export const getRandomValueWithCustomProbabilities = (a: number, b: number, c: number, d: number): number => {
  if (a < 0 || b < 0 || c < 0 || d < 0 || a + b + c + d !== 100) {
    throw new Error("Invalid probabilities. Probabilities must be non-negative and sum up to 100.");
  }

  const randomValue = Math.random();

  if (randomValue < a) {
    return 0;
  } else if (randomValue < a + b) {
    return 1;
  } else if (randomValue < a + b + c) {
    return 2;
  } else {
    return 3;
  }
};

export const getRandomsValueWithCustomProbabilities = (n: number, a: number, b: number, c: number, d: number): number[] => {
  if (a < 0 || b < 0 || c < 0 || d < 0 || a + b + c + d !== 100) {
    throw new Error("Invalid probabilities. Probabilities must be non-negative and sum up to 100.");
  }

  const results: number[] = [];
  for (let i = 0; i < n; i++) {
    const randomValue = Math.random();

    if (randomValue < a) {
      results.push(0);
    } else if (randomValue < a + b) {
      results.push(1);
    } else if (randomValue < a + b + c) {
      results.push(2);
    } else {
      results.push(3);
    }
  }
  return results;
};

export const getRandomUniqueNumbersFromArray = (arr: number[], n: number): number[] => {
  if (n > arr.length) {
    throw new Error('Cannot select more unique numbers than available in the array.');
  }

  const result: number[] = [];
  const shuffledArray = [...arr];

  for (let i = 0; i < n; i++) {
    const randomIndex = Math.floor(Math.random() * shuffledArray.length);
    const selectedNumber = shuffledArray.splice(randomIndex, 1)[0];
    result.push(selectedNumber);
  }

  return result;
}


