# Lunar Birthday Calculator | 음력 생일 계산기

한국에서 음력 생일을 챙기는 사용자가 **양력 또는 음력 생년월일을 입력해 연도별 실제 양력 생일 날짜와 만 나이를 확인할 수 있는 브라우저 기반 웹 서비스**입니다.

모든 날짜 계산은 사용자의 브라우저 안에서 처리되며, 생년월일이나 계산 결과를 서버에 저장하지 않습니다.

---

## 🔗 Live Demo

### [👉 음력 생일 계산기 바로가기](YOUR_DEPLOYMENT_URL)

> 지원 범위: 1900-01-01 ~ 2050-12-31

<!--
배포 후 아래와 같이 화면 캡처를 추가하는 것을 추천합니다.

![Desktop Preview](./docs/demo-desktop.png)
![Mobile Preview](./docs/demo-mobile.gif)
-->

---

## 🛠 Tech Stack

| Category | Technology |
| --- | --- |
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Lunar Calendar | `korean-lunar-calendar` |
| Architecture | Modular JavaScript, Static Web Application |
| Testing | Browser-based JavaScript Test Runner |
| Deployment | GitHub Pages / Netlify / Vercel compatible |

별도의 프레임워크, 백엔드, 데이터베이스 또는 외부 날짜 변환 API를 사용하지 않습니다.

---

## 🚀 Getting Started

### 1. Repository Clone

```bash
git clone https://github.com/alexjhlee4/lunar-birthday-calculator.git
cd lunar-birthday-calculator
```

### 2. 실행

별도의 패키지 설치나 빌드 과정이 필요하지 않습니다.

#### 권장: VS Code Live Server

1. VS Code에서 프로젝트 폴더를 엽니다.
2. `Live Server` 확장 프로그램을 설치합니다.
3. `index.html`을 우클릭합니다.
4. **Open with Live Server**를 선택합니다.

또는 대부분의 최신 브라우저에서는 `index.html`을 직접 열어 실행할 수도 있습니다.

---

## 🔐 Environment Variables

이 프로젝트는 **환경 변수를 사용하지 않습니다.**

```text
.env 파일 필요 없음
API Key 필요 없음
외부 API 요청 없음
```

따라서 `.env` 또는 `.env.example` 파일을 별도로 생성할 필요가 없습니다.

> 향후 외부 API가 추가될 경우 실제 키는 저장소에 커밋하지 않고 `.env`에서 관리하며, 변수 이름만 포함한 `.env.example`을 제공할 예정입니다.

---

## ✅ Implemented Features

### Must

- [x] 양력 생년월일 → 한국 음력 날짜 변환
- [x] 음력 생년월일 → 실제 양력 출생일 변환
- [x] 평달 / 윤달 입력 및 존재하지 않는 윤달 검증
- [x] 선택한 양력 연도를 기준으로 연도별 음력 생일 계산
- [x] 5년 / 10년 / 20년 / 30년 조회
- [x] 윤달이 없는 해의 동일 월·일 평달 대체
- [x] 작은달에서 음력 30일 → 29일 자동 조정
- [x] 실제 양력 출생일 기준 만 나이 계산
- [x] 1900~2050년 지원 범위 검증

### Should

- [x] 태어난 음력 연도 기준 연간지 표시
- [x] 월간 달력 및 월·연도 이동
- [x] 계산 결과 ↔ 달력 양방향 이동
- [x] 특정 연도 검색 및 결과 상태 필터링
- [x] 데스크톱 / 모바일 반응형 결과 UI
- [x] 키보드 접근성 및 모달 Focus Trap
- [x] 입력 데이터 서버 미전송 및 브라우저 내부 계산

---

## 🧠 Core Implementation Logic

### 1. Solar ↔ Lunar Date Normalization

사용자가 **양력과 음력 중 어떤 날짜를 알고 있는지**에 따라 입력 처리 방식을 분리했습니다.

```text
양력 입력
→ 유효한 양력 날짜인지 검증
→ 음력 날짜로 변환
→ 변환된 음력 월·일을 생일 기준으로 사용

음력 입력
→ 윤달 여부 및 날짜 검증
→ 실제 양력 출생일로 변환
→ 입력한 음력 월·일을 생일 기준으로 사용
```

이를 통해 두 입력 방식 모두 이후 계산 과정에서는 동일한 형태의 데이터로 처리됩니다.

---

### 2. Solar-Year Based Birthday Search

음력 생일은 음력 연도가 아니라 **사용자가 보고 싶은 양력 연도**를 기준으로 결과를 제공합니다.

예를 들어 `2026년 생일`은:

```text
2026-01-01 ~ 2026-12-31
```

사이에 발생하는 해당 음력 월·일을 의미합니다.

하나의 양력 연도 안에 인접한 음력 연도의 같은 월·일이 들어올 수 있기 때문에 대상 연도마다:

```text
targetYear - 1
targetYear
targetYear + 1
```

의 음력 연도를 함께 검사한 뒤, 변환된 양력 날짜가 실제 대상 연도에 속하는 경우만 결과에 포함합니다.

---

### 3. Leap-Month Policy

윤달 생일의 경우 대상 음력 연도에 동일한 윤달이 존재하는지 먼저 확인합니다.

```text
같은 윤달 존재
→ 기존 윤달 날짜 사용

같은 윤달 없음
→ 같은 월·일의 평달로 대체
```

대체가 발생한 결과에는 별도의 상태값을 저장하여 UI에서 사용자에게 명확하게 안내합니다.

```text
LEAP_ORIGINAL
LEAP_TO_REGULAR
```

---

### 4. Small-Month Adjustment

음력은 월에 따라 29일까지 존재하는 **작은달**과 30일까지 존재하는 **큰달**이 있습니다.

음력 30일 생일인데 해당 연도의 월이 작은달인 경우:

```text
음력 30일
↓
해당 월 길이 확인
↓
29일까지만 존재
↓
음력 29일로 조정
```

조정 여부는 다음 상태값으로 별도 관리합니다.

```text
DAY_30_TO_29
```

윤달 대체와 29일 조정이 동시에 발생하는 경우 두 원인을 모두 보존합니다.

---

### 5. International Age Calculation

만 나이는 음력 생일 날짜가 아니라 **실제 양력 출생일**을 기준으로 계산합니다.

```text
target year - birth year
```

을 기본값으로 사용한 뒤, 해당 연도의 실제 양력 생일이 지나지 않았다면 1을 차감합니다.

음력으로 출생일을 입력한 경우에도 먼저 실제 양력 출생일을 계산한 뒤 동일한 규칙을 적용합니다.

---

### 6. Date & Time-Zone Safety

JavaScript의 UTC 변환으로 날짜가 하루씩 밀리는 문제를 피하기 위해 핵심 날짜 계산에서 문자열 기반 UTC 변환을 사용하지 않습니다.

대신 날짜 객체를 로컬 시간 **정오(12:00)** 기준으로 생성하고:

```javascript
new Date(year, month - 1, day, 12, 0, 0)
```

날짜 식별자는 연·월·일 숫자를 직접 조합합니다.

```text
YYYY-MM-DD
```

이를 통해 시간대 및 DST 경계에서 날짜가 의도치 않게 변경될 가능성을 줄였습니다.

---

### 7. Calendar Synchronization

달력은 항상 **6주 × 7일 = 42개 셀**을 생성합니다.

각 날짜 셀에는:

- 양력 날짜
- 대응되는 음력 날짜
- 오늘 여부
- 선택 여부
- 음력 생일 여부
- 해당 날짜의 만 나이

정보를 연결합니다.

결과 목록에서 **달력에서 보기**를 선택하면 해당 날짜로 달력이 이동하고, 달력의 생일 날짜를 선택하면 연결된 결과 항목을 다시 찾을 수 있도록 `dateKey`를 공통 식별자로 사용합니다.

---

## 📁 Project Structure

```text
lunar-birthday-calculator/
├── index.html          # Main UI and application entry point
├── css/                # Responsive layout and visual styles
├── js/                 # Date, lunar birthday, calendar, UI and app logic
└── vendor/ + tests/    # Lunar conversion library and browser tests
```

### JavaScript Modules

| File | Responsibility |
| --- | --- |
| `constants.js` | 지원 범위, 상태 코드, 공통 설정 |
| `date-utils.js` | 날짜 검증, 이동, 비교 및 날짜 키 생성 |
| `lunar-adapter.js` | 음양력 변환 라이브러리 추상화 |
| `birthday-service.js` | 생일 계산, 윤달 및 작은달 정책 |
| `age-service.js` | 실제 만 나이 계산 |
| `calendar.js` | 42셀 달력 생성 및 결과 동기화 |
| `filters.js` | 연도 검색 및 상태 필터 |
| `ui.js` | DOM 렌더링 및 접근성 처리 |
| `app.js` | 앱 상태 관리 및 전체 이벤트 흐름 |

---

## 🧪 Testing

브라우저에서 실제 음양력 변환 모듈과 서비스 로직을 함께 검증하는 테스트 러너를 제공합니다.

```text
tests/test-runner.html
tests/test-cases.js
```

주요 테스트 범위:

- 양력 ↔ 음력 변환
- 존재하지 않는 윤달 차단
- 윤달 → 평달 대체
- 음력 30일 → 29일 조정
- 윤달 + 작은달 복합 조정
- 1900 / 2050 지원 범위 경계
- 달력 이동 경계
- 결과 ↔ 달력 동기화
- 연도 및 상태 필터
- 생일 전·당일·후 만 나이 계산
- 2월 29일 출생자 처리

테스트는 `tests/test-runner.html`을 Live Server로 실행하여 확인할 수 있습니다.

---

## 📌 Limitations

- 한국 음력만 지원합니다.
- 서비스 날짜 지원 범위는 `1900-01-01 ~ 2050-12-31`입니다.
- 사용자 입력 또는 계산 결과를 저장하지 않습니다.
- 회원가입, 알림, 서버 동기화 기능은 제공하지 않습니다.
- 윤달이 없는 해에는 동일 월·일의 평달을 사용하는 서비스 정책을 적용합니다.
- 작은달에서 음력 30일은 해당 월의 마지막 날인 29일로 조정합니다.

이 서비스는 가족의 음력 생일 확인을 돕기 위한 도구이며, 법률·행정 목적의 공식 날짜 증명 자료를 제공하지 않습니다.

---

## 📚 Lunar Calendar Library

음양력 변환에는 `korean-lunar-calendar` 기반의 브라우저용 로컬 빌드를 사용합니다.

- Upstream: `usingsky/korean_lunar_calendar_js`
- Reference version: `0.4.0`
- License: MIT
- Runtime network request: 없음

서드파티 라이선스 전문은 `vendor/LICENSE`에서 확인할 수 있습니다.

---

## 👤 Author

**Alex Lee**

- GitHub: https://github.com/alexjhlee4
