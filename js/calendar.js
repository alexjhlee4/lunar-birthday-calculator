(function (global) {
  'use strict';

  const { Constants, DateUtils, LunarAdapter, AgeService } = global.LunarBirthdayApp;

  function getShiftedMonth(year, month, delta) {
    return DateUtils.shiftMonth(year, month, delta);
  }

  function shiftMonthWithinRange(year, month, delta) {
    const shifted = getShiftedMonth(year, month, delta);
    return DateUtils.clampCalendarMonth(shifted.year, shifted.month);
  }

  function shiftYearWithinRange(year, month, delta) {
    return DateUtils.clampCalendarMonth(year + delta, month);
  }

  function getBoundaryState(year, month) {
    return {
      previousMonthDisabled: year === Constants.MIN_YEAR && month === 1,
      previousYearDisabled: year === Constants.MIN_YEAR,
      nextMonthDisabled: year === Constants.MAX_YEAR && month === 12,
      nextYearDisabled: year === Constants.MAX_YEAR
    };
  }
  
  function findPrimaryResultForSolarYear(resultRows, targetSolarYear) {
  if (!Array.isArray(resultRows) || !resultRows.length) {
    return null;
  }

  return (
    resultRows.find(
      (row) => row.targetSolarYear === targetSolarYear
    )
    || resultRows[0]
    || null
  );
  }

  function syncResultToCalendarState(calendarState, result) {
    return {
      ...calendarState,
      year: result.solarDate.year,
      month: result.solarDate.month,
      selectedDate: { ...result.solarDate }
    };
  }

  function syncCalendarToResultIndex(dateKey, rows) {
    return rows.findIndex((row) => row.dateKey === dateKey);
  }

  function buildCalendarCells(year, month, resultRows, selectedDate, solarBirthDate) {
    const resultMap = new Map(resultRows.map((row) => [row.dateKey, row]));
    const today = DateUtils.getTodayParts();
    return DateUtils.getCalendarGridDates(year, month).map((date) => {
      const inSupport = DateUtils.isWithinSupportedDate(date);
      const dateKey = DateUtils.createDateKey(date.year, date.month, date.day);
      const result = resultMap.get(dateKey) || null;
      const lunarResult = inSupport ? LunarAdapter.solarToLunar(date.year, date.month, date.day) : null;
      const lunar = lunarResult && lunarResult.success ? lunarResult.lunar : null;
      const age = result ? result.age : (solarBirthDate ? AgeService.calculateInternationalAge(solarBirthDate, date) : null);
      return {
        date,
        dateKey,
        inSupport,
        inCurrentMonth: date.year === year && date.month === month,
        isToday: DateUtils.sameDate(date, today),
        isSelected: DateUtils.sameDate(date, selectedDate),
        lunar,
        result,
        age
      };
    });
  }

  function createAccessibleLabel(cell) {
    const parts = [`${DateUtils.formatKoreanDate(cell.date, true)}`];
    if (!cell.inSupport) return `${parts[0]}, 지원 범위 밖`;
    if (cell.lunar) {
      parts.push(`음력 ${cell.lunar.month}월 ${cell.lunar.day}일`);
      parts.push(cell.lunar.isLeapMonth ? '윤달' : '평달');
    }
    if (cell.result) {
      parts.push('음력 생일');
      parts.push(AgeService.formatAge(cell.result.age));
      cell.result.messages.forEach((message) => parts.push(message));
    }
    return parts.join(', ');
  }

  function renderMonthlyCalendar(options) {
    const {
      gridElement,
      headingElement,
      year,
      month,
      resultRows,
      selectedDate,
      solarBirthDate,
      onDateSelect
    } = options;
    headingElement.textContent = `${year}년 ${month}월`;
    const cells = buildCalendarCells(year, month, resultRows || [], selectedDate, solarBirthDate);
    gridElement.replaceChildren();

    Constants.WEEKDAY_SHORT.forEach((name, index) => {
      const header = document.createElement('div');
      header.className = `calendar-weekday ${index === 0 ? 'sunday' : ''} ${index === 6 ? 'saturday' : ''}`;
      header.setAttribute('role', 'columnheader');
      header.textContent = name;
      gridElement.appendChild(header);
    });

    cells.forEach((cell, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'calendar-day';
      if (!cell.inCurrentMonth) button.classList.add('is-adjacent');
      if (cell.isToday) button.classList.add('is-today');
      if (cell.isSelected) button.classList.add('is-selected');
      if (cell.result) button.classList.add('is-birthday');
      if (index % 7 === 0) button.classList.add('sunday');
      if (index % 7 === 6) button.classList.add('saturday');
      button.disabled = !cell.inSupport;
      button.dataset.dateKey = cell.dateKey;
      button.setAttribute('aria-label', createAccessibleLabel(cell));
      button.setAttribute('aria-pressed', String(cell.isSelected));
      button.innerHTML = `
        <span class="calendar-day-number">${cell.date.day}</span>
        ${cell.lunar ? `<span class="calendar-lunar">음력 ${cell.lunar.month}.${cell.lunar.day}${cell.lunar.isLeapMonth ? ' 윤' : ''}</span>` : '<span class="calendar-lunar">지원 범위 밖</span>'}
        ${cell.result ? `<span class="calendar-birthday"><span aria-hidden="true">🎂</span> ${getCalendarResultLabel(cell.result)}</span>` : ''}
      `;
      if (cell.inSupport) button.addEventListener('click', () => onDateSelect(cell));
      gridElement.appendChild(button);
    });
    return cells;
  }

  function getCalendarResultLabel(result) {
    if (result.statuses.includes(Constants.RESULT_STATUS.LEAP_TO_REGULAR) && result.statuses.includes(Constants.RESULT_STATUS.DAY_30_TO_29)) return '복합 조정';
    if (result.statuses.includes(Constants.RESULT_STATUS.LEAP_TO_REGULAR)) return '평달 대체';
    if (result.statuses.includes(Constants.RESULT_STATUS.DAY_30_TO_29)) return '29일 조정';
    if (result.statuses.includes(Constants.RESULT_STATUS.LEAP_ORIGINAL)) return '윤달 생일';
    return '음력 생일';
  }

  global.LunarBirthdayApp.Calendar = Object.freeze({
  getShiftedMonth,
  shiftMonthWithinRange,
  shiftYearWithinRange,
  getBoundaryState,
  findPrimaryResultForSolarYear,
  syncResultToCalendarState,
  syncCalendarToResultIndex,
  buildCalendarCells,
  renderMonthlyCalendar,
  getCalendarResultLabel
  });
})(window);
