const utcDateParts = (date: Date) => ({
  day: date.getUTCDate(),
  month: date.getUTCMonth(),
  year: date.getUTCFullYear(),
});

const monthNames = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
] as const;

export const isoEventDate = (date: Date) => date.toISOString().slice(0, 10);

export const formatEventDate = (date: Date) => {
  const { day, month, year } = utcDateParts(date);
  return `${day} de ${monthNames[month]} de ${year}`;
};

export const formatEventDateRange = (startDate: Date, endDate?: Date) => {
  if (!endDate || isoEventDate(startDate) === isoEventDate(endDate)) {
    return formatEventDate(startDate);
  }

  const start = utcDateParts(startDate);
  const end = utcDateParts(endDate);
  if (start.month === end.month && start.year === end.year) {
    return `${start.day}–${end.day} de ${monthNames[start.month]} de ${start.year}`;
  }

  return `${formatEventDate(startDate)} a ${formatEventDate(endDate)}`;
};
