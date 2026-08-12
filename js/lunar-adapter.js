(function (global) {
  'use strict';

  const { Constants, DateUtils } = global.LunarBirthdayApp;

  function failure(errorCode, message, details) {
    return { success: false, errorCode, message, details: details || null };
  }

  function createConverter() {
    if (typeof global.KoreanLunarCalendar !== 'function') {
      throw new Error('KoreanLunarCalendar 라이브러리를 불러오지 못했습니다.');
    }
    return new global.KoreanLunarCalendar();
  }

  function solarToLunar(year, month, day) {
    const solar = { year, month, day };
    if (!DateUtils.isValidSolarDate(year, month, day) || !DateUtils.isWithinSupportedDate(solar)) {
      return failure('INVALID_SOLAR_DATE', '존재하지 않거나 지원 범위를 벗어난 양력 날짜입니다.');
    }
    const calendar = createConverter();
    if (!calendar.setSolarDate(year, month, day)) {
      return failure('CONVERSION_FAILED', '양력 날짜를 음력으로 변환하지 못했습니다.');
    }
    const lunarRaw = calendar.getLunarCalendar();
    return {
      success: true,
      solar,
      lunar: {
        year: lunarRaw.year,
        month: lunarRaw.month,
        day: lunarRaw.day,
        isLeapMonth: Boolean(lunarRaw.intercalation)
      }
    };
  }

  function lunarToSolar(year, month, day, isLeapMonth) {
    const calendar = createConverter();
    const requestedLeap = Boolean(isLeapMonth);
    if (![year, month, day].every(Number.isInteger) || month < 1 || month > 12 || day < 1 || day > 30) {
      return failure('INVALID_LUNAR_DATE', '입력한 음력 날짜가 존재하지 않습니다.');
    }
    if (requestedLeap && !isLeapMonthAvailable(year, month)) {
      return failure('INVALID_LEAP_MONTH', `${year}년에는 윤${month}월이 존재하지 않습니다.`);
    }
    if (!calendar.setLunarDate(year, month, day, requestedLeap)) {
      return failure('INVALID_LUNAR_DATE', '입력한 음력 날짜가 존재하지 않습니다.');
    }
    const lunarRaw = calendar.getLunarCalendar();
    if (requestedLeap && !lunarRaw.intercalation) {
      return failure('INVALID_LEAP_MONTH', `${year}년에는 윤${month}월이 존재하지 않습니다.`);
    }
    const solarRaw = calendar.getSolarCalendar();
    const solar = { year: solarRaw.year, month: solarRaw.month, day: solarRaw.day };
    if (!DateUtils.isWithinSupportedDate(solar)) {
      return failure('OUT_OF_SUPPORTED_RANGE', '음력 날짜를 양력으로 변환한 결과가 지원 범위를 벗어납니다.', { solar });
    }
    return {
      success: true,
      solar,
      lunar: { year, month, day, isLeapMonth: requestedLeap }
    };
  }

  function tryLunarToSolar(year, month, day, isLeapMonth) {
    try {
      return lunarToSolar(year, month, day, isLeapMonth);
    } catch (error) {
      return failure('CONVERSION_ERROR', '음력 날짜 변환 중 오류가 발생했습니다.', { error: String(error) });
    }
  }

  function isLeapMonthAvailable(lunarYear, lunarMonth) {
    if (!Number.isInteger(lunarYear) || !Number.isInteger(lunarMonth) || lunarMonth < 1 || lunarMonth > 12) return false;
    try {
      const calendar = createConverter();
      if (!calendar.setLunarDate(lunarYear, lunarMonth, 1, true)) return false;
      return Boolean(calendar.getLunarCalendar().intercalation);
    } catch (_error) {
      return false;
    }
  }

  function getLunarMonthLength(lunarYear, lunarMonth, isLeapMonth) {
    if (tryLunarToSolar(lunarYear, lunarMonth, 30, isLeapMonth).success) return 30;
    if (tryLunarToSolar(lunarYear, lunarMonth, 29, isLeapMonth).success) return 29;
    return 0;
  }

  function getYearGanji(lunarYear) {
    try {
      const calendar = createConverter();
      if (!calendar.setLunarDate(lunarYear, 1, 1, false)) {
        return failure('GANJI_UNAVAILABLE', '태어난 해의 간지를 계산하지 못했습니다.');
      }
      const korean = calendar.getKoreanGapja().year;
      const hanja = calendar.getChineseGapja().year;
      return { success: true, lunarYear, korean, hanja, display: `${korean}(${hanja})` };
    } catch (error) {
      return failure('GANJI_UNAVAILABLE', '태어난 해의 간지를 계산하지 못했습니다.', { error: String(error) });
    }
  }

  function getLibraryInfo() {
    return {
      name: 'korean-lunar-calendar',
      version: 'upstream 0.4.0 reference / adapted vendored browser build',
      license: 'MIT',
      upstreamLunarRange: '1000-01-01 ~ 2050-11-18',
      upstreamSolarRange: '1000-02-13 ~ 2050-12-31',
      serviceRange: `${DateUtils.createDateKey(Constants.MIN_DATE.year, Constants.MIN_DATE.month, Constants.MIN_DATE.day)} ~ ${DateUtils.createDateKey(Constants.MAX_DATE.year, Constants.MAX_DATE.month, Constants.MAX_DATE.day)}`
    };
  }

  global.LunarBirthdayApp.LunarAdapter = Object.freeze({
    solarToLunar,
    lunarToSolar,
    tryLunarToSolar,
    isLeapMonthAvailable,
    getLunarMonthLength,
    getYearGanji,
    getLibraryInfo
  });
})(window);
