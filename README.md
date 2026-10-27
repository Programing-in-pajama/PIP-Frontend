# SOYO 프론트엔드 (PIP-Frontend)

맞춤형 식이 및 산책 코스 추천 웰니스 플랫폼 **소요(SOYO)**의 프론트엔드 레포지토리입니다.  
React와 Vite 기반으로 구축되었으며, 실시간 Geolocation, 카카오 지도 SDK, 식약처 영양 DB 및 개인 맞춤형 건강 프로필 연동을 지원합니다.

- 서비스 배포 URL: https://main.d3p7uoybais0cu.amplifyapp.com/
- 백엔드 레포지토리: https://github.com/Programing-in-pajama/PIP-Backend
- UI/UX 디자인 시안: Figma 가이드라인 준수

---

## 1. 기술 스택

| 구분 | 기술 및 라이브러리 | 설명 |
|---|---|---|
| Framework / Build | React 18, Vite 5 | 컴포넌트 기반 UI 개발 및 고속 HMR 빌드 |
| Language / Styling | JavaScript (ES6+), Vanilla CSS | 커스텀 모바일 웹 뷰포트 스타일링 시스템 |
| Maps & Geo | Kakao Maps SDK v3, HTML5 Geolocation | 실시간 지도 렌더링, 보행 경로 표시 및 GPS 트래킹 |
| State & Storage | React Hooks, LocalStorage, SessionStorage | 인증 토큰 캐싱 및 사용자 세션 데이터 유지 |
| Backend & Auth | Supabase Client SDK, REST API | 사용자 계정 인증 및 백엔드 RESTful API 통신 |
| Deployment | AWS Amplify | GitHub main 브랜치 연동 자동 CI/CD 배포 |

---

## 2. 주요 기능 구현 현황

### 2.1 위치 기반 산책 탐색 및 권역 시각화
- HTML5 Geolocation API를 통한 실시간 사용자 GPS 위치 확인 및 역지오코딩(행정동명 추출)
- 사용자 현재 위치 중심 반경 540m 산책 권역 폴리곤 동적 렌더링
- 홈 화면 내 실시간 위치 펄스 마커 및 내 위치 재탐색(크로스헤어) 기능
- 부천시 행정동(역곡, 중동, 상동, 송내 등) 및 전국 단위 좌표 지원

### 2.2 보행 내비게이션 및 순환 코스 최적화
- 목표 산책 시간(10분 / 25분 / 60분) 및 식당 경유 여부에 따른 맞춤 코스 추천
- 둘레길 등 순환형(Loop) 코스 시작 시 사용자 위치 기반 최단 출발점 자동 회전 재배열
- 물리적 이동 거리(GPS) 기반 정밀 실측 보행 추적 (정지 시 거리 증가 방지 및 노이즈 필터링)
- 보행자 전용 도로망 기준 경로 분할 렌더링(지나온 길 / 앞으로 갈 길) 및 턴바이턴 안내
- Web Speech API를 활용한 음성 방향 안내 지원

### 2.3 회원 인증 및 맞춤형 건강 온보딩
- 일반 이메일/비밀번호 로그인 및 소셜 로그인(카카오, 구글) 연동
- 신규 회원 온보딩: 생년월일(달력 선택), 알레르기(25종 및 직접 입력), 만성질환(8개 범주 26종), 복용 약물 등록
- 비로그인 둘러보기(건너뛰기) 지원: 기본 산책로 탐색 기능 개방
- 아이디/비밀번호 찾기 UI 및 이메일 인증코드 입력 화면

### 2.4 안심 식당 및 영양 신호등 분석
- 코스 경유 식당의 외식영양성분(열량, 당류, 나트륨) 실시간 평가
- 사용자 기저질환(당뇨, 고혈압, 신장질환 등)과 연계된 3색 안심 신호등(초록/노랑/빨강) 판정
- 메뉴별 영양 주의사항 및 대체 가이드라인 제공

### 2.5 핀(코스 보관함) 및 마이페이지
- 관심 코스 북마크 및 폴더별 분류 관리
- 커스텀 드래그 앤 드롭 정렬 / 최신순 / 거리순 정렬 기능
- 마이페이지 내 건강정보 관리, 복용 약물 검색 및 동일 성분 중복 복용 주의 안내

---

## 3. 디렉터리 구조

```
src/
  api/                  백엔드 및 Supabase 연동 모듈 (auth, user, routes, pins 등)
  components/           공통 UI 컴포넌트 (지도, 하단 네비게이션, 모달, 바텀시트, 아이콘 등)
  data/                 기준 데이터 (만성질환, 알레르겐, 안심식당 DB, 코스 데이터)
  lib/                  외부 SDK 클라이언트 (kakao.js 등)
  mocks/                오프라인 테스트용 데이터
  pages/                주요 화면 플로우
    mypage/             마이페이지 및 건강정보 수정
    pins/               저장된 핀 및 폴더 관리
    FindAccountPage.jsx 아이디/비밀번호 찾기
    LocationGate.jsx    위치 권한 요청 및 초기화
    LoginPage.jsx       로그인 화면
    SignupFlow.jsx      회원가입 및 온보딩
    WalkFlow.jsx        메인 홈, 지역 검색, 추천 코스, 실시간 보행 내비게이션
  utils/                공통 유틸리티 (좌표 연산, 경로 스냅, 날짜/시간 포맷)
  App.jsx               라우팅 및 세션 관리
  main.jsx              애플리케이션 진입점
  styles.css            전역 스타일 시스템
```

---

## 4. 로컬 개발 환경 설정

### 4.1 요구 사항
- Node.js 20.0.0 이상
- npm 9.0.0 이상

### 4.2 설치 및 실행
```bash
# 1. 레포지토리 클론
git clone https://github.com/Programing-in-pajama/PIP-Frontend.git
cd PIP-Frontend

# 2. 패키지 설치
npm install

# 3. 환경 변수 설정
cp .env.example .env

# 4. 개발 서버 구동
npm run dev
```
로컬 개발 서버 주소: `http://localhost:5173`

### 4.3 빌드 및 검증
```bash
# 프로덕션 빌드 (타입 및 번들 검증)
npm run build

# 빌드 결과물 로컬 미리보기
npm run preview
```

---

## 5. 환경 변수 (.env) 설정 가이드

```env
VITE_BACKEND_URL=http://localhost:8080
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
VITE_KAKAO_MAP_API_KEY=<your-kakao-app-key>
```

---

## 6. 협업 및 기여 가이드라인

1. **브랜치 전략**: `main` 브랜치는 프로덕션 배포 브랜치이므로, 작업 시 기능별 브랜치(`feat/기능명`, `fix/버그명`)를 생성하여 진행합니다.
2. **코드 검증**: PR 제출 전 로컬 환경에서 `npm run build`를 반드시 실행하여 빌드 에러가 없는지 확인합니다.
3. **코드 리뷰**: 모든 PR은 최소 1인 이상의 코드 리뷰를 거쳐 `main` 브랜치에 병합(Squash and Merge)합니다.
4. **배포 반영**: `main` 브랜치에 코드가 푸시되면 AWS Amplify 파이프라인을 통해 실서버에 자동 반영됩니다.
