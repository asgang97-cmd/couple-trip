# 우리 여행 💌

둘만 쓰는 여행 일정 앱 (폰 홈 화면에 설치하는 웹앱).

- 배포 주소: https://couple-trip-rho.vercel.app
- 코드: GitHub private 저장소 `asgang97-cmd/couple-trip` — `main`에 push하면 Vercel이 자동으로 다시 배포해요.
- 사용 기술: React + TypeScript + Vite, Supabase(데이터·로그인·사진), 구글 지도(Maps JS · Places · Routes)

꾸미기(이름·이모지·색·문구·기본 사진)는 `src/theme.ts` 한 곳에서 해요.

---

## 처음부터 다시 세팅할 때 (순서대로)

### 1. Supabase 데이터베이스
Supabase 대시보드 → 프로젝트 → **SQL Editor** → **New query**에 아래 파일 내용을 **순서대로** 붙여넣고 **Run**:

1. `supabase/schema.sql` — 표·권한·첫 여행
2. `supabase/002_cover_photo.sql` — 커플 사진 보관함
3. `supabase/003_timezone_currency.sql` — 여행지 시간대 + 통화 코드 검사
4. `supabase/004_packing.sql` — 준비물
5. `supabase/005_vouchers.sql` — 바우처 보관함
6. `supabase/006_expenses.sql` — 가계부
7. `supabase/007_decor.sql` — 캐릭터·배경 꾸미기
8. `supabase/008_decor_slot.sql` — 꾸미기를 둘이 동시에 바꿔도 안 덮어쓰게

> 1·2번은 이미 실행했으면 다시 실행하지 마세요 (에러가 나요). 3번부터는 각 파일 맨 위 안내를 확인하세요.

### 2. Supabase 로그인 설정 (⚠️ 보안상 꼭 확인)
앱 코드 안의 공개 키는 누구나 볼 수 있어요. 그래서 **아래 두 개가 꺼져 있어야** 모르는 사람이 계정을 만들어 들어올 수 없어요.

주소: `https://supabase.com/dashboard/project/<프로젝트 ref>/auth/providers` → **User Signups**
- **Allow new users to sign up** → 끔
- **Allow anonymous sign-ins** → 끔
- (Confirm email은 켜져 있어도 상관없음)

공유 계정 만들기: **Authentication → Users → Add user → Create new user**
- Email: `.env.local`의 `VITE_SHARED_EMAIL`과 같게 (예: `us@trip.local`)
- Password: 둘만 아는 비밀번호
- **Auto Confirm User** 체크

> 마지막 확인일: 2026-11-14 — 두 설정 모두 꺼져 있음.

### 3. 구글 지도 키
Google Cloud Console → **API 및 서비스**
- 사용 설정할 API 3개: **Maps JavaScript API**, **Places API (New)**, **Routes API**
- 사용자 인증 정보 → API 키 → **키 제한**
  - 애플리케이션 제한: **웹사이트** — `https://couple-trip-rho.vercel.app/*`, `http://localhost:5173/*`, `http://localhost:4173/*`
  - API 제한: 위 3개만
- 결제 → **예산 및 알림**: 예산 ₩10,000 + 알림 (요금 폭탄 방지)

### 4. 환경 변수
`.env.example`을 `.env.local`로 복사해서 채워요 (`.env.local`은 git에 안 올라가요).

| 이름 | 어디서 |
|---|---|
| `VITE_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | 같은 곳의 publishable(anon) 키 |
| `VITE_SHARED_EMAIL` | 2단계에서 만든 공유 계정 이메일 |
| `VITE_GOOGLE_MAPS_API_KEY` | 3단계의 API 키 |
| `VITE_GOOGLE_MAP_ID` | (선택) 구글 지도 Map ID. 비우면 기본 지도 |

Vercel에도 같은 값을 넣어요: Vercel → 프로젝트 → **Settings → Environment Variables** → 저장 후 **Redeploy**.

---

## 내 컴퓨터에서 실행

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # 테스트
npm run build      # 배포용 빌드 (타입 검사 포함)
npm run lint       # 코드 검사
```

> 사용자 폴더 이름이 한글이면 npm이 꼬일 수 있어서, npm 캐시를 `C:\dev\npm-cache`로 옮겨 두었어요
> (사용자 설정 `~/.npmrc`). 새 컴퓨터에서는 `npm config set cache "C:\dev\npm-cache" --location=user`.

---

## 알아두면 좋은 것

- **오프라인:** 마지막으로 불러온 일정이 폰에 저장돼서, 인터넷이 없어도 볼 수 있어요 (수정은 막혀요).
  로그인이 오래돼도 오프라인이면 저장본을 보여주고, 비밀번호를 바꾸면 다음 접속 때 다시 물어봐요.
- **여행 정보 바꾸기**(제목·날짜·통화·시간대)는 Supabase → **Table Editor → trips**에서 직접 고쳐요.
  - 통화는 영어 대문자 3글자 (JPY, KRW, EUR …)
  - 시간대(`timezone`)는 한국과 시차가 있는 곳만 넣으면 돼요 (예: `Europe/Paris`). 비우면 폰 시간대 기준.
- **기본 커버 사진:** 앱에서 📷로 올리면 그게 보여요. 올리기 전 기본 사진을 쓰려면
  `public/cover.jpg`를 넣고 `src/theme.ts`의 `coverPhoto`를 `'/cover.jpg'`로 바꾸세요.
- 설계·계획 문서: `docs/superpowers/specs`, `docs/superpowers/plans`
