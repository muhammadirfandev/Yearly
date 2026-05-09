export const getDaysInYear = (year: number) => {
  return ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0) ? 366 : 365;
};

export const getYearProgress = (date: Date) => {
  const start = new Date(date.getFullYear(), 0, 1);
  const end = new Date(date.getFullYear() + 1, 0, 1);
  const total = end.getTime() - start.getTime();
  const current = date.getTime() - start.getTime();
  return (current / total) * 100;
};

export const getDaysRemaining = (date: Date) => {
  const end = new Date(date.getFullYear() + 1, 0, 1);
  const diff = end.getTime() - date.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

export const getDaysElapsed = (date: Date) => {
  const start = new Date(date.getFullYear(), 0, 1);
  const diff = date.getTime() - start.getTime();
  // We add 1 because Jan 1st is Day 1
  return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
};
