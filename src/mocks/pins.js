// 내 핀 예시 데이터 (Figma N0.19 핀 · No.20 폴더A 화면에 나온 값 그대로)
// 처음 로그인한 사람에게 보여 줄 예시예요. 백엔드가 생기면 서버 값으로 바뀝니다.
// 코스 필드: id, title, distanceToStartKm(시작점까지 km), durationMin(예상 분), hasRestaurant, roadType, savedAt
const day = (n) => new Date(Date.UTC(2026, 9, n)).toISOString();

export const MOCK_PIN_FOLDERS = [
  {
    id: 'folder-a',
    name: '폴더A',
    createdAt: day(1),
    courses: [
      { id: 'pin-yeokgok', title: '역곡천 산책 코스', distanceToStartKm: 0.8, durationMin: 25, hasRestaurant: true, roadType: '평탄한 보행로', savedAt: day(20) },
      { id: 'pin-pureun', title: '푸른수목원 코스', distanceToStartKm: 2.4, durationMin: 28, hasRestaurant: true, roadType: '평탄한 보행로', savedAt: day(18) },
      { id: 'pin-catholic', title: '가톨릭대 둘레길', distanceToStartKm: 1.2, durationMin: 23, hasRestaurant: true, roadType: '경사진 보행로', savedAt: day(15) },
    ],
  },
  {
    id: 'folder-b',
    name: '폴더B',
    createdAt: day(2),
    courses: [
      { id: 'pin-sangdong', title: '상동호수공원 코스', distanceToStartKm: 3.1, durationMin: 30, hasRestaurant: true, roadType: '평탄한 보행로', savedAt: day(17) },
      { id: 'pin-dodang', title: '도당수목원 데크로드', distanceToStartKm: 4.0, durationMin: 10, hasRestaurant: false, roadType: '평탄한 보행로', savedAt: day(12) },
    ],
  },
  {
    id: 'folder-c',
    name: '폴더C',
    createdAt: day(3),
    courses: [
      { id: 'pin-central', title: '부천 중앙공원 코스', distanceToStartKm: 2.0, durationMin: 12, hasRestaurant: true, roadType: '평탄한 보행로', savedAt: day(19) },
      { id: 'pin-wonmi', title: '원미산 둘레길', distanceToStartKm: 1.6, durationMin: 40, hasRestaurant: false, roadType: '경사진 보행로', savedAt: day(14) },
      { id: 'pin-simgok', title: '심곡천 산책길', distanceToStartKm: 2.7, durationMin: 25, hasRestaurant: true, roadType: '평탄한 보행로', savedAt: day(11) },
    ],
  },
];
