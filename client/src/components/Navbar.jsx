import { useEffect, useRef, useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabase"

function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const menuRef = useRef(null)

  const [user, setUser] = useState(null)
  const [avatarUrl, setAvatarUrl] = useState("")
  const [menuOpen, setMenuOpen] = useState(false)

  const loadProfile = async (authUser) => {
    if (!authUser) return

    const fallbackUser = {
      id: authUser.id,
      email: authUser.email || "",
      name:
        authUser.user_metadata?.full_name ||
        authUser.user_metadata?.name ||
        authUser.email ||
        "User",
    }

    try {
      /*
       * Identity now comes from profiles.
       * Do NOT use the old students table here.
       */
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, avatar_url")
        .eq("id", authUser.id)
        .maybeSingle()

      if (error) {
        console.error("Navbar profile error:", error)
      }

      const updatedUser = {
        ...fallbackUser,
        name:
          profile?.full_name ||
          fallbackUser.name,
        email:
          profile?.email ||
          fallbackUser.email,
      }

      setUser(updatedUser)
      setAvatarUrl(profile?.avatar_url || "")

      localStorage.setItem(
        "studentUser",
        JSON.stringify(updatedUser)
      )
    } catch (error) {
      console.error("Navbar loading error:", error)

      setUser(fallbackUser)
      setAvatarUrl("")

      localStorage.setItem(
        "studentUser",
        JSON.stringify(fallbackUser)
      )
    }
  }

  useEffect(() => {
    let mounted = true

    const getUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!mounted) return

      if (session?.user) {
        await loadProfile(session.user)
      } else {
        /*
         * Keep the cached identity only as a temporary UI fallback.
         * Authentication is still controlled by Supabase.
         */
        const storedUser =
          localStorage.getItem("studentUser")

        if (storedUser) {
          try {
            setUser(JSON.parse(storedUser))
          } catch {
            localStorage.removeItem("studentUser")
          }
        }
      }
    }

    getUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return

        if (session?.user) {
          await loadProfile(session.user)
        } else if (event === "SIGNED_OUT") {
          setUser(null)
          setAvatarUrl("")
          setMenuOpen(false)

          localStorage.removeItem("studentUser")
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  // Close menu when user clicks outside
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target)
      ) {
        setMenuOpen(false)
      }
    }

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    )

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      )
    }
  }, [])

  // Close menu whenever page changes
  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  const handleLogout = async () => {
    setMenuOpen(false)

    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error("Logout error:", error)
      return
    }

    localStorage.removeItem("studentUser")

    setUser(null)
    setAvatarUrl("")

    navigate("/login", { replace: true })
  }

  return (
    <nav className="main-navbar">

      {/* BRAND */}
      <div className="navbar-brand">
        <Link to="/" className="navbar-logo">
          Campus Event
        </Link>
      </div>

      {/* NAVIGATION */}
      <div className="navbar-navigation">

        <Link to="/" className="navbar-link">
          Home
        </Link>

        <Link to="/events" className="navbar-link">
          Events
        </Link>

        {user ? (
          <div
            className="profile-menu-wrapper"
            ref={menuRef}
          >

            {/* PIP BUTTON */}
            <button
              type="button"
              className="profile-avatar-button"
              onClick={() =>
                setMenuOpen((prev) => !prev)
              }
              aria-label="Open profile menu"
              aria-expanded={menuOpen}
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Profile"
                  className="profile-avatar-image"
                />
              ) : (
                <span className="profile-avatar-fallback">
                  {user.name
                    ?.charAt(0)
                    ?.toUpperCase()}
                </span>
              )}
            </button>

            {/* DROPDOWN */}
            {menuOpen && (
              <div className="profile-dropdown">

                {/* USER INFO */}
                <div className="profile-dropdown-header">
                  <div className="dropdown-avatar">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="Profile"
                      />
                    ) : (
                      <span>
                        {user.name
                          ?.charAt(0)
                          ?.toUpperCase()}
                      </span>
                    )}
                  </div>

                  <div className="dropdown-user-info">
                    <strong>{user.name}</strong>
                    <span>{user.email}</span>
                  </div>
                </div>

                <div className="dropdown-divider" />

                {/* PROFILE */}
                <Link
                  to="/profile"
                  className="dropdown-item"
                >
                  <span>Profile</span>
                </Link>

                {/* DASHBOARD */}
                <Link
                  to="/dashboard"
                  className="dropdown-item"
                >
                  <span>Dashboard</span>
                </Link>

                {/* SETTINGS */}
                <Link
                  to="/settings"
                  className="dropdown-item"
                >
                  <span>Settings</span>
                </Link>

                <div className="dropdown-divider" />

                {/* LOGOUT */}
                <button
                  type="button"
                  className="dropdown-item logout-item"
                  onClick={handleLogout}
                >
                  <span>Logout</span>
                </button>

              </div>
            )}
          </div>
        ) : (
          <Link
            to="/login"
            className="navbar-link"
          >
            Login
          </Link>
        )}

      </div>
    </nav>
  )
}

export default Navbar
