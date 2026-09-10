import { Navigate, Outlet, useLocation } from "react-router-dom"
import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"

function RoleRoute({ allowedRoles = [] }) {
  const location = useLocation()

  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    let mounted = true

    const checkRole = async () => {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError) {
          throw userError
        }

        if (!user) {
          if (mounted) {
            setAuthorized(false)
            setLoading(false)
          }

          return
        }

        /*
         * NEVER trust role from:
         *
         * URL
         * query parameters
         * localStorage
         * sessionStorage
         * frontend state
         *
         * Role comes from the database.
         */

        const {
          data: profile,
          error: profileError,
        } = await supabase
          .from("profiles")
          .select("role, account_status")
          .eq("id", user.id)
          .maybeSingle()

        if (profileError) {
          throw profileError
        }

        if (!profile) {
          throw new Error(
            "Profile not found."
          )
        }

        /*
         * Account status check.
         *
         * If your DB currently doesn't have
         * account_status values, this remains
         * harmless for normal active accounts.
         */

        if (
          profile.account_status &&
          profile.account_status !== "active"
        ) {
          if (mounted) {
            setAuthorized(false)
            setLoading(false)
          }

          return
        }

        const userRole = profile.role

        const isAllowed =
          allowedRoles.includes(userRole)

        if (mounted) {
          setAuthorized(isAllowed)
          setLoading(false)
        }
      } catch (error) {
        console.error(
          "Role authorization error:",
          error
        )

        if (mounted) {
          setAuthorized(false)
          setLoading(false)
        }
      }
    }

    checkRole()

    return () => {
      mounted = false
    }
  }, [allowedRoles])

  if (loading) {
    return (
      <main className="auth-loading">
        <p>
          Checking authorization...
        </p>
      </main>
    )
  }

  if (!authorized) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from:
            location.pathname +
            location.search,
        }}
      />
    )
  }

  return <Outlet />
}

export default RoleRoute