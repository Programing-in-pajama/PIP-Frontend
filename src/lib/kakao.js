// 카카오맵 SDK 로더
// .env 의 VITE_KAKAO_MAP_KEY 값을 사용합니다.
// 키가 없거나 도메인 승인/네트워크 문제로 로드되지 않으면 호출부에서 일러스트 지도로 대체합니다.

// 기존 프로젝트에서 사용하던 JavaScript 키 (배포 도메인에 등록되어 있다면 바로 동작합니다)
const LEGACY_APP_KEY = 'b88cc92c96bd5bcf8d859631f249d305';

const ENV_APP_KEY = (import.meta.env.VITE_KAKAO_MAP_KEY || '').trim();
export const KAKAO_APP_KEY = (ENV_APP_KEY || LEGACY_APP_KEY).trim();

// 로컬 개발 도메인은 카카오 콘솔에 따로 등록해야 합니다.
// .env 키를 넣거나 아래 LEGACY_APP_KEY 를 본인 키로 바꾸면 로컬에서도 시도합니다.
const KEY_WAS_CUSTOMIZED = Boolean(ENV_APP_KEY) || KAKAO_APP_KEY !== LEGACY_APP_KEY;
const isLocalHost =
  typeof window !== 'undefined' &&
  ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);

let loadPromise = null;

export function loadKakaoMaps() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('카카오맵은 브라우저에서만 사용할 수 있어요.'));
  }
  if (window.__soyoKakaoReady && window.kakao?.maps) {
    return Promise.resolve(window.kakao);
  }
  if (!KAKAO_APP_KEY) {
    return Promise.reject(new Error('VITE_KAKAO_MAP_KEY 가 설정되지 않았어요.'));
  }
  if (isLocalHost && !KEY_WAS_CUSTOMIZED) {
    return Promise.reject(
      new Error('로컬 도메인은 카카오 콘솔에 등록되어 있지 않아 일러스트 지도로 표시합니다.'),
    );
  }
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    let settled = false;
    let timer = null;
    let script = document.querySelector('script[data-soyo-kakao]');

    const cleanup = () => {
      if (script) {
        script.removeEventListener('load', boot);
        script.removeEventListener('error', fail);
      }
      if (timer) clearTimeout(timer);
    };

    const succeed = () => {
      if (settled) return;
      settled = true;
      window.__soyoKakaoReady = true;
      cleanup();
      resolve(window.kakao);
    };

    const fail = (error) => {
      if (settled) return;
      settled = true;
      cleanup();
      console.warn('⚠️ [카카오맵] 지도를 불러오지 못해 일러스트 지도로 표시합니다:', error?.message || error);
      reject(error instanceof Error ? error : new Error(String(error)));
    };

    function boot() {
      if (!window.kakao?.maps?.load) {
        fail(new Error('카카오맵 SDK를 찾을 수 없어요.'));
        return;
      }
      try {
        window.kakao.maps.load(succeed);
      } catch (error) {
        fail(error);
      }
    }

    timer = setTimeout(() => fail(new Error('카카오맵 로드 시간이 초과되었어요.')), 8000);

    if (script) {
      if (window.kakao?.maps) boot();
      else {
        script.addEventListener('load', boot, { once: true });
        script.addEventListener('error', () => fail(new Error('카카오맵 스크립트 로드 실패')), { once: true });
      }
      return;
    }

    script = document.createElement('script');
    script.dataset.soyoKakao = 'true';
    script.async = true;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_APP_KEY}&libraries=services,clusterer&autoload=false`;
    script.addEventListener('load', boot, { once: true });
    script.addEventListener('error', () => fail(new Error('카카오맵 스크립트 로드 실패')), { once: true });
    document.head.appendChild(script);
  });

  return loadPromise;
}
