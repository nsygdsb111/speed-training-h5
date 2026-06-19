import type { Question } from '../types';

const toHalfWidth = (value: string) =>
  value.replace(/[！-～]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0));

export const normalizeAnswer = (value: string) =>
  toHalfWidth(value)
    .trim()
    .replace(/\s+/g, '')
    .replace(/％/g, '%')
    .toLowerCase();

const gcd = (a: number, b: number): number => {
  const absA = Math.abs(a);
  const absB = Math.abs(b);

  if (absB === 0) {
    return absA;
  }

  return gcd(absB, absA % absB);
};

const parseFraction = (value: string) => {
  const match = normalizeAnswer(value).match(/^(-?\d+)\/(-?\d+)$/);

  if (!match) {
    return null;
  }

  const numerator = Number(match[1]);
  const denominator = Number(match[2]);

  if (!Number.isInteger(numerator) || !Number.isInteger(denominator) || denominator === 0) {
    return null;
  }

  const sign = denominator < 0 ? -1 : 1;
  const divisor = gcd(numerator, denominator);

  return {
    numerator: (numerator / divisor) * sign,
    denominator: Math.abs(denominator / divisor),
  };
};

const parseNumeric = (value: string) => {
  const normalized = normalizeAnswer(value);
  const withoutPercent = normalized.endsWith('%') ? normalized.slice(0, -1) : normalized;

  if (!/^-?(?:\d+\.?\d*|\.\d+)$/.test(withoutPercent)) {
    return null;
  }

  const number = Number(withoutPercent);
  if (!Number.isFinite(number)) {
    return null;
  }

  return normalized.endsWith('%') ? number / 100 : number;
};

const isDecimalAnswer = (value: string) => normalizeAnswer(value).replace(/%$/, '').includes('.');

const fractionToNumber = (fraction: NonNullable<ReturnType<typeof parseFraction>>) =>
  fraction.numerator / fraction.denominator;

const areEquivalentAnswers = (expected: string, actual: string) => {
  const normalizedExpected = normalizeAnswer(expected);
  const normalizedActual = normalizeAnswer(actual);

  if (normalizedExpected === normalizedActual) {
    return true;
  }

  const expectedFraction = parseFraction(expected);
  const actualFraction = parseFraction(actual);

  if (expectedFraction && actualFraction) {
    return (
      expectedFraction.numerator === actualFraction.numerator &&
      expectedFraction.denominator === actualFraction.denominator
    );
  }

  const expectedNumber = expectedFraction ? fractionToNumber(expectedFraction) : parseNumeric(expected);
  const actualNumber = actualFraction ? fractionToNumber(actualFraction) : parseNumeric(actual);

  if (expectedNumber === null || actualNumber === null) {
    return false;
  }

  if (expectedFraction || actualFraction || isDecimalAnswer(expected)) {
    return Math.abs(expectedNumber - actualNumber) <= 0.1;
  }

  return expectedNumber === actualNumber;
};

export const checkAnswer = (question: Question, userAnswer: string) => {
  const acceptedAnswers = question.acceptedAnswers?.length
    ? question.acceptedAnswers
    : [question.correctAnswer];

  return acceptedAnswers.some((answer) => areEquivalentAnswers(answer, userAnswer));
};
