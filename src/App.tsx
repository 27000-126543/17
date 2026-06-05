import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import WaterSource from "@/pages/WaterSource";
import WaterSupply from "@/pages/WaterSupply";
import Metering from "@/pages/Metering";
import Drainage from "@/pages/Drainage";
import Sewage from "@/pages/Sewage";
import Inspection from "@/pages/Inspection";
import Settings from "@/pages/Settings";
import AppLayout from "@/components/layout/AppLayout";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/water-source" element={<WaterSource />} />
          <Route path="/water-supply" element={<WaterSupply />} />
          <Route path="/metering" element={<Metering />} />
          <Route path="/drainage" element={<Drainage />} />
          <Route path="/sewage" element={<Sewage />} />
          <Route path="/inspection" element={<Inspection />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}
