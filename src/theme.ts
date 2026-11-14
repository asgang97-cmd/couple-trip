// ✏️ 여기는 직접 꾸미는 곳이에요. 바꾸고 저장하면 앱에 바로 반영돼요.
export const theme = {
  // a = 나, b = 여자친구. 이름·이모지를 바꿔보세요.
  names: { a: '밍석', b: '밍하' },
  emoji: { a: '💩', b: '🐷' },

  // 색 (https://htmlcolorcodes.com 에서 골라 '#xxxxxx' 로)
  // (세부 색은 src/tokens.css 에 있어요. 여기 두 개는 주요 버튼색·바탕색만 덮어써요)
  primary: '#7b4b2d', // 버튼·강조색 (밤 껍질 갈색)
  background: '#fbf6ec', // 배경색 (만쥬 크림색)

  // 앱 캐릭터: 'manju' (밤만쥬) 또는 'frog' (개구리)
  mascot: 'manju' as 'manju' | 'frog',

  // 앱에서 사진을 올리기 전에 보일 기본 사진.
  // public 폴더에 사진(예: cover.jpg)을 넣고 '/cover.jpg' 로 바꾸세요. null이면 분홍 그라데이션만.
  coverPhoto: null as string | null,

  // 문구
  appName: '우리 여행',
  greeting: '우리 여행까지',
  passwordHint: '우리만 아는 비밀번호 💌',
} as const
