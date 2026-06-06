# 랜덤 데이트

서울대입구역 근처 친구·커플이 **어디서 · 뭐 먹고 · 디저트 · 어디 놀지** 고민할 때, 순서대로 한 번씩만 랜덤 뽑기하는 모바일 웹 앱입니다.

배포 URL만 공유하면 **항목 목록은 모두 같이** 쓰고, **완료 기록과 진행 중 뽑기는 각자 기기**에만 저장됩니다.

## 주요 기능

| 화면 | 설명 |
|------|------|
| **뽑기** | 지역 → 음식 → 디저트 → 데이트거리 순서로 1회씩 랜덤 선정 |
| **결과** | 이번 회차 뽑기 결과 확인 |
| **기록** | 완료한 데이트 목록 (본인 기기만) |
| **항목 관리** | 카테고리별 항목 추가·삭제 (전역 공유) |

- 진행 중 이탈 시 **이어하기** (localStorage)
- 「데이트 취소」 시 기록 미저장
- 카테고리당 **재뽑기 없음**
- 항목 변경 시 Supabase Realtime으로 다른 사용자 화면도 갱신

## 기술 스택

- **Frontend**: React 19, TypeScript, Vite, React Router
- **Backend / DB**: Supabase (PostgreSQL + Realtime)
- **배포**: Vercel

## 빠른 시작 (로컬)

```bash
npm install
cp .env.example .env
npm run dev
```

브라우저에서 `http://localhost:5173` 접속.

`.env` 수정 후에는 dev 서버를 **껐다가 다시** 켜야 반영됩니다.

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-publishable-key
```

Supabase Dashboard → **Settings → API**에서 **Project URL**과 **Publishable key** (`sb_publishable_...`)를 복사합니다. **Secret key는 사용하지 마세요.**

## Supabase 설정

### 1. 프로젝트 생성

[supabase.com](https://supabase.com)에서 새 프로젝트를 만듭니다.

### 2. 마이그레이션 실행

SQL Editor에서 아래 파일을 **순서대로** 실행합니다.

1. [`supabase/migrations/001_shared_items.sql`](supabase/migrations/001_shared_items.sql)
2. [`supabase/migrations/002_normalize_date_items.sql`](supabase/migrations/002_normalize_date_items.sql)

002 실행 시 destructive 경고가 뜨면 정상입니다. `shared_items` JSON 데이터는 `date_items`로 이전된 뒤 예전 테이블이 삭제됩니다.

### 3. DB 구조

| 테이블 | 역할 |
|--------|------|
| `date_items` | 항목 1개 = row 1개 (`category`, `label`, `sort_order`) |
| `app_meta` | 시드 버전·갱신 시각 (singleton row) |

Table Editor에서 `date_items`를 카테고리·라벨별로 확인할 수 있습니다.

## Vercel 배포

1. GitHub 저장소 연결 후 배포
2. **Settings → Environment Variables**에 아래 추가 (Production + Preview)

| Name | Value |
|------|--------|
| `VITE_SUPABASE_URL` | Supabase Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase Publishable key |

3. 환경 변수 추가·변경 후 **Redeploy** (캐시 끄고 재배포 권장)

Vite는 `VITE_` 변수를 **빌드 시점**에 JS에 포함합니다. Dashboard에만 넣고 재배포하지 않으면 배포 URL에서 env 에러가 납니다.

## 데이터 저장 정책

| 데이터 | 저장 위치 | 공유 범위 |
|--------|-----------|-----------|
| 항목 목록 | Supabase `date_items` | 전역 (URL 아는 사람 모두) |
| 완료 기록 | 브라우저 localStorage | 본인 기기만 |
| 진행 중 세션 | 브라우저 localStorage | 본인 기기만 |

## 초기 시드 데이터

앱 최초 실행 시 `date_items`가 비어 있으면 아래 시드가 자동 주입됩니다. 시드 버전이 올라가면 앱이 누락된 기본 항목을 보충합니다.

| 카테고리 | 출처 |
|----------|------|
| 지역 | 서울대입구역 기준 지하철 1시간 이내 역 — [`src/data/regions.ts`](src/data/regions.ts) |
| 음식 | 배민·쿠팡이츠·요기요·두잇 카테고리 — [`src/data/foods.ts`](src/data/foods.ts) |
| 디저트 | 카페·디저트 카테고리 — [`src/data/desserts.ts`](src/data/desserts.ts) |
| 데이트거리 | [`src/data/dateSpots.ts`](src/data/dateSpots.ts) |

## 프로젝트 구조

```
src/
├── context/AppContext.tsx   # 앱 상태·뽑기·항목 CRUD
├── storage/
│   ├── remoteItems.ts       # Supabase 항목 sync
│   └── storage.ts           # localStorage (기록·세션)
├── pages/
│   ├── DrawPage.tsx         # 뽑기
│   ├── ResultPage.tsx       # 결과
│   ├── HistoryPage.tsx      # 기록
│   └── ItemsPage.tsx        # 항목 관리
├── data/                    # 시드 데이터
└── lib/supabase.ts          # Supabase 클라이언트

supabase/migrations/         # DB 마이그레이션 SQL
```

## 스크립트

```bash
npm run dev      # 개발 서버
npm run build    # 프로덕션 빌드
npm run preview  # 빌드 결과 미리보기
npm run lint     # ESLint
```

## 설계 메모 (MVP)

| 항목 | 결정 |
|------|------|
| 항목 수정 | 삭제 후 재추가 |
| 뽑기 순서 | 지역 → 음식 → 디저트 → 데이트거리 고정 |
| 재뽑기 | 없음 |
| 회차 간 중복 | 허용 |
| 기록 메모·공유 | 제외 |
| Supabase RLS | anon/public 읽기·쓰기 허용 (친구 그룹용) |

URL을 아는 사람은 항목을 수정·삭제할 수 있습니다. 공개 배포 시 RLS 강화를 검토하세요.
