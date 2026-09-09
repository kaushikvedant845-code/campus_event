import { BrowserRouter, Routes, Route } from "react-router-dom"

// Public pages
import Home from "./pages/Home"
import Events from "./pages/Events"
import EventDetails from "./pages/EventDetails"
import Login from "./pages/Login"
import Signup from "./pages/Signup"
import NotFound from "./pages/NotFound"

// Authenticated pages
import DashboardRouter from "./pages/DashboardRouter"
import Profile from "./pages/Profile"
import Settings from "./pages/Settings"

// Settings pages
import CustomizeProfile from "./pages/settingsPages/CustomizeProfile"
import DashboardPreferences from "./pages/settingsPages/DashboardPreferences"
import AccountSettings from "./pages/settingsPages/AccountSettings"

// Registration pages
import EventRegistration from "./pages/EventRegistration"
import RegistrationReview from "./pages/RegistrationReview"
import RegistrationSuccess from "./pages/RegistrationSuccess"

// Components
import Navbar from "./components/Navbar"
import ProtectedRoute from "./components/ProtectedRoute"
import AttendanceScanner from "./components/AttendanceScanner"

// Faculty module
import FacultyLogin from "./pages/faculty_module/FacultyLogin"
import FacultyMfaSetup from "./pages/faculty_module/FacultyMfaSetup"
import FacultyDashboard from "./pages/faculty_module/FacultyDashboard"
import FacultyRoute from "./components/FacultyRoute"

function App() {
  return (
    <BrowserRouter>

      {/* Global Navbar */}
      <Navbar />

      <Routes>

        {/* =====================================================
            PUBLIC ROUTES
            ===================================================== */}

        <Route
          path="/"
          element={<Home />}
        />

        <Route
          path="/events"
          element={<Events />}
        />

        <Route
          path="/events/:id"
          element={<EventDetails />}
        />

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/signup"
          element={<Signup />}
        />


        {/* =====================================================
            STUDENT DASHBOARD
            ===================================================== */}

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardRouter />
            </ProtectedRoute>
          }
        />


        {/* =====================================================
            STUDENT PROFILE
            ===================================================== */}

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />


        {/* =====================================================
            SETTINGS
            ===================================================== */}

        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />

        <Route
          path="/settings/profile"
          element={
            <ProtectedRoute>
              <CustomizeProfile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/settings/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPreferences />
            </ProtectedRoute>
          }
        />

        <Route
          path="/settings/account"
          element={
            <ProtectedRoute>
              <AccountSettings />
            </ProtectedRoute>
          }
        />


        {/* =====================================================
            EVENT REGISTRATION
            ===================================================== */}

        <Route
          path="/events/:id/register"
          element={
            <ProtectedRoute>
              <EventRegistration />
            </ProtectedRoute>
          }
        />

        <Route
          path="/events/:id/review"
          element={
            <ProtectedRoute>
              <RegistrationReview />
            </ProtectedRoute>
          }
        />

        <Route
          path="/registration-success"
          element={
            <ProtectedRoute>
              <RegistrationSuccess />
            </ProtectedRoute>
          }
        />


        {/* =====================================================
            ATTENDANCE
            ===================================================== */}

        <Route
          path="/attendance/check-in"
          element={
            <ProtectedRoute>
              <AttendanceScanner />
            </ProtectedRoute>
          }
        />
           {/* =====================================================
    FACULTY AUTHENTICATION
    ===================================================== */}

<Route
  path="/faculty-login"
  element={<FacultyLogin />}
/>

<Route
  path="/faculty-mfa-setup"
  element={<FacultyMfaSetup />}
/>


{/* =====================================================
    FACULTY DASHBOARD
    ===================================================== */}

<Route
  path="/faculty"
  element={
    <FacultyRoute>
      <FacultyDashboard />
    </FacultyRoute>
  }
/>

        {/* =====================================================
            404
            ===================================================== */}

        <Route
          path="*"
          element={<NotFound />}
        />

      </Routes>

    </BrowserRouter>
  )
}

export default App