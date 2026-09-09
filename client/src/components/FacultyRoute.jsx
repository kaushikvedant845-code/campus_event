import { useEffect, useState } from "react"
import { Navigate, useLocation } from "react-router-dom"
import { supabase } from "../lib/supabase"

function FacultyRoute({ children }) {
  const location = useLocation()
  const [state, setState] = useState("checking")

  useEffect(() => {
    let mounted = true

    const checkFacultyAccess = async () => {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (sessionError) throw sessionError

        if (!session) {
          if (mounted) setState("login")
          return
        }

        const { data: authorized, error: authzError } =
          await supabase.rpc("is_authorized_faculty")

        if (authzError) throw authzError

        if (!authorized) {
          if (mounted) setState("denied")
          return
        }

        const { data: aal, error: aalError } =
          await supabase.auth.mfa.getAuthenticatorAssuranceLevel()

        if (aalError) throw aalError

        if (aal?.currentLevel !== "aal2") {
          if (mounted) setState("mfa")
          return
        }

        if (mounted) setState("allowed")
      } catch (error) {
        console.error("Faculty route check failed:", error)
        if (mounted) setState("denied")
      }
    }

    checkFacultyAccess()

    return () => {
      mounted = false
    }
  }, [])

  if (state === "checking") {
    return (
      <main className="dashboard-page">
        <div className="loading-card">
          <div className="loading-spinner" />
          <p>Checking faculty access...</p>
        </div>
      </main>
    )
  }

  if (state === "login") {
    return (
      <Navigate
        to="/faculty-login"
        state={{ from: location.pathname }}
        replace
      />
    )
  }

  if (state === "mfa") {
    return (
      <Navigate
        to="/faculty-login"
        state={{ from: location.pathname }}
        replace
      />
    )
  }

  if (state === "denied") {
    return (
      <main className="dashboard-page">
        <section className="dashboard-empty-state">
          <p className="dashboard-section-kicker">FACULTY PLATFORM</p>
          <h1>Access denied</h1>
          <p>
            This Google account is not authorized for the faculty platform.
          </p>
        </section>
      </main>
    )
  }

  return children
}

export default FacultyRoute
