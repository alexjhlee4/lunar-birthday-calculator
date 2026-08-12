(function (global) {
  'use strict';

  const { Constants } = global.LunarBirthdayApp;

  function toInteger(value) {
    if (value === '' || value === null || value === undefined) return null;
    const number = Number(value);
    return Number.isInteger(number) ? number : null;
  }

  function isLeapYear(year) {
    return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  }

  function getDaysInSolarMonth(year, month) {
    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return 0;
    return [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
  }

  function isValidSolarDate(year, month, day) {
    return Number.isInteger(year) && Number.isInteger(month) && Number.isInteger(day)
      && month >= 1 && month <= 12
      && day >= 1 && day <= getDaysInSolarMonth(year, month);
  }

  function compareDates(a, b) {
    if (a.year !== b.year) return a.year - b.year;
    if (a.month !== b.month) return a.month - b.month;
    return a.day - b.day;
  }

  function isWithinSupportedDate(date) {
    return compareDates(date, Constants.MIN_DATE) >= 0 && compareDates(date, Constants.MAX_DATE) <= 0;
  }

  function createDateKey(year, month, day) {
    return [String(year).padStart(4, '0'), String(month).padStart(2, '0'), String(day).padStart(2, '0')].join('-');
  }

  function parseDateKey(key) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(key || ''));
    if (!match) return null;
    const date = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
    return isValidSolarDate(date.year, date.month, date.day) ? date : null;
  }

  function createLocalDate(year, month, day) {
    return new Date(year, month - 1, day, 12, 0, 0, 0);
  }

  function fromLocalDate(date) {
    return { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() };
  }

  function getWeekdayIndex(date) {
    return createLocalDate(date.year, date.month, date.day).getDay();
  }

  function getWeekdayName(date) {
    return Constants.WEEKDAY_NAMES[getWeekdayIndex(date)];
  }

  function formatKoreanDate(date, includeWeekday) {
    const base = `${date.year}년 ${date.month}월 ${date.day}일`;
    return includeWeekday ? `${base} ${getWeekdayName(date)}` : base;
  }

  function addDays(date, amount) {
    const local = createLocalDate(date.year, date.month, date.day);
    local.setDate(local.getDate() + amount);
    return fromLocalDate(local);
  }

  function shiftMonth(year, month, amount) {
    const serial = year * 12 + (month - 1) + amount;
    return { year: Math.floor(serial / 12), month: (serial % 12 + 12) % 12 + 1 };
  }

  function clampCalendarMonth(year, month) {
    if (year < Constants.MIN_YEAR || (year === Constants.MIN_YEAR && month < 1)) {
      return { year: Constants.MIN_YEAR, month: 1 };
    }
    if (year > Constants.MAX_YEAR || (year === Constants.MAX_YEAR && month > 12)) {
      return { year: Constants.MAX_YEAR, month: 12 };
    }
    return { year, month };
  }

  function clampDate(date) {
    if (compareDates(date, Constants.MIN_DATE) < 0) return { ...Constants.MIN_DATE };
    if (compareDates(date, Constants.MAX_DATE) > 0) return { ...Constants.MAX_DATE };
    return { ...date };
  }

  function getTodayParts() {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
  }

  function getCalendarGridDates(year, month) {
    const first = { year, month, day: 1 };
    const start = addDays(first, -getWeekdayIndex(first));
    return Array.from({ length: 42 }, (_, index) => addDays(start, index));
  }

  function sameDate(a, b) {
    return Boolean(a && b) && a.year === b.year && a.month === b.month && a.day === b.day;
  }

  global.LunarBirthdayApp.DateUtils = Object.freeze({
    toInteger,
    isLeapYear,
    getDaysInSolarMonth,
    isValidSolarDate,
    compareDates,
    isWithinSupportedDate,
    createDateKey,
    parseDateKey,
    createLocalDate,
    fromLocalDate,
    getWeekdayIndex,
    getWeekdayName,
    formatKoreanDate,
    addDays,
    shiftMonth,
    clampCalendarMonth,
    clampDate,
    getTodayParts,
    getCalendarGridDates,
    sameDate
  });
})(window);
