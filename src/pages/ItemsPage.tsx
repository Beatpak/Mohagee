import { useState } from "react";
import { useApp } from "../context/AppContext";
import { CATEGORY_LABELS, CATEGORY_ORDER, type Category } from "../types";

export function ItemsPage() {
  const { items, addItem, removeItem } = useApp();
  const [tab, setTab] = useState<Category>("region");
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const result = addItem(tab, input);
    if (!result.ok) {
      setError(result.reason);
      return;
    }
    setInput("");
  };

  const list = items[tab];

  return (
    <section className="page">
      <h2 className="page-heading">항목 관리</h2>
      <p className="muted">추가·삭제가 가능해요. 수정은 삭제 후 다시 추가해 주세요.</p>

      <div className="tabs" role="tablist" aria-label="카테고리">
        {CATEGORY_ORDER.map((category) => (
          <button
            key={category}
            type="button"
            role="tab"
            aria-selected={tab === category}
            className={`tabs__btn${tab === category ? " tabs__btn--active" : ""}`}
            onClick={() => {
              setTab(category);
              setError(null);
            }}
          >
            {CATEGORY_LABELS[category]}
            <span className="tabs__count">{items[category].length}</span>
          </button>
        ))}
      </div>

      <form className="add-form" onSubmit={handleAdd}>
        <input
          type="text"
          className="input"
          placeholder={`${CATEGORY_LABELS[tab]} 항목 추가`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={50}
          aria-label={`${CATEGORY_LABELS[tab]} 새 항목`}
        />
        <button type="submit" className="btn btn--primary">
          추가
        </button>
      </form>
      {error && <p className="alert">{error}</p>}

      {list.length === 0 ? (
        <p className="empty">항목이 없어요. 위에서 추가해 주세요.</p>
      ) : (
        <ul className="item-list">
          {list.map((label) => (
            <li key={label} className="item-list__row">
              <span>{label}</span>
              <button
                type="button"
                className="btn btn--ghost btn--small"
                onClick={() => {
                  if (window.confirm(`「${label}」 항목을 삭제할까요?`)) {
                    removeItem(tab, label);
                  }
                }}
              >
                삭제
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
