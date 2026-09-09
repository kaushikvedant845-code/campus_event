import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { supabase } from "../lib/supabase"

function ClubHeadDashboard() {
  const [profile, setProfile] = useState(null)
  const [club, setClub] = useState(null)
  const [clubs, setClubs] = useState([])
  const [selectedClubId, setSelectedClubId] = useState(null)
  const [events, setEvents] = useState([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [showRequestForm, setShowRequestForm] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState(null)

  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState("")
  const [formSuccess, setFormSuccess] = useState("")

  const [form, setForm] = useState({
    title: "",
    category: "",
    description: "",
    event_date: "",
    start_time: "",
    end_time: "",
    expected_participants: "",
    requested_venue: "",
  })

  // --------------------------------------------------
  // LOAD CLUB HEAD DASHBOARD
  // --------------------------------------------------

  const loadDashboard = async () => {
    setLoading(true)
    setError("")

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError
      if (!user) {
        setError("Your session has expired. Please log in again.")
        return
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select(`id, email, full_name, avatar_url, account_status`)
        .eq("id", user.id)
        .maybeSingle()
      if (profileError) throw profileError
      setProfile(profileData)

      const { data: membershipData, error: membershipError } = await supabase
        .from("club_memberships")
        .select(`id, club_id, membership_role, membership_status, joined_at, clubs (id, name, club_code, description, is_active)`)
        .eq("profile_id", user.id)
        .eq("membership_role", "head")
        .eq("membership_status", "active")
      if (membershipError) throw membershipError

      const activeClubs = (membershipData || []).map(m => m.clubs).filter(Boolean)
      if (!activeClubs.length) {
        setError("No active Club Head membership was found for your account.")
        return
      }

      setClubs(activeClubs)
      const currentClub = activeClubs.find(c => c.id === selectedClubId) || activeClubs[0]
      setClub(currentClub)
      setSelectedClubId(currentClub.id)

      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select(`id, club_id, title, category, description, event_date, start_time, end_time, requested_venue, assigned_venue, expected_participants, status, approval_status, head_decision, publication_mode, member_early_access, visibility, registration_access, approved_at, rejection_reason, rejected_at, published_at, created_at, updated_at, clubs (id, name, club_code)`)
        .in("club_id", activeClubs.map(c => c.id))
        .order("created_at", { ascending: false })
      if (eventError) throw eventError
      setEvents(eventData || [])
    } catch (err) {
      console.error("Club Head Dashboard Error:", err)
      setError(err?.message || "Unable to load Club Head Dashboard.")
    } finally {
      setLoading(false)
    }
  }

  const handleClubChange = (e) => {
    const nextClub = clubs.find(c => c.id === e.target.value)
    if (!nextClub) return
    setSelectedClubId(nextClub.id)
    setClub(nextClub)
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  // --------------------------------------------------
  // REQUEST FORM
  // --------------------------------------------------

  const openRequestForm = () => {
    setFormError("")
    setFormSuccess("")
    setShowRequestForm(true)
  }

  const closeRequestForm = () => {
    if (submitting) return

    setShowRequestForm(false)
    setFormError("")
    setFormSuccess("")

    setForm({
      title: "",
      category: "",
      description: "",
      event_date: "",
      start_time: "",
      end_time: "",
      expected_participants: "",
      requested_venue: "",
    })
  }

  const handleChange = (e) => {
    const { name, value } = e.target

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }))
  }

  // --------------------------------------------------
  // SUBMIT EVENT REQUEST
  // --------------------------------------------------

  const handleRequestSubmit = async (e) => {
    e.preventDefault()

    setFormError("")
    setFormSuccess("")

    if (
      !form.title.trim() ||
      !form.category ||
      !form.event_date ||
      !form.start_time ||
      !form.end_time ||
      !form.requested_venue.trim()
    ) {
      setFormError(
        "Please fill in all required fields."
      )
      return
    }

    if (form.end_time <= form.start_time) {
      setFormError(
        "End time must be later than start time."
      )
      return
    }

    if (
      form.expected_participants &&
      Number(form.expected_participants) < 1
    ) {
      setFormError(
        "Expected participants must be at least 1."
      )
      return
    }

    if (!selectedClubId) {
      setFormError("Please select a club before submitting the request.")
      return
    }

    setSubmitting(true)

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) throw userError

      if (!user) {
        throw new Error(
          "Your session has expired. Please log in again."
        )
      }

      // IMPORTANT:
      // Event belongs to CLUB, not directly to user.
      //
      // RLS will verify that this user is an active
      // Club Head of this club.

      const { error: insertError } =
        await supabase
          .from("events")
          .insert({
            club_id: selectedClubId,

            title: form.title.trim(),
            category: form.category,
            description:
              form.description.trim() || null,

            event_date: form.event_date,
            start_time: form.start_time,
            end_time: form.end_time,

            expected_participants:
              form.expected_participants
                ? Number(form.expected_participants)
                : null,

            requested_venue:
              form.requested_venue.trim(),

            // Workflow
            approval_status: "WAITING",
            head_decision: "HOLD",
            publication_mode: "DETAILS_ONLY",

            member_early_access: false,

            visibility: "public",
            registration_access:
              "students_and_members",

            status: "UPCOMING",
          })

      if (insertError) throw insertError

      setFormSuccess(
        "Event request submitted successfully. Waiting for admin approval."
      )

      await loadDashboard()

      setTimeout(() => {
        closeRequestForm()
      }, 1200)
    } catch (err) {
      console.error(
        "Event Request Error:",
        err
      )

      setFormError(
        err?.message ||
          "Unable to submit event request."
      )
    } finally {
      setSubmitting(false)
    }
  }

  // --------------------------------------------------
  // HELPERS
  // --------------------------------------------------

  const getApprovalLabel = (event) => {
    if (event.approval_status === "APPROVED") {
      if (event.head_decision === "PUBLISHED") {
        return "Published"
      }

      return "Approved"
    }

    if (event.approval_status === "REJECTED") {
      return "Rejected"
    }

    return "Waiting for Approval"
  }

  const getApprovalClass = (event) => {
    if (event.approval_status === "APPROVED") {
      return "approved"
    }

    if (event.approval_status === "REJECTED") {
      return "rejected"
    }

    return "waiting"
  }

  const formatDate = (date) => {
    if (!date) return "Date pending"

    return new Date(
      `${date}T00:00:00`
    ).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

  const formatTime = (time) => {
    if (!time) return ""

    return new Date(
      `1970-01-01T${time}`
    ).toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
    })
  }

  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------

  if (loading) {
    return (
      <main className="club-dashboard-page">
        <div className="loading-card">
          <div className="loading-spinner" />
          <p>
            Loading Club Head Dashboard...
          </p>
        </div>
      </main>
    )
  }

  // --------------------------------------------------
  // ERROR
  // --------------------------------------------------

  if (error) {
    return (
      <main className="club-dashboard-page">
        <div className="error-card">
          <h2>
            Something went wrong
          </h2>

          <p>{error}</p>

          <button
            className="primary-button"
            onClick={loadDashboard}
          >
            Try Again
          </button>
        </div>
      </main>
    )
  }

  // --------------------------------------------------
  // DASHBOARD
  // --------------------------------------------------

  return (
    <main className="club-dashboard-page">

      {/* ============================================
          HEADER
      ============================================ */}

      <section className="club-dashboard-hero">

        <div>
          <p className="club-dashboard-label">
            CLUB HEAD DASHBOARD
          </p>

          <h1>
            {club?.name || "Your Club"}
          </h1>

          <p>
            Welcome back,{" "}
            {profile?.full_name ||
              "Club Head"}
            .
          </p>

          <p>
            Manage your club events,
            announcements and attendance
            from one place.
          </p>
        </div>

        <div className="club-verification-badge">
          Verified Club Head
        </div>

      </section>


      {/* ============================================
          EVENT MANAGEMENT
      ============================================ */}

      <section className="club-dashboard-section">

        <div className="club-section-heading">

          <div>
            <p className="club-section-kicker">
              EVENT MANAGEMENT
            </p>

            <h2>
              My Events
            </h2>

            <p>
              Submit event requests and
              manage your club events.
            </p>
          </div>

          <button
            className="primary-button"
            onClick={openRequestForm}
          >
            + Request Event
          </button>

        </div>


        {clubs.length > 1 && (
          <div className="club-selector">
            <label htmlFor="managed-club">Managing Club</label>
            <select id="managed-club" value={selectedClubId || ""} onChange={handleClubChange}>
              {clubs.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* ==========================================
            NO EVENTS
        ========================================== */}

        {events.filter(event => event.club_id === selectedClubId).length === 0 ? (

          <div className="club-empty-card">

            <h3>
              No events yet
            </h3>

            <p>
              Your event requests and
              approved events will appear here.
            </p>

            <button
              className="primary-button"
              onClick={openRequestForm}
            >
              Request Your First Event
            </button>

          </div>

        ) : (

          /* ==========================================
             EVENT GRID
          ========================================== */

          <div className="club-event-grid">

            {events.filter(event => event.club_id === selectedClubId).map((event) => (

              <article
                className="club-event-card"
                key={event.id}
              >

                <span
                  className={`club-event-status ${getApprovalClass(
                    event
                  )}`}
                >
                  {getApprovalLabel(event)}
                </span>


                <h3>
                  {event.title}
                </h3>


                <p>
                  {event.description ||
                    "No event description available."}
                </p>


                <div className="club-event-meta">

                  <span>
                    {formatDate(
                      event.event_date
                    )}
                  </span>

                  <span>
                    {formatTime(
                      event.start_time
                    )}

                    {event.end_time
                      ? ` – ${formatTime(
                          event.end_time
                        )}`
                      : ""}
                  </span>

                  <span>
                    {event.assigned_venue ||
                      event.requested_venue ||
                      "Venue pending"}
                  </span>

                </div>


                {/* EVENT ACTIONS */}

                <div className="club-event-actions">

                  {event.approval_status ===
                    "APPROVED" ? (

                    <Link
                      to={`/events/${event.id}`}
                      className="secondary-button"
                    >
                      View Event
                    </Link>

                  ) : (

                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() =>
                        setSelectedRequest(event)
                      }
                    >
                      View Request
                    </button>

                  )}


                  <button
                    type="button"
                    className="primary-button"
                    disabled={
                      event.approval_status !==
                        "APPROVED" ||
                      event.head_decision ===
                        "CANCELLED"
                    }
                    title={
                      event.approval_status !==
                      "APPROVED"
                        ? "Available after admin approval"
                        : "Event management will be available here"
                    }
                  >
                    Manage
                  </button>

                </div>

              </article>

            ))}

          </div>

        )}

      </section>


      {/* ============================================
          VIEW REQUEST MODAL
      ============================================ */}

      {selectedRequest && (

        <div
          className="club-request-overlay"
          onMouseDown={(e) => {

            if (
              e.target ===
              e.currentTarget
            ) {
              setSelectedRequest(null)
            }

          }}
        >

          <section
            className="club-request-modal"
            onMouseDown={(e) =>
              e.stopPropagation()
            }
          >

            <div className="club-request-header">

              <div>

                <p className="club-section-kicker">
                  EVENT REQUEST
                </p>

                <h2>
                  {selectedRequest.title}
                </h2>

                <p>
                  Your request is currently
                  under administrator review.
                </p>

              </div>

              <button
                type="button"
                className="club-request-close"
                onClick={() =>
                  setSelectedRequest(null)
                }
                aria-label="Close"
              >
                ×
              </button>

            </div>


            <div className="club-request-details">

              <div>
                <span>
                  Category
                </span>

                <strong>
                  {selectedRequest.category ||
                    "—"}
                </strong>
              </div>


              <div>
                <span>
                  Date
                </span>

                <strong>
                  {formatDate(
                    selectedRequest.event_date
                  )}
                </strong>
              </div>


              <div>
                <span>
                  Time
                </span>

                <strong>
                  {formatTime(
                    selectedRequest.start_time
                  )}

                  {" – "}

                  {formatTime(
                    selectedRequest.end_time
                  )}
                </strong>
              </div>


              <div>
                <span>
                  Expected Participants
                </span>

                <strong>
                  {selectedRequest
                    .expected_participants ||
                    "—"}
                </strong>
              </div>


              <div>
                <span>
                  Requested Venue
                </span>

                <strong>
                  {selectedRequest
                    .requested_venue ||
                    "—"}
                </strong>
              </div>


              <div>
                <span>
                  Approval Status
                </span>

                <strong>
                  {getApprovalLabel(
                    selectedRequest
                  )}
                </strong>
              </div>

            </div>


            {selectedRequest.description && (

              <div className="club-request-description">

                <span>
                  Description
                </span>

                <p>
                  {selectedRequest.description}
                </p>

              </div>

            )}


            {selectedRequest.rejection_reason && (

              <div className="club-request-note">

                <strong>
                  Rejection Reason:
                </strong>

                <br />

                {selectedRequest.rejection_reason}

              </div>

            )}


            <div className="club-request-note">

              The administrator will review
              this request and provide the
              acknowledgement and final venue.
              After approval, you control when
              the event is published.

            </div>


            <div className="club-request-actions">

              <button
                type="button"
                className="primary-button"
                onClick={() =>
                  setSelectedRequest(null)
                }
              >
                Close
              </button>

            </div>

          </section>

        </div>

      )}


      {/* ============================================
          REQUEST EVENT MODAL
      ============================================ */}

      {showRequestForm && (

        <div
          className="club-request-overlay"
          onMouseDown={(e) => {

            if (
              e.target ===
              e.currentTarget
            ) {
              closeRequestForm()
            }

          }}
        >

          <section
            className="club-request-modal"
            onMouseDown={(e) =>
              e.stopPropagation()
            }
          >

            <div className="club-request-header">

              <div>

                <p className="club-section-kicker">
                  EVENT REQUEST
                </p>

                <h2>
                  Request an Event
                </h2>

                <p>
                  Submit the event details
                  for administrator approval.
                </p>

              </div>


              <button
                type="button"
                className="club-request-close"
                onClick={closeRequestForm}
                disabled={submitting}
                aria-label="Close"
              >
                ×
              </button>

            </div>


            <form
              className="club-request-form"
              onSubmit={handleRequestSubmit}
            >

              {/* TITLE */}

              <div className="club-form-field">

                <label htmlFor="event-title">
                  Event Title
                </label>

                <input
                  id="event-title"
                  name="title"
                  type="text"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="Enter event title"
                  required
                />

              </div>


              {/* CATEGORY */}

              <div className="club-form-field">

                <label htmlFor="event-category">
                  Category
                </label>

                <select
                  id="event-category"
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  required
                >

                  <option value="">
                    Select category
                  </option>

                  <option value="Technical">
                    Technical
                  </option>

                  <option value="Cultural">
                    Cultural
                  </option>

                  <option value="Sports">
                    Sports
                  </option>

                  <option value="Workshop">
                    Workshop
                  </option>

                  <option value="Competition">
                    Competition
                  </option>

                  <option value="Seminar">
                    Seminar
                  </option>

                  <option value="Other">
                    Other
                  </option>

                </select>

              </div>


              {/* DESCRIPTION */}

              <div className="club-form-field">

                <label htmlFor="event-description">
                  Description{" "}
                  <span>
                    (optional)
                  </span>
                </label>

                <textarea
                  id="event-description"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Add a description"
                  rows="4"
                />

              </div>


              {/* DATE + TIME */}

              <div className="club-form-row">

                <div className="club-form-field">

                  <label htmlFor="event-date">
                    Event Date
                  </label>

                  <input
                    id="event-date"
                    name="event_date"
                    type="date"
                    value={form.event_date}
                    onChange={handleChange}
                    min={
                      new Date()
                        .toISOString()
                        .split("T")[0]
                    }
                    required
                  />

                </div>


                <div className="club-form-field">

                  <label htmlFor="start-time">
                    Start Time
                  </label>

                  <input
                    id="start-time"
                    name="start_time"
                    type="time"
                    value={form.start_time}
                    onChange={handleChange}
                    required
                  />

                </div>


                <div className="club-form-field">

                  <label htmlFor="end-time">
                    End Time
                  </label>

                  <input
                    id="end-time"
                    name="end_time"
                    type="time"
                    value={form.end_time}
                    onChange={handleChange}
                    required
                  />

                </div>

              </div>


              {/* PARTICIPANTS + VENUE */}

              <div className="club-form-row">

                <div className="club-form-field">

                  <label htmlFor="expected-participants">
                    Expected Participants
                  </label>

                  <input
                    id="expected-participants"
                    name="expected_participants"
                    type="number"
                    min="1"
                    value={
                      form.expected_participants
                    }
                    onChange={handleChange}
                    placeholder="e.g. 100"
                  />

                </div>


                <div className="club-form-field">

                  <label htmlFor="requested-venue">
                    Requested Venue
                  </label>

                  <input
                    id="requested-venue"
                    name="requested_venue"
                    type="text"
                    value={form.requested_venue}
                    onChange={handleChange}
                    placeholder="e.g. Seminar Hall"
                    required
                  />

                </div>

              </div>


              {/* NOTE */}

              <div className="club-request-note">

                <strong>
                  Workflow:
                </strong>

                <br />

                Your request will first go to
                the administrator for approval.
                After approval, acknowledgement
                and final venue will be returned
                to the Club Head.

              </div>


              {/* ERROR */}

              {formError && (

                <div className="form-message form-error">
                  {formError}
                </div>

              )}


              {/* SUCCESS */}

              {formSuccess && (

                <div className="form-message form-success">
                  {formSuccess}
                </div>

              )}


              {/* ACTIONS */}

              <div className="club-request-actions">

                <button
                  type="button"
                  className="secondary-button"
                  onClick={closeRequestForm}
                  disabled={submitting}
                >
                  Cancel
                </button>


                <button
                  type="submit"
                  className="primary-button"
                  disabled={submitting}
                >
                  {submitting
                    ? "Submitting..."
                    : "Submit Request"}
                </button>

              </div>

            </form>

          </section>

        </div>

      )}

    </main>
  )
}

export default ClubHeadDashboard