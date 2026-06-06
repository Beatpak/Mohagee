import { useApp } from "../context/AppContext";
import { formatDateTime, ResultSummary } from "./DrawPage";

export function HistoryPage() {
  const { history, deleteHistoryEntry } = useApp();

  if (history.length === 0) {
    return (
      <section className="page">
        <h2 className="page-heading">기록</h2>
        <p className="empty">아직 완료한 데이트가 없어요.</p>
      </section>
    );
  }

  return (
    <section className="page">
      <h2 className="page-heading">기록</h2>
      <ul className="history-list">
        {history.map((entry) => (
          <li key={entry.id} className="history-card">
            <div className="history-card__header">
              <time className="history-card__date" dateTime={entry.completedAt}>
                {formatDateTime(entry.completedAt)}
              </time>
              <button
                type="button"
                className="btn btn--ghost btn--small"
                onClick={() => {
                  if (window.confirm("이 기록을 삭제할까요?")) {
                    deleteHistoryEntry(entry.id);
                  }
                }}
                aria-label="기록 삭제"
              >
                삭제
              </button>
            </div>
            <ResultSummary
              region={entry.region}
              food={entry.food}
              dessert={entry.dessert}
              dateSpot={entry.dateSpot}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
