import { Navigate, useLocation } from "react-router-dom"
import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"

function ProtectedRoute({ children }) {
  const location = useLocation()

  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(null)

  useEffect(() => {
    let mounted = true

    const loadSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession()

        if (error) {
          throw error
        }

        if (mounted) {
          setSession(session)
          setLoading(false)
        }
      } catch (error) {
        console.error(
          "Authentication session error:",
          error
        )

        if (mounted) {
          setSession(null)
          setLoading(false)
        }
      }
    }

    loadSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return

        setSession(session)
        setLoading(false)
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  if (loading) {
    return (
      <main className="auth-loading">
        <p>Checking authentication...</p>
      </main>
    )
  }

  if (!session) {
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

  return children
}

export default ProtectedRoute