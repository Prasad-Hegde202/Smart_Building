import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import History from "./pages/History";
import Landing from "./pages/Home";
import RealtimeChart from "./pages/Realtimechart";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"          element={<Landing />}   />
        <Route path="/dashboard"        element={<Dashboard />} />
        <Route path="/history" element={<History />}   />
        <Route path="/chart" element={<RealtimeChart />}   />
        
      </Routes>
    </BrowserRouter>
  );
}