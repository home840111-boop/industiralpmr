import Layout from "./Layout";
import { FC, useState, useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route
} from 'react-router-dom';
import { auth } from "./Components/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { FullScreen } from "./Components/Loaders";
import { Provider } from "jotai";
import store from "./Components/Store";
import Login from "./routes/Login";
import Dashboard from "./routes/Dashboard";
import Machines from "./routes/Machines";
import Machine from "./routes/Machines/Machine";
import MainElectricity from "./routes/MainElectricity";
import Settings from "./routes/Settings";
import Equipments from "./routes/Equipments";
import NotFound from "./routes/NotFound";
import Equipment from "./routes/Equipments/Equipment";
import RawMaterials from "./routes/RawMaterials";
import ManageRawMaterials from "./routes/RawMaterials/Manage";
import Environments from "./routes/Environments";
import Environment from "./routes/Environments/Environment";
import Reports from "./routes/Reports";
import CostIntelligence from "./routes/Reports/CostIntelligence";
import MachinePower from "./routes/Machines/Machine/Power";
import Departments from "./routes/Departments";
import Department from "./routes/Departments/Department";
import Downtime from "./routes/Targets/Downtime";
import Production from "./routes/Targets";
import Target from "./routes/Targets/Target";
// import TargetStats from "./routes/Targets/TargetStats";

const App: FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith("active_production_order_")) {
          localStorage.removeItem(key);
        }
      });
    } catch (e) {}

    onAuthStateChanged(auth, (user) => {
      setIsLoggedIn(!!user);
    });
  }, []);

  return <Router>
    <Provider store={store}>
      {isLoggedIn === null ? <FullScreen />
        : isLoggedIn ? <Layout>
          <Routes>
            <Route path="/" element={
              <Dashboard />
            } />
            <Route path="/machines" element={
              <Machines />
            } />
            <Route path="/machines/:machineID" element={
              <Machine />
            } />
            <Route path="/machines/:machineID/power" element={
              <MachinePower />
            } />
            <Route path="/equipments" element={
              <Equipments />
            } />
            <Route path="/equipments/:equipmentID" element={
              <Equipment />
            } />
            <Route path="/environments" element={
              <Environments />
            } />
            <Route path="/environments/:environmentID" element={
              <Environment />
            } />
            <Route path="/main-electricity" element={
              <MainElectricity />
            } />
            <Route path="/departments" element={
              <Departments />
            } />
            <Route path="/departments/:departmentName" element={
              <Department />
            } />
            <Route path="/raw-materials" element={
              <RawMaterials />
            } />
            <Route path="/raw-materials/manage" element={
              <ManageRawMaterials />
            } />
            <Route path="/reports" element={
              <Reports />
            } />
            <Route path="/reports/cost-intelligence" element={
              <CostIntelligence />
            } />
            <Route path="/settings" element={
              <Settings />
            } />
            <Route path="/targets" element={
              <Production />
            } />
            <Route path="/targets/target/:machineID" element={
              <Target />
            } />
            <Route path="/targets/stats" element={
              <NotFound text="Coming Soon." />
            } />
            <Route path="/targets/down-time" element={
              <Downtime />
            } />
            <Route path="/targets/:machineID" element={
              <Target />
            } />
            <Route path="*" element={
              <NotFound />
            } />
          </Routes>
        </Layout>
          : <Login />}
    </Provider>
  </Router>
}

export default App