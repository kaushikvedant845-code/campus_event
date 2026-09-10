import { Routes, Route } from "react-router-dom"

// =====================================================
// PUBLIC PAGES
// =====================================================

import Home from "../pages/common/Home"
import Events from "../pages/common/Events"
import EventDetails from "../pages/common/EventDetails"
import NotFound from "../pages/common/NotFound"

// =====================================================
// AUTH
// =====================================================

import Login from "../pages/auth/Login"
import Signup from "../pages/auth/Signup"

// =====================================================
// STUDENT
// =====================================================

import StudentDashboard from "../pages/student/StudentDashboard"
import Profile from "../pages/student/Profile"

import EventRegistration from "../pages/student/EventRegistration"
import RegistrationReview from "../pages/student/RegistrationReview"
import RegistrationSuccess from "../pages/student/RegistrationSuccess"

// =====================================================
// CLUB HEAD
// =====================================================

import ClubHeadDashboard from "../pages/club_head/ClubHeadDashboard"

// =====================================================
// SETTINGS
// =====================================================

import Settings from "../pages/settings/Settings"
import CustomizeProfile from "../pages/settings/CustomizeProfile"
import DashboardPreferences from "../pages/settings/DashboardPreferences"
import AccountSettings from "../pages/settings/AccountSettings"

// =====================================================
// COMPONENTS / PROTECTION
// =====================================================

import ProtectedRoute from "../components/ProtectedRoute"
import AttendanceScanner from "../components/AttendanceScanner"

// =====================================================
// FACULTY
// =====================================================

// Faculty module
import FacultyLogin from "../pages/faculty/FacultyLogin"
import FacultyMfaSetup from "../pages/faculty/FacultyMfaSetup"
import FacultyDashboard from "../pages/faculty/FacultyDashboard"
import FacultyRoute from "../components/FacultyRoute"



export default function AppRoutes() {
  return (
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
            <StudentDashboard />
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
          CLUB HEAD
          ===================================================== */}

      <Route
        path="/club-head"
        element={
          <ProtectedRoute>
            <ClubHeadDashboard />
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
  )
}