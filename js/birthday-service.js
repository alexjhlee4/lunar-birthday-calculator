(function (global) {
  'use strict';

  const { Constants, DateUtils, LunarAdapter, AgeService } = global.LunarBirthdayApp;
  const S = Constants.RESULT_STATUS;

  function fail(errorCode, message, field, details) {
    return { success: false, errorCode, message, field: field || null, details: details || null };
  }

  function normalizeBirthInput(inputMode, inputValues) {
    const year = DateUtils.toInteger(inputValues.year);
    const month = DateUtils.toInteger(inputValues.month);
    const day = DateUtils.toInteger(inputValues.day);
    const isLeapMonth = Boolean(inputValues.isLeapMonth);

    if (year === null) return fail('REQUIRED_YEAR', '연도를 입력해 주세요.', 'year');
    if (month === null) return fail('REQUIRED_MONTH', '월을 입력해 주세요.', 'month');
    if (day === null) return fail('REQUIRED_DAY', '일을 입력해 주세요.', 'day');
    if (year < Constants.MIN_YEAR || year > Constants.MAX_YEAR) {
      return fail('YEAR_OUT_OF_RANGE', `연도는 ${Constants.MIN_YEAR}년부터 ${Constants.MAX_YEAR}년까지 입력할 수 있습니다.`, 'year');
    }

    if (inputMode === 'solar') {
      const solar = { year, month, day };
      if (!DateUtils.isValidSolarDate(year, month, day) || !DateUtils.isWithinSupportedDate(solar)) {
        return fail('INVALID_SOLAR_DATE', '존재하지 않는 양력 날짜입니다. 연도, 월, 일을 다시 확인해 주세요.', 'day');
      }
      const conversion = LunarAdapter.solarToLunar(year, month, day);
      if (!conversion.success) return fail(conversion.errorCode, conversion.message, 'day');
      return {
        success: true,
        inputMode,
        originalInput: { year, month, day, isLeapMonth: false },
        solarBirthDate: conversion.solar,
        lunarBirthDate: conversion.lunar
      };
    }

    if (month < 1 || month > 12 || day < 1 || day > 30) {
      return fail('INVALID_LUNAR_DATE', '입력한 음력 날짜는 존재하지 않습니다. 해당 음력달의 날짜 수와 윤달 여부를 확인해 주세요.', 'day');
    }
    if (isLeapMonth && !LunarAdapter.isLeapMonthAvailable(year, month)) {
      return fail(
        'INVALID_LEAP_MONTH',
        `${year}년에는 윤${month}월이 존재하지 않습니다. 입력한 음력 월이나 윤달 여부를 다시 확인해 주세요. 평${month}월을 의미했다면 ‘윤달이에요’ 선택을 해제해 주세요.`,
        'leap'
      );
    }
    const conversion = LunarAdapter.lunarToSolar(year, month, day, isLeapMonth);
    if (!conversion.success) {
      return fail(conversion.errorCode, conversion.message === '입력한 음력 날짜가 존재하지 않습니다.'
        ? '입력한 음력 날짜는 존재하지 않습니다. 해당 음력달의 날짜 수와 윤달 여부를 확인해 주세요.'
        : conversion.message, 'day');
    }
    return {
      success: true,
      inputMode,
      originalInput: { year, month, day, isLeapMonth },
      solarBirthDate: conversion.solar,
      lunarBirthDate: conversion.lunar
    };
  }

  function buildBirthdayBasis(normalizedBirthInput) {
    const lunar = normalizedBirthInput.lunarBirthDate;
    return { month: lunar.month, day: lunar.day, isLeapMonth: lunar.isLeapMonth };
  }

  function applyLeapMonthPolicy(lunarYear, lunarMonth, lunarDay, isLeapMonth) {
    if (!isLeapMonth) {
      return { success: true, lunarYear, lunarMonth, lunarDay, isLeapMonth: false, statuses: [], messages: [] };
    }
    if (LunarAdapter.isLeapMonthAvailable(lunarYear, lunarMonth)) {
      return {
        success: true, lunarYear, lunarMonth, lunarDay, isLeapMonth: true,
        statuses: [S.LEAP_ORIGINAL], messages: []
      };
    }
    return {
      success: true, lunarYear, lunarMonth, lunarDay, isLeapMonth: false,
      statuses: [S.LEAP_TO_REGULAR],
      messages: [`이 해에는 윤${lunarMonth}월이 없어 같은 월·일의 평달인 음력 ${lunarMonth}월 ${lunarDay}일로 계산했습니다.`]
    };
  }

  function applySmallMonthPolicy(lunarYear, lunarMonth, lunarDay, isLeapMonth) {
    const length = LunarAdapter.getLunarMonthLength(lunarYear, lunarMonth, isLeapMonth);
    if (length === 0) return fail('INVALID_TARGET_LUNAR_MONTH', '대상 음력달을 확인하지 못했습니다.');
    if (lunarDay <= length) {
      return { success: true, lunarYear, lunarMonth, lunarDay, isLeapMonth, monthLength: length, statuses: [], messages: [] };
    }
    if (lunarDay === 30 && length === 29) {
      const prefix = isLeapMonth ? `윤${lunarMonth}월` : `평${lunarMonth}월`;
      return {
        success: true,
        lunarYear,
        lunarMonth,
        lunarDay: 29,
        isLeapMonth,
        monthLength: 29,
        statuses: [S.DAY_30_TO_29],
        messages: [`${prefix}은 29일까지 있는 작은달이어서 음력 ${lunarMonth}월 30일이 존재하지 않습니다. 그달의 마지막 날인 음력 ${lunarMonth}월 29일, 즉 그믐으로 하루 앞당겼습니다.`]
      };
    }
    return fail('INVALID_TARGET_LUNAR_DATE', '대상 연도에 해당 음력 날짜가 존재하지 않습니다.');
  }

  function getCompositeStatus(statuses) {
    const hasLeapReplacement = statuses.includes(S.LEAP_TO_REGULAR);
    const hasDayAdjustment = statuses.includes(S.DAY_30_TO_29);
    if (hasLeapReplacement && hasDayAdjustment) return S.LEAP_TO_REGULAR_AND_DAY_30_TO_29;
    if (statuses.includes(S.LEAP_ORIGINAL)) return S.LEAP_ORIGINAL;
    if (hasLeapReplacement) return S.LEAP_TO_REGULAR;
    if (hasDayAdjustment) return S.DAY_30_TO_29;
    return S.NORMAL;
  }

  function findBirthdayOccurrencesForSolarYear(targetSolarYear, birthdayBasis) {
    const results = [];
    const seen = new Set();
    const candidateLunarYears = [targetSolarYear - 1, targetSolarYear, targetSolarYear + 1];

    candidateLunarYears.forEach((lunarYear) => {
      if (lunarYear < 1000 || lunarYear > 2050) return;
      const leapApplied = applyLeapMonthPolicy(
        lunarYear,
        birthdayBasis.month,
        birthdayBasis.day,
        birthdayBasis.isLeapMonth
      );
      if (!leapApplied.success) return;
      const smallApplied = applySmallMonthPolicy(
        lunarYear,
        leapApplied.lunarMonth,
        leapApplied.lunarDay,
        leapApplied.isLeapMonth
      );
      if (!smallApplied.success) return;
      const converted = LunarAdapter.tryLunarToSolar(
        lunarYear,
        smallApplied.lunarMonth,
        smallApplied.lunarDay,
        smallApplied.isLeapMonth
      );
      if (!converted.success || converted.solar.year !== targetSolarYear || !DateUtils.isWithinSupportedDate(converted.solar)) return;
      const dateKey = DateUtils.createDateKey(converted.solar.year, converted.solar.month, converted.solar.day);
      if (seen.has(dateKey)) return;
      seen.add(dateKey);
      const statuses = [...leapApplied.statuses, ...smallApplied.statuses];
      results.push({
        targetSolarYear,
        solarDate: converted.solar,
        dateKey,
        appliedLunarDate: {
          year: lunarYear,
          month: smallApplied.lunarMonth,
          day: smallApplied.lunarDay,
          isLeapMonth: smallApplied.isLeapMonth
        },
        originalBirthdayBasis: { ...birthdayBasis },
        statuses: statuses.length ? statuses : [S.NORMAL],
        compositeStatus: getCompositeStatus(statuses),
        messages: [...leapApplied.messages, ...smallApplied.messages]
      });
    });

    return results.sort((a, b) => DateUtils.compareDates(a.solarDate, b.solarDate));
  }

  function buildBirthdayResults(baseYear, range, birthdayBasis, solarBirthDate) {
    const safeBase = Math.min(Constants.MAX_YEAR, Math.max(Constants.MIN_YEAR, Number(baseYear)));
    const safeRange = Constants.RESULT_RANGES.includes(Number(range)) ? Number(range) : 5;
    const requestedEndYear = safeBase + safeRange - 1;
    const endYear = Math.min(requestedEndYear, Constants.MAX_YEAR);
    const rows = [];
    const duplicateYears = [];

    for (let year = safeBase; year <= endYear; year += 1) {
      const occurrences = findBirthdayOccurrencesForSolarYear(year, birthdayBasis);
      if (occurrences.length > 1) duplicateYears.push(year);
      occurrences.forEach((row) => {
        rows.push({
          ...row,
          weekday: DateUtils.getWeekdayName(row.solarDate),
          age: AgeService.calculateInternationalAge(solarBirthDate, row.solarDate)
        });
      });
    }
    return {
      success: true,
      baseYear: safeBase,
      range: safeRange,
      endYear,
      requestedEndYear,
      truncated: requestedEndYear > Constants.MAX_YEAR,
      rows,
      duplicateYears
    };
  }

  global.LunarBirthdayApp.BirthdayService = Object.freeze({
    normalizeBirthInput,
    buildBirthdayBasis,
    applyLeapMonthPolicy,
    applySmallMonthPolicy,
    findBirthdayOccurrencesForSolarYear,
    buildBirthdayResults,
    getCompositeStatus
  });
})(window);
