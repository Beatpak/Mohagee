import { Link, Navigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { formatDateTime, ResultSummary } from "./DrawPage";

export function ResultPage() {
  const { lastCompleted, clearLastCompleted } = useApp();

  if (!lastCompleted) {
    return <Navigate to="/" replace />;
  }

  return (
    <section className="page">
      <div className="card card--highlight">
        <p className="eyebrow">결과</p>
        <h2 className="page-heading">오늘의 랜덤 데이트</h2>
        <ResultSummary
          region={lastCompleted.region}
          food={lastCompleted.food}
          dessert={lastCompleted.dessert}
          dateSpot={lastCompleted.dateSpot}
        />
        <p className="muted">{formatDateTime(lastCompleted.completedAt)}</p>
      </div>
      <div className="button-row">
        <Link to="/" className="btn btn--primary" onClick={() => clearLastCompleted()}>
          새 데이트
        </Link>
        <Link to="/history" className="btn btn--secondary">
          기록 보기
        </Link>
      </div>
    </section>
  );
}
