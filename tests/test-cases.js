(function (global) {
  'use strict';

  const App = global.LunarBirthdayApp;
  const { Constants, DateUtils, LunarAdapter, BirthdayService, AgeService, Calendar, Filters } = App;
  const S = Constants.RESULT_STATUS;

  const tests = [];
  function test(name, fn) { tests.push({ name, fn }); }
  function assert(condition, message) { if (!condition) throw new Error(message || '조건이 참이 아닙니다.'); }
  function equal(actual, expected, message) {
    if (actual !== expected) throw new Error(`${message || '값 불일치'}: 기대 ${expected}, 실제 ${actual}`);
  }
  function deepDate(actual, expected, message) {
    equal(DateUtils.createDateKey(actual.year, actual.month, actual.day), DateUtils.createDateKey(expected.year, expected.month, expected.day), message);
  }

  test('1. 양력 1980-01-01 변환과 2026년 결과', () => {
    const normalized = BirthdayService.normalizeBirthInput('solar', { year: 1980, month: 1, day: 1, isLeapMonth: false });
    assert(normalized.success, normalized.message);
    deepDate(normalized.lunarBirthDate, { year: 1979, month: 11, day: 14 }, '음력 변환');
    equal(normalized.lunarBirthDate.isLeapMonth, false, '평달 여부');
    equal(LunarAdapter.getYearGanji(1979).display, '기미년(己未年)', '연간지');
    const rows = BirthdayService.findBirthdayOccurrencesForSolarYear(2026, BirthdayService.buildBirthdayBasis(normalized));
    equal(rows.length, 2, '2026년 두 번의 생일 결과');
    deepDate(rows[0].solarDate, { year: 2026, month: 1, day: 2 }, '2026년 첫 생일');
    deepDate(rows[1].solarDate, { year: 2026, month: 12, day: 22 }, '2026년 두 번째 생일');
    equal(AgeService.calculateInternationalAge(normalized.solarBirthDate, rows[0].solarDate), 46, '실제 만 나이');
  });

  test('2. 음력 1980-01-01 평달 변환과 2026년 결과', () => {
    const normalized = BirthdayService.normalizeBirthInput('lunar', { year: 1980, month: 1, day: 1, isLeapMonth: false });
    assert(normalized.success, normalized.message);
    deepDate(normalized.solarBirthDate, { year: 1980, month: 2, day: 16 }, '양력 출생일');
    const row = BirthdayService.findBirthdayOccurrencesForSolarYear(2026, BirthdayService.buildBirthdayBasis(normalized))[0];
    deepDate(row.solarDate, { year: 2026, month: 2, day: 17 }, '2026년 생일');
    equal(AgeService.calculateInternationalAge(normalized.solarBirthDate, row.solarDate), 46, '실제 만 나이');
  });

  test('3. 존재하지 않는 윤달 입력 차단', () => {
    const result = BirthdayService.normalizeBirthInput('lunar', { year: 1980, month: 1, day: 1, isLeapMonth: true });
    equal(result.success, false, '계산 중단');
    equal(result.errorCode, 'INVALID_LEAP_MONTH', '오류 코드');
    assert(result.message.includes('윤1월이 존재하지 않습니다'), '정확한 안내 문구');
  });

  test('4. 윤달 생일의 평달 대체', () => {
    assert(LunarAdapter.isLeapMonthAvailable(1900, 8), '1900년 윤8월 존재');
    const row = BirthdayService.findBirthdayOccurrencesForSolarYear(1901, { month: 8, day: 15, isLeapMonth: true })[0];
    assert(row, '대체 결과 존재');
    assert(row.statuses.includes(S.LEAP_TO_REGULAR), '평달 대체 상태');
    equal(row.appliedLunarDate.isLeapMonth, false, '평달 적용');
    assert(row.messages[0].includes('평달'), '대체 설명');
  });

  test('5. 음력 30일의 29일 자동 조정', () => {
    const row = BirthdayService.findBirthdayOccurrencesForSolarYear(1902, { month: 2, day: 30, isLeapMonth: false })[0];
    assert(row, '조정 결과 존재');
    equal(row.appliedLunarDate.day, 29, '29일 적용');
    assert(row.statuses.includes(S.DAY_30_TO_29), '29일 조정 상태');
    assert(row.messages[0].includes('그달의 마지막 날') && row.messages[0].includes('그믐'), '작은달 설명');
  });

  test('6. 윤달 대체와 29일 조정의 복합 처리', () => {
    assert(LunarAdapter.isLeapMonthAvailable(1906, 4), '1906년 윤4월 존재');
    const row = BirthdayService.findBirthdayOccurrencesForSolarYear(1910, { month: 4, day: 30, isLeapMonth: true })[0];
    assert(row.statuses.includes(S.LEAP_TO_REGULAR), '평달 대체 상태');
    assert(row.statuses.includes(S.DAY_30_TO_29), '29일 조정 상태');
    equal(row.compositeStatus, S.LEAP_TO_REGULAR_AND_DAY_30_TO_29, '복합 상태 코드');
    equal(row.messages.length, 2, '설명 두 개');
  });

  test('7. 지원 범위 경계', () => {
    assert(LunarAdapter.solarToLunar(1900, 1, 1).success, '최솟값 성공');
    assert(LunarAdapter.solarToLunar(2050, 12, 31).success, '최댓값 성공');
    equal(LunarAdapter.solarToLunar(1899, 12, 31).success, false, '최솟값 밖 차단');
    equal(LunarAdapter.solarToLunar(2051, 1, 1).success, false, '최댓값 밖 차단');
  });

  test('8. 달력 월·연도 이동과 경계', () => {
    const previous = Calendar.getShiftedMonth(2026, 1, -1);
    equal(previous.year, 2025); equal(previous.month, 12);
    const next = Calendar.getShiftedMonth(2026, 12, 1);
    equal(next.year, 2027); equal(next.month, 1);
    const min = Calendar.shiftMonthWithinRange(1900, 1, -1);
    equal(min.year, 1900); equal(min.month, 1);
    const max = Calendar.shiftMonthWithinRange(2050, 12, 1);
    equal(max.year, 2050); equal(max.month, 12);
  });

  test('9. 로컬 날짜와 날짜 키의 시간대 안전성', () => {
    const local = DateUtils.createLocalDate(1980, 1, 1);
    equal(local.getFullYear(), 1980, '연도 유지');
    equal(local.getMonth() + 1, 1, '월 유지');
    equal(local.getDate(), 1, '일 유지');
    equal(DateUtils.createDateKey(1980, 1, 1), '1980-01-01', '숫자 구성요소 날짜 키');
  });

  test('10. 결과와 달력 상태 연결', () => {
    const row = { dateKey: '2026-06-30', solarDate: { year: 2026, month: 6, day: 30 } };
    const state = Calendar.syncResultToCalendarState({ year: 2026, month: 7, selectedDate: null }, row);
    equal(state.year, 2026); equal(state.month, 6); deepDate(state.selectedDate, row.solarDate);
    equal(Calendar.syncCalendarToResultIndex('2026-06-30', [row]), 0, '결과 인덱스');
  });

  test('11. 연도 검색과 상태 필터', () => {
    const rows = [
      { targetSolarYear: 2026, statuses: [S.NORMAL], compositeStatus: S.NORMAL },
      { targetSolarYear: 2027, statuses: [S.LEAP_TO_REGULAR], compositeStatus: S.LEAP_TO_REGULAR },
      { targetSolarYear: 2028, statuses: [S.DAY_30_TO_29], compositeStatus: S.DAY_30_TO_29 },
      { targetSolarYear: 2029, statuses: [S.LEAP_TO_REGULAR, S.DAY_30_TO_29], compositeStatus: S.LEAP_TO_REGULAR_AND_DAY_30_TO_29 }
    ];
    equal(Filters.applyResultFilters(rows, { yearSearch: '2027', status: 'ALL' }).length, 1, '연도 검색');
    equal(Filters.applyResultFilters(rows, { yearSearch: '', status: S.NORMAL }).length, 1, '일반 필터');
    equal(Filters.applyResultFilters(rows, { yearSearch: '', status: S.LEAP_TO_REGULAR }).length, 1, '평달 대체 필터');
    equal(Filters.applyResultFilters(rows, { yearSearch: '', status: S.DAY_30_TO_29 }).length, 1, '29일 필터');
    equal(Filters.applyResultFilters(rows, { yearSearch: '', status: S.LEAP_TO_REGULAR_AND_DAY_30_TO_29 }).length, 1, '복합 필터');
  });

  test('12. 실제 만 나이: 전·당일·후·음력 변환·2월 29일', () => {
    const birth = { year: 2000, month: 7, day: 6 };
    equal(AgeService.calculateInternationalAge(birth, { year: 2026, month: 7, day: 5 }), 25, '생일 전');
    equal(AgeService.calculateInternationalAge(birth, { year: 2026, month: 7, day: 6 }), 26, '생일 당일');
    equal(AgeService.calculateInternationalAge(birth, { year: 2026, month: 7, day: 7 }), 26, '생일 후');
    const lunarBirth = LunarAdapter.lunarToSolar(1980, 1, 1, false).solar;
    equal(AgeService.calculateInternationalAge(lunarBirth, { year: 2026, month: 2, day: 17 }), 46, '음력 입력의 양력 출생일 기준');
    const leapBirth = { year: 2000, month: 2, day: 29 };
    equal(AgeService.calculateInternationalAge(leapBirth, { year: 2023, month: 2, day: 28 }), 22, '비윤년 2월 28일');
    equal(AgeService.calculateInternationalAge(leapBirth, { year: 2023, month: 3, day: 1 }), 23, '비윤년 3월 1일');
  });

  async function runTests() {
    const list = document.querySelector('#test-results');
    const summary = document.querySelector('#test-summary');
    let passed = 0;
    for (const item of tests) {
      const li = document.createElement('li');
      try {
        await item.fn();
        passed += 1;
        li.className = 'pass';
        li.innerHTML = `<strong>PASS</strong> ${item.name}`;
      } catch (error) {
        li.className = 'fail';
        li.innerHTML = `<strong>FAIL</strong> ${item.name}<pre>${String(error.stack || error)}</pre>`;
      }
      list.appendChild(li);
    }
    summary.textContent = `${tests.length}개 중 ${passed}개 PASS, ${tests.length - passed}개 FAIL`;
    summary.className = passed === tests.length ? 'summary pass' : 'summary fail';
    document.title = passed === tests.length ? 'PASS - 음력 생일 계산기 테스트' : 'FAIL - 음력 생일 계산기 테스트';
  }

  document.addEventListener('DOMContentLoaded', runTests);
})(window);
