import { NavLink } from "react-router-dom";

const links: { to: string; label: string; end?: boolean }[] = [
  { to: "/", label: "뽑기", end: true },
  { to: "/history", label: "기록" },
  { to: "/items", label: "항목" },
];

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="메인 메뉴">
      {links.map(({ to, label, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end ?? false}
          className={({ isActive }) =>
            `bottom-nav__link${isActive ? " bottom-nav__link--active" : ""}`
          }
        >
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
