---
version: 1
slug: "src-components-trippage-tsx"
primary_target: "src/components/TripPage.tsx"
related_targets: ["src/components/ItemList.tsx","src/components/ItemCard.tsx","src/components/HomeHeader.tsx","src/components/DayTabs.tsx","src/index.css"]
---

# 여행 메인 화면 (TripPage)

Scope: 앱을 열면 보이는 여행 메인 화면(커버·날짜·목록/지도/준비물/보관함/가계부 탭). Mode: operate.
Audience/job: 밍석·밍하가 아이폰으로, 여행 전엔 계획하고 여행 중엔 길에서 다음 일정·시간·길찾기·예약번호를 바로 꺼낸다.
Constraints: PRODUCT.md Brand Commitments 그대로(크림·밤색, 온글잎 대롱체, 커버 사진+D-day, 직접 넣은 캐릭터·배경 사진). 기능·문구·aria 이름 유지. 입력 16px 이상, 터치 44px 이상.

## Direction contract
THESIS: 이 화면은 "다음에 할 일"을 소유한다. 커버가 반 화면을 차지하고 일정은 스크롤 아래에 숨는 지금 배치(그리고 모든 카드가 같은 크기인 여행 앱 기본 배치)를 거부한다.
OWN-WORLD: 크림 바탕, 밤색 잉크와 버튼, 볼 분홍 D-day. 모든 글자는 손글씨(사용자 요청 2026-11-18), 읽는 글은 한 단계 크게. 출발 안내판의 규율: 시간 열 정렬, 다음 일정만 밤색 테두리로 불 켜짐, 경고는 분홍 띠로 유지.
STORY: 열자마자 오늘(또는 고른 날)의 다음 일정이 보이고, 한 번 눌러 길찾기·예약번호 복사. 아래로 그날 나머지 일정을 시간순으로 훑는다. 아래 탭바로 지도·준비물·보관함·가계부를 오간다.
FIRST VIEWPORT (390x844): 위 약 150px 커버 띠(커플 사진 위 D-day·여행 이름, 오른쪽 위 아이콘 3개). 그 아래 날짜 칩 한 줄(날씨 포함, 고른 날 위 캐릭터 사진). 종류 버튼 줄. 비용 한 줄. "다음 일정" 큰 카드(손글씨 시간 40px급·장소 30px급, 길찾기·예약번호 버튼). 그 아래 시간 열이 있는 나머지 일정. 화면 맨 아래 고정 탭바 5개, 일정 추가는 탭바 위 둥근 버튼.
FORM: 다음 일정이 먼저 (내 목록 3번째, dealt lead). Raise from 탑승권·출발 안내판: 시간순, 다음 것만 불 켜짐, 경고색 유지. seed:f572e1a47290aabf
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved
- '다음 일정' 기준: 여행 기간 중 오늘 탭이면 지금 시각 이후 첫 일정(여행지 시간대), 그 외 날은 그날 첫 일정(라벨 "첫 일정").
