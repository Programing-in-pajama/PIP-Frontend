// 🌿 부천 역곡 지역 실제 음식점 및 식약처 외식영양성분DB(I2790) 실측 매핑 데이터셋
// 식당 이름 + 위치(위도, 경도, 도로명주소) + 대표 음식(열량, 나트륨, 당류, 신호등 등급)

export const YEOKGOK_RESTAURANTS = [
  {
    id: 'rest-yeokgok-01',
    name: '장모님 보리밥집',
    category: '한식 / 보리밥·청국장',
    isSafeRestaurant: false,
    location: {
      lat: 37.48720,
      lng: 126.81220,
      address: '경기 부천시 원미구 역곡로26번길 20 (역곡상상시장)',
      area: '역곡상상시장',
    },
    foods: [
      {
        name: '옛날 산채 보리밥',
        calories: 420,
        sodium: 310,
        sugar: 1.2,
        protein: 11,
        grade: 'green',
        label: '초록 안심 (극저염·식이섬유 풍부)',
        description: '나트륨과 당류가 매우 낮아 고혈압·당뇨 환자에게 최고의 안심 식단입니다.'
      },
      {
        name: '토골 청국장찌개',
        calories: 290,
        sodium: 820,
        sugar: 2.1,
        protein: 19,
        grade: 'green',
        label: '초록 안심 (발효 식물성 단백질)',
        description: '콩 발효 단백질이 풍부하고 자극적이지 않아 편안하게 드실 수 있습니다.'
      }
    ]
  },
  {
    id: 'rest-yeokgok-02',
    name: '들깨랑보리보리',
    category: '한식 / 국수·보리밥',
    isSafeRestaurant: false,
    location: {
      lat: 37.48671,
      lng: 126.81143,
      address: '경기 부천시 원미구 역곡로 16',
      area: '역곡역 북부',
    },
    foods: [
      {
        name: '구수한 보리밥 정식',
        calories: 420,
        sodium: 310,
        sugar: 1.2,
        protein: 11,
        grade: 'green',
        label: '초록 안심 (저염·저당)',
        description: '신선한 나물과 보리밥의 조화로 혈당 상승을 완만하게 돕습니다.'
      },
      {
        name: '고소한 들깨 칼국수',
        calories: 520,
        sodium: 980,
        sugar: 2.5,
        protein: 14,
        grade: 'yellow',
        label: '노랑 주의 (국물 섭취 조절)',
        description: '들깨의 불포화지방산은 우수하나 국물 나트륨이 있으므로 면과 건더기 위주로 드세요.'
      }
    ]
  },
  {
    id: 'rest-yeokgok-03',
    name: '소담촌 역곡직영점',
    category: '샤브샤브 / 웰빙 뷔페',
    isSafeRestaurant: true,
    location: {
      lat: 37.48469,
      lng: 126.81190,
      address: '경기 부천시 소사구 경인로 511',
      area: '역곡역 남부',
    },
    foods: [
      {
        name: '월남쌈 소고기 샤브샤브',
        calories: 420,
        sodium: 680,
        sugar: 3.2,
        protein: 26,
        grade: 'green',
        label: '초록 안심 (채소 풍부·고단백)',
        description: '다양한 신선 채소와 기름기 뺀 소고기로 당뇨·만성질환에 매우 유익합니다.'
      },
      {
        name: '버섯야채 샤브샤브',
        calories: 360,
        sodium: 720,
        sugar: 2.8,
        protein: 21,
        grade: 'green',
        label: '초록 안심 (식이섬유 우수)',
        description: '버섯의 베타글루칸이 면역력과 혈관 탄력을 돕는 건강 식단입니다.'
      }
    ]
  },
  {
    id: 'rest-yeokgok-04',
    name: '미락생선조림구이',
    category: '한식 / 생선구이·조림',
    isSafeRestaurant: false,
    location: {
      lat: 37.48620,
      lng: 126.80950,
      address: '경기 부천시 원미구 부일로725번길 14',
      area: '역곡역 북부',
    },
    foods: [
      {
        name: '노릇한 고등어구이 백반',
        calories: 380,
        sodium: 520,
        sugar: 0.5,
        protein: 32,
        grade: 'green',
        label: '초록 안심 (오메가3 풍부·저당)',
        description: '당류가 거의 없고 오메가3 불포화지방산이 풍부해 심혈관 질환에 강력 추천합니다.'
      },
      {
        name: '칼칼한 갈치조림 백반',
        calories: 320,
        sodium: 1450,
        sugar: 6.2,
        protein: 24,
        grade: 'yellow',
        label: '노랑 주의 (양념 국물 주의)',
        description: '조림 양념에 나트륨이 포함되어 있으므로 생선 살코기 위주로 드시는 것이 좋습니다.'
      }
    ]
  },
  {
    id: 'rest-yeokgok-05',
    name: '예향정 부천역곡점',
    category: '한식 / 쌈밥·찌개',
    isSafeRestaurant: false,
    location: {
      lat: 37.48680,
      lng: 126.80450,
      address: '경기 부천시 원미구 지봉로 34',
      area: '가톨릭대 방면',
    },
    foods: [
      {
        name: '직화 두루치기 쌈밥정식',
        calories: 590,
        sodium: 1180,
        sugar: 11.2,
        protein: 28,
        grade: 'yellow',
        label: '노랑 주의 (신선 쌈채소와 함께)',
        description: '풍성한 쌈채소를 2~3장씩 함께 싸서 드시면 나트륨과 당 흡수를 크게 억제할 수 있습니다.'
      },
      {
        name: '구수한 차돌 된장찌개',
        calories: 310,
        sodium: 1240,
        sugar: 3.2,
        protein: 16,
        grade: 'yellow',
        label: '노랑 주의 (건더기 위주 섭취)',
        description: '국물 대신 두부와 채소 건더기 위주로 드시면 훌륭한 단백질 식단이 됩니다.'
      }
    ]
  },
  {
    id: 'rest-yeokgok-06',
    name: '본가닭탕 역곡본점',
    category: '한식 / 닭한마리',
    isSafeRestaurant: false,
    location: {
      lat: 37.48355,
      lng: 126.81222,
      address: '경기 부천시 소사구 부광로8번길 11',
      area: '역곡역 남부',
    },
    foods: [
      {
        name: '맑은 닭한마리 (닭탕)',
        calories: 480,
        sodium: 840,
        sugar: 1.5,
        protein: 38,
        grade: 'green',
        label: '초록 안심 (고단백·극저당 보양식)',
        description: '자극적이지 않은 맑은 닭 육수와 닭가슴살/살코기로 기력 회복과 근육 유지에 좋습니다.'
      },
      {
        name: '든든한 닭곰탕',
        calories: 410,
        sodium: 790,
        sugar: 1.2,
        protein: 30,
        grade: 'green',
        label: '초록 안심 (저염 보양식)',
        description: '소금을 추가하지 않고 후추와 파 위주로 간을 맞추시면 안심하고 드실 수 있습니다.'
      }
    ]
  },
  {
    id: 'rest-yeokgok-07',
    name: '8개월냉면',
    category: '한식 / 냉면·황태국',
    isSafeRestaurant: false,
    location: {
      lat: 37.48793,
      lng: 126.81189,
      address: '경기 부천시 원미구 역곡로26번길 25 (상상시장 서문 앞)',
      area: '역곡상상시장',
    },
    foods: [
      {
        name: '담백한 황태 북어국',
        calories: 230,
        sodium: 890,
        sugar: 1.1,
        protein: 26,
        grade: 'green',
        label: '초록 안심 (고단백·저열량)',
        description: '칼로리가 낮고 순수 단백질과 아미노산이 풍부해 위에 부담을 주지 않습니다.'
      },
      {
        name: '시원한 함흥 물냉면',
        calories: 460,
        sodium: 1280,
        sugar: 14.5,
        protein: 15,
        grade: 'yellow',
        label: '노랑 주의 (육수 원샷 주의)',
        description: '시원한 맛에 육수를 다 마시면 나트륨이 초과될 수 있으니 면 위주로 즐겨주세요.'
      }
    ]
  },
  {
    id: 'rest-yeokgok-08',
    name: '미담향샤브칼국수 부천본점',
    category: '샤브샤브 / 칼국수',
    isSafeRestaurant: false,
    location: {
      lat: 37.48550,
      lng: 126.81350,
      address: '경기 부천시 원미구 역곡로 10',
      area: '역곡역 북부',
    },
    foods: [
      {
        name: '버섯 미나리 샤브샤브',
        calories: 360,
        sodium: 780,
        sugar: 2.8,
        protein: 22,
        grade: 'green',
        label: '초록 안심 (미나리 항산화)',
        description: '미나리의 풍부한 칼륨과 섬유질이 혈관 속 노폐물 배출을 돕습니다.'
      },
      {
        name: '시원한 바지락 칼국수',
        calories: 430,
        sodium: 1380,
        sugar: 2.1,
        protein: 17,
        grade: 'yellow',
        label: '노랑 주의 (나트륨 조절)',
        description: '해물 육수 특성상 염분이 있으므로 국물을 적당량 남기시는 것을 권장합니다.'
      }
    ]
  },
  {
    id: 'rest-yeokgok-09',
    name: '작동오리불고기',
    category: '한식 / 오리전문 (안심식당)',
    isSafeRestaurant: true,
    location: {
      lat: 37.50200,
      lng: 126.81500,
      address: '경기 부천시 오정구 역곡로344번길 16',
      area: '역곡 북부·작동',
    },
    foods: [
      {
        name: '한방 오리백숙',
        calories: 430,
        sodium: 580,
        sugar: 0.8,
        protein: 36,
        grade: 'green',
        label: '초록 안심 (저염·저당 한방 보양)',
        description: '부천시 지정 안심식당으로 위생적이며, 한방 약재와 오리고기의 보양 효과가 탁월합니다.'
      },
      {
        name: '오리불고기 쌈밥',
        calories: 520,
        sodium: 890,
        sugar: 7.5,
        protein: 29,
        grade: 'green',
        label: '초록 안심 (불포화지방산 풍부)',
        description: '오리의 풍부한 불포화지방산이 혈관을 부드럽게 지켜주는 훌륭한 산책 후 식단입니다.'
      }
    ]
  },
  {
    id: 'rest-yeokgok-10',
    name: '풍년명절',
    category: '한정식 / 보리굴비 (안심식당)',
    isSafeRestaurant: true,
    location: {
      lat: 37.50150,
      lng: 126.81200,
      address: '경기 부천시 원미구 역곡로324번길 67',
      area: '역곡 생활권',
    },
    foods: [
      {
        name: '영광 보리굴비 정식',
        calories: 340,
        sodium: 1100,
        sugar: 1.8,
        protein: 28,
        grade: 'yellow',
        label: '노랑 주의 (녹차물과 균형 식사)',
        description: '보리굴비 자체의 염분이 있으니 시원한 녹차물 밥과 곁들여 적당량 섭취를 권합니다.'
      },
      {
        name: '명품 간장게장 백반',
        calories: 290,
        sodium: 2200,
        sugar: 7.8,
        protein: 22,
        grade: 'red',
        label: '빨강 주의 (고나트륨 경고)',
        description: '고혈압 및 만성 신장질환 환자는 염분 함량이 매우 높아 섭취에 주의가 필요합니다.'
      }
    ]
  },
  {
    id: 'rest-yeokgok-11',
    name: '경인로570숯불구이',
    category: '한식 / 숯불구이·갈비탕',
    isSafeRestaurant: false,
    location: {
      lat: 37.48645,
      lng: 126.81757,
      address: '경기 부천시 소사구 경인로 570',
      area: '역곡역 남부',
    },
    foods: [
      {
        name: '영양 솥밥 된장정식',
        calories: 380,
        sodium: 1100,
        sugar: 2.5,
        protein: 15,
        grade: 'yellow',
        label: '노랑 보통 (잡곡 솥밥 식이섬유)',
        description: '갓 지은 솥밥과 정갈한 반찬으로 든든하게 즐길 수 있는 식단입니다.'
      },
      {
        name: '한우 왕갈비탕',
        calories: 450,
        sodium: 1650,
        sugar: 2.1,
        protein: 34,
        grade: 'red',
        label: '빨강 주의 (국물 남기기 필수)',
        description: '고단백 식사이나 고기 국물의 나트륨 함량이 높으니 밥을 말지 말고 고기 위주로 드세요.'
      }
    ]
  },
  {
    id: 'rest-yeokgok-12',
    name: 'the 53',
    category: '한식 / 제육·불고기',
    isSafeRestaurant: false,
    location: {
      lat: 37.48720,
      lng: 126.80350,
      address: '경기 부천시 원미구 지봉로 53',
      area: '가톨릭대 정문',
    },
    foods: [
      {
        name: '직화 제육볶음 정식',
        calories: 580,
        sodium: 1250,
        sugar: 10.8,
        protein: 27,
        grade: 'yellow',
        label: '노랑 주의 (양념 국물 비비지 않기)',
        description: '직화 향의 든든한 고기 반찬으로, 밥은 2/3 공기만 드시면 칼로리를 알맞게 맞출 수 있습니다.'
      },
      {
        name: '매콤 오삼불고기',
        calories: 540,
        sodium: 1190,
        sugar: 9.5,
        protein: 29,
        grade: 'yellow',
        label: '노랑 주의 (오징어 타우린 풍부)',
        description: '오징어의 타우린이 피로 해소를 돕습니다. 쌈채소를 곁들여 드세요.'
      }
    ]
  },
  {
    id: 'rest-yeokgok-13',
    name: '신동랩 역곡점',
    category: '일식 / 연어덮밥·규카츠',
    isSafeRestaurant: false,
    location: {
      lat: 37.48600,
      lng: 126.80800,
      address: '경기 부천시 원미구 역곡로13번길 15',
      area: '역곡역 북부',
    },
    foods: [
      {
        name: '사케동 (생연어덮밥)',
        calories: 520,
        sodium: 540,
        sugar: 3.1,
        protein: 31,
        grade: 'green',
        label: '초록 안심 (건강한 연어 오메가3)',
        description: '나트륨과 당분이 낮고 양질의 연어 단백질이 가득해 혈관 건강에 아주 좋습니다.'
      },
      {
        name: '규카츠 정식',
        calories: 680,
        sodium: 960,
        sugar: 5.2,
        protein: 33,
        grade: 'yellow',
        label: '노랑 보통 (소고기 단백질)',
        description: '소고기 단백질이 풍부하나 튀김옷이 있으므로 와사비와 샐러드를 듬뿍 곁들여 드세요.'
      }
    ]
  },
  {
    id: 'rest-yeokgok-14',
    name: '조부장네 밥집',
    category: '한식 / 가정식 백반',
    isSafeRestaurant: false,
    location: {
      lat: 37.48700,
      lng: 126.81250,
      address: '경기 부천시 원미구 역곡로26번길 18 (역곡상상시장)',
      area: '역곡상상시장',
    },
    foods: [
      {
        name: '오늘의 가정식 백반',
        calories: 510,
        sodium: 980,
        sugar: 4.8,
        protein: 23,
        grade: 'yellow',
        label: '노랑 보통 (균형 잡힌 집밥)',
        description: '자극적이지 않은 제철 반찬으로 속 편안하게 식사할 수 있는 정겨운 밥집입니다.'
      },
      {
        name: '해물 순두부찌개',
        calories: 260,
        sodium: 1150,
        sugar: 2.9,
        protein: 18,
        grade: 'yellow',
        label: '노랑 주의 (순두부 단백질 우수)',
        description: '순두부의 풍부한 식물성 단백질이 좋으며, 국물보다는 순두부 위주로 드세요.'
      }
    ]
  },
  {
    id: 'rest-yeokgok-15',
    name: '역곡 손칼국수 & 콩국수',
    category: '한식 / 콩국수·칼국수',
    isSafeRestaurant: false,
    location: {
      lat: 37.48580,
      lng: 126.81100,
      address: '경기 부천시 원미구 부일로 718',
      area: '역곡역 사거리',
    },
    foods: [
      {
        name: '진한 서리태 콩국수',
        calories: 510,
        sodium: 480,
        sugar: 3.0,
        protein: 28,
        grade: 'green',
        label: '초록 안심 (극저염·식물성 고단백 강추)',
        description: '소금을 거의 넣지 않고 갈아낸 콩물은 고혈압·당뇨·신장 환자 모두에게 최상의 건강식입니다.'
      },
      {
        name: '바지락 옛날 손칼국수',
        calories: 430,
        sodium: 1380,
        sugar: 2.1,
        protein: 16,
        grade: 'yellow',
        label: '노랑 주의 (국물 염분 조절)',
        description: '시원한 바지락의 타우린이 우수하지만, 국물 나트륨이 높으므로 면과 바지락 위주로 드세요.'
      }
    ]
  }
];

// Helper: 전체 역곡 식당 목록 조회
export function getYeokgokRestaurants() {
  return YEOKGOK_RESTAURANTS;
}

// Helper: ID로 식당 단건 조회
export function getRestaurantById(id) {
  return YEOKGOK_RESTAURANTS.find((r) => r.id === id) || null;
}

// Helper: 특정 좌표(위경도) 기준 가까운 식당 찾기
export function findNearbyRestaurants(lat, lng, maxDistanceKm = 0.8) {
  return YEOKGOK_RESTAURANTS.map((rest) => {
    const dLat = (rest.location.lat - lat) * 111;
    const dLng = (rest.location.lng - lng) * 88.8;
    const distanceKm = Math.sqrt(dLat * dLat + dLng * dLng);
    return { ...rest, distanceKm };
  })
    .filter((rest) => rest.distanceKm <= maxDistanceKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}
