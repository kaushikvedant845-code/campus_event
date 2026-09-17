import { Routes, Route, Outlet } from "react-router-dom"

// =========================================================
// PUBLIC
// =========================================================

import Home from "../pages/common/Home"
import Events from "../pages/common/Events"
import EventDetails from "../pages/common/EventDetails"
import NotFound from "../pages/common/NotFound"

// =========================================================
// AUTH
// =========================================================

import Login from "../pages/auth/Login"
import Signup from "../pages/auth/Signup"

// =========================================================
// STUDENT
// =========================================================

import DashboardRouter from "../pages/DashboardRouter"
import Profile from "../pages/student/Profile"
import EventRegistration from "../pages/student/EventRegistration"
import RegistrationReview from "../pages/student/RegistrationReview"
import RegistrationSuccess from "../pages/student/RegistrationSuccess"
import RegisteredEventDetails from "../pages/student/RegisteredEventDetails"

// =========================================================
// SETTINGS
// =========================================================

import Settings from "../pages/settings/Settings"
import CustomizeProfile from "../pages/settings/CustomizeProfile"
import DashboardPreferences from "../pages/settings/DashboardPreferences"
import AccountSettings from "../pages/settings/AccountSettings"

// =========================================================
// FACULTY
// =========================================================

import FacultyLogin from "../pages/faculty/FacultyLogin"
import FacultyMfaSetup from "../pages/faculty/FacultyMfaSetup"
import FacultyDashboard from "../pages/faculty/FacultyDashboard"

// =========================================================
// CLUB HEAD
// =========================================================

import ClubHeadDashboard from "../pages/club_head/ClubHeadDashboard"

// =========================================================
// COMPONENTS
// =========================================================

import ProtectedRoute from "../components/ProtectedRoute"
import FacultyRoute from "../components/FacultyRoute"
import AttendanceScanner from "../components/AttendanceScanner"

// =========================================================
// APP ROUTES
// =========================================================

function AppRoutes() {
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

      {/* -----------------------------------------------------
          PUBLIC EVENT DETAILS

          IMPORTANT:
          This page must remain accessible WITHOUT LOGIN.

          /events/:id
          → pages/common/EventDetails.jsx

          Login is required only when the user chooses
          to register for the event.
      ----------------------------------------------------- */}

      <Route
        path="/events/:id"
        element={<EventDetails />}
      />

      {/* =====================================================
          STUDENT AUTH
      ===================================================== */}

      <Route
        path="/login"
        element={<Login />}
      />

      <Route
        path="/signup"
        element={<Signup />}
      />

      {/* =====================================================
          AUTHENTICATED USER ROUTES

          ProtectedRoute:
          - checks Supabase session
          - redirects unauthenticated users to /login
      ===================================================== */}

      <Route element={<ProtectedRouteWrapper />}>

        {/* ---------------------------------------------------
            DASHBOARD

            DashboardRouter decides:
            - Normal Student
            - Club Head
        --------------------------------------------------- */}

        <Route
          path="/dashboard"
          element={<DashboardRouter />}
        />

        {/* ---------------------------------------------------
            REGISTERED EVENT DETAILS

            IMPORTANT:
            This is NOT the public event page.

            Dashboard:
              Registered Events
                    ↓
              View Details
                    ↓
              /dashboard/registered-events/:id
                    ↓
              RegisteredEventDetails.jsx

            The student must already be logged in.
            There is NO "Register for Event" action here.
        --------------------------------------------------- */}

        <Route
          path="/dashboard/registered-events/:id"
          element={<RegisteredEventDetails />}
        />

        {/* ---------------------------------------------------
            STUDENT PROFILE
        --------------------------------------------------- */}

        <Route
          path="/profile"
          element={<Profile />}
        />

        {/* ---------------------------------------------------
            SETTINGS
        --------------------------------------------------- */}

        <Route
          path="/settings"
          element={<Settings />}
        />

        <Route
          path="/settings/profile"
          element={<CustomizeProfile />}
        />

        <Route
          path="/settings/dashboard"
          element={<DashboardPreferences />}
        />

        <Route
          path="/settings/account"
          element={<AccountSettings />}
        />

        {/* ---------------------------------------------------
            EVENT REGISTRATION

            Public event details are visible without login,
            but actual registration requires authentication.
        --------------------------------------------------- */}

        <Route
          path="/events/:id/register"
          element={<EventRegistration />}
        />

        <Route
          path="/events/:id/review"
          element={<RegistrationReview />}
        />

        <Route
          path="/registration-success"
          element={<RegistrationSuccess />}
        />

        {/* ---------------------------------------------------
            ATTENDANCE
        --------------------------------------------------- */}

        <Route
          path="/attendance/check-in"
          element={<AttendanceScanner />}
        />

      </Route>

      {/* =====================================================
          FACULTY AUTH
      ===================================================== */}

      <Route
        path="/faculty-login"
        element={<FacultyLogin />}
      />

      <Route
        path="/faculty-mfa-setup"
        element={
          <ProtectedRoute>
            <FacultyMfaSetup />
          </ProtectedRoute>
        }
      />

      {/* =====================================================
          FACULTY PLATFORM

          FacultyRoute checks:
          1. Supabase session
          2. Authorized faculty
          3. AAL2 / TOTP MFA

          Only after all three checks does the dashboard render.
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
          CLUB HEAD PLATFORM

          Club Head authorization is handled separately by
          DashboardRouter for /dashboard.

          The dedicated /club-head route remains protected.
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
          404
      ===================================================== */}

      <Route
        path="*"
        element={<NotFound />}
      />

    </Routes>
  )
}

// =========================================================
// PROTECTED ROUTE WRAPPER
// =========================================================

function ProtectedRouteWrapper() {
  return (
    <ProtectedRoute>
      <Outlet />
    </ProtectedRoute>
  )
}

export default AppRoutes