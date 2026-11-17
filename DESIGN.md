---
name: 우리 여행 (couple-trip)
description: 두 사람만을 위한 여행 앱. 크림 바탕에 밤색 잉크, 모든 글자는 손글씨.
colors:
  cream-paper: "oklch(97% 0.016 80)"
  toasted-cream: "oklch(94% 0.026 76)"
  golden-crust: "oklch(90% 0.038 72)"
  chestnut-ink: "oklch(27% 0.035 50)"
  chestnut-ink-soft: "oklch(40% 0.035 50)"
  muted-bark: "oklch(48% 0.03 55)"
  crumb-rule: "oklch(86% 0.03 70)"
  field-edge: "oklch(60% 0.04 60)"
  chestnut-shell: "oklch(46% 0.09 50)"
  chestnut-shell-deep: "oklch(40% 0.085 48)"
  on-chestnut: "oklch(98% 0.012 80)"
  focus-ember: "oklch(50% 0.14 45)"
  cheek-blush: "oklch(58% 0.19 3)"
  cheek-blush-soft: "oklch(84% 0.09 3)"
  cheek-blush-wash: "oklch(94% 0.03 3)"
  baked-dot: "oklch(80% 0.07 70)"
  cover-fallback-gold: "oklch(66% 0.09 62)"
  error-red: "oklch(50% 0.18 27)"
  photo-scrim: "oklch(20% 0.03 45 / 0.72)"
  photo-glass: "oklch(20% 0.03 45 / 0.42)"
  sheet-backdrop: "oklch(20% 0.03 45 / 0.4)"
  photo-veil: "oklch(97% 0.016 80 / 0.86)"
  viewer-white: "oklch(99.5% 0.004 80)"
typography:
  display:
    fontFamily: "Ongeulip Daerong, Apple SD Gothic Neo, Malgun Gothic, ui-rounded, sans-serif"
    fontSize: "2.5rem"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "0em"
  headline:
    fontFamily: "Ongeulip Daerong, Apple SD Gothic Neo, Malgun Gothic, ui-rounded, sans-serif"
    fontSize: "2.2rem"
    fontWeight: 400
    lineHeight: 1.15
  title:
    fontFamily: "Ongeulip Daerong, Apple SD Gothic Neo, Malgun Gothic, ui-rounded, sans-serif"
    fontSize: "1.55rem"
    fontWeight: 400
    lineHeight: 1.25
  title-small:
    fontFamily: "Ongeulip Daerong, Apple SD Gothic Neo, Malgun Gothic, ui-rounded, sans-serif"
    fontSize: "1.3rem"
    fontWeight: 400
    lineHeight: 1.2
  body:
    fontFamily: "Ongeulip Daerong, Apple SD Gothic Neo, Malgun Gothic, ui-rounded, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Ongeulip Daerong, Apple SD Gothic Neo, Malgun Gothic, ui-rounded, sans-serif"
    fontSize: "0.95rem"
    fontWeight: 400
    lineHeight: 1.4
  label-small:
    fontFamily: "Ongeulip Daerong, Apple SD Gothic Neo, Malgun Gothic, ui-rounded, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.3
rounded:
  input: "14px"
  card: "22px"
  cover: "28px"
  pill: "999px"
spacing:
  3xs: "2px"
  2xs: "4px"
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "40px"
  2xl: "64px"
  3xl: "96px"
components:
  button-primary:
    backgroundColor: "{colors.chestnut-shell}"
    textColor: "{colors.on-chestnut}"
    typography: "{typography.body}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.chestnut-shell-deep}"
  button-quiet:
    backgroundColor: "{colors.cream-paper}"
    textColor: "{colors.chestnut-shell}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "44px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.chestnut-shell}"
    rounded: "{rounded.pill}"
    padding: "0 12px"
    height: "44px"
  button-fab:
    backgroundColor: "{colors.chestnut-shell}"
    textColor: "{colors.on-chestnut}"
    rounded: "{rounded.pill}"
    size: "56px"
  day-pill:
    backgroundColor: "{colors.toasted-cream}"
    textColor: "{colors.chestnut-ink}"
    rounded: "{rounded.pill}"
    padding: "4px 12px"
    height: "44px"
  day-pill-active:
    backgroundColor: "{colors.chestnut-shell}"
    textColor: "{colors.on-chestnut}"
  filter-pill:
    backgroundColor: "{colors.toasted-cream}"
    textColor: "{colors.chestnut-ink-soft}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 12px"
    height: "36px"
  filter-pill-active:
    backgroundColor: "{colors.chestnut-shell}"
    textColor: "{colors.cream-paper}"
  card-featured:
    backgroundColor: "{colors.cream-paper}"
    textColor: "{colors.chestnut-ink}"
    rounded: "{rounded.card}"
    padding: "16px 16px 4px"
  card-row:
    backgroundColor: "{colors.cream-paper}"
    textColor: "{colors.chestnut-ink}"
    rounded: "{rounded.card}"
    padding: "8px 16px"
  lead-badge:
    backgroundColor: "{colors.cheek-blush-wash}"
    textColor: "{colors.chestnut-ink}"
    typography: "{typography.label-small}"
    rounded: "{rounded.pill}"
    padding: "2px 8px"
  warning-band:
    backgroundColor: "{colors.cheek-blush-wash}"
    textColor: "{colors.chestnut-ink-soft}"
    typography: "{typography.label}"
    rounded: "{rounded.input}"
    padding: "8px 12px"
  input:
    backgroundColor: "{colors.cream-paper}"
    textColor: "{colors.chestnut-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.input}"
    padding: "12px"
    height: "44px"
  tab-bar:
    backgroundColor: "{colors.cream-paper}"
    textColor: "{colors.chestnut-ink-soft}"
    typography: "{typography.label}"
    height: "52px"
  tab-bar-active:
    backgroundColor: "{colors.toasted-cream}"
    textColor: "{colors.chestnut-shell}"
---

# Design System: 우리 여행 (couple-trip)

## Overview

**Creative North Star: "만쥬 가게의 출발 안내판"**

크림색 종이 위에 밤색 잉크로 쓴, 두 사람만의 여행 안내판이다. 따뜻함은 만쥬 가게(크림 바탕, 노릇한 밤색, 볼 빨간 분홍)에서 오고, 규율은 출발 안내판에서 온다: 시간은 한 열에 줄을 맞추고, 지금 다음 것 하나만 불이 켜지고, 경고는 늘 같은 분홍 띠로 나온다. 화면은 아이폰 한 손 보기(폭 480px 이하)를 기준으로 만든 한 줄 세로 흐름이다.

앱의 모든 글자는 손글씨(온글잎 대롱체)다 (사용자 요청 2026-11-18). 메모·금액·버튼·안내·입력칸도 손글씨. 손글씨는 같은 크기에서 보통 글꼴보다 작아 보여서, 읽는 글은 한 단계 크게(메모 1.3rem, 작은 안내도 0.95rem 이상) 놓는다. 굵기가 하나뿐이라 굵게는 쓰지 않는다.

화면의 주인공은 두 사람이 직접 넣은 것들이다: 커버의 커플 사진, 캐릭터 사진, 이름 이모지, 하트와 댓글. 이것들은 꾸밈이 아니라 내용이다. 시스템은 이것들이 놓일 자리를 만들 뿐, 대신 그려 넣지 않는다.

**Key Characteristics:**
- 크림 바탕(브랜드 약속, 사용자 확인) 위 밤색 하나가 주요 행동과 선택 상태를 맡는다.
- 분홍은 D-day, "다음 일정" 표시, 경고, 내 댓글, 하트에만.
- 모든 글자는 손글씨. 읽는 글은 한 단계 크게, 굵게 금지.
- 다음 일정 한 장만 크게(밤색 2px 테두리), 나머지는 시간 열이 있는 한 줄.
- 둥근 모양: 알약 버튼·칩, 22px 카드, 둥근 떠 있는 추가 버튼, 화면 아래 고정 탭바.

## Colors

따뜻한 크림과 밤색의 한 계열, 그리고 볼터치 분홍 한 점.

### Primary
- **Chestnut Shell 밤 껍질** (chestnut-shell): 주요 버튼, 선택한 날짜 알약, 선택한 종류 알약, 다음 일정 카드의 테두리, 시간 숫자, 링크 글자. 눌렀을 때와 마우스를 올렸을 때는 **Chestnut Shell Deep**(chestnut-shell-deep)으로 한 단계 어두워진다. 밤색 위 글자는 **On Chestnut**(on-chestnut).

### Secondary
- **Cheek Blush 볼터치 분홍** (cheek-blush): 하트 아이콘. 진한 분홍은 작은 면적에만.
- **Cheek Blush Soft** (cheek-blush-soft): 커버 사진 위 D-day 글자.
- **Cheek Blush Wash** (cheek-blush-wash): "다음 일정/첫 일정" 표시, 빠듯한 이동·영업시간 경고 띠, 내 댓글 말풍선.

### Neutral
- **Cream Paper 만쥬 크림** (cream-paper): 모든 화면의 바탕, 카드 바탕, 입력칸 바탕, 탭바.
- **Toasted Cream** (toasted-cream): 고르지 않은 알약, 칩, 눌린 탭바 칸, 상대방 댓글 말풍선, 비활성 버튼.
- **Golden Crust** (golden-crust): 알약·칩을 눌렀을 때.
- **Chestnut Ink** (chestnut-ink): 본문 글자, 장소 이름.
- **Chestnut Ink Soft** (chestnut-ink-soft): 메모, 보조 글, 고르지 않은 탭 글자.
- **Muted Bark** (muted-bark): 안내 문구, 금액 이름표, 지난 날씨, 입력칸 안내 글.
- **Crumb Rule** (crumb-rule): 카드 테두리, 알약 테두리, 구분선, 일정 사이 점선 길.
- **Field Edge** (field-edge): 입력칸 테두리(구분선보다 진하게, 칸이 보이도록).
- **Baked Dot** (baked-dot): 일정 목록 왼쪽 점선 길 위의 동그란 점, 준비물 진행 막대.
- **Focus Ember** (focus-ember): 키보드 초점 테두리(2px).
- **Error Red** (error-red): 오류 글과 삭제 버튼 글자·테두리에만.

사진 위 막: **Photo Scrim**(커버 아래 그라데이션), **Photo Glass**(커버 사진 위 반투명 동그란 아이콘 버튼), **Photo Veil**(배경 사진 위 크림 막), **Sheet Backdrop**(아래에서 올라오는 창 뒤). **Viewer White**는 바우처 크게 보기 화면 바탕.

### Named Rules
**The One Chestnut Rule.** 채운 밤색은 "지금 할 행동"과 "지금 고른 것"에만 쓴다. 한 화면에 채운 밤색 버튼은 주요 행동 하나와 떠 있는 추가 버튼뿐이고, 나머지 버튼(댓글 보내기, 복사, 준비물 시작)은 크림 바탕에 밤색 테두리·글자로 조용하게.

**The Blush Is a Signal Rule.** 분홍은 장식색이 아니다. D-day, 다음 일정 표시, 경고 띠, 내 댓글, 하트처럼 "우리에게 지금 중요한 것"에만 쓴다.

**The Cream Ground Rule.** 바탕은 늘 크림(cream-paper)이다. 흰 바탕이나 어두운 바탕 화면을 만들지 않는다(바우처 크게 보기와 사진 자르기 화면만 예외).

## Typography

**Display Font:** 온글잎 대롱체 Ongeulip Daerong (자체 호스팅 `public/fonts/ongeulip-daerong.woff2`, 대체: Apple SD Gothic Neo, Malgun Gothic)
**Body Font:** 온글잎 대롱체 (모든 글자, 대체: Apple SD Gothic Neo, Malgun Gothic)

**Character:** 손으로 쓴 둥근 손글씨가 화면 전체에 "우리가 쓴" 느낌을 준다. 작은 글도 손글씨라서 크기를 넉넉히 잡아 길에서도 읽히게 한다. 손글씨는 굵기가 하나(400)뿐이라 위계는 크기와 글꼴 차이로만 만든다.

### Hierarchy
- **Display** (손글씨 400, 2.5rem, 1): 다음 일정 카드의 시간 숫자 하나.
- **Headline** (손글씨 400, 2.2rem, 1.15): 다음 일정 카드의 장소 이름, 커버의 D-day, 가계부 총액, 가운데 화면 제목.
- **Title** (손글씨 400, 1.55rem, 1.25): 보통 카드의 장소 이름과 시간, 커버의 여행 이름, 아래 창 제목.
- **Title Small** (손글씨 400, 1.3rem, 1.2): 한 줄 일정의 시간, 묶음 제목(준비물 개수, 보관함·가계부 날짜 제목, 빈 화면 제목). 날짜 알약의 "1일차"는 손글씨 1.0625rem로, 옆의 손글씨 날짜(0.95rem)보다 크다.
- **Body** (손글씨 400, 1.0625rem, 1.6): 메모, 금액, 버튼 글자, 입력칸(16px 이상이어야 아이폰이 확대하지 않음). 문단은 최대 65ch.
- **Label** (손글씨 400, 0.95rem): 종류 알약, 경고 띠, 보조 줄, 금액 이름표, 탭바 글자.
- **Label Small** (손글씨 400, 0.875rem): "다음 일정" 표시, 작은 안내.

금액과 시간은 모두 `tabular-nums`로 숫자 폭을 맞춘다. 손글씨는 굵기가 하나라 굵게는 쓰지 않는다(가짜 굵게도 끔).

### Named Rules
**The All-Handwriting Rule.** 모든 글자는 손글씨다 (사용자가 직접 정함). 손글씨을 섞지 않는다. 대신 읽는 글은 한 단계 크게, 0.95rem 아래로 내리지 않는다.

**The One-Step-Up Rule.** 손글씨는 같은 크기의 보통 글꼴보다 작아 보이므로, 읽는 글(메모 1.3rem, 금액 이름표·탭바·작은 안내 0.95rem 이상)도 한 단계 크게 놓는다.

## Layout

한 열 세로 흐름. 내용 폭은 최대 480px(가운데 정렬), 좌우 여백 16px. 화면 위에서부터: 커버 띠(약 140px, 아래 모서리만 둥글게, 좌우 여백까지 꽉 채움) → 날짜 알약 한 줄(가로 스크롤, 스크롤바 숨김) → 종류 알약 한 줄(가로 스크롤) → 비용 한 줄 → 다음 일정 큰 카드 → 나머지 한 줄 일정들 → 지난 일정(접힘).

일정 목록은 왼쪽에 24px 들여 쓰고, 그 자리에 점선 길(2px dashed)과 카드마다 동그란 점을 둔다. 보통 카드는 왼쪽 시간 열(4.5rem, 한 줄 카드는 5.5rem)과 오른쪽 내용 열의 2열 격자라서 시간끼리 세로로 줄이 맞는다.

화면 아래에는 탭 5개 고정 탭바(아이폰 홈 표시줄 여백 `safe-area-inset-bottom` 포함), 그 바로 위 오른쪽에 56px 둥근 추가 버튼이 떠 있다. 내용은 아래에 80px + 홈 표시줄 여백만큼 비워 탭바에 가리지 않게 한다.

간격은 2/4/8/12/16/24/40/64/96px 단계. 카드 사이 12px, 알약 사이 8px(종류 알약은 4px), 카드 안 여백 16px. 터치 목표는 44px 이상(작은 보조 버튼만 32~36px).

## Elevation & Depth

거의 평평하다. 깊이는 테두리(1px crumb-rule)와 크림 단계(paper → toasted → golden)로 만든다. 그림자는 "떠 있는 것" 세 가지에만, 모두 밤색 잉크 기반의 부드러운 아래쪽 그림자다(딱딱한 오프셋 그림자 없음).

### Shadow Vocabulary
- **Lit Card** (`box-shadow: 0 12px 24px -16px oklch(27% 0.035 50 / 0.5)`): 다음 일정 카드 하나에만.
- **Floating Add** (`box-shadow: 0 12px 22px -12px oklch(27% 0.035 50 / 0.6)`): 떠 있는 둥근 추가 버튼.
- **Tab Bar Lift** (`box-shadow: 0 -8px 20px -16px oklch(27% 0.035 50 / 0.4)`): 아래 고정 탭바 윗선.

### Named Rules
**The Only-the-Next-One-Glows Rule.** 목록에서 그림자와 2px 밤색 테두리를 받는 카드는 다음 일정 한 장뿐이다. 다른 카드는 1px 테두리, 그림자 없음.

## Shapes

둥글고 부드럽다. 행동과 고르기는 알약(999px): 버튼, 날짜 알약, 종류 알약, 칩, 표시, 목록/지도 바꾸기. 담는 것은 22px 카드(일정 카드, 지도, 가계부 합계). 입력칸·경고 띠·사진 썸네일은 14px. 화면 가장자리에 붙는 큰 면은 28px: 커버는 아래 두 모서리, 아래 창은 위 두 모서리. 떠 있는 추가 버튼과 캐릭터 사진은 완전한 원. 말풍선은 16px에 말하는 쪽 아래 모서리만 4px. 테두리는 1px 실선이 기본, 점선(dashed)은 "아직 없는 것/추가할 것"(바우처 추가, 예약번호 칩)과 일정 사이 길에만.

## Components

### Buttons
따뜻하고 손에 잘 잡히는 알약.
- **Shape:** 알약(999px), 높이 44px 이상, 좌우 16px.
- **Primary:** 밤색 바탕, 크림 글자, 손글씨 1.0625rem. 아이콘은 글자 앞 8px 간격.
- **Hover / Active / Focus:** 올리면 한 단계 진한 밤색(220ms), 누르면 1px 내려감(120ms), 초점은 2px focus-ember 테두리 2px 띄움.
- **Quiet:** 크림 바탕 + 밤색 1px 테두리 + 밤색 글자. 화면의 둘째 행동(댓글 보내기, 복사, 준비물 시작).
- **Ghost:** 테두리·바탕 없음, 글자만. 카드 안 하트·댓글·수정.
- **Danger:** 투명 바탕에 오류 빨강 테두리·글자.
- **Disabled:** 토스트 크림 바탕, field-edge 테두리, muted 글자. 흐리게 사라지지 않고 보인다.
- **Floating Add:** 56px 원, 밤색, Floating Add 그림자. 탭바 바로 위 오른쪽.
- **Photo Glass:** 커버 사진 위 40px 원, 반투명 어두운 유리 + 크림 아이콘.

### Chips
- **Day Pill:** 두 줄 알약. 위 줄은 손글씨 "N일차" + 손글씨 날짜, 아래 줄은 날씨(지난해 기준이면 muted). 고르지 않은 것은 토스트 크림 + 1px 테두리, 고른 것은 밤색 바탕 + 크림 글자 + 왼쪽에 32px 캐릭터 사진(나타날 때 폴짝 뛰어 들어옴, 420ms).
- **Filter Pill (종류):** 36px 알약, 손글씨 0.95rem. 고른 것만 밤색으로 채움.
- **Chip:** 32px 알약, 토스트 크림 + 1px 점선 테두리. 예약번호(눌러 복사), 바우처. 다음 일정 카드 안에서는 44px 실선으로 커짐.
- **Lead Badge:** 다음 일정 시간 옆의 분홍 알약 "다음 일정/첫 일정". 상태 표시이지 장식 제목이 아니다.

### Cards / Containers
- **Featured (다음 일정):** 22px, 크림 바탕, 2px 밤색 테두리, Lit Card 그림자, 안 여백 16px. 위 줄에 종류 이모지 + 손글씨 시간(2.5rem) + 분홍 표시, 그 아래 손글씨 장소 이름(2.2rem), 메모·금액(손글씨), 밤색 "여기로 길찾기" 알약, 하트·댓글·수정·바우처 줄.
- **Row (나머지 일정):** 22px, 1px 테두리, 위아래 8px. 시간 열(5.5rem) + 장소 이름 한 줄 + 요약 한 줄(예약번호·하트·댓글 수). 장소를 누르면 그 자리에서 펼쳐진다(줄 어디를 눌러도 됨).
- **Passed (지난 일정):** 맨 아래 접힌 묶음, 열면 78% 불투명도.
- **Warning Band:** 14px, 분홍 물 바탕, 0.95rem. 카드 사이(빠듯한 이동)나 카드 안(영업시간)에 같은 모양으로.

### Inputs / Fields
- **Style:** 크림 바탕, 1px field-edge 테두리, 14px, 높이 44px, 글자 1.0625rem(아이폰 확대 방지). 시간·날짜 칸은 기본 모양을 꺼서 폭을 넘지 않게.
- **Hover / Focus:** 올리면 테두리가 chestnut-ink-soft로, 초점은 2px focus-ember 테두리(안쪽).
- **Disabled:** 토스트 크림 바탕, 55% 불투명도.

### Navigation
- **Cover band:** 커플 사진(없으면 금빛→밤색 그라데이션) 위 어두운 그라데이션 3겹, 왼쪽 아래 분홍 손글씨 D-day와 크림 손글씨 여행 이름, 오른쪽 위 유리 아이콘 버튼 3개, 오른쪽 아래 캐릭터 커플 사진.
- **Bottom Tab Bar:** 5칸(목록/지도/준비물/보관함/가계부), 크림 바탕, 위 1px 선 + Tab Bar Lift. 칸마다 20px 선 아이콘 위, 손글씨 글자 아래. 고른 칸은 토스트 크림 바탕(14px) + 밤색 글자.
- **View Toggle:** 토스트 크림 알약 홈 안에 버튼들, 고른 것은 크림 바탕 + 1px 테두리.

### Bottom Sheet
아래에서 올라오는 입력 창. 크림 바탕, 위 모서리 28px, 최대 화면 92%, 뒤는 Sheet Backdrop. 제출 버튼은 52px, 1.3rem.

## Do's and Don'ts

### Do:
- **Do** 모든 글자를 손글씨로, 읽는 글은 한 단계 크게.
- **Do** 버튼, 메모, 금액, 안내, 입력칸은 손글씨로.
- **Do** 크림 바탕을 지키고, 채운 밤색은 주요 행동·고른 상태에만.
- **Do** 분홍은 D-day, 다음 일정 표시, 경고 띠, 내 댓글, 하트에만.
- **Do** 목록에서는 다음 일정 한 장만 크게 불 켜고, 나머지는 시간 열이 맞춰진 한 줄로.
- **Do** 아이콘은 `Icon` 컴포넌트의 선 아이콘(1.8 굵기, 둥근 끝, 글자색 따라감)을 쓴다.
- **Do** 커플 사진, 캐릭터 사진, 이름 이모지는 사용자가 넣은 내용으로 다루고 자리만 마련한다.
- **Do** 터치 목표 44px, 입력 글자 16px 이상, 아래 고정 요소는 `safe-area-inset-bottom`만큼 띄운다.

### Don't:
- **Don't** 문장, 버튼 글자, 금액, 메모를 손글씨로 쓰지 않는다.
- **Don't** 흰색이나 어두운 바탕 화면을 만들지 않는다(바우처 보기·사진 자르기 제외).
- **Don't** 모든 일정 카드를 같은 크기로 만들지 않는다. 2px 밤색 테두리와 그림자는 다음 일정 한 장에만.
- **Don't** 분홍을 장식이나 배경 면으로 넓게 쓰지 않는다.
- **Don't** 저작권 캐릭터를 그려 넣거나 캐릭터·사진을 일러스트로 대신하지 않는다.
- **Don't** 딱딱한 오프셋 그림자나 진한 그림자를 쓰지 않는다. 그림자는 떠 있는 세 가지(다음 일정, 추가 버튼, 탭바)에만.
- **Don't** 코드 주석의 옛 이름(연잎, 개구리, 연못 `pond`/`pad`)을 지금 디자인 개념으로 되살리지 않는다. 지금 그 자리는 "점선 길과 점"이다.
