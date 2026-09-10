import { Navigate, Outlet, useLocation } from "react-router-dom"
import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"

export default function RoleRoute({ allowedRoles }) {
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

        if (userError) throw userError

        if (!user) {
          if (mounted) {
            setAuthorized(false)
            setLoading(false)
          }
          return
        }

        /*
         * IMPORTANT:
         * Role must come from trusted user/profile data
         * protected by Supabase RLS.
         *
         * Do NOT trust a role coming from URL/query/localStorage.
         */

        const { data: profile, error: profileError } =
          await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single()

        if (profileError) throw profileError

        const userRole = profile?.role

        if (
          mounted &&
          allowedRoles.includes(userRole)
        ) {
          setAuthorized(true)
        } else if (mounted) {
          setAuthorized(false)
        }
      } catch (error) {
        console.error("Role authorization error:", error)

        if (mounted) {
          setAuthorized(false)
        }
      } finally {
        if (mounted) {
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
        <p>Checking authorization...</p>
      </main>
    )
  }

  if (!authorized) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location.pathname,
        }}
      />
    )
  }

  return <Outlet />
}