import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
// pages/faculty/FacultyDashboard.jsx
import { supabase } from "../../lib/supabase"
import "./Student.css"

function StudentDashboard({ profile: dashboardProfile = null }) {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(dashboardProfile)

  const [registrations, setRegistrations] = useState([])
  const [memberships, setMemberships] = useState([])
  const [attendanceCount, setAttendanceCount] = useState(0)

  const [openRecruitmentClubs, setOpenRecruitmentClubs] = useState([])
  const [membershipApplications, setMembershipApplications] = useState([])
  const [selectedRecruitmentClub, setSelectedRecruitmentClub] = useState(null)
  const [applicationAnswers, setApplicationAnswers] = useState({})
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [submittingApplication, setSubmittingApplication] = useState(false)
  const [respondingApplicationId, setRespondingApplicationId] = useState(null)

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

        // -----------------------------------------------------
        // OPEN CLUB RECRUITMENT
        // -----------------------------------------------------

        const {
          data: recruitmentConfigs,
          error: recruitmentError,
        } = await supabase
          .from("club_recruitment_configs")
          .select(
            `
              club_id,
              recruitment_status,
              application_start_at,
              application_end_at,
              required_fields,
              custom_questions,
              fee_amount,
              ticket_collection_start,
              ticket_collection_end,
              ticket_instruction,
              terms_text,
              terms_version,

              clubs (
                id,
                name,
                club_code,
                description,
                is_active
              )
            `
          )
          .eq("recruitment_status", "OPEN")

        if (recruitmentError) {
          throw recruitmentError
        }

        // -----------------------------------------------------
        // MY RECRUITMENT APPLICATIONS
        // -----------------------------------------------------

        const {
          data: applicationRows,
          error: applicationError,
        } = await supabase
          .from("club_membership_applications")
          .select(
            `
              id,
              club_id,
              student_id,
              status,
              form_version,
              answers,
              terms_version,
              terms_accepted,
              terms_accepted_at,
              applied_at,
              updated_at,
              published_at,
              student_response,
              student_responded_at,

              clubs (
                id,
                name,
                club_code,
                description
              )
            `
          )
          .eq("student_id", user.id)
          .order("applied_at", {
            ascending: false,
          })

        if (applicationError) {
          throw applicationError
        }

        if (!mounted) {
          return
        }

        const now = Date.now()

        setOpenRecruitmentClubs(
          (recruitmentConfigs || []).filter((config) => {
            const start = config.application_start_at
              ? new Date(config.application_start_at).getTime()
              : null

            const end = config.application_end_at
              ? new Date(config.application_end_at).getTime()
              : null

            return (
              config.clubs?.is_active !== false &&
              (!start || now >= start) &&
              (!end || now <= end)
            )
          })
        )

        setMembershipApplications(
          applicationRows || []
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

  const formatDateTime = (dateTime) => {
    if (!dateTime) {
      return "Date to be announced"
    }

    return new Date(dateTime).toLocaleString(
      "en-IN",
      {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }
    )
  }

  const getTicketInstruction = (club) => {
    const collectionDate =
      club?.ticket_collection_start ||
      club?.ticket_collection_end ||
      ""

    const formattedDate = collectionDate
      ? formatDate(collectionDate)
      : "the collection date"

    const instruction =
      club?.ticket_instruction?.trim() || ""

    if (!instruction) {
      return `Please get your ticket after successful fee submission on ${formattedDate}.`
    }

    // Convert the old two-date placeholder to the single collection date.
    if (/DATE\s*---\s*to\s*---/i.test(instruction)) {
      return instruction.replace(
        /DATE\s*---\s*to\s*---/gi,
        formattedDate
      )
    }

    return instruction
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
  // CLUB RECRUITMENT
  // =========================================================

  const getConfiguredFields = (config) => {
    const raw = config?.required_fields

    if (Array.isArray(raw)) {
      return raw
        .map((field) => {
          if (typeof field === "string") {
            return {
              key: field,
              label: field
                .replaceAll("_", " ")
                .replace(/\b\w/g, (letter) => letter.toUpperCase()),
              required: true,
            }
          }

          return {
            key: field?.key || field?.name,
            label:
              field?.label ||
              field?.key ||
              field?.name ||
              "Information",
            required: field?.required !== false,
          }
        })
        .filter((field) => field.key)
    }

    if (raw && typeof raw === "object") {
      return Object.entries(raw).map(([key, value]) => ({
        key,
        label:
          typeof value === "string"
            ? value
            : value?.label ||
              key
                .replaceAll("_", " ")
                .replace(/\b\w/g, (letter) => letter.toUpperCase()),
        required:
          typeof value === "object"
            ? value?.required !== false
            : true,
      }))
    }

    return []
  }

  const getCustomQuestions = (config) => {
    const raw = config?.custom_questions
    return Array.isArray(raw) ? raw : []
  }

  const getProfileFieldValue = (key) => {
    const values = {
      full_name: profile?.full_name,
      name: profile?.full_name,
      email: profile?.email,
      phone: student?.phone,
      admission_no: student?.admission_no,
      academic_session: student?.academic_session,
      program_name: student?.program_name,
      department: student?.department,
      course: student?.course,
      year: student?.year,
      roll_number: student?.roll_number,
    }

    return values[key] ?? ""
  }

  const openRecruitmentForm = (config) => {
    const fields = getConfiguredFields(config)
    const initialAnswers = {}

    fields.forEach((field) => {
      initialAnswers[field.key] =
        getProfileFieldValue(field.key)
    })

    getCustomQuestions(config).forEach((question) => {
      const key =
        question?.id ||
        question?.key ||
        question?.question

      if (key) {
        initialAnswers[key] = ""
      }
    })

    setSelectedRecruitmentClub(config)
    setApplicationAnswers(initialAnswers)
    setTermsAccepted(false)
  }

  const closeRecruitmentForm = () => {
    setSelectedRecruitmentClub(null)
    setApplicationAnswers({})
    setTermsAccepted(false)
  }

  const updateApplicationAnswer = (key, value) => {
    setApplicationAnswers((previous) => ({
      ...previous,
      [key]: value,
    }))
  }

  const refreshRecruitmentData = async (userId) => {
    const {
      data: configs,
      error: configError,
    } = await supabase
      .from("club_recruitment_configs")
      .select(
        `
          club_id,
          recruitment_status,
          application_start_at,
          application_end_at,
          required_fields,
          custom_questions,
          fee_amount,
          ticket_collection_start,
          ticket_collection_end,
          ticket_instruction,
          terms_text,
          terms_version,

          clubs (
            id,
            name,
            club_code,
            description,
            is_active
          )
        `
      )
      .eq("recruitment_status", "OPEN")

    if (configError) {
      throw configError
    }

    const {
      data: applications,
      error: applicationsError,
    } = await supabase
      .from("club_membership_applications")
      .select(
        `
          id,
          club_id,
          student_id,
          status,
          form_version,
          answers,
          terms_version,
          terms_accepted,
          terms_accepted_at,
          applied_at,
          updated_at,
          published_at,
          student_response,
          student_responded_at,

          clubs (
            id,
            name,
            club_code,
            description
          )
        `
      )
      .eq("student_id", userId)
      .order("applied_at", { ascending: false })

    if (applicationsError) {
      throw applicationsError
    }

    const now = Date.now()

    setOpenRecruitmentClubs(
      (configs || []).filter((config) => {
        const start = config.application_start_at
          ? new Date(config.application_start_at).getTime()
          : null

        const end = config.application_end_at
          ? new Date(config.application_end_at).getTime()
          : null

        return (
          config.clubs?.is_active !== false &&
          (!start || now >= start) &&
          (!end || now <= end)
        )
      })
    )

    setMembershipApplications(
      applications || []
    )

    return applications || []
  }

  const submitClubApplication = async () => {
    if (!selectedRecruitmentClub) {
      return
    }

    if (!termsAccepted) {
      setError("Please accept the Terms & Conditions before applying.")
      return
    }

    const fields = getConfiguredFields(selectedRecruitmentClub)
    const questions = getCustomQuestions(selectedRecruitmentClub)

    const missingField = fields.find(
      (field) =>
        field.required &&
        !String(
          applicationAnswers[field.key] ?? ""
        ).trim()
    )

    if (missingField) {
      setError(
        `${missingField.label} is required.`
      )
      return
    }

    const missingQuestion = questions.find((question) => {
      const key =
        question?.id ||
        question?.key ||
        question?.question

      return (
        question?.required !== false &&
        key &&
        !String(
          applicationAnswers[key] ?? ""
        ).trim()
      )
    })

    if (missingQuestion) {
      setError(
        `${missingQuestion.label || missingQuestion.question || "This question"} is required.`
      )
      return
    }

    try {
      setSubmittingApplication(true)
      setError("")

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error("You are not logged in.")
      }

      const { error: insertError } = await supabase
        .from("club_membership_applications")
        .insert({
          club_id: selectedRecruitmentClub.club_id,
          student_id: user.id,
          status: "APPLIED",
          form_version:
            selectedRecruitmentClub.terms_version || 1,
          answers: applicationAnswers,
          terms_version:
            selectedRecruitmentClub.terms_version || 1,
          terms_accepted: true,
          terms_accepted_at: new Date().toISOString(),
        })

      if (insertError) {
        throw insertError
      }

      await refreshRecruitmentData(user.id)

      closeRecruitmentForm()
    } catch (err) {
      console.error(
        "Club application error:",
        err
      )

      setError(
        err?.message ||
          "Unable to submit your club application."
      )
    } finally {
      setSubmittingApplication(false)
    }
  }

  const respondToApplication = async (
    applicationId,
    response
  ) => {
    try {
      setRespondingApplicationId(
        applicationId
      )
      setError("")

      const {
        data,
        error: responseError,
      } = await supabase.rpc(
        "respond_to_club_membership_application",
        {
          p_application_id: applicationId,
          p_response: response,
        }
      )

      if (responseError) {
        throw responseError
      }

      setMembershipApplications(
        (previous) =>
          previous.map((application) =>
            application.id === applicationId
              ? data
              : application
          )
      )

      if (response === "ACCEPTED") {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (user) {
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

          if (!membershipError) {
            setMemberships(
              clubMemberships || []
            )
          }
        }
      }
    } catch (err) {
      console.error(
        "Club application response error:",
        err
      )

      setError(
        err?.message ||
          "Unable to update your application response."
      )
    } finally {
      setRespondingApplicationId(null)
    }
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
                              to={`/dashboard/registered-events/${registration.id}`}
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

              <div className="attendance-actions">

                <Link
                  to="/attendance/check-in"
                  className="secondary-button"
                >
                  Scan-QR
                </Link>

                <Link
                  to="/attendance"
                  className="secondary-button"
                >
                  Attendance Record
                </Link>

              </div>

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

              <div className="student-club-actions">

                <button
                  type="button"
                  className="primary-button"
                  onClick={() => {
                    setError("")
                    setSelectedRecruitmentClub(null)
                  }}
                >
                  Join Club
                </button>

              </div>

              {error && (
                <div className="student-club-message error">
                  {error}
                </div>
              )}

              {/* =================================================
                  JOIN CLUB
              ================================================= */}

              <div className="student-club-join-section">

                <div className="student-club-subheading">
                  <div>
                    <span className="activity-panel-label">
                      RECRUITMENT
                    </span>

                    <h3>
                      Clubs accepting applications
                    </h3>

                    <p>
                      Only clubs with an active recruitment
                      window are shown here.
                    </p>
                  </div>
                </div>

                {openRecruitmentClubs.length === 0 ? (

                  <div className="activity-empty-state">
                    <h3>
                      No open recruitment right now
                    </h3>

                    <p>
                      Clubs will appear here when their
                      recruitment registration is open.
                    </p>
                  </div>

                ) : (

                  <div className="student-recruitment-club-list">

                    {openRecruitmentClubs.map((config) => {

                      const existingApplication =
                        membershipApplications.find(
                          (application) =>
                            application.club_id ===
                            config.club_id
                        )

                      const activeMembership =
                        memberships.find(
                          (membership) =>
                            membership.club_id ===
                            config.club_id &&
                            membership.membership_status ===
                              "active"
                        )

                      return (
                        <div
                          className="student-recruitment-club-item"
                          key={config.club_id}
                        >

                          <div>
                            <strong>
                              {config.clubs?.name ||
                                "Club"}
                            </strong>

                            {config.application_start_at &&
                              config.application_end_at && (
                                <span>
                                  Applications: {formatDateTime(config.application_start_at)}
                                  {" "}–{" "}
                                  {formatDateTime(config.application_end_at)}
                                </span>
                              )}

                            {config.clubs?.description && (
                              <p>
                                {config.clubs.description}
                              </p>
                            )}
                          </div>

                          {activeMembership ? (

                            <span className="club-membership-status active">
                              Active Member
                            </span>

                          ) : existingApplication ? (

                            <span
                              className={`student-application-badge ${existingApplication.status.toLowerCase()}`}
                            >
                              {existingApplication.status ===
                              "SELECTED"
                                ? "Selected"
                                : existingApplication.status ===
                                  "NOT_SURE"
                                ? "Not Sure"
                                : existingApplication.status ===
                                  "REJECTED"
                                ? "Rejected"
                                : existingApplication.status}
                            </span>

                          ) : (

                            <button
                              type="button"
                              className="secondary-button"
                              onClick={() =>
                                openRecruitmentForm(config)
                              }
                            >
                              Apply
                            </button>

                          )}

                        </div>
                      )
                    })}

                  </div>

                )}

              </div>


              {/* =================================================
                  APPLICATION FORM
              ================================================= */}

              {selectedRecruitmentClub && (

                <div className="student-recruitment-form">

                  <div className="student-club-subheading">

                    <div>
                      <span className="activity-panel-label">
                        APPLICATION
                      </span>

                      <h3>
                        {selectedRecruitmentClub.clubs?.name ||
                          "Club"}{" "}
                        Recruitment Form
                      </h3>

                      <p>
                        Complete the configured information
                        and submit your application.
                      </p>
                    </div>

                    <button
                      type="button"
                      className="secondary-button"
                      onClick={closeRecruitmentForm}
                    >
                      Close Form
                    </button>

                  </div>


                  {getConfiguredFields(
                    selectedRecruitmentClub
                  ).map((field) => {

                    const profileValue =
                      getProfileFieldValue(
                        field.key
                      )

                    const profileDerivedFields = [
                      "full_name",
                      "name",
                      "email",
                      "phone",
                      "admission_no",
                      "academic_session",
                    ]

                    const isProfileDerived =
                      profileDerivedFields.includes(
                        field.key
                      )

                    return (
                      <label
                        className="student-recruitment-field"
                        key={field.key}
                      >
                        <span>
                          {field.label}
                          {field.required && " *"}
                        </span>

                        <input
                          type="text"
                          value={
                            applicationAnswers[
                              field.key
                            ] ?? ""
                          }
                          readOnly={
                            isProfileDerived &&
                            Boolean(profileValue)
                          }
                          onChange={(event) =>
                            updateApplicationAnswer(
                              field.key,
                              event.target.value
                            )
                          }
                        />
                      </label>
                    )
                  })}


                  {getCustomQuestions(
                    selectedRecruitmentClub
                  ).map((question, index) => {

                    const key =
                      question?.id ||
                      question?.key ||
                      `question_${index}`

                    const type =
                      question?.type ||
                      "short_answer"

                    const label =
                      question?.label ||
                      question?.question ||
                      `Question ${index + 1}`

                    const options =
                      Array.isArray(
                        question?.options
                      )
                        ? question.options
                        : []

                    return (
                      <label
                        className="student-recruitment-field"
                        key={key}
                      >
                        <span>
                          {label}
                          {question?.required !== false &&
                            " *"}
                        </span>

                        {type === "long_answer" ? (

                          <textarea
                            rows="4"
                            value={
                              applicationAnswers[key] ||
                              ""
                            }
                            onChange={(event) =>
                              updateApplicationAnswer(
                                key,
                                event.target.value
                              )
                            }
                          />

                        ) : type === "yes_no" ? (

                          <select
                            value={
                              applicationAnswers[key] ||
                              ""
                            }
                            onChange={(event) =>
                              updateApplicationAnswer(
                                key,
                                event.target.value
                              )
                            }
                          >
                            <option value="">
                              Select
                            </option>
                            <option value="Yes">
                              Yes
                            </option>
                            <option value="No">
                              No
                            </option>
                          </select>

                        ) : (
                          type === "single_choice" ||
                          type === "multiple_choice"
                        ) ? (

                          <select
                            multiple={
                              type ===
                              "multiple_choice"
                            }
                            value={
                              type ===
                              "multiple_choice"
                                ? applicationAnswers[
                                    key
                                  ] || []
                                : applicationAnswers[
                                    key
                                  ] || ""
                            }
                            onChange={(event) => {
                              if (
                                type ===
                                "multiple_choice"
                              ) {
                                const values =
                                  Array.from(
                                    event.target
                                      .selectedOptions
                                  ).map(
                                    (option) =>
                                      option.value
                                  )

                                updateApplicationAnswer(
                                  key,
                                  values
                                )
                              } else {
                                updateApplicationAnswer(
                                  key,
                                  event.target.value
                                )
                              }
                            }}
                          >
                            <option value="">
                              Select
                            </option>

                            {options.map(
                              (option) => (
                                <option
                                  value={option}
                                  key={option}
                                >
                                  {option}
                                </option>
                              )
                            )}

                          </select>

                        ) : (

                          <input
                            type="text"
                            value={
                              applicationAnswers[key] ||
                              ""
                            }
                            onChange={(event) =>
                              updateApplicationAnswer(
                                key,
                                event.target.value
                              )
                            }
                          />

                        )}

                      </label>
                    )
                  })}


                  <div className="student-recruitment-info-card">

                    <strong>
                      Offline Fee & Ticket Collection
                    </strong>

                    <p>
                      Fee: ₹
                      {Number(
                        selectedRecruitmentClub.fee_amount ||
                          0
                      ).toLocaleString("en-IN")}
                    </p>

                    {(selectedRecruitmentClub.ticket_collection_start ||
                      selectedRecruitmentClub.ticket_collection_end) && (
                      <p>
                        Fee & ticket collection:{" "}
                        {formatDate(
                          selectedRecruitmentClub.ticket_collection_start ||
                            selectedRecruitmentClub.ticket_collection_end
                        )}
                      </p>
                    )}

                    <p>
                      {getTicketInstruction(selectedRecruitmentClub)}
                    </p>

                  </div>


                  <label className="student-recruitment-terms">

                    <input
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={(event) =>
                        setTermsAccepted(
                          event.target.checked
                        )
                      }
                    />

                    <span>
                      {selectedRecruitmentClub.terms_text ||
                        "I have read and agree to the above Terms & Conditions."}
                    </span>

                  </label>


                  <div className="student-recruitment-submit-row">

                    <button
                      type="button"
                      className="primary-button"
                      disabled={
                        !termsAccepted ||
                        submittingApplication
                      }
                      onClick={
                        submitClubApplication
                      }
                    >
                      {submittingApplication
                        ? "Submitting..."
                        : "Submit Application"}
                    </button>

                  </div>

                </div>

              )}


              {/* =================================================
                  MY APPLICATIONS / ACKNOWLEDGEMENTS
              ================================================= */}

              {membershipApplications.length > 0 && (

                <div className="student-recruitment-applications">

                  <div className="student-club-subheading">
                    <div>
                      <span className="activity-panel-label">
                        APPLICATIONS
                      </span>

                      <h3>
                        My Club Applications
                      </h3>
                    </div>
                  </div>

                  <div className="student-application-list">

                    {membershipApplications.map(
                      (application) => (

                        <div
                          className="student-application-item"
                          key={application.id}
                        >

                          <div>
                            <strong>
                              {application.clubs?.name ||
                                "Club"}
                            </strong>

                            <span>
                              Applied{" "}
                              {application.applied_at
                                ? new Date(
                                    application.applied_at
                                  ).toLocaleDateString(
                                    "en-IN"
                                  )
                                : ""}
                            </span>
                          </div>

                          <div className="student-application-actions">

                            <span
                              className={`student-application-badge ${application.status.toLowerCase()}`}
                            >
                              {application.status ===
                              "SELECTED"
                                ? "Selected"
                                : application.status ===
                                  "NOT_SURE"
                                ? "Not Sure"
                                : application.status ===
                                  "REJECTED"
                                ? "Rejected"
                                : application.status}
                            </span>

                            {application.status ===
                              "SELECTED" &&
                              !application.student_response && (

                                <div className="student-acknowledgement">

                                  <p>
                                    You have been selected.
                                    Please confirm your
                                    decision.
                                  </p>

                                  <div>

                                    <button
                                      type="button"
                                      className="primary-button"
                                      disabled={
                                        respondingApplicationId ===
                                        application.id
                                      }
                                      onClick={() =>
                                        respondToApplication(
                                          application.id,
                                          "ACCEPTED"
                                        )
                                      }
                                    >
                                      Accept
                                    </button>

                                    <button
                                      type="button"
                                      className="secondary-button"
                                      disabled={
                                        respondingApplicationId ===
                                        application.id
                                      }
                                      onClick={() =>
                                        respondToApplication(
                                          application.id,
                                          "DECLINED"
                                        )
                                      }
                                    >
                                      Decline
                                    </button>

                                  </div>

                                </div>

                              )}

                            {application.student_response && (
                              <span className="student-acknowledgement-result">
                                {application.student_response ===
                                "ACCEPTED"
                                  ? "Membership accepted"
                                  : "Selection declined"}
                              </span>
                            )}

                          </div>

                        </div>
                      )
                    )}

                  </div>

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