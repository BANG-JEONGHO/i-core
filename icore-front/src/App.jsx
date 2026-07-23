import { useState } from "react";
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";

function App() {
  const [session, setSession] = useState(() => {
    const saved = window.localStorage.getItem("icore_user_session");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const handleLogout = () => {
    window.localStorage.removeItem("icore_auth_token");
    window.localStorage.removeItem("icore_user_session");
    setSession(null);
  };

  // If no session, present Google SNS Login as the first screen
  if (!session) {
    return <LoginPage onSuccess={setSession} />;
  }

  return <Dashboard session={session} onLogout={handleLogout} />;
}

export default App;
