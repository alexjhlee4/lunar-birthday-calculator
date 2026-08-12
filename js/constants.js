(function (global) {
  'use strict';

  const RESULT_STATUS = Object.freeze({
    NORMAL: 'NORMAL',
    LEAP_ORIGINAL: 'LEAP_ORIGINAL',
    LEAP_TO_REGULAR: 'LEAP_TO_REGULAR',
    DAY_30_TO_29: 'DAY_30_TO_29',
    LEAP_TO_REGULAR_AND_DAY_30_TO_29: 'LEAP_TO_REGULAR_AND_DAY_30_TO_29'
  });

  const STATUS_LABELS = Object.freeze({
    [RESULT_STATUS.NORMAL]: '일반',
    [RESULT_STATUS.LEAP_ORIGINAL]: '윤달 생일',
    [RESULT_STATUS.LEAP_TO_REGULAR]: '평달로 대체',
    [RESULT_STATUS.DAY_30_TO_29]: '29일로 자동 조정',
    [RESULT_STATUS.LEAP_TO_REGULAR_AND_DAY_30_TO_29]: '복합 조정'
  });

  const Constants = Object.freeze({
    MIN_YEAR: 1900,
    MAX_YEAR: 2050,
    MIN_DATE: Object.freeze({ year: 1900, month: 1, day: 1 }),
    MAX_DATE: Object.freeze({ year: 2050, month: 12, day: 31 }),
    RESULT_RANGES: Object.freeze([5, 10, 20, 30]),
    WEEKDAY_NAMES: Object.freeze(['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']),
    WEEKDAY_SHORT: Object.freeze(['일', '월', '화', '수', '목', '금', '토']),
    RESULT_STATUS,
    STATUS_LABELS,
    FILTER_OPTIONS: Object.freeze([
      { value: 'ALL', label: '전체' },
      { value: RESULT_STATUS.NORMAL, label: '일반' },
      { value: RESULT_STATUS.LEAP_ORIGINAL, label: '윤달 생일' },
      { value: RESULT_STATUS.LEAP_TO_REGULAR, label: '평달 대체' },
      { value: RESULT_STATUS.DAY_30_TO_29, label: '29일 조정' },
      { value: RESULT_STATUS.LEAP_TO_REGULAR_AND_DAY_30_TO_29, label: '복합 조정' }
    ]),
    MESSAGES: Object.freeze({
      BEFORE_CALCULATION: '생년월일을 입력하면 연도별 음력 생일과 양력 날짜를 확인할 수 있습니다.',
      RANGE_TRUNCATED: '음양력 변환 지원 범위에 따라 2050년 12월 31일까지의 결과만 표시했습니다.',
      OUT_OF_TODAY_RANGE: '현재 날짜가 서비스 지원 범위를 벗어났습니다. 달력은 지원 가능한 마지막 날짜인 2050년 12월을 표시합니다.',
      NO_FILTER_RESULTS: '선택한 조건에 맞는 생일 결과가 없습니다. 검색 연도나 상태 필터를 변경해 주세요.'
    })
  });

  global.LunarBirthdayApp = global.LunarBirthdayApp || {};
  global.LunarBirthdayApp.Constants = Constants;
})(window);
