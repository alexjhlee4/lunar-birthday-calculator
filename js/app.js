(function (global) {
  'use strict';

  const App = global.LunarBirthdayApp;
  const {
    Constants,
    DateUtils,
    LunarAdapter,
    BirthdayService,
    Calendar,
    Filters,
    UI
  } = App;

  const actualToday = DateUtils.getTodayParts();
  const clampedToday = DateUtils.clampDate(actualToday);

  const appState = {
    inputMode: 'solar',
    birthInput: { year: null, month: null, day: null, isLeapMonth: false },
    normalizedBirthday: null,
    solarBirthDate: null,
    lunarBirthdayBasis: null,
    birthYearGanji: null,
    resultBaseYear: clampedToday.year,
    resultRange: 5,
    resultRows: [],
    resultMeta: null,
    activeResultDateKey: null,
    calendar: {
      year: clampedToday.year,
      month: clampedToday.month,
      selectedDate: null,
      highlightedDates: []
    },
    filters: { yearSearch: '', status: 'ALL' }
  };

  function init() {
    if (!document.querySelector('[data-page="app"]')) return;
    UI.cacheElements();
    UI.populateSelectors();
    UI.setInputMode(appState.inputMode);
    UI.renderToday(actualToday, clampedToday, !DateUtils.isWithinSupportedDate(actualToday));
    UI.renderRangeControls(appState.resultBaseYear, appState.resultRange);
    UI.renderCalendar(appState.calendar, [], null, handleCalendarDateSelect);
    UI.setupModal();
    bindEvents();
    updateInputDayLimit();
    App.appState = appState;
  }

  function bindEvents() {
    const r = UI.getRefs();

    r.modeButtons.forEach((button) => {
      button.addEventListener('click', () => {
        appState.inputMode = button.dataset.inputMode;
        appState.birthInput.isLeapMonth = false;
        UI.setInputMode(appState.inputMode);
        updateInputDayLimit();
      });
    });

    r.form.addEventListener('submit', (event) => {
      event.preventDefault();
      calculateFromForm();
    });

    [r.yearInput, r.monthInput].forEach((input) => input.addEventListener('input', updateInputDayLimit));

    r.rangeButtons.forEach((button) => {
      button.addEventListener('click', () => {
        appState.resultRange = Number(button.dataset.resultRange);
        recalculateResults('조회 기간을 변경했습니다.');
      });
    });

    r.resultPrev.addEventListener('click', () => changeResultBaseYear(appState.resultBaseYear - 1));
    r.resultNext.addEventListener('click', () => changeResultBaseYear(appState.resultBaseYear + 1));
    r.resultJumpButton.addEventListener('click', () => {
      const year = DateUtils.toInteger(r.resultJumpInput.value);
      if (year === null || year < Constants.MIN_YEAR || year > Constants.MAX_YEAR) {
        UI.announce(`결과 시작 연도는 ${Constants.MIN_YEAR}년부터 ${Constants.MAX_YEAR}년까지 입력해 주세요.`);
        r.resultJumpInput.focus();
        return;
      }
      changeResultBaseYear(year);
    });
    r.resultJumpInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        r.resultJumpButton.click();
      }
    });
    r.resultRecalculate.addEventListener('click', () => recalculateResults('결과를 다시 계산했습니다.'));

    r.yearSearch.addEventListener('input', () => {
      appState.filters.yearSearch = r.yearSearch.value;
      renderFilteredResults();
    });
    r.statusFilter.addEventListener('change', () => {
      appState.filters.status = r.statusFilter.value;
      renderFilteredResults();
    });
    r.filterReset.addEventListener('click', resetFilters);

    r.calendarPrevMonth.addEventListener('click', () => moveCalendarMonth(-1));
    r.calendarNextMonth.addEventListener('click', () => moveCalendarMonth(1));
    r.calendarPrevYear.addEventListener('click', () => moveCalendarYear(-1));
    r.calendarNextYear.addEventListener('click', () => moveCalendarYear(1));
    r.calendarToday.addEventListener('click', () => {
      appState.calendar.year = clampedToday.year;
      appState.calendar.month = clampedToday.month;
      appState.calendar.selectedDate = { ...clampedToday };
      renderCalendar();
      selectDateByParts(clampedToday);
      if (!DateUtils.isWithinSupportedDate(actualToday)) {
        UI.announce('실제 오늘 날짜가 지원 범위 밖이므로 지원 가능한 경계 날짜로 이동했습니다.');
      } else {
        UI.announce('오늘 날짜가 있는 달로 이동했습니다.');
      }
    });
    r.calendarJumpButton.addEventListener('click', () => {
      const year = Number(r.calendarJumpYear.value);
      const month = Number(r.calendarJumpMonth.value);
      if (year < Constants.MIN_YEAR || year > Constants.MAX_YEAR || month < 1 || month > 12) {
        UI.announce('지원 범위 안의 연도와 월을 선택해 주세요.');
        return;
      }
      appState.calendar.year = year;
      appState.calendar.month = month;
      appState.calendar.selectedDate = null;
      renderCalendar();
      UI.announce(`${year}년 ${month}월로 이동했습니다.`);
    });
    r.calendarApplyResultYear.addEventListener('click', () => {
      changeResultBaseYear(appState.calendar.year);
      UI.announce(`${appState.calendar.year}년부터 결과를 표시합니다.`);
      r.resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    [r.primaryContent, r.tableBody, r.mobileCards].forEach((container) => {
      container.addEventListener('click', (event) => {
        const button = event.target.closest('[data-result-key]');
        if (button) syncResultToCalendar(button.dataset.resultKey);
      });
    });

    r.dateDetail.addEventListener('click', (event) => {
      const button = event.target.closest('[data-scroll-result]');
      if (button) UI.scrollToResult(button.dataset.scrollResult);
    });
  }

  function updateInputDayLimit() {
    const r = UI.getRefs();
    if (appState.inputMode === 'lunar') {
      r.dayInput.max = '30';
      return;
    }
    const year = DateUtils.toInteger(r.yearInput.value);
    const month = DateUtils.toInteger(r.monthInput.value);
    const max = DateUtils.getDaysInSolarMonth(year || Constants.MIN_YEAR, month || 1) || 31;
    r.dayInput.max = String(max);
  }

  function calculateFromForm() {
    const r = UI.getRefs();
    UI.clearFormError();
    const inputValues = {
      year: r.yearInput.value,
      month: r.monthInput.value,
      day: r.dayInput.value,
      isLeapMonth: r.leapInput.checked
    };
    appState.birthInput = {
      year: DateUtils.toInteger(inputValues.year),
      month: DateUtils.toInteger(inputValues.month),
      day: DateUtils.toInteger(inputValues.day),
      isLeapMonth: inputValues.isLeapMonth
    };
    const normalized = BirthdayService.normalizeBirthInput(appState.inputMode, inputValues);
    if (!normalized.success) {
      resetCalculationData();
      UI.clearCalculationResult();
      renderCalendar();
      UI.showFormError(normalized.message, normalized.field);
      return;
    }
    const basis = BirthdayService.buildBirthdayBasis(normalized);
    const ganji = LunarAdapter.getYearGanji(normalized.lunarBirthDate.year);
    if (!ganji.success) {
      resetCalculationData();
      UI.clearCalculationResult();
      UI.showFormError(ganji.message, 'year');
      return;
    }

    appState.normalizedBirthday = normalized;
    appState.solarBirthDate = normalized.solarBirthDate;
    appState.lunarBirthdayBasis = basis;
    appState.birthYearGanji = ganji;
    appState.filters = Filters.resetFilters();
    appState.activeResultDateKey = null;
    r.yearSearch.value = '';
    r.statusFilter.value = 'ALL';

    UI.renderSummary(normalized, basis, ganji);
    recalculateResults('생일 계산이 완료되었습니다.');
    UI.getRefs().primarySection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function resetCalculationData() {
    appState.normalizedBirthday = null;
    appState.solarBirthDate = null;
    appState.lunarBirthdayBasis = null;
    appState.birthYearGanji = null;
    appState.resultRows = [];
    appState.resultMeta = null;
    appState.activeResultDateKey = null;
  }

  function changeResultBaseYear(year) {
    const clamped = Math.min(Constants.MAX_YEAR, Math.max(Constants.MIN_YEAR, year));
    appState.resultBaseYear = clamped;
    recalculateResults(`${clamped}년부터 결과를 계산했습니다.`);
  }

  function recalculateResults(announcement) {
    UI.renderRangeControls(appState.resultBaseYear, appState.resultRange);
    if (!appState.lunarBirthdayBasis || !appState.solarBirthDate) return;
    const meta = BirthdayService.buildBirthdayResults(
      appState.resultBaseYear,
      appState.resultRange,
      appState.lunarBirthdayBasis,
      appState.solarBirthDate
    );
    appState.resultMeta = meta;
    appState.resultRows = meta.rows;
    UI.renderPrimaryResult(meta);
    if (appState.activeResultDateKey && !meta.rows.some((row) => row.dateKey === appState.activeResultDateKey)) {
      appState.activeResultDateKey = null;
    }
    renderFilteredResults();
    renderCalendar();
    UI.announce(announcement);
  }

  function renderFilteredResults() {
    if (!appState.resultMeta) return;
    const filtered = Filters.applyResultFilters(appState.resultRows, appState.filters);
    UI.renderResults(appState.resultMeta, filtered, appState.activeResultDateKey);
  }

  function resetFilters() {
    const r = UI.getRefs();
    appState.filters = Filters.resetFilters();
    r.yearSearch.value = '';
    r.statusFilter.value = 'ALL';
    renderFilteredResults();
    UI.announce('결과 검색과 상태 필터를 초기화했습니다.');
  }

  function moveCalendarMonth(delta) {
    const next = Calendar.shiftMonthWithinRange(appState.calendar.year, appState.calendar.month, delta);
    appState.calendar.year = next.year;
    appState.calendar.month = next.month;
    appState.calendar.selectedDate = null;
    renderCalendar();
    UI.announce(`${next.year}년 ${next.month}월로 이동했습니다.`);
  }

  function moveCalendarYear(delta) {
    const next = Calendar.shiftYearWithinRange(appState.calendar.year, appState.calendar.month, delta);
    appState.calendar.year = next.year;
    appState.calendar.month = next.month;
    appState.calendar.selectedDate = null;
    renderCalendar();
    UI.announce(`${next.year}년 ${next.month}월로 이동했습니다.`);
  }

  function renderCalendar() {
    UI.renderCalendar(appState.calendar, appState.resultRows, appState.solarBirthDate, handleCalendarDateSelect);
  }

  function handleCalendarDateSelect(cell) {
    appState.calendar.year = cell.date.year;
    appState.calendar.month = cell.date.month;
    appState.calendar.selectedDate = { ...cell.date };
    appState.activeResultDateKey = cell.result ? cell.result.dateKey : null;
    renderCalendar();
    const selectedCell = Calendar.buildCalendarCells(
      appState.calendar.year,
      appState.calendar.month,
      appState.resultRows,
      appState.calendar.selectedDate,
      appState.solarBirthDate
    ).find((item) => item.dateKey === cell.dateKey);
    UI.renderDateDetail(selectedCell || cell);
    UI.setActiveResult(appState.activeResultDateKey);
    UI.announce(`${DateUtils.formatKoreanDate(cell.date, true)}을 선택했습니다.${cell.result ? ' 계산된 생일 날짜입니다.' : ''}`);
  }

  function selectDateByParts(date) {
    const cell = Calendar.buildCalendarCells(
      appState.calendar.year,
      appState.calendar.month,
      appState.resultRows,
      date,
      appState.solarBirthDate
    ).find((item) => item.dateKey === DateUtils.createDateKey(date.year, date.month, date.day));
    if (cell) handleCalendarDateSelect(cell);
  }

  function syncResultToCalendar(dateKey) {
    const result = appState.resultRows.find((row) => row.dateKey === dateKey);
    if (!result) return;
    appState.calendar = Calendar.syncResultToCalendarState(appState.calendar, result);
    appState.activeResultDateKey = dateKey;
    const refs = UI.getRefs();
    if (refs.calendarDisclosure) refs.calendarDisclosure.open = true;
    renderCalendar();
    selectDateByParts(result.solarDate);
    refs.calendarSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.setTimeout(() => {
      document.querySelector(`.calendar-day[data-date-key="${dateKey}"]`)?.focus({ preventScroll: true });
    }, 350);
  }

  document.addEventListener('DOMContentLoaded', init);
})(window);
