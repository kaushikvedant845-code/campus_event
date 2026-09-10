import { Routes, Route } from "react-router-dom"

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

import StudentDashboard from "../pages/student/StudentDashboard"
import Profile from "../pages/student/Profile"
import EventRegistration from "../pages/student/EventRegistration"
import RegistrationReview from "../pages/student/RegistrationReview"
import RegistrationSuccess from "../pages/student/RegistrationSuccess"

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
import RoleRoute from "../components/RoleRoute"
import AttendanceScanner from "../components/AttendanceScanner"

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
          AUTHENTICATED USER
      ===================================================== */}

      <Route element={<ProtectedRouteWrapper />}>

        {/* Student dashboard */}
        <Route
          path="/dashboard"
          element={<StudentDashboard />}
        />

        {/* Profile */}
        <Route
          path="/profile"
          element={<Profile />}
        />

        {/* Settings */}
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

        {/* Registration */}
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

        {/* Attendance */}
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
          FACULTY
      ===================================================== */}

      <Route
        element={
          <RoleRoute
            allowedRoles={["faculty"]}
          />
        }
      >
        <Route
          path="/faculty"
          element={<FacultyDashboard />}
        />
      </Route>

      {/* =====================================================
          CLUB HEAD
      ===================================================== */}

      <Route
        element={
          <RoleRoute
            allowedRoles={[
              "student",
              "club_head",
            ]}
          />
        }
      >
        <Route
          path="/club-head"
          element={<ClubHeadDashboard />}
        />
      </Route>

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

/*
 * =========================================================
 * AUTHENTICATED ROUTE WRAPPER
 * =========================================================
 *
 * We keep ProtectedRoute responsible only for
 * authentication.
 *
 * RoleRoute is responsible for authorization.
 *
 * This separation makes future roles easier to add.
 * =========================================================
 */

function ProtectedRouteWrapper() {
  return (
    <ProtectedRoute>
      <RoutesOutlet />
    </ProtectedRoute>
  )
}

function RoutesOutlet() {
  return <></>
}

export default AppRoutes