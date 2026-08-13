(function (global) {
  'use strict';

  const { Constants, DateUtils, AgeService, Calendar } = global.LunarBirthdayApp;
  const S = Constants.RESULT_STATUS;

  let refs = null;

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function cacheElements() {
    refs = {
      body: document.body,
      todayText: document.querySelector('#today-text'),
      beforeCalcNote: document.querySelector('#before-calc-note'),
      supportNotice: document.querySelector('#support-notice'),
      modeButtons: [...document.querySelectorAll('[data-input-mode]')],
      form: document.querySelector('#birthday-form'),
      yearInput: document.querySelector('#birth-year'),
      monthInput: document.querySelector('#birth-month'),
      dayInput: document.querySelector('#birth-day'),
      leapWrap: document.querySelector('#leap-month-wrap'),
      leapInput: document.querySelector('#is-leap-month'),
      inputLabel: document.querySelector('#birth-input-label'),
      formError: document.querySelector('#form-error'),
      primarySection: document.querySelector('#primary-result-section'),
      primaryHeading: document.querySelector('#primary-result-heading'),
      primaryContent: document.querySelector('#primary-result-content'),
      summarySection: document.querySelector('#summary-section'),
      summaryContent: document.querySelector('#summary-content'),
      rangeSection: document.querySelector('#range-section'),
      resultBaseYear: document.querySelector('#result-base-year'),
      resultPrev: document.querySelector('#result-prev-year'),
      resultNext: document.querySelector('#result-next-year'),
      rangeButtons: [...document.querySelectorAll('[data-result-range]')],
      resultJumpInput: document.querySelector('#result-jump-year'),
      resultJumpButton: document.querySelector('#result-jump-button'),
      resultRecalculate: document.querySelector('#result-recalculate'),
      resultSection: document.querySelector('#results-section'),
      resultSummary: document.querySelector('#result-summary'),
      resultNotices: document.querySelector('#result-notices'),
      yearSearch: document.querySelector('#filter-year'),
      statusFilter: document.querySelector('#filter-status'),
      filterReset: document.querySelector('#filter-reset'),
      filterCount: document.querySelector('#filter-count'),
      noFilterResults: document.querySelector('#no-filter-results'),
      tableBody: document.querySelector('#result-table-body'),
      mobileCards: document.querySelector('#result-mobile-cards'),
      calendarDisclosure: document.querySelector('#calendar-disclosure'),
      calendarSection: document.querySelector('#calendar-section'),
      calendarHeading: document.querySelector('#calendar-heading'),
      calendarGrid: document.querySelector('#calendar-grid'),
      calendarPrevYear: document.querySelector('#calendar-prev-year'),
      calendarPrevMonth: document.querySelector('#calendar-prev-month'),
      calendarNextMonth: document.querySelector('#calendar-next-month'),
      calendarNextYear: document.querySelector('#calendar-next-year'),
      calendarToday: document.querySelector('#calendar-today'),
      calendarJumpYear: document.querySelector('#calendar-jump-year'),
      calendarJumpMonth: document.querySelector('#calendar-jump-month'),
      calendarJumpButton: document.querySelector('#calendar-jump-button'),
      calendarApplyResultYear: document.querySelector('#calendar-apply-result-year'),
      dateDetail: document.querySelector('#date-detail'),
      liveRegion: document.querySelector('#live-region'),
      modalOpen: document.querySelector('#criteria-open'),
      modal: document.querySelector('#criteria-modal'),
      modalPanel: document.querySelector('#criteria-modal-panel'),
      modalClose: document.querySelector('#criteria-close')
    };
    return refs;
  }

  function getRefs() {
    return refs || cacheElements();
  }

  function renderToday(actualToday, clampedToday, outOfRange) {
    const r = getRefs();
    r.todayText.textContent = `오늘은 ${actualToday.year}년 ${actualToday.month}월 ${actualToday.day}일입니다.`;
    r.supportNotice.hidden = !outOfRange;
    if (outOfRange) {
      r.supportNotice.textContent = actualToday.year > Constants.MAX_YEAR
        ? Constants.MESSAGES.OUT_OF_TODAY_RANGE
        : '현재 날짜가 서비스 지원 범위를 벗어났습니다. 달력은 지원 가능한 첫 날짜인 1900년 1월을 표시합니다.';
    }
    r.calendarJumpYear.value = String(clampedToday.year);
    r.calendarJumpMonth.value = String(clampedToday.month);
  }

  function setInputMode(mode) {
    const r = getRefs();
    r.modeButtons.forEach((button) => {
      const active = button.dataset.inputMode === mode;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    const lunar = mode === 'lunar';
    r.leapWrap.hidden = !lunar;
    if (!lunar) r.leapInput.checked = false;
    r.inputLabel.textContent = lunar ? '음력 생년월일' : '양력 생년월일';
    r.formError.hidden = true;
  }

  function showFormError(message, field) {
    const r = getRefs();
    r.formError.innerHTML = `<span aria-hidden="true">⚠️</span> ${escapeHtml(message)}`;
    r.formError.hidden = false;
    const target = field === 'month' ? r.monthInput
      : field === 'day' ? r.dayInput
        : field === 'leap' ? r.leapInput
          : r.yearInput;
    target.setAttribute('aria-invalid', 'true');
    target.focus();
    announce(message);
  }

  function clearFormError() {
    const r = getRefs();
    r.formError.hidden = true;
    [r.yearInput, r.monthInput, r.dayInput, r.leapInput].forEach((input) => input.removeAttribute('aria-invalid'));
  }

  function formatLunar(lunar, includeYear) {
    const prefix = includeYear ? `${lunar.year}년 ` : '';
    return `${prefix}${lunar.isLeapMonth ? '윤' : '평'}${lunar.month}월 ${lunar.day}일`;
  }

  function renderSummary(normalized, basis, ganji) {
    const r = getRefs();
    const solarText = DateUtils.formatKoreanDate(normalized.solarBirthDate, false);
    const lunarText = `${normalized.lunarBirthDate.year}년 ${normalized.lunarBirthDate.month}월 ${normalized.lunarBirthDate.day}일 · ${normalized.lunarBirthDate.isLeapMonth ? '윤달' : '평달'}`;
    const inputTitle = normalized.inputMode === 'solar' ? '입력한 양력 생일' : '입력한 음력 생일';
    const inputValue = normalized.inputMode === 'solar'
      ? solarText
      : `${normalized.originalInput.year}년 ${normalized.originalInput.month}월 ${normalized.originalInput.day}일 · ${normalized.originalInput.isLeapMonth ? '윤달' : '평달'}`;
    const convertedTitle = normalized.inputMode === 'solar' ? '변환된 음력 생일' : '변환된 양력 생일';
    const convertedValue = normalized.inputMode === 'solar' ? lunarText : solarText;

    r.summaryContent.innerHTML = `
      <dl class="summary-grid">
        <div><dt>${inputTitle}</dt><dd>${escapeHtml(inputValue)}</dd></div>
        <div><dt>${convertedTitle}</dt><dd>${escapeHtml(convertedValue)}</dd></div>
        <div><dt>매년 계산할 음력 생일 기준</dt><dd>음력 ${basis.isLeapMonth ? '윤' : ''}${basis.month}월 ${basis.day}일${basis.isLeapMonth ? ' · 윤달' : ''}</dd></div>
        <div><dt>태어난 해의 간지</dt><dd>${escapeHtml(ganji.display)}</dd></div>
        <div><dt>실제 양력 출생일</dt><dd>${escapeHtml(solarText)}</dd></div>
      </dl>
      <p class="confirmation-note"><span aria-hidden="true">✓</span> 이 음력 월·일을 기준으로 연도별 생일을 계산합니다.</p>
    `;
    r.beforeCalcNote.hidden = true;
    r.summarySection.hidden = false;
    r.summarySection.open = false;
    r.rangeSection.hidden = false;
    r.resultSection.hidden = false;
  }

  function renderPrimaryResult(resultMeta) {
    const r = getRefs();
    const rows = resultMeta?.rows?.filter((row) => row.targetSolarYear === resultMeta.baseYear) || [];
    r.primaryHeading.textContent = `${resultMeta.baseYear}년 음력 생일`;

    if (!rows.length) {
      r.primaryContent.innerHTML = '<p class="notice-box">선택한 연도에 표시할 생일 결과를 찾지 못했습니다.</p>';
      r.primarySection.hidden = false;
      return;
    }

    const duplicateNotice = rows.length > 1
      ? '<p class="notice-box">이 양력 연도에는 같은 음력 생일이 두 번 포함되어 있어 두 날짜를 모두 표시합니다.</p>'
      : '';

    r.primaryContent.innerHTML = `
      ${duplicateNotice}
      <div class="primary-result-list">
        ${rows.map((row) => {
          const lunarLabel = `음력 ${row.appliedLunarDate.month}월 ${row.appliedLunarDate.day}일 · ${row.appliedLunarDate.isLeapMonth ? '윤달' : '평달'}`;
          const badges = getStatusBadgeHtml(row);
          const messages = row.messages.length
            ? `<ul class="adjustment-messages primary-adjustment">${row.messages.map((message) => `<li>${escapeHtml(message)}</li>`).join('')}</ul>`
            : '';
          return `
            <article class="primary-result-item">
              <p class="primary-year">${row.targetSolarYear}년</p>
              <p class="primary-date">
                <strong>${row.solarDate.month}월 ${row.solarDate.day}일</strong>
                <span>${escapeHtml(row.weekday)}</span>
              </p>
              <p class="primary-meta">${escapeHtml(lunarLabel)} · <span class="primary-age">${escapeHtml(AgeService.formatAge(row.age))}</span></p>
              ${badges ? `<div class="badge-list" style="justify-content:center; margin-top:.65rem">${badges}</div>` : ''}
              ${messages}
              <div class="primary-result-actions">
                <button type="button" class="button button-secondary" data-result-key="${row.dateKey}">달력에서 보기</button>
              </div>
            </article>`;
        }).join('')}
      </div>`;
    r.primarySection.hidden = false;
  }

  function clearCalculationResult() {
    const r = getRefs();
    r.beforeCalcNote.hidden = false;
    r.primarySection.hidden = true;
    r.primaryContent.replaceChildren();
    r.summarySection.hidden = true;
    r.summarySection.open = false;
    r.rangeSection.hidden = true;
    r.resultSection.hidden = true;
    if (r.calendarDisclosure) r.calendarDisclosure.open = false;
    r.tableBody.replaceChildren();
    r.mobileCards.replaceChildren();
    r.dateDetail.innerHTML = '<p>달력에서 날짜를 선택하면 양력·음력 정보를 확인할 수 있습니다.</p>';
  }

  function renderRangeControls(baseYear, range) {
    const r = getRefs();
    r.resultBaseYear.textContent = `${baseYear}년`;
    r.resultPrev.disabled = baseYear <= Constants.MIN_YEAR;
    r.resultNext.disabled = baseYear >= Constants.MAX_YEAR;
    r.resultJumpInput.value = String(baseYear);
    r.rangeButtons.forEach((button) => {
      const active = Number(button.dataset.resultRange) === range;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  function getStatusBadgeHtml(row) {
    const statuses = (row.statuses || [S.NORMAL]).filter((status) => status !== S.NORMAL);
    return statuses.map((status) => {
      const label = Constants.STATUS_LABELS[status] || status;
      return `<span class="status-badge status-${status.toLowerCase()}">${escapeHtml(label)}</span>`;
    }).join('');
  }

  /* [UX 5단계] 데스크톱 표와 모바일 카드가
   동일한 날짜·음력·만 나이 정보를 사용하도록
   결과 한 행의 표시용 데이터를 한 곳에서 정리합니다.
   계산 결과 자체는 변경하지 않습니다. */
  function buildResultDisplayData(row) {
    const lunarLabel =
    `음력 ${row.appliedLunarDate.month}월 `
    + `${row.appliedLunarDate.day}일 · `
    + `${row.appliedLunarDate.isLeapMonth
      ? '윤달'
      : '평달'}`;
    /* [UX 5단계] 결과 목록에서는 연도가 이미 별도로 보이므로
     양력 날짜의 핵심인 월·일을 크게 보여주기 위한 문자열입니다. */
    const solarMonthDay =
      `${row.solarDate.month}월 `
      + `${row.solarDate.day}일`;

    return {
    yearLabel:
      `${row.targetSolarYear}년`,

    solarMonthDay,

    solarFullDate:
      DateUtils.formatKoreanDate(
        row.solarDate,
        false
      ),

    weekday:
      row.weekday,

    lunarLabel,

    ageLabel:
      AgeService.formatAge(
        row.age
      )
  };
}

  function renderResults(resultMeta, filteredRows, activeDateKey) {
    const r = getRefs();
    r.resultSummary.textContent = `${resultMeta.baseYear}년부터 ${resultMeta.endYear}년까지, 총 ${resultMeta.rows.length}개의 생일 날짜를 계산했습니다.`;
    const notices = [];
    if (resultMeta.truncated) notices.push(Constants.MESSAGES.RANGE_TRUNCATED);
    resultMeta.duplicateYears.forEach((year) => notices.push(`${year}년에는 같은 음력 생일이 두 번 포함되어 있습니다. 두 날짜를 모두 표시합니다.`));
    r.resultNotices.innerHTML = notices.map((notice) => `<p class="notice-box">${escapeHtml(notice)}</p>`).join('');
    r.filterCount.textContent = `전체 ${resultMeta.rows.length}개 중 ${filteredRows.length}개 표시`;
    r.noFilterResults.hidden = filteredRows.length !== 0;
    r.noFilterResults.textContent = Constants.MESSAGES.NO_FILTER_RESULTS;
    r.tableBody.replaceChildren();
    r.mobileCards.replaceChildren();

    filteredRows.forEach((row) => {
    /* [UX 5단계] Desktop Table과 Mobile Card에서
     같은 정보 구조를 사용하기 위한 표시용 데이터입니다. */
      const display = buildResultDisplayData(row);
      const badgeHtml = getStatusBadgeHtml(row);
      const messageHtml = row.messages.length
        ? `<ul class="adjustment-messages">${row.messages.map((m) => `<li>${escapeHtml(m)}</li>`).join('')}</ul>`
        : '';
      const activeClass = row.dateKey === activeDateKey ? ' is-active-result' : '';

      const tr = document.createElement('tr');
      tr.id = `result-row-${row.dateKey}`;
      tr.className = activeClass.trim();
/* [UX 5단계] 연도·월일·요일을 하나의 셀에 계층적으로 배치해
   데스크톱에서도 사용자가 실제 생일 날짜를 가장 먼저 읽게 합니다. */
tr.innerHTML = `

  <td class="result-date-cell">

    <span class="result-table-year">
      ${escapeHtml(display.yearLabel)}
    </span>

    <strong class="result-table-date">
      ${escapeHtml(display.solarMonthDay)}
    </strong>

    <span class="result-table-weekday">
      ${escapeHtml(display.weekday)}
    </span>

  </td>


  <td class="result-lunar-cell">
    ${escapeHtml(display.lunarLabel)}
  </td>


  <!-- [UX 5단계] 만 나이는 날짜 다음으로 빠르게 찾을 수 있도록
       독립적인 강조 텍스트로 표시합니다. -->
  <td class="result-age-cell">
    <strong>
      ${escapeHtml(display.ageLabel)}
    </strong>
  </td>


  <!-- [UX 5단계] 정상 결과에는 불필요한 상태 문구를 추가하지 않고,
       윤달 대체·29일 조정 같은 예외가 있을 때만 강조합니다. -->
  <td class="result-status-cell">

    ${
      badgeHtml
        ? `
          <div class="badge-list">
            ${badgeHtml}
          </div>

          ${messageHtml}
        `
        : `
          <span
            class="status-none"
            aria-label="특이사항 없음"
          >
            —
          </span>
        `
    }

  </td>


  <td class="result-calendar-cell">

    <button
      type="button"
      class="button button-small"
      data-result-key="${row.dateKey}"
    >
      달력 보기
    </button>

  </td>
`;
      r.tableBody.appendChild(tr);

      const card = document.createElement('article');
      card.id = `result-card-${row.dateKey}`;
      card.className = `result-card${activeClass}`;
/* [UX 5단계] 모바일에서도 데스크톱과 동일하게
   '연도 → 양력 날짜 → 요일 → 음력 → 만 나이 → 예외' 순서로
   정보 우선순위를 통일합니다. */
card.innerHTML = `

  <div class="result-card-header">

    <p class="result-year">
      ${escapeHtml(display.yearLabel)}
    </p>


    <p class="result-card-date">

      <strong>
        ${escapeHtml(display.solarMonthDay)}
      </strong>

      <span>
        ${escapeHtml(display.weekday)}
      </span>

    </p>

  </div>


  <dl class="result-card-info">

    <div>
      <dt>음력</dt>

      <dd>
        ${escapeHtml(display.lunarLabel)}
      </dd>
    </div>


    <div>
      <dt>만 나이</dt>

      <dd class="result-card-age">
        <strong>
          ${escapeHtml(display.ageLabel)}
        </strong>
      </dd>
    </div>

  </dl>


  ${
    badgeHtml
      ? `
        <!-- [UX 5단계] 예외가 발생한 결과에만
             조정 상태와 상세 설명을 표시합니다. -->
        <div class="result-card-exception">

          <div class="badge-list">
            ${badgeHtml}
          </div>

          ${messageHtml}

        </div>
      `
      : ''
  }


  <button
    type="button"
    class="button button-secondary result-calendar-button"
    data-result-key="${row.dateKey}"
  >
    달력에서 보기
  </button>
`;
      r.mobileCards.appendChild(card);
    });
  }

  function renderCalendar(calendarState, rows, solarBirthDate, onDateSelect) {
    const r = getRefs();
    const boundary = Calendar.getBoundaryState(calendarState.year, calendarState.month);
    r.calendarPrevMonth.disabled = boundary.previousMonthDisabled;
    r.calendarPrevYear.disabled = boundary.previousYearDisabled;
    r.calendarNextMonth.disabled = boundary.nextMonthDisabled;
    r.calendarNextYear.disabled = boundary.nextYearDisabled;
    r.calendarJumpYear.value = String(calendarState.year);
    r.calendarJumpMonth.value = String(calendarState.month);
    Calendar.renderMonthlyCalendar({
      gridElement: r.calendarGrid,
      headingElement: r.calendarHeading,
      year: calendarState.year,
      month: calendarState.month,
      resultRows: rows,
      selectedDate: calendarState.selectedDate,
      solarBirthDate,
      onDateSelect
    });
  }

/* [UX 4단계] 달력에서 선택한 날짜 정보를
   일반 문장 나열이 아니라 날짜 → 음력 → 만 나이 → 조정 상태의
   명확한 정보 계층으로 보여줍니다. */
  function renderDateDetail(cell) {
    const r = getRefs();

    const weekday =
    DateUtils.getWeekdayName(cell.date);


  /* [UX 4단계] 음력 정보가 존재하면
     날짜와 평달/윤달 여부를 하나의 읽기 쉬운 문장으로 만듭니다. */
    const lunarText = cell.lunar
    ? (
      `음력 ${cell.lunar.year}년 `
      + `${cell.lunar.month}월 `
      + `${cell.lunar.day}일 · `
      + `${cell.lunar.isLeapMonth ? '윤달' : '평달'}`
    )
    : '음력 정보를 확인할 수 없습니다.';


    const result = cell.result;


  /* [UX 4단계] 계산된 생일 날짜에만
     만 나이와 결과 상태를 추가로 보여줍니다. */
    const birthdayDetailHtml = result
    ? `
      <div class="date-detail-birthday">

        <p class="date-detail-birthday-label">
          <span aria-hidden="true">🎂</span>
          <strong>계산된 음력 생일입니다.</strong>
        </p>


        <dl class="date-detail-info">

          <div class="date-detail-info-row">
            <dt>음력 날짜</dt>

            <dd>
              ${escapeHtml(lunarText)}
            </dd>
          </div>


          <div class="date-detail-info-row">
            <dt>만 나이</dt>

            <dd>
              <strong>
                ${escapeHtml(
                  AgeService.formatAge(result.age)
                )}
              </strong>
            </dd>
          </div>

        </dl>


        ${
          getStatusBadgeHtml(result)
            ? `
              <div class="badge-list">
                ${getStatusBadgeHtml(result)}
              </div>
            `
            : ''
        }


        ${
          result.messages.length
            ? `
              <ul class="adjustment-messages">
                ${result.messages
                  .map(
                    (message) =>
                      `<li>${escapeHtml(message)}</li>`
                  )
                  .join('')}
              </ul>
            `
            : ''
        }


        <button
          type="button"
          class="button button-secondary"
          data-scroll-result="${result.dateKey}"
        >
          연도별 결과에서 보기
        </button>

      </div>
    `
    : `
      <dl class="date-detail-info">

        <div class="date-detail-info-row">
          <dt>음력 날짜</dt>

          <dd>
            ${escapeHtml(lunarText)}
          </dd>
        </div>

      </dl>


      <p class="date-detail-empty">
        이 날짜는 현재 계산된 음력 생일 날짜가 아닙니다.
      </p>
    `;


  /* [UX 4단계] 선택 날짜 자체를 가장 먼저 보여주고,
     그 아래에 생일 여부와 상세정보를 배치합니다. */
  r.dateDetail.innerHTML = `

    <div class="date-detail-header">

      <p class="date-detail-eyebrow">
        선택한 날짜
      </p>

      <h3>
        ${escapeHtml(
          DateUtils.formatKoreanDate(
            cell.date,
            false
          )
        )}

        ${escapeHtml(weekday)}
      </h3>

    </div>


    ${birthdayDetailHtml}
  `;
}

  function setActiveResult(dateKey) {
    document.querySelectorAll('.is-active-result').forEach((element) => element.classList.remove('is-active-result'));
    if (!dateKey) return;
    document.querySelector(`#result-row-${CSS.escape(dateKey)}`)?.classList.add('is-active-result');
    document.querySelector(`#result-card-${CSS.escape(dateKey)}`)?.classList.add('is-active-result');
  }

  function scrollToResult(dateKey) {
    const target = document.querySelector(`#result-row-${CSS.escape(dateKey)}`)
      || document.querySelector(`#result-card-${CSS.escape(dateKey)}`);
    if (target) {
      setActiveResult(dateKey);
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const button = target.querySelector('button');
      if (button) button.focus({ preventScroll: true });
    }
  }

  function populateSelectors() {
    const r = getRefs();
    r.calendarJumpYear.replaceChildren();
    for (let year = Constants.MIN_YEAR; year <= Constants.MAX_YEAR; year += 1) {
      const option = document.createElement('option');
      option.value = String(year);
      option.textContent = `${year}년`;
      r.calendarJumpYear.appendChild(option);
    }
    r.calendarJumpMonth.replaceChildren();
    for (let month = 1; month <= 12; month += 1) {
      const option = document.createElement('option');
      option.value = String(month);
      option.textContent = `${month}월`;
      r.calendarJumpMonth.appendChild(option);
    }
    r.statusFilter.replaceChildren();
    Constants.FILTER_OPTIONS.forEach((item) => {
      const option = document.createElement('option');
      option.value = item.value;
      option.textContent = item.label;
      r.statusFilter.appendChild(option);
    });
  }

  function announce(message) {
    const r = getRefs();
    r.liveRegion.textContent = '';
    window.setTimeout(() => { r.liveRegion.textContent = message; }, 20);
  }

  function setupModal() {
    const r = getRefs();
    let lastFocused = null;

    function getFocusable() {
      return [...r.modalPanel.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
        .filter((element) => !element.disabled && !element.hidden);
    }

    function open() {
      lastFocused = document.activeElement;
      r.modal.hidden = false;
      r.modal.setAttribute('aria-hidden', 'false');
      r.body.classList.add('modal-open');
      r.modalClose.focus();
    }

    function close() {
      r.modal.hidden = true;
      r.modal.setAttribute('aria-hidden', 'true');
      r.body.classList.remove('modal-open');
      if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
    }

    r.modalOpen.addEventListener('click', open);
    r.modalClose.addEventListener('click', close);
    r.modal.addEventListener('mousedown', (event) => {
      if (event.target === r.modal) close();
    });
    document.addEventListener('keydown', (event) => {
      if (r.modal.hidden) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }
      if (event.key === 'Tab') {
        const focusable = getFocusable();
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    });
    return { open, close };
  }

  global.LunarBirthdayApp.UI = Object.freeze({
    cacheElements,
    getRefs,
    renderToday,
    setInputMode,
    showFormError,
    clearFormError,
    renderSummary,
    renderPrimaryResult,
    clearCalculationResult,
    renderRangeControls,
    renderResults,
    renderCalendar,
    renderDateDetail,
    setActiveResult,
    scrollToResult,
    populateSelectors,
    announce,
    setupModal,
    formatLunar
  });
})(window);
