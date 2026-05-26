import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import { Layout } from "./components/Layout";
import { DrawPage } from "./pages/DrawPage";
import { HistoryPage } from "./pages/HistoryPage";
import { ItemsPage } from "./pages/ItemsPage";
import { ResultPage } from "./pages/ResultPage";

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<DrawPage />} />
            <Route path="result" element={<ResultPage />} />
            <Route path="history" element={<HistoryPage />} />
            <Route path="items" element={<ItemsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
