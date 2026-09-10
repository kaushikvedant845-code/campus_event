import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
// pages/faculty/FacultyDashboard.jsx
import { supabase } from "../../lib/supabase"

function StudentDashboard({ profile: dashboardProfile = null }) {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(dashboardProfile)

  const [registrations, setRegistrations] = useState([])
  const [memberships, setMemberships] = useState([])
  const [attendanceCount, setAttendanceCount] = useState(0)

  const [error, setError] = useState("")
  const [expandedPanel, setExpandedPanel] = useState("registered")

  const [preferences, setPreferences] = useState({
    showEmail: true,
    showAdmissionNo: true,
    showProgram: true,
    showAcademicSession: true,
  })

  // =========================================================
  // GREETING
  // =========================================================

  const getGreeting = () => {
    const hour = new Date().getHours()

    if (hour >= 5 && hour < 12) {
      return "Good Morning"
    }

    if (hour >= 12 && hour < 17) {
      return "Good Afternoon"
    }

    return "Good Evening"
  }

  // =========================================================
  // LOAD PREFERENCES
  // =========================================================

  const loadPreferences = (userId) => {
    try {
      const userKey = `dashboardPreferences:${userId}`

      const saved =
        localStorage.getItem(userKey) ||
        localStorage.getItem("dashboardPreferences")

      if (!saved) {
        return
      }

      const parsed = JSON.parse(saved)

      setPreferences({
        showEmail: parsed.showEmail ?? true,
        showAdmissionNo:
          parsed.showAdmissionNo ?? true,
        showProgram:
          parsed.showProgram ?? true,
        showAcademicSession:
          parsed.showAcademicSession ?? true,
      })
    } catch (err) {
      console.error(
        "Dashboard preferences error:",
        err
      )
    }
  }

  // =========================================================
  // LOAD DASHBOARD
  // =========================================================

  useEffect(() => {
    let mounted = true

    const loadDashboard = async () => {
      try {
        setLoading(true)
        setError("")

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError) {
          throw userError
        }

        if (!user) {
          throw new Error(
            "You are not logged in."
          )
        }

        loadPreferences(user.id)

        // -----------------------------------------------------
        // COMMON PROFILE
        // -----------------------------------------------------

        const {
          data: baseProfile,
          error: profileError,
        } = await supabase
          .from("profiles")
          .select(
            `
              id,
              email,
              full_name,
              avatar_url,
              role,
              account_status
            `
          )
          .eq("id", user.id)
          .maybeSingle()

        if (profileError) {
          throw profileError
        }

        if (!baseProfile) {
          throw new Error(
            "Profile not found for this account."
          )
        }

        // -----------------------------------------------------
        // STUDENT PROFILE
        // -----------------------------------------------------

        const {
          data: studentProfile,
          error: studentError,
        } = await supabase
          .from("student_profiles")
          .select(
            `
              profile_id,
              roll_number,
              department,
              course,
              year,
              phone,
              program_name,
              academic_session,
              admission_no,
              profile_complete,
              verification_status
            `
          )
          .eq("profile_id", user.id)
          .maybeSingle()

        if (studentError) {
          throw studentError
        }

        // -----------------------------------------------------
        // REGISTERED EVENTS
        // -----------------------------------------------------

        const {
          data: registrationRows,
          error: registrationError,
        } = await supabase
          .from("registrations")
          .select(
            `
              id,
              profile_id,
              event_id,
              registered_at,

              events (
                id,
                title,
                category,
                description,
                event_date,
                start_time,
                end_time,
                requested_venue,
                assigned_venue,
                expected_participants,
                status,
                approval_status,
                head_decision,
                publication_mode
              )
            `
          )
          .eq("profile_id", user.id)
          .order("registered_at", {
            ascending: false,
          })

        if (registrationError) {
          throw registrationError
        }

        // -----------------------------------------------------
        // CLUB MEMBERSHIPS
        // -----------------------------------------------------

        const {
          data: clubMemberships,
          error: membershipError,
        } = await supabase
          .from("club_memberships")
          .select(
            `
              id,
              club_id,
              membership_role,
              membership_status,
              joined_at,

              clubs (
                id,
                name,
                club_code,
                description,
                is_active
              )
            `
          )
          .eq("profile_id", user.id)
          .order("joined_at", {
            ascending: false,
          })

        if (membershipError) {
          throw membershipError
        }

        // -----------------------------------------------------
        // ATTENDANCE
        // -----------------------------------------------------

        const {
          count,
          error: attendanceError,
        } = await supabase
          .from("attendance")
          .select("id", {
            count: "exact",
            head: true,
          })
          .eq("profile_id", user.id)

        if (attendanceError) {
          throw attendanceError
        }

        if (!mounted) {
          return
        }

        setProfile({
          ...baseProfile,
          student_profile:
            studentProfile || null,
        })

        setRegistrations(
          registrationRows || []
        )

        setMemberships(
          clubMemberships || []
        )

        setAttendanceCount(
          count || 0
        )
      } catch (err) {
        console.error(
          "Dashboard error:",
          err
        )

        if (!mounted) {
          return
        }

        setError(
          err?.message ||
            "Unable to load your dashboard."
        )
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadDashboard()

    return () => {
      mounted = false
    }
  }, [])

  // =========================================================
  // LISTEN FOR SETTINGS CHANGES
  // =========================================================

  useEffect(() => {
    const handleStorage = () => {
      const userId = profile?.id

      if (userId) {
        loadPreferences(userId)
      }
    }

    window.addEventListener(
      "storage",
      handleStorage
    )

    return () => {
      window.removeEventListener(
        "storage",
        handleStorage
      )
    }
  }, [profile?.id])

  // =========================================================
  // PANEL
  // =========================================================

  const togglePanel = (panel) => {
    setExpandedPanel(
      (previous) =>
        previous === panel
          ? null
          : panel
    )
  }

  // =========================================================
  // DATE
  // =========================================================

  const formatDate = (date) => {
    if (!date) {
      return "Date to be announced"
    }

    return new Date(
      `${date}T00:00:00`
    ).toLocaleDateString(
      "en-IN",
      {
        day: "numeric",
        month: "long",
        year: "numeric",
      }
    )
  }

  // =========================================================
  // TIME
  // =========================================================

  const formatTime = (time) => {
    if (!time) {
      return ""
    }

    const [hours, minutes] =
      time.split(":")

    const date = new Date()

    date.setHours(
      Number(hours),
      Number(minutes),
      0,
      0
    )

    return date.toLocaleTimeString(
      "en-IN",
      {
        hour: "numeric",
        minute: "2-digit",
      }
    )
  }

  // =========================================================
  // VENUE
  // =========================================================

  const getEventVenue = (event) => {
    return (
      event?.assigned_venue ||
      event?.requested_venue ||
      "Venue to be announced"
    )
  }

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <main className="dashboard-page">
        <div className="loading-card">
          <div className="loading-spinner" />

          <p>
            Loading your dashboard...
          </p>
        </div>
      </main>
    )
  }

  // =========================================================
  // ERROR
  // =========================================================

  if (error) {
    return (
      <main className="dashboard-page">
        <section className="dashboard-empty-state">

          <p className="dashboard-section-kicker">
            DASHBOARD
          </p>

          <h1>
            Unable to load dashboard
          </h1>

          <p>
            {error}
          </p>

          <button
            type="button"
            onClick={() =>
              window.location.reload()
            }
          >
            Try Again
          </button>

        </section>
      </main>
    )
  }

  // =========================================================
  // DATA
  // =========================================================

  const displayName =
    profile?.full_name ||
    "Student"

  const student =
    profile?.student_profile || {}

  // =========================================================
  // PAGE
  // =========================================================

  return (
    <main className="dashboard-page">

      {/* =====================================================
          HERO
      ===================================================== */}

      <section className="dashboard-hero">

        <div className="dashboard-hero-content">

          <p className="dashboard-label">
            STUDENT DASHBOARD
          </p>

          <h1>
            {getGreeting()}, {displayName}.
          </h1>

          <p className="dashboard-subtitle">
            Keep track of your campus
            activities, registrations
            and clubs.
          </p>

        </div>

      </section>


      {/* =====================================================
          PROFILE
      ===================================================== */}

      <section className="dashboard-profile-section">

     <div className="section-heading">
  <div>
  <p className="dashboard-label">
  YOUR DASHBOARD
</p>

<h2>
  Student Overview
</h2>
  </div>
</div>


        <div className="info-grid">

          {preferences.showEmail && (
            <div className="info-card">

              <span>
                Email
              </span>

              <strong>
                {profile?.email ||
                  "Not available"}
              </strong>

            </div>
          )}


          {preferences.showAdmissionNo && (
            <div className="info-card">

              <span>
                Admission No.
              </span>

              <strong>
                {student.admission_no ||
                  "Not available"}
              </strong>

            </div>
          )}


          {preferences.showProgram && (
            <div className="info-card">

              <span>
                Program
              </span>

              <strong>
                {student.program_name ||
                  "Not available"}
              </strong>

            </div>
          )}


          {preferences.showAcademicSession && (
            <div className="info-card">

              <span>
                Academic Session
              </span>

              <strong>
                {student.academic_session ||
                  "Not available"}
              </strong>

            </div>
          )}

        </div>
       <div
  className="dashboard-customize-wrapper"
  style={{
    display: "flex",
    justifyContent: "flex-start",
    marginTop: "8px",
    marginBottom: "34px",
  }}
>
  <Link
    to="/settings/dashboard"
    className="dashboard-customize-link"
  >
    Customize
  </Link>
</div>

      </section>


      {/* =====================================================
          ACTIVITY
      ===================================================== */}

      <section className="activity-section">

        <div className="activity-section-heading">

          <div>

            <p className="dashboard-section-kicker">
              YOUR ACTIVITY
            </p>

            <h2>
              Everything in one place.
            </h2>

            <p className="activity-section-subtitle">
              Your registrations, attendance
              and club memberships.
            </p>

          </div>

        </div>


        {/* ===================================================
            REGISTERED EVENTS
        =================================================== */}

        <article
          className={`activity-panel ${
            expandedPanel === "registered"
              ? "activity-panel-open"
              : ""
          }`}
        >

          <button
            type="button"
            className="activity-panel-header"
            onClick={() =>
              togglePanel("registered")
            }
            aria-expanded={
              expandedPanel === "registered"
            }
          >

            <div className="activity-panel-title">

              <div className="activity-icon registered-icon">
                ✓
              </div>

              <div>

                <span className="activity-panel-label">
                  EVENTS
                </span>

                <h3>
                  Registered Events
                </h3>

              </div>

            </div>

            <span className="activity-panel-arrow">
              {expandedPanel === "registered"
                ? "−"
                : "+"}
            </span>

          </button>


          {expandedPanel === "registered" && (

            <div className="activity-panel-content">

              <div className="registered-events-toolbar">

                <span className="event-count">
                  {registrations.length}{" "}
                  {registrations.length === 1
                    ? "Event"
                    : "Events"}
                </span>

                <Link
                  to="/events"
                  className="view-all-button"
                >
                  Browse Events
                </Link>

              </div>


              {registrations.length === 0 ? (

                <div className="activity-empty-state">

                  <h3>
                    No registered events
                  </h3>

                  <p>
                    Events you register for
                    will appear here.
                  </p>

                  <Link
                    to="/events"
                    className="primary-button"
                  >
                    Browse Events
                  </Link>

                </div>

              ) : (

                <div className="registered-event-list">

                  {registrations.map(
                    (registration) => {

                      const event =
                        registration.events

                      return (
                        <div
                          className="registered-event-item"
                          key={registration.id}
                        >

                          <div>

                            <strong>
                              {event?.title ||
                                "Event"}
                            </strong>

                            <span>
                              {event?.category ||
                                "Campus Event"}
                            </span>

                            <span>
                              {formatDate(
                                event?.event_date
                              )}

                              {event?.start_time
                                ? ` • ${formatTime(
                                    event.start_time
                                  )}`
                                : ""}
                            </span>

                            <span>
                              {getEventVenue(
                                event
                              )}
                            </span>

                          </div>

                          {event?.id && (
                            <Link
                              to={`/events/${event.id}`}
                              className="secondary-button"
                            >
                              View Details
                            </Link>
                          )}

                        </div>
                      )
                    }
                  )}

                </div>

              )}

            </div>

          )}

        </article>


        {/* ===================================================
            ATTENDANCE
        =================================================== */}

        <article
          className={`activity-panel ${
            expandedPanel === "attendance"
              ? "activity-panel-open"
              : ""
          }`}
        >

          <button
            type="button"
            className="activity-panel-header"
            onClick={() =>
              togglePanel("attendance")
            }
            aria-expanded={
              expandedPanel === "attendance"
            }
          >

            <div className="activity-panel-title">

              <div className="activity-icon attendance-icon">
                ✓
              </div>

              <div>

                <span className="activity-panel-label">
                  PARTICIPATION
                </span>

                <h3>
                  Attendance
                </h3>

              </div>

            </div>

            <span className="activity-panel-arrow">
              {expandedPanel === "attendance"
                ? "−"
                : "+"}
            </span>

          </button>


          {expandedPanel === "attendance" && (

            <div className="activity-panel-content">

              <div className="activity-summary-card">

                <span>
                  Events attended
                </span>

                <strong>
                  {attendanceCount}
                </strong>

                <p>
                  Your attendance history
                  and event participation
                  analysis will appear here.
                </p>

              </div>

              <Link
                to="/attendance/check-in"
                className="secondary-button"
              >
                Check In
              </Link>

            </div>

          )}

        </article>


        {/* ===================================================
            MY CLUB
        =================================================== */}

        <article
          className={`activity-panel ${
            expandedPanel === "clubs"
              ? "activity-panel-open"
              : ""
          }`}
        >

          <button
            type="button"
            className="activity-panel-header"
            onClick={() =>
              togglePanel("clubs")
            }
            aria-expanded={
              expandedPanel === "clubs"
            }
          >

            <div className="activity-panel-title">

              <div className="activity-icon club-icon">
                ◇
              </div>

              <div>

                <span className="activity-panel-label">
                  MEMBERSHIPS
                </span>

                <h3>
                  My Club
                </h3>

              </div>

            </div>

            <span className="activity-panel-arrow">
              {expandedPanel === "clubs"
                ? "−"
                : "+"}
            </span>

          </button>


          {expandedPanel === "clubs" && (

            <div className="activity-panel-content">

              {memberships.length === 0 ? (

                <div className="activity-empty-state">

                  <h3>
                    No club memberships
                  </h3>

                  <p>
                    Your active club memberships
                    will appear here.
                  </p>

                </div>

              ) : (

                <div className="club-membership-list">

                  {memberships.map(
                    (membership) => (

                      <div
                        className="club-membership-item"
                        key={membership.id}
                      >

                        <div>

                          <strong>
                            {membership.clubs?.name ||
                              "Club"}
                          </strong>

                          <span>
                            {membership.membership_role ===
                            "head"
                              ? "Club Head"
                              : "Member"}
                          </span>

                        </div>

                        <span
                          className={`club-membership-status ${membership.membership_status}`}
                        >
                          {membership.membership_status}
                        </span>

                      </div>

                    )
                  )}

                </div>

              )}

            </div>

          )}

        </article>

      </section>


      {/* =====================================================
          FOOTER
      ===================================================== */}

      <section className="dashboard-footer">

        <Link
          to="/events"
          className="browse-link"
        >
          Browse More Events →
        </Link>

      </section>

    </main>
  )
}

export default StudentDashboard