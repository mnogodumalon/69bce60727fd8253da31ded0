import { HashRouter, Routes, Route } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import DashboardOverview from '@/pages/DashboardOverview';
import AdminPage from '@/pages/AdminPage';
import EinkaufsartikelPage from '@/pages/EinkaufsartikelPage';
import EinkaeuferPage from '@/pages/EinkaeuferPage';
import EinkaufslistePage from '@/pages/EinkaufslistePage';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<DashboardOverview />} />
          <Route path="einkaufsartikel" element={<EinkaufsartikelPage />} />
          <Route path="einkaeufer" element={<EinkaeuferPage />} />
          <Route path="einkaufsliste" element={<EinkaufslistePage />} />
          <Route path="admin" element={<AdminPage />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}