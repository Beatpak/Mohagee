import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import {
  CATEGORY_LABELS,
  getNextCategory,
  type Category,
} from "../types";

export function DrawPage() {
  const {
    activeSession,
    lastCompleted,
    startNewSession,
    cancelSession,
    drawCurrentStep,
    finishSession,
    clearLastCompleted,
    items,
  } = useApp();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [justDrawn, setJustDrawn] = useState<{ category: Category; value: string } | null>(
    null,
  );

  const nextCategory = activeSession ? getNextCategory(activeSession) : null;
  const isAllDrawn =
    activeSession?.status === "in_progress" && nextCategory === null;

  useEffect(() => {
    if (!isAllDrawn || justDrawn) return;
    const timer = setTimeout(() => {
      finishSession();
      navigate("/result");
    }, 800);
    return () => clearTimeout(timer);
  }, [isAllDrawn, justDrawn, finishSession, navigate]);

  const handleStart = () => {
    setError(null);
    setJustDrawn(null);
    const result = startNewSession();
    if (!result.ok) {
      setError(result.reason);
    }
  };

  const handleCancel = () => {
    if (window.confirm("진행 중인 데이트를 취소할까요? 뽑은 내용은 저장되지 않아요.")) {
      cancelSession();
      setJustDrawn(null);
      setError(null);
    }
  };

  const handleDraw = () => {
    if (!nextCategory) return;
    setError(null);
    const result = drawCurrentStep();
    if (!result.ok) {
      setError(result.reason);
      return;
    }
    setJustDrawn({ category: nextCategory, value: result.value });
    if (result.isComplete) {
      setTimeout(() => {
        finishSession();
        navigate("/result");
      }, 800);
    }
  };

  const handleNextStep = () => {
    setJustDrawn(null);
  };

  const canDraw = nextCategory && items[nextCategory].length > 0 && !justDrawn;

  if (lastCompleted && !activeSession && !justDrawn) {
    return (
      <section className="page">
        <div className="card card--highlight">
          <p className="eyebrow">데이트 완료</p>
          <h2 className="page-heading">오늘의 랜덤 데이트</h2>
          <ResultSummary
            region={lastCompleted.region}
            food={lastCompleted.food}
            dateSpot={lastCompleted.dateSpot}
          />
          <p className="muted">
            {formatDateTime(lastCompleted.completedAt)}에 기록에 저장됐어요.
          </p>
        </div>
        <div className="button-row">
          <button type="button" className="btn btn--primary" onClick={handleStart}>
            새 데이트
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => {
              clearLastCompleted();
            }}
          >
            닫기
          </button>
        </div>
        <Link to="/history" className="text-link">
          기록 보기
        </Link>
      </section>
    );
  }

  if (!activeSession) {
    return (
      <section className="page">
        <div className="hero">
          <p className="hero__text">
            지역 → 음식 → 데이트거리 순으로
            <br />
            각각 한 번씩만 뽑아요.
          </p>
        </div>
        {error && <p className="alert">{error}</p>}
        <button type="button" className="btn btn--primary btn--large" onClick={handleStart}>
          새 데이트 시작
        </button>
      </section>
    );
  }

  return (
    <section className="page">
      <ProgressSteps session={activeSession} current={nextCategory} />

      {activeSession.region && (
        <PickedChip label="지역" value={activeSession.region} />
      )}
      {activeSession.food && <PickedChip label="음식" value={activeSession.food} />}
      {activeSession.dateSpot && (
        <PickedChip label="데이트거리" value={activeSession.dateSpot} />
      )}

      {justDrawn && (
        <div className="draw-panel">
          <p className="draw-panel__label">{CATEGORY_LABELS[justDrawn.category]} 선정</p>
          <p className="draw-reveal" aria-live="polite">
            {justDrawn.value}
          </p>
          {justDrawn.category !== "dateSpot" && nextCategory && (
            <button type="button" className="btn btn--secondary btn--large" onClick={handleNextStep}>
              다음 단계
            </button>
          )}
          {justDrawn.category === "dateSpot" && (
            <p className="draw-hint">결과 화면으로 이동 중…</p>
          )}
        </div>
      )}

      {nextCategory && !justDrawn && (
        <div className="draw-panel">
          <p className="draw-panel__label">{CATEGORY_LABELS[nextCategory]} 뽑기</p>
          {!canDraw ? (
            <p className="alert">
              {CATEGORY_LABELS[nextCategory]} 항목이 없어요.{" "}
              <Link to="/items">항목 관리</Link>에서 추가해 주세요.
            </p>
          ) : (
            <>
              <p className="draw-hint">버튼을 눌러 랜덤으로 선정해요</p>
              <button type="button" className="btn btn--primary btn--large" onClick={handleDraw}>
                {CATEGORY_LABELS[nextCategory]} 뽑기
              </button>
            </>
          )}
        </div>
      )}

      {error && <p className="alert">{error}</p>}

      <button type="button" className="btn btn--ghost btn--small" onClick={handleCancel}>
        데이트 취소
      </button>
    </section>
  );
}

function ProgressSteps({
  session,
  current,
}: {
  session: { region?: string; food?: string; dateSpot?: string };
  current: Category | null;
}) {
  const steps: { key: Category; done: boolean }[] = [
    { key: "region", done: Boolean(session.region) },
    { key: "food", done: Boolean(session.food) },
    { key: "dateSpot", done: Boolean(session.dateSpot) },
  ];

  return (
    <ol className="steps" aria-label="뽑기 진행">
      {steps.map(({ key, done }) => (
        <li
          key={key}
          className={`steps__item${done ? " steps__item--done" : ""}${current === key ? " steps__item--current" : ""}`}
        >
          {CATEGORY_LABELS[key]}
        </li>
      ))}
    </ol>
  );
}

function PickedChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="picked-chip">
      <span className="picked-chip__label">{label}</span>
      <span className="picked-chip__value">{value}</span>
    </div>
  );
}

export function ResultSummary({
  region,
  food,
  dateSpot,
}: {
  region?: string;
  food?: string;
  dateSpot?: string;
}) {
  return (
    <ul className="result-list">
      <li>
        <span>지역</span>
        <strong>{region ?? "-"}</strong>
      </li>
      <li>
        <span>음식</span>
        <strong>{food ?? "-"}</strong>
      </li>
      <li>
        <span>데이트거리</span>
        <strong>{dateSpot ?? "-"}</strong>
      </li>
    </ul>
  );
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
