
// Cache formatters to prevent performance overhead
const formatters = {
  persianFull: new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
  }),
  persianShort: new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
    year: 'numeric', month: '2-digit', day: '2-digit'
  }),
  persianMonth: new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
    month: 'long'
  }),
  persianYear: new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
    year: 'numeric'
  }),
  persianDayMonthYear: new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
    day: 'numeric', month: 'numeric', year: 'numeric'
  }),
  currency: new Intl.NumberFormat('fa-IR')
};

const farsiDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

export const toPersianDigits = (n: number | string): string => {
  if (n === undefined || n === null) return '';
  return n.toString().replace(/\d/g, (x) => farsiDigits[parseInt(x)]);
};

export const getPersianDate = (date: Date = new Date()): string => {
  try {
    if (isNaN(date.getTime())) return "تاریخ نامعتبر";
    return formatters.persianFull.format(date);
  } catch (e) {
    return "خطا در تاریخ";
  }
};

export const formatPersianDateShort = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "-";
    // Also include time if available
    const timeStr = date.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
    return formatters.persianShort.format(date) + ' | ' + timeStr;
  } catch (e) {
    return "-";
  }
};

export const getPersianMonth = (date: Date = new Date()): string => {
  try {
    if (isNaN(date.getTime())) return "نامشخص";
    return formatters.persianMonth.format(date);
  } catch (e) {
    return "نامشخص";
  }
};

export const formatCurrency = (amount: number): string => {
  try {
    if (isNaN(amount)) return toPersianDigits(0) + ' تومان';
    return formatters.currency.format(amount) + ' تومان';
  } catch (e) {
    return toPersianDigits(amount) + ' تومان';
  }
};

export const getJalaliCalendarData = (date: Date) => {
  try {
    const parts = formatters.persianDayMonthYear.format(date).split('/');
    // Extract digits correctly regardless of environment formatting
    const d = parseInt(parts[2].replace(/[۰-۹]/g, (s) => String(farsiDigits.indexOf(s))));
    const m = parseInt(parts[1].replace(/[۰-۹]/g, (s) => String(farsiDigits.indexOf(s))));
    const y = parseInt(parts[0].replace(/[۰-۹]/g, (s) => String(farsiDigits.indexOf(s))));
    return { day: d, month: m, year: y };
  } catch (e) {
    return { day: 1, month: 1, year: 1403 };
  }
};

export const jalaliToIso = (y: number, m: number, d: number): string => {
  const now = new Date();
  const currentJ = getJalaliCalendarData(now);
  const diffDays = (y - currentJ.year) * 365 + (m - currentJ.month) * 30 + (d - currentJ.day);
  const targetDate = new Date();
  targetDate.setDate(now.getDate() + diffDays);
  
  // Set the exact current time to the target date for precise record keeping
  targetDate.setHours(now.getHours());
  targetDate.setMinutes(now.getMinutes());
  targetDate.setSeconds(now.getSeconds());
  
  return targetDate.toISOString();
};
