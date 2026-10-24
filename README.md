# SOYO 프론트엔드 (programing-in-pajama)

React + Vite 웹 앱입니다. 백엔드: [program-in-pazama](https://github.com/philip0613/program-in-pazama) · API 명세: [docs/API.md](https://github.com/philip0613/program-in-pazama/blob/main/docs/API.md)

> 🐣 **Git/GitHub 이 처음이라면 → [초보자 가이드](https://github.com/philip0613/program-in-pazama/blob/main/docs/GUIDE.md) 부터 보세요!** (명령어 없이 버튼으로만)

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
| `실행하기.bat` | 설치 + 개발 서버 실행 |
| `올리기.bat` | 저장(commit) + 올리기(push) + PR 페이지 열기 |
| `최신받기.bat` | 친구들이 합친 최신 코드 받기 |

(실제 동작은 `scripts/team.cjs` — 프론트/백엔드 레포에 같은 파일이 있으니 고칠 땐 양쪽 다)

터미널로 직접 하려면 (Node.js 20 이상 필요):

```bash
git clone https://github.com/philip0613/programing-in-pajama.git
cd programing-in-pajama
npm install
cp .env.example .env      # Windows PowerShell: copy .env.example .env
npm run dev
```

http://localhost:5173 을 열면 화면 위쪽에 백엔드 연결 상태가 보입니다.
- ✅ 연결 성공 → 백엔드도 켜져 있음
- ❌ 연결 실패 → 백엔드를 켜거나(백엔드 README 참고), 아래 **목 모드**를 사용

> Supabase 키는 팀 단톡방 공지에서 받아 `.env` 에 넣으세요. 비워두면 로그인만 안 되고 나머지 화면은 동작합니다.

## 🧪 백엔드 없이 개발하기 (목 모드)
`.env` 에서 `VITE_USE_MOCK=true` 로 바꾸고 `npm run dev` 를 다시 실행하면, 백엔드 대신 `src/mocks/` 의 가짜 데이터를 사용합니다.
백엔드 친구가 API를 아직 만들고 있어도 화면 작업을 먼저 할 수 있어요.

## 폴더 구조
```
src/
  App.jsx             화면 조립 및 라우팅 (네이버 소셜 로그인 콜백 처리)
  components/         ★ 화면 조각 — 대부분의 작업은 여기서
    AuthPanel.jsx       로그인/로그아웃
    PostForm.jsx        글 작성
    PostList.jsx        글 목록
    ApiHealthCheck.jsx  백엔드 연결 상태 표시
  pages/              주요 페이지 컴포넌트
    LoginPage.jsx       로그인 화면 (일반 로그인 및 네이버/카카오/구글 소셜 연동)
    SignupFlow.jsx      회원가입 플로우 (1단계 계정 생성 / 2단계 건강 프로필 입력)
    mypage/             마이페이지 플로우
  api/                ★ 백엔드 호출 함수 (fetch 는 여기서만)
    client.js           공통 요청 함수 apiFetch
    auth.js             인증/프로필 API (naverAuthCallback, saveUserProfile 등)
    posts.js            게시글 API
  mocks/              목 모드용 가짜 데이터
```

## 협업 규칙
1. `main` 에서 바로 작업하지 말고 `작업시작.bat` 으로 작업 공간 만들기
2. 작업이 끝나면 `올리기.bat` → PR 만들고 **다른 친구 1명이 확인한 뒤** 합치기
3. API를 바꾸고 싶으면 먼저 백엔드 `docs/API.md` 수정 + 단톡방에 알리기

> ⚠️ `main` 에 합쳐지면 **AWS Amplify 실서버에 자동 배포**됩니다.
