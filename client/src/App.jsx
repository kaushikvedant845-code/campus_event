import { BrowserRouter, useLocation } from "react-router-dom"

import Navbar from "./components/Navbar"
import AppRoutes from "./routes/AppRoutes"

function AppContent() {
  const location = useLocation()

  /*
   * Hide the normal application navbar ONLY while
   * faculty authentication is in progress.
   *
   * Faculty login:
   *   /faculty-login
   *
   * Faculty MFA setup / verification:
   *   /faculty-mfa-setup
   *
   * Once authentication is complete and the user reaches:
   *   /faculty
   *
   * the normal Campus Event navbar is shown again.
   */

  const isFacultyAuthenticationPage =
    location.pathname === "/faculty-login" ||
    location.pathname === "/faculty-mfa-setup"

  return (
    <>
      {!isFacultyAuthenticationPage && <Navbar />}

      <AppRoutes />
    </>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}

export default App