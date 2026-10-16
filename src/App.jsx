import { BrowserRouter, Routes, Route } from "react-router-dom";
import EntryPage from "./pages/EntryPage.jsx";
import Login from "./pages/LoginPage.jsx"
import Signup from "./pages/SignupPage.jsx"
import Secondsignup from "./pages/secondsignup.jsx"
import Dashboard from "./pages/Dashboard.jsx";
import ForgotPassword from "./pages/Forgotpassword.jsx";
import Lessons from "./pages/sidebarpages/Lessons.jsx";
import Saved from "./pages/sidebarpages/Saved.jsx";
import Projects from "./pages/sidebarpages/Projects.jsx";
import Notes from "./pages/sidebarpages/Notes.jsx";
import Resources from "./pages/sidebarpages/Resources.jsx";
import Community from "./pages/sidebarpages/Community.jsx";
import Achievements from "./pages/sidebarpages/Achievements.jsx";
import Certificates from "./pages/sidebarpages/Certificates.jsx";
import Settings from "./pages/sidebarpages/Settings.jsx";
import Help from "./pages/sidebarpages/Help.jsx";
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<EntryPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />}/>
        <Route path="/secondsignup" element={<Secondsignup />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="forgot-password" element={<ForgotPassword />}/>
        <Route path="/lessons" element={<Lessons />} />
        <Route path="/saved" element={<Saved />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/resources" element={<Resources />} />
        <Route path="/community" element={<Community />} />
        <Route path="/notes" element={<Notes /> } />
        <Route path="/achievements" element={<Achievements />} />
        <Route path="/certificates" element={<Certificates />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/help" element={<Help />} />
      </Routes>
    </BrowserRouter>
  );
}