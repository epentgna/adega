import { Navigate, Route, Routes } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db/db'
import { Layout } from './components/Layout'
import Home from './pages/Home'
import Catalog from './pages/Catalog'
import WineDetail from './pages/WineDetail'
import AddWine from './pages/AddWine'
import EditWine from './pages/EditWine'
import Menu from './pages/Menu'
import Manage from './pages/Manage'
import Cellars from './pages/Cellars'
import Consumption from './pages/Consumption'
import Labels from './pages/Labels'
import Settings from './pages/Settings'
import Onboarding from './pages/Onboarding'

export default function App() {
  const settings = useLiveQuery(() => db.settings.get(1), [])

  if (settings === undefined) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <div className="eyebrow animate-pulse">ADEGA // ABRINDO</div>
      </div>
    )
  }

  if (!settings.onboarded) {
    return (
      <Routes>
        <Route path="/inicio" element={<Onboarding />} />
        <Route path="*" element={<Navigate to="/inicio" replace />} />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/catalogo" element={<Catalog />} />
        <Route path="/cardapio" element={<Menu />} />
        <Route path="/gestao" element={<Manage />} />
      </Route>

      {/* Telas cheias, sem navegação de rodapé. */}
      <Route path="/catalogar" element={<AddWine />} />
      <Route path="/vinho/:id" element={<WineDetail />} />
      <Route path="/vinho/:id/editar" element={<EditWine />} />
      <Route path="/gestao/adegas" element={<Cellars />} />
      <Route path="/gestao/consumo" element={<Consumption />} />
      <Route path="/gestao/etiquetas" element={<Labels />} />
      <Route path="/gestao/config" element={<Settings />} />

      {/* Com a adega já aberta, /inicio cai na home: reabrir o onboarding
          aqui prenderia o app nele logo depois do primeiro cadastro. */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
