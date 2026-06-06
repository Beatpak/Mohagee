# 랜덤 데이트

모바일 웹에서 지역 · 음식 · 디저트 · 데이트거리(코스·장소)를 순서대로 랜덤 뽑기하는 앱입니다.

## 실행

```bash
npm install
cp .env.example .env
# .env에 Supabase URL·anon key 입력
npm run dev
```

## Supabase 설정

1. [supabase.com](https://supabase.com)에서 프로젝트 생성
2. SQL Editor에서 마이그레이션을 **순서대로** 실행
   - [`supabase/migrations/001_shared_items.sql`](supabase/migrations/001_shared_items.sql)
   - [`supabase/migrations/002_normalize_date_items.sql`](supabase/migrations/002_normalize_date_items.sql)
3. Dashboard → Settings → API에서 URL과 anon key를 복사해 `.env`에 설정

항목 데이터는 `date_items` 테이블(row 단위)에 저장됩니다. 시드 버전은 `app_meta`에 저장됩니다.

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

Vercel 배포 시에도 동일한 환경 변수를 Project Settings → Environment Variables에 추가합니다.

## MVP 결정 사항

| 항목 | 결정 |
|------|------|
| 항목 관리 | 추가 + 삭제 (수정은 삭제 후 재추가) |
| 진행 중 이탈 | localStorage에 세션 저장 → **이어하기** |
| 진행 취소 | 「데이트 취소」로 버림 (기록 미저장) |
| 뽑기 순서 | 지역 → 음식 → 디저트 → 데이트거리 고정 |
| 재뽑기 | 없음 (카테고리당 1회) |
| 중복 | 회차 간 동일 항목 나와도 됨 |
| 최소 항목 | 카테고리별 1개 이상 필요 |
| 기록 | 완료 시 자동 저장, **삭제** 가능 |
| 기록 메모·공유 | MVP 제외 |
| 항목 목록 저장소 | Supabase (전역 공유) |
| 기록·진행 세션 저장소 | 브라우저 localStorage (기기별) |

## 초기 시드 데이터

- **지역**: 서울대입구역 기준 지하철 1시간 이내 역 ([`src/data/regions.ts`](src/data/regions.ts))
- **음식**: 배민·쿠팡이츠·요기요·두잇 카테고리 통합 ([`src/data/foods.ts`](src/data/foods.ts))
- **디저트**: 카페·디저트 카테고리 분리 ([`src/data/desserts.ts`](src/data/desserts.ts))
- **데이트거리**: [`src/data/dateSpots.ts`](src/data/dateSpots.ts)

첫 Supabase 초기화 시 `date_items`에 시드가 주입되며, 시드 버전 업데이트 시 자동 반영됩니다.

## 빌드

```bash
npm run build
npm run preview
```
