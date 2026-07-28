import { Outlet } from "react-router-dom";

import Sidebar from "../../components/Sidebar";

const Main = () => {
  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar />

      <main className="relative min-w-0 flex-1 overflow-hidden bg-[#0e0d1a] max-md:rounded-lg shadow-lg">
        <Outlet />
      </main>
    </div>
  );
};

export default Main;
