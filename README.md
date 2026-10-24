# SOYO 프론트엔드 (PIP-Frontend)

React + Vite 웹 앱입니다.
백엔드: [PIP-Backend](https://github.com/Programing-in-pajama/PIP-Backend) · API 명세: [docs/API.md](https://github.com/Programing-in-pajama/PIP-Backend/blob/main/docs/API.md) · 배포: https://main.d3p7uoybais0cu.amplifyapp.com

> 🐣 **Git/GitHub 이 처음이라면 → [초보자 가이드](https://github.com/Programing-in-pajama/PIP-Backend/blob/main/docs/GUIDE.md) 부터 보세요!** (명령어 없이 더블클릭만으로)

---

## 🚀 개발 및 구현 진행 상황 (2026-10-24 최신)

### ✅ 마이페이지 회원정보 수정 및 기저질환 DB 동기화 검증 완료
1. **마이페이지 회원정보 수정 연동 (`src/pages/mypage/ProfileEditPage.jsx`)**:
   - 사용자 이름 및 생년월일 수정 후 저장 시 백엔드 API를 거쳐 Supabase `user_profiles` 테이블에 실시간 `UPDATE` 반영.
2. **기저질환 선택 및 관리 연동 (`src/pages/mypage/DiseaseSelectPage.jsx`)**:
   - 기저질환 카테고리별 다중 선택/해제/초기화 시 `diseaseIds` 배열이 Supabase `chronic_conditions` 컬럼과 실시간 동기화.
3. **프로필 로컬 캐시 및 DB 정합성 유지 (`src/api/user.js`, `src/api/auth.js`)**:
   - 마이페이지 진입 시 Supabase DB로부터 최신 회원정보와 기저질환 목록을 로드하여 화면 상태 유지 및 토스트 피드백 제공.

### ✅ 네이버 소셜 로그인 연동 및 사용자 온보딩 플로우 완료
1. **네이버 OAuth 2.0 공식 인증창 호출 (`src/pages/LoginPage.jsx`)**:
   - 네이버 Client ID 기반 인증 URL 동적 생성 및 CSRF 방지용 `state` 보안 토큰 적용
2. **리다이렉트 콜백 수신 및 백엔드 토큰 교환 (`src/App.jsx`)**:
   - `window.location.search`에서 `code`와 `state` 파라미터 감지 후 `POST /api/auth/naver`로 자동 전송
   - 발급된 JWT 토큰 및 유저 식별자 안전 저장
3. **신규 가입자 온보딩 최적화 (`src/pages/SignupFlow.jsx`)**:
   - 네이버/소셜 신규 유저는 1단계(비밀번호, 이메일 인증)를 건너뛰고 네이버 프로필(이름, 생년월일)이 자동 세팅된 **2단계 건강정보(알레르기, 기저질환, 복용약) 입력창으로 직행**
   - 일반 가입자는 기존대로 1단계부터 차례대로 진행하도록 완벽 분기
4. **기존 가입자 재로그인 프리패스**:
   - 이미 가입된 네이버 회원은 온보딩 절차 없이 **곧바로 마이페이지(메인)로 화면 자동 전환**
5. **로그아웃 세션 정리**:
   - 로그아웃 시 로컬 스토리지의 모든 인증 키(`soyo-jwt-token`, 유저 ID, 이메일) 일괄 제거

---

## 처음 실행하기
**가장 쉬운 방법:** 폴더 안의 `실행하기.bat` 더블클릭 (맥은 `맥용/실행하기.command`). 설치부터 실행까지 자동으로 해줘요.

| 더블클릭 파일 | 하는 일 |
|---|---|
| `작업시작.bat` | 최신 코드 받기 + 내 작업 공간(브랜치) 만들기 |
| `실행하기.bat` | 설치 + 개발 서버 실행 (브라우저 자동으로 열림) |
| `올리기.bat` | 저장(commit) + 올리기(push) + PR 페이지 열기 |
| `최신받기.bat` | 친구들이 합친 최신 코드 받기 |

(실제 동작은 `scripts/team.cjs` — 프론트/백엔드 레포에 같은 파일이 있으니 고칠 땐 양쪽 다)

터미널로 직접 하려면 (Node.js 20 이상 필요):

```bash
git clone https://github.com/Programing-in-pajama/PIP-Frontend.git
cd PIP-Frontend
npm install
cp .env.example .env      # Windows PowerShell: copy .env.example .env
npm run dev
```

http://localhost:5173 → 로그인 화면이 나와요. 가입한 계정이나 소셜 로그인으로 들어가고, **건너뛰기**를 누르면 로그인 없이 둘러볼 수 있어요.

> Supabase 키는 팀 단톡방 공지에서 받아 `.env` 에 넣으세요. 비워둬도 화면은 동작합니다.

## 🧪 백엔드 없이 개발하기
- 마이페이지 회원 정보는 백엔드(AWS RDS)와 연결돼 있고, 브라우저에도 캐시해 둬요 (`src/api/user.js`, `src/mocks/user.js`)
- **약물 검색**은 백엔드 API 가 생기기 전까지 `src/mocks/medications.js` 의 Figma 예시 데이터를 써요
- `.env` 의 `VITE_USE_MOCK=true` 는 예전 게시판 API 용 가짜 데이터 스위치예요.

## 폴더 구조
```
src/
  App.jsx               화면 흐름 · 라우팅 (로그인 → 메인, 하단 메뉴, 네이버 소셜 로그인 콜백 처리)
  main.jsx              시작 파일 (전체 CSS 불러오기)
  styles.css            로그인·회원가입 화면 CSS
  pages/                ★ 화면 한 장 전체
    LoginPage.jsx         로그인 (일반 로그인 + 네이버/카카오/구글 소셜 연동)
    SignupFlow.jsx        회원가입 1단계 계정 생성 / 2단계 건강 프로필 입력
    mypage/               마이페이지 탭 (Figma No.10 ~ no.19)
      MyPageFlow.jsx        화면 전환 (‹ 뒤로 가기 포함)
      MyPage.jsx            No.10 마이페이지
      ProfileEditPage.jsx   N0.11 회원정보 수정
      HealthManagePage.jsx  No.12 건강정보 관리
      DiseaseSelectPage.jsx No.12 기저질환 선택
      Allergy*.jsx          no.13 ~ no.16 알레르기 관리·수정·직접 입력
      Medication*.jsx       no.14 ~ no.17 복용 약물 관리·검색·상세·등록 확인
      DuplicateWarningPage.jsx no.18 성분 중복 주의
      common.jsx            제목 줄, 삭제 확인 팝업, 아이콘 등 공통 조각
      mypage.css            마이페이지 CSS (맨 위에 Figma 색상 모음)
  components/           ★ 화면 조각 (BottomNav 하단 메뉴 등)
  api/                  ★ 백엔드 호출 함수 (fetch 는 여기서만)
    client.js             공통 요청 함수 apiFetch / apiData / ApiError
    auth.js               인증·프로필 API (naverAuthCallback, saveUserProfile 등)
    user.js               회원 정보 (백엔드 프로필 API 연동 + 로컬 캐시)
    medications.js        약물 검색 (지금은 가짜 데이터)
  data/                 고정 목록
    chronicDiseases.js    만성질환 목록 (학술제_만성질환_목록표.xlsx 기준, 8개 분류 · 26개)
    allergens.js          알레르기 목록 (Figma no.14 기준, 식품 25종)
  mocks/                가짜 데이터 (백엔드 완성 전까지)
  utils/medications.js  성분 중복 검사
public/pic/             로고·소셜 아이콘 이미지
```

## 새 기능 추가하는 법 (예: 산책 기록)
1. 백엔드 `docs/API.md` 와 통합 변수 명세서(구글 문서)에서 변수 이름 확인 (없으면 백엔드 친구와 먼저 정하기)
2. `src/api/records.js` 에 호출 함수 작성 (`user.js` 참고)
3. 백엔드가 아직이면 `src/mocks/records.js` 에 가짜 데이터 작성
4. `src/pages/` 에 화면 만들고 `App.jsx` 또는 각 탭의 Flow 파일에 연결
5. 디자인은 **Figma 시안 그대로** (문구·색·순서). 시안에 없는 건 임의로 추가하지 말고 팀에 먼저 물어보기

## 협업 규칙
1. `main` 에서 바로 작업하지 말고 `작업시작.bat` 으로 작업 공간 만들기
2. 작업이 끝나면 `올리기.bat` → PR 만들고 **다른 친구 1명이 확인한 뒤** 합치기
3. API·변수 이름을 바꾸고 싶으면 먼저 단톡방에 알리기
4. GitHub 웹사이트의 **Upload files 는 쓰지 않기** (확인 없이 바로 실제 사이트에 반영돼요)

> ⚠️ `main` 에 합쳐지면 **AWS Amplify 실서버에 자동 배포**됩니다.

---

## 📝 작업 기록

### 1. 개발 환경 · 협업 세팅
- 백엔드 주소를 `.env` 로 관리 (`VITE_BACKEND_URL`), `.env.example` · `.env.production` 템플릿
- 백엔드 연결 확인 API(`/api/test`)와 연결 상태 표시 컴포넌트(`ApiHealthCheck`, 지금은 화면에서 숨김)
- 더블클릭 도우미 4개 (`작업시작` / `실행하기` / `올리기` / `최신받기`) + 초보자 가이드
- PR 템플릿, PR 마다 빌드 자동 검사(GitHub Actions)

### 2. 로그인 · 회원가입 (Chanu0525 작업을 프로젝트 구조로 이동 후 수정)
- 로그인 화면, 회원가입 1단계(계정)·2단계(나의 정보)
- 회의 결정 반영: 아이디 로그인 + 이메일 인증, 비밀번호 영문·숫자·특수문자 8자 이상
- 이후 sonminki07 · dev-jiwon520 이 실제 백엔드 인증(이메일 인증, AWS RDS 저장)과 네이버/카카오/구글 소셜 로그인 연결 (위 "개발 및 구현 진행 상황" 참고)
- 필수 약관 동의 · 건강 정보 이용 동의 체크박스
- 기저질환 선택을 엑셀 만성질환 목록으로 교체
- 변수 이름을 통합 변수 명세서 기준으로 정리 (`loginId`, `authMessage`, `diseaseIds`, `birthDate` 등)

### 3. 메인 화면 · 하단 메뉴
- 하단 메뉴 3개 (산책 / 홈 / 마이페이지) — 산책·홈은 "구현 예정" 안내
- 예전 임시 게시판 파일(AuthPanel · PostForm · PostList · api/posts)은 삭제 — 백엔드 팀이 연결 로직을 새로 짜기로 함

### 4. 마이페이지 (Figma 시안 18개 화면 그대로)
| Figma | 화면 | 파일 |
|---|---|---|
| No.10 | 마이페이지 (로그인 / 비로그인) | `MyPage.jsx` |
| N0.11 | 회원정보 수정 | `ProfileEditPage.jsx` |
| No.12 | 건강정보 관리 | `HealthManagePage.jsx` |
| No.12 | 기저질환 선택 (목록은 엑셀 기준) | `DiseaseSelectPage.jsx` |
| no.13 | 알레르기 관리 | `AllergyManagePage.jsx` |
| no.14 | 알레르기 수정 (있어요 25종 / 없어요) | `AllergyEditPage.jsx` |
| no.15 | 알레르기 직접 입력 | `AllergyCustomPage.jsx` |
| no.16 | 알레르기 삭제 확인 | `AllergyManagePage.jsx` (팝업) |
| no.14 | 복용 약물 관리 (목록 / 약물 없음) | `MedicationManagePage.jsx` |
| no.15 | 약물 검색 (결과 / 결과 없음) | `MedicationSearchPage.jsx` |
| No.16 | 약물 상세 | `MedicationDetailPage.jsx` |
| no.17 | 약물 등록 확인 | `MedicationConfirmPage.jsx` |
| no.18 | 성분 중복 주의 (같은 성분이 2개 이상 약물에 있으면 자동 표시) | `DuplicateWarningPage.jsx` |
| no.19 | 약물 삭제 확인 | `MedicationManagePage.jsx` (팝업) |

- 글꼴 Noto Sans KR, 색상은 Figma 값 그대로 (`mypage.css` 맨 위)
- 데이터 형식은 DB 설계(`user_profiles`, `user_medications`) 기준 — `birthDate`, `allergies`, `hasMedication`, 약물 `name / ingredientName / cautionNote …`
- 백엔드는 지금 약물 **이름만** 저장해요. 화면에서 고른 약물의 성분·주의사항은 브라우저 캐시에만 남아서, 다른 기기에서는 성분 중복 검사가 안 될 수 있어요 (백엔드에 `ingredient_name`, `caution_note` 저장이 추가되면 해결)
- 약물 이름·주의사항은 Figma 의 **예시 데이터** 그대로 (실제 정보는 백엔드가 식약처 데이터로 채울 예정)

### 5. 추가 수정 (회의 피드백)
- 생년월일: 키패드로 `20070305` 입력 → `2007-03-05` 자동 변환, 없는 날짜는 막음 (`src/utils/date.js`)
- 약물 검색 로딩 화면: "‘검색어’ 찾는 중…" + 5초 넘으면 서버가 느리다는 안내
- 버그 수정: 마이페이지 → 건강정보 관리가 기저질환 관리로 바로 넘어가던 문제

### 6. 아이디 / 비밀번호 찾기 (Figma No.1)
- 로그인 화면의 "아이디/비밀번호 찾기" → `FindAccountPage.jsx` (제목 글자를 눌러 탭 전환)
- 이메일 인증번호 전송·확인은 기존 백엔드 API 사용
- ⚠️ 아이디 조회 · 비밀번호 재설정 서버 API 는 아직 없어서 "서버 준비 중" 안내만 나와요 (파일 맨 위 TODO 참고)

### 7. 내 핀 탭 (하단 📍, Figma no.15 비회원 · N0.19 · No.20 · no.22)
| Figma | 화면 |
|---|---|
| no.15 비회원버전 | 로그인 안 했을 때: 제목 + 안내 문구만 |
| N0.19 핀 | 지도 위 시트에 폴더 목록 + 새 폴더 만들기 |
| No.20 | 폴더 상세: 정렬(최신순/가까운순/직접 정렬) · 식당 필터 · 삭제 · 저장 코스 선택 |
| no.22 | 새 폴더 만들기 |
- 파일: `src/pages/pins/` · 데이터 `src/api/pins.js` (예시 데이터 `src/mocks/pins.js`)
- 직접 정렬일 때만 ≡ 손잡이로 끌어서 순서 변경 (팀 규칙)
- ⚠️ 아직 백엔드 API 가 없어서 폴더·코스는 브라우저(localStorage)에만 저장돼요
- 지도 그림은 `PinMapBackdrop` 한 곳만 바꾸면 카카오 지도로 교체 가능 (지도 담당)
- "저장 코스 선택" → 지금은 홈 탭으로만 이동. 고른 코스로 산책 시작하는 연결은 지도 담당이 이어 주세요

### 아직 남은 것
- 아이디 찾기 · 비밀번호 재설정 · 내 핀 백엔드 API
- 지도 화면 (No.0 위치 허용, No.4~10, no.21) — 지도 담당
