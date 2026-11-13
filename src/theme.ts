// ✏️ 여기는 직접 꾸미는 곳이에요. 바꾸고 저장하면 앱에 바로 반영돼요.
export const theme = {
  // a = 나, b = 여자친구. 이름·이모지를 바꿔보세요.
  names: { a: '밍석', b: '밍하' },
  emoji: { a: '💩', b: '🐷' },

  // 색 (https://htmlcolorcodes.com 에서 골라 '#xxxxxx' 로)
  primary: '#ff6b81', // 버튼·강조색
  background: '#fff7f8', // 배경색

  // public 폴더에 넣은 커플 사진 파일 이름
  coverPhoto: '/cover.jpg',

  // 문구
  appName: '우리 여행',
  greeting: '우리 여행까지',
  passwordHint: '우리만 아는 비밀번호 💌',
} as const
