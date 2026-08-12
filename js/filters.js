(function (global) {
  'use strict';

  const { Constants } = global.LunarBirthdayApp;
  const S = Constants.RESULT_STATUS;

  function matchesStatus(row, status) {
    if (!status || status === 'ALL') return true;
    if (status === S.LEAP_TO_REGULAR_AND_DAY_30_TO_29) {
      return row.statuses.includes(S.LEAP_TO_REGULAR) && row.statuses.includes(S.DAY_30_TO_29);
    }
    if (status === S.LEAP_TO_REGULAR) {
      return row.statuses.includes(S.LEAP_TO_REGULAR) && !row.statuses.includes(S.DAY_30_TO_29);
    }
    if (status === S.DAY_30_TO_29) {
      return row.statuses.includes(S.DAY_30_TO_29) && !row.statuses.includes(S.LEAP_TO_REGULAR);
    }
    return row.compositeStatus === status || row.statuses.includes(status);
  }

  function applyResultFilters(rows, filters) {
    const yearSearch = String(filters.yearSearch || '').trim();
    const year = yearSearch === '' ? null : Number(yearSearch);
    return rows.filter((row) => {
      const yearMatches = year === null || (Number.isInteger(year) && row.targetSolarYear === year);
      return yearMatches && matchesStatus(row, filters.status || 'ALL');
    });
  }

  function resetFilters() {
    return { yearSearch: '', status: 'ALL' };
  }

  global.LunarBirthdayApp.Filters = Object.freeze({ matchesStatus, applyResultFilters, resetFilters });
})(window);
