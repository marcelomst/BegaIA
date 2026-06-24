const MS_PER_DAY = 24 * 60 * 60 * 1000;
const ES_MONTH_NAMES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

function utcTodayNoon() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12));
}

export function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

export function formatDateISO(date: Date) {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function formatDateDDMMYYYY(date: Date) {
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = date.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function futureReservationDateRange(daysFromToday = 30, nights = 1) {
  const checkIn = addDays(utcTodayNoon(), daysFromToday);
  const checkOut = addDays(checkIn, nights);
  const checkInText = formatDateDDMMYYYY(checkIn);
  const checkOutText = formatDateDDMMYYYY(checkOut);

  return {
    checkIn,
    checkOut,
    checkInISO: formatDateISO(checkIn),
    checkOutISO: formatDateISO(checkOut),
    checkInText,
    checkOutText,
    rangeText: `${checkInText} al ${checkOutText}`,
  };
}

export function futureMonthDayReservationRange(month: number, checkInDay: number, checkOutDay: number) {
  const today = utcTodayNoon();
  let year = today.getUTCFullYear();
  let checkIn = new Date(Date.UTC(year, month - 1, checkInDay, 12));
  if (checkIn.getTime() < today.getTime()) {
    year += 1;
    checkIn = new Date(Date.UTC(year, month - 1, checkInDay, 12));
  }
  let checkOut = new Date(Date.UTC(year, month - 1, checkOutDay, 12));
  if (checkOut.getTime() <= checkIn.getTime()) {
    checkOut = new Date(Date.UTC(year + 1, month - 1, checkOutDay, 12));
  }
  const monthNameEs = ES_MONTH_NAMES[month - 1];

  return {
    checkIn,
    checkOut,
    checkInISO: formatDateISO(checkIn),
    checkOutISO: formatDateISO(checkOut),
    checkInText: formatDateDDMMYYYY(checkIn),
    checkOutText: formatDateDDMMYYYY(checkOut),
    monthNameEs,
    wordRangeText: `${checkInDay} al ${checkOutDay} de ${monthNameEs}`,
    singleCheckoutText: `${checkOutDay} de ${monthNameEs}`,
  };
}
