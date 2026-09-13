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

  // ---------------------------------------------------------
  // PLATFORM IDENTITY
  // ---------------------------------------------------------
  // "student"  = normal student platform
  // "faculty"  = faculty platform
  // "unknown"  = authenticated but not yet identified
  // ---------------------------------------------------------

  const [platform, setPlatform] = useState("unknown")

  // ---------------------------------------------------------
  // LOAD USER + PLATFORM IDENTITY
  // ---------------------------------------------------------

  const loadUserIdentity = async (authUser) => {
    if (!authUser) {
      setUser(null)
      setAvatarUrl("")
      setPlatform("unknown")
      return
    }

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
      // -----------------------------------------------------
      // COMMON PROFILE
      // -----------------------------------------------------

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select(
          "id, email, full_name, avatar_url"
        )
        .eq("id", authUser.id)
        .maybeSingle()

      if (profileError) {
        console.error(
          "Navbar profile error:",
          profileError
        )
      }

      // -----------------------------------------------------
      // FACULTY AUTHORIZATION
      // -----------------------------------------------------
      // IMPORTANT:
      // Do NOT use profiles.role to identify faculty.
      //
      // Faculty identity is determined by the trusted
      // faculty authorization function.
      // -----------------------------------------------------

      let isFaculty = false

      const {
        data: authorizedFaculty,
        error: facultyError,
      } = await supabase.rpc(
        "is_authorized_faculty"
      )

      if (facultyError) {
        console.error(
          "Navbar faculty authorization check failed:",
          facultyError
        )
      } else {
        isFaculty = authorizedFaculty === true
      }

      // -----------------------------------------------------
      // FINAL USER
      // -----------------------------------------------------

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
      setAvatarUrl(
        profile?.avatar_url || ""
      )

      // -----------------------------------------------------
      // PLATFORM
      // -----------------------------------------------------

      setPlatform(
        isFaculty
          ? "faculty"
          : "student"
      )

      // -----------------------------------------------------
      // CACHE ONLY FOR UI
      // -----------------------------------------------------
      // This cache is NEVER used for authorization.
      // Supabase session + DB authorization remain
      // the source of truth.
      // -----------------------------------------------------

      localStorage.setItem(
        "studentUser",
        JSON.stringify(updatedUser)
      )
    } catch (error) {
      console.error(
        "Navbar loading error:",
        error
      )

      setUser(fallbackUser)
      setAvatarUrl("")

      // If identity check fails, do NOT assume faculty.
      setPlatform("student")

      localStorage.setItem(
        "studentUser",
        JSON.stringify(fallbackUser)
      )
    }
  }

  // ---------------------------------------------------------
  // INITIAL SESSION + AUTH STATE
  // ---------------------------------------------------------

  useEffect(() => {
    let mounted = true

    const getUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!mounted) return

      if (session?.user) {
        await loadUserIdentity(session.user)
      } else {
        setUser(null)
        setAvatarUrl("")
        setPlatform("unknown")

        // ---------------------------------------------------
        // No authenticated session:
        // cached identity is not trusted.
        // ---------------------------------------------------

        localStorage.removeItem(
          "studentUser"
        )
      }
    }

    getUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return

        if (session?.user) {
          await loadUserIdentity(
            session.user
          )
        } else if (
          event === "SIGNED_OUT"
        ) {
          setUser(null)
          setAvatarUrl("")
          setPlatform("unknown")
          setMenuOpen(false)

          localStorage.removeItem(
            "studentUser"
          )
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  // ---------------------------------------------------------
  // CLOSE MENU OUTSIDE CLICK
  // ---------------------------------------------------------

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(
          event.target
        )
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

  // ---------------------------------------------------------
  // CLOSE MENU ON PAGE CHANGE
  // ---------------------------------------------------------

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  // ---------------------------------------------------------
  // LOGOUT
  // ---------------------------------------------------------

  const handleLogout = async () => {
    setMenuOpen(false)

    const { error } =
      await supabase.auth.signOut()

    if (error) {
      console.error(
        "Logout error:",
        error
      )
      return
    }

    localStorage.removeItem(
      "studentUser"
    )

    setUser(null)
    setAvatarUrl("")
    setPlatform("unknown")

    navigate("/login", {
      replace: true,
    })
  }

  // ---------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------

  return (
    <nav className="main-navbar">

      {/* ===================================================
          BRAND
      =================================================== */}

      <div className="navbar-brand">
        <Link
          to="/"
          className="navbar-logo"
        >
          Campus Event
        </Link>
      </div>

      {/* ===================================================
          NAVIGATION
      =================================================== */}

      <div className="navbar-navigation">

        <Link
          to="/"
          className="navbar-link"
        >
          Home
        </Link>

        <Link
          to="/events"
          className="navbar-link"
        >
          Events
        </Link>

        {/* =================================================
            AUTHENTICATED USER
        ================================================= */}

        {user ? (
          <div
            className="profile-menu-wrapper"
            ref={menuRef}
          >

            {/* ------------------------------------------------
                PROFILE BUTTON
            ------------------------------------------------ */}

            <button
              type="button"
              className="profile-avatar-button"
              onClick={() =>
                setMenuOpen(
                  (prev) => !prev
                )
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

            {/* ------------------------------------------------
                DROPDOWN
            ------------------------------------------------ */}

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

                    <strong>
                      {user.name}
                    </strong>

                    <span>
                      {user.email}
                    </span>

                  </div>

                </div>

                <div className="dropdown-divider" />

                {/* =================================================
                    FACULTY MENU
                ================================================= */}

                {platform === "faculty" ? (
                  <>
                    <Link
                      to="/faculty"
                      className="dropdown-item"
                    >
                      <span>
                        Faculty Dashboard
                      </span>
                    </Link>

                    <div className="dropdown-divider" />

                    <button
                      type="button"
                      className="dropdown-item logout-item"
                      onClick={
                        handleLogout
                      }
                    >
                      <span>
                        Logout
                      </span>
                    </button>
                  </>
                ) : (
                  /* =================================================
                     STUDENT / CLUB HEAD MENU
                  ================================================= */

                  <>
                    <Link
                      to="/profile"
                      className="dropdown-item"
                    >
                      <span>
                        Profile
                      </span>
                    </Link>

                    <Link
                      to="/dashboard"
                      className="dropdown-item"
                    >
                      <span>
                        Dashboard
                      </span>
                    </Link>

                    <Link
                      to="/settings"
                      className="dropdown-item"
                    >
                      <span>
                        Settings
                      </span>
                    </Link>

                    <div className="dropdown-divider" />

                    <button
                      type="button"
                      className="dropdown-item logout-item"
                      onClick={
                        handleLogout
                      }
                    >
                      <span>
                        Logout
                      </span>
                    </button>
                  </>
                )}

              </div>
            )}

          </div>
        ) : (
          /* =================================================
             NOT AUTHENTICATED
          ================================================= */

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