import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { supabase } from "../../lib/supabase"
import "./ClubHeadDashboard.css"
function ClubHeadDashboard() {
  // =========================================================
  // PROFILE / CLUB
  // =========================================================

  const [profile, setProfile] = useState(null)
  const [club, setClub] = useState(null)
  const [clubs, setClubs] = useState([])
  const [selectedClubId, setSelectedClubId] = useState(null)

  // =========================================================
  // EVENTS
  // =========================================================

  const [events, setEvents] = useState([])

  // =========================================================
  // PAGE STATE
  // =========================================================

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // =========================================================
  // EVENT FILTER
  // =========================================================

  const [eventFilter, setEventFilter] = useState("all")

  // =========================================================
  // REQUEST FORM
  // =========================================================

  const [showRequestForm, setShowRequestForm] =
    useState(false)

  const [submitting, setSubmitting] =
    useState(false)

  const [formError, setFormError] =
    useState("")

  const [formSuccess, setFormSuccess] =
    useState("")

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

  // =========================================================
  // REQUEST DETAILS
  // =========================================================

  const [selectedRequest, setSelectedRequest] =
    useState(null)

  // =========================================================
  // APPROVAL ACKNOWLEDGEMENT
  // =========================================================

  const [approvalEvent, setApprovalEvent] =
    useState(null)

  const [showApproval, setShowApproval] =
    useState(false)

  const [approvalAssets, setApprovalAssets] =
    useState(null)

  const [approvalLoading, setApprovalLoading] =
    useState(false)

  const [approvalError, setApprovalError] =
    useState("")

  // =========================================================
  // LOAD DASHBOARD
  // =========================================================

  const loadDashboard = async (
    requestedClubId = null
  ) => {
    setLoading(true)
    setError("")

    try {
      // -------------------------------------------------------
      // AUTH USER
      // -------------------------------------------------------

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) {
        throw userError
      }

      if (!user) {
        throw new Error(
          "Your session has expired. Please log in again."
        )
      }

      // -------------------------------------------------------
      // PROFILE
      // -------------------------------------------------------

      const {
        data: profileData,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select(`
          id,
          email,
          full_name,
          avatar_url,
          account_status
        `)
        .eq("id", user.id)
        .maybeSingle()

      if (profileError) {
        throw profileError
      }

      if (!profileData) {
        throw new Error(
          "Profile not found for your account."
        )
      }

      setProfile(profileData)

      // -------------------------------------------------------
      // ACTIVE CLUB HEAD MEMBERSHIPS
      // -------------------------------------------------------

      const {
        data: membershipData,
        error: membershipError,
      } = await supabase
        .from("club_memberships")
        .select(`
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
        `)
        .eq("profile_id", user.id)
        .eq("membership_role", "head")
        .eq("membership_status", "active")

      if (membershipError) {
        throw membershipError
      }

      // -------------------------------------------------------
      // ACTIVE CLUBS
      // -------------------------------------------------------

      const activeClubs = (
        membershipData || []
      )
        .map(
          (membership) =>
            membership.clubs
        )
        .filter(
          (item) =>
            item &&
            item.is_active !== false
        )

      if (!activeClubs.length) {
        throw new Error(
          "No active Club Head membership was found for your account."
        )
      }

      setClubs(activeClubs)

      // -------------------------------------------------------
      // SELECT CLUB
      // -------------------------------------------------------

      const preferredClubId =
        requestedClubId ||
        selectedClubId

      const selectedClub =
        activeClubs.find(
          (item) =>
            item.id === preferredClubId
        ) || activeClubs[0]

      setClub(selectedClub)
      setSelectedClubId(selectedClub.id)

      // -------------------------------------------------------
      // LOAD EVENTS
      // -------------------------------------------------------

      const {
        data: eventData,
        error: eventError,
      } = await supabase
        .from("events")
        .select(`
          id,
          club_id,
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
          publication_mode,
          member_early_access,
          visibility,
          registration_access,
          approved_at,
          approval_asset_id,
          faculty_acknowledgement,
          rejection_reason,
          rejected_at,
          published_at,
          created_at,
          updated_at,
          clubs (
            id,
            name,
            club_code
          )
        `)
        .in(
          "club_id",
          activeClubs.map(
            (item) => item.id
          )
        )
        .order("created_at", {
          ascending: false,
        })

      if (eventError) {
        throw eventError
      }

      setEvents(eventData || [])
    } catch (err) {
      console.error(
        "Club Head Dashboard Error:",
        err
      )

      setError(
        err?.message ||
          "Unable to load Club Head Dashboard."
      )
    } finally {
      setLoading(false)
    }
  }

  // =========================================================
  // INITIAL LOAD
  // =========================================================

  useEffect(() => {
    loadDashboard()
  }, [])

  // =========================================================
  // CLUB SWITCH
  // =========================================================

  const handleClubChange = (event) => {
    const nextClubId =
      event.target.value

    setSelectedClubId(nextClubId)

    const nextClub =
      clubs.find(
        (item) =>
          item.id === nextClubId
      )

    if (nextClub) {
      setClub(nextClub)
    }

    loadDashboard(nextClubId)
  }

  // =========================================================
  // REQUEST FORM
  // =========================================================

  const openRequestForm = () => {
    setFormError("")
    setFormSuccess("")
    setShowRequestForm(true)
  }

  const closeRequestForm = () => {
    if (submitting) {
      return
    }

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

  const handleChange = (event) => {
    const {
      name,
      value,
    } = event.target

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }))
  }

  // =========================================================
  // SUBMIT EVENT REQUEST
  // =========================================================

  const handleRequestSubmit = async (
    event
  ) => {
    event.preventDefault()

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

    if (
      form.end_time <=
      form.start_time
    ) {
      setFormError(
        "End time must be later than start time."
      )
      return
    }

    if (
      form.expected_participants &&
      Number(
        form.expected_participants
      ) < 1
    ) {
      setFormError(
        "Expected participants must be at least 1."
      )
      return
    }

    if (!club?.id) {
      setFormError(
        "Club information is unavailable."
      )
      return
    }

    setSubmitting(true)

    try {
      const {
        data: { user },
        error: userError,
      } =
        await supabase.auth.getUser()

      if (userError) {
        throw userError
      }

      if (!user) {
        throw new Error(
          "Your session has expired. Please log in again."
        )
      }

      // -------------------------------------------------------
      // DATABASE INSERT
      // RLS remains the actual authorization boundary.
      // -------------------------------------------------------

      const {
        error: insertError,
      } = await supabase
        .from("events")
        .insert({
          club_id: club.id,

          title:
            form.title.trim(),

          category:
            form.category,

          description:
            form.description.trim() ||
            null,

          event_date:
            form.event_date,

          start_time:
            form.start_time,

          end_time:
            form.end_time,

          expected_participants:
            form.expected_participants
              ? Number(
                  form.expected_participants
                )
              : null,

          requested_venue:
            form.requested_venue.trim(),

          approval_status:
            "WAITING",

          head_decision:
            "HOLD",

          publication_mode:
            "DETAILS_ONLY",

          member_early_access:
            false,

          visibility:
            "public",

          registration_access:
            "students_and_members",

          status:
            "UPCOMING",
        })

      if (insertError) {
        throw insertError
      }

      setFormSuccess(
        "Event request submitted successfully."
      )

      await loadDashboard(
        selectedClubId
      )

      setTimeout(() => {
        closeRequestForm()
      }, 1000)
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

  // =========================================================
  // HELPERS
  // =========================================================

  const getApprovalLabel = (
    event
  ) => {
    if (
      event.approval_status ===
      "APPROVED"
    ) {
      if (
        event.head_decision ===
        "PUBLISHED"
      ) {
        return "Listed"
      }

      return "Approved"
    }

    if (
      event.approval_status ===
      "REJECTED"
    ) {
      return "Rejected"
    }

    return "Pending"
  }

  const getApprovalClass = (
    event
  ) => {
    if (
      event.approval_status ===
      "APPROVED"
    ) {
      return "approved"
    }

    if (
      event.approval_status ===
      "REJECTED"
    ) {
      return "rejected"
    }

    return "waiting"
  }

  const formatDate = (
    date
  ) => {
    if (!date) {
      return "Date pending"
    }

    const parsedDate =
      new Date(
        `${date}T00:00:00`
      )

    if (
      Number.isNaN(
        parsedDate.getTime()
      )
    ) {
      return date
    }

    return parsedDate.toLocaleDateString(
      "en-IN",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      }
    )
  }

  const formatApprovalEventDate = (
    date
  ) => {
    if (!date) {
      return "Not specified"
    }

    const parsedDate =
      new Date(
        `${date}T00:00:00`
      )

    if (
      Number.isNaN(
        parsedDate.getTime()
      )
    ) {
      return date
    }

    return parsedDate.toLocaleDateString(
      "en-IN",
      {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }
    )
  }

  const formatTime = (
    time
  ) => {
    if (!time) {
      return ""
    }

    const parsed =
      new Date(
        `1970-01-01T${time}`
      )

    if (
      Number.isNaN(
        parsed.getTime()
      )
    ) {
      return time
    }

    return parsed.toLocaleTimeString(
      "en-IN",
      {
        hour: "numeric",
        minute: "2-digit",
      }
    )
  }

  const formatApprovalTimestamp = (
    timestamp
  ) => {
    if (!timestamp) {
      return "Not available"
    }

    const parsed =
      new Date(timestamp)

    if (
      Number.isNaN(
        parsed.getTime()
      )
    ) {
      return "Not available"
    }

    return parsed.toLocaleString(
      "en-IN",
      {
        timeZone:
          "Asia/Kolkata",

        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",

        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",

        hour12: true,
      }
    )
  }

  // =========================================================
  // OPEN APPROVAL
  // =========================================================

  const openApproval = async (
    event
  ) => {
    setApprovalEvent(event)
    setShowApproval(true)

    setApprovalAssets(null)
    setApprovalError("")
    setApprovalLoading(true)

    try {
      let assetData = null

      // -------------------------------------------------------
      // LINKED ASSET
      // -------------------------------------------------------

      if (
        event.approval_asset_id
      ) {
        const {
          data,
          error,
        } =
          await supabase
            .from(
              "faculty_approval_assets"
            )
            .select(`
              id,
              institution_name,
              office_name,
              certificate_title,
              signature_designation,
              signature_url,
              stamp_url,
              watermark_url
            `)
            .eq(
              "id",
              event.approval_asset_id
            )
            .maybeSingle()

        if (error) {
          throw error
        }

        assetData = data
      }

      // -------------------------------------------------------
      // ACTIVE ASSET FALLBACK
      // -------------------------------------------------------

      if (!assetData) {
        const {
          data,
          error,
        } =
          await supabase
            .from(
              "faculty_approval_assets"
            )
            .select(`
              id,
              institution_name,
              office_name,
              certificate_title,
              signature_designation,
              signature_url,
              stamp_url,
              watermark_url
            `)
            .eq(
              "is_active",
              true
            )
            .order(
              "updated_at",
              {
                ascending: false,
              }
            )
            .limit(1)
            .maybeSingle()

        if (error) {
          throw error
        }

        assetData = data
      }

      setApprovalAssets(
        assetData || null
      )
    } catch (err) {
      console.error(
        "Approval Asset Error:",
        err
      )

      setApprovalError(
        "Official approval assets could not be loaded."
      )
    } finally {
      setApprovalLoading(false)
    }
  }

  // =========================================================
  // CLOSE APPROVAL
  // =========================================================

  const closeApproval = () => {
    setShowApproval(false)
    setApprovalEvent(null)
    setApprovalAssets(null)
    setApprovalError("")
  }

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <main className="club-dashboard-page">

        <div className="loading-card">

          <div className="loading-spinner" />

          <p>
            Loading...
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
      <main className="club-dashboard-page">

        <div className="error-card">

          <h2>
            Unable to load dashboard
          </h2>

          <p>
            {error}
          </p>

          <button
            type="button"
            className="primary-button"
            onClick={() =>
              loadDashboard()
            }
          >
            Try Again
          </button>

        </div>

      </main>
    )
  }

  // =========================================================
  // CURRENT CLUB EVENTS
  // =========================================================

  const currentClubEvents =
    events.filter(
      (event) =>
        event.club_id ===
        selectedClubId
    )

  // =========================================================
  // DATE HELPERS FOR STATS
  // =========================================================

  const today =
    new Date()

  today.setHours(
    0,
    0,
    0,
    0
  )

  const completedEvents =
    currentClubEvents.filter(
      (event) => {
        if (!event.event_date) {
          return false
        }

        const eventDate =
          new Date(
            `${event.event_date}T00:00:00`
          )

        return (
          event.approval_status ===
            "APPROVED" &&
          eventDate < today
        )
      }
    )

  const pendingRequests =
    currentClubEvents.filter(
      (event) =>
        event.approval_status ===
        "WAITING"
    )

  const approvedEvents =
    currentClubEvents.filter(
      (event) =>
        event.approval_status ===
        "APPROVED"
    )

  const listedEvents =
    currentClubEvents.filter(
      (event) =>
        event.approval_status ===
          "APPROVED" &&
        event.head_decision ===
          "PUBLISHED"
    )

  // =========================================================
  // FILTERED EVENTS
  // =========================================================

  const visibleEvents =
    eventFilter === "completed"
      ? completedEvents
      : eventFilter === "pending"
      ? pendingRequests
      : eventFilter === "approved"
      ? approvedEvents
      : eventFilter === "listed"
      ? listedEvents
      : currentClubEvents

  // =========================================================
  // MAIN DASHBOARD
  // =========================================================

  return (
    <main className="club-dashboard-page">

      {/* =====================================================
          CLUB PROFILE HEADER
      ===================================================== */}

      <section className="club-profile-header">

        <div className="club-profile-identity">

          <div className="club-profile-avatar">

            {club?.name
              ?.charAt(0)
              ?.toUpperCase() ||
              "C"}

          </div>


          <div className="club-profile-name">

            <h1>
              {club?.name ||
                "Your Club"}
            </h1>

            <p>
              Club Head
            </p>

          </div>

        </div>


        {/* MULTIPLE CLUBS */}

        {clubs.length > 1 && (

          <div className="club-profile-selector">

            <label htmlFor="managed-club">
              Club
            </label>

            <select
              id="managed-club"
              value={
                selectedClubId ||
                ""
              }
              onChange={
                handleClubChange
              }
            >

              {clubs.map(
                (item) => (

                  <option
                    key={item.id}
                    value={item.id}
                  >
                    {item.name}
                  </option>

                )
              )}

            </select>

          </div>

        )}

      </section>


      {/* =====================================================
          INSTAGRAM STYLE EVENT STATS
      ===================================================== */}

      <section className="club-profile-stats">

        <button
          type="button"
          className={
            eventFilter ===
            "completed"
              ? "club-stat active"
              : "club-stat"
          }
          onClick={() =>
            setEventFilter(
              "completed"
            )
          }
        >

          <strong>
            {completedEvents.length}
          </strong>

          <span>
            COMPLETED
          </span>

        </button>


        <button
          type="button"
          className={
            eventFilter ===
            "pending"
              ? "club-stat active"
              : "club-stat"
          }
          onClick={() =>
            setEventFilter(
              "pending"
            )
          }
        >

          <strong>
            {pendingRequests.length}
          </strong>

          <span>
            PENDING REQ
          </span>

        </button>


        <button
          type="button"
          className={
            eventFilter ===
            "approved"
              ? "club-stat active"
              : "club-stat"
          }
          onClick={() =>
            setEventFilter(
              "approved"
            )
          }
        >

          <strong>
            {approvedEvents.length}
          </strong>

          <span>
            APPROVED
          </span>

        </button>

      </section>


      {/* =====================================================
          MY EVENTS
      ===================================================== */}

      <section className="club-my-events">

        <div className="club-my-events-header">

          <h2>
            My Events
          </h2>

        </div>


        {/* =================================================
            ACTION BUTTONS
        ================================================= */}

        <div className="club-event-links">

  {/* APPROVED EVENTS */}
  <button
    type="button"
    className={
      eventFilter === "approved"
        ? "club-event-link active"
        : "club-event-link"
    }
    onClick={() => setEventFilter("approved")}
  >
    Approved Events
  </button>


  {/* LISTED EVENTS */}
  <button
    type="button"
    className={
      eventFilter === "listed"
        ? "club-event-link active"
        : "club-event-link"
    }
    onClick={() => setEventFilter("listed")}
  >
    Listed Events
  </button>


  {/* PENDING REQUESTS */}
  <button
    type="button"
    className={
      eventFilter === "pending"
        ? "club-event-link active"
        : "club-event-link"
    }
    onClick={() => setEventFilter("pending")}
  >
    Pending Requests
  </button>


  {/* NEW REQUEST */}
  <button
    type="button"
    className="club-event-link club-event-link-primary"
    onClick={openRequestForm}
  >
    + New Request
  </button>

</div>


        {/* =================================================
            FILTER RESET
        ================================================= */}

        {eventFilter !==
          "all" && (

          <button
            type="button"
            className="club-clear-filter"
            onClick={() =>
              setEventFilter(
                "all"
              )
            }
          >
            Show all
          </button>

        )}


        {/* =================================================
            EVENTS
        ================================================= */}

        {visibleEvents.length ===
        0 ? (

          <div className="club-empty-card">

            <h3>

              {eventFilter ===
              "approved"
                ? "No approved events"
                : eventFilter ===
                  "listed"
                ? "No listed events"
                : eventFilter ===
                  "completed"
                ? "No completed events"
                : eventFilter ===
                  "pending"
                ? "No pending requests"
                : "No events yet"}

            </h3>


            {eventFilter ===
              "all" && (

              <button
                type="button"
                className="primary-button"
                onClick={
                  openRequestForm
                }
              >
                + New Request
              </button>

            )}

          </div>

        ) : (

          <div className="club-event-list">

            {visibleEvents.map(
              (event) => (

                <article
                  className="club-event-row"
                  key={event.id}
                >

                  <div className="club-event-row-main">

                    <span
                      className={`club-event-status ${getApprovalClass(
                        event
                      )}`}
                    >
                      {getApprovalLabel(
                        event
                      )}
                    </span>


                    <h3>
                      {event.title}
                    </h3>


                    <div className="club-event-row-details">

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

                  </div>


                  {/* ACTIONS */}

                  <div className="club-event-row-actions">

                    {event.approval_status ===
                    "APPROVED" ? (

                      <>

                        <Link
                          to={`/events/${event.id}`}
                          className="secondary-button"
                        >
                          View Event
                        </Link>


                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() =>
                            openApproval(
                              event
                            )
                          }
                        >
                          View Approval
                        </button>

                      </>

                    ) : (

                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() =>
                          setSelectedRequest(
                            event
                          )
                        }
                      >
                        View Request
                      </button>

                    )}

                  </div>

                </article>

              )
            )}

          </div>

        )}

      </section>


      {/* =====================================================
          REQUEST DETAILS MODAL
      ===================================================== */}

      {selectedRequest && (

        <div
          className="club-request-overlay"
          onMouseDown={(
            event
          ) => {

            if (
              event.target ===
              event.currentTarget
            ) {
              setSelectedRequest(
                null
              )
            }

          }}
        >

          <section
            className="club-request-modal"
            onMouseDown={(event) =>
              event.stopPropagation()
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

              </div>


              <button
                type="button"
                className="club-request-close"
                onClick={() =>
                  setSelectedRequest(
                    null
                  )
                }
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
                  {selectedRequest.expected_participants ||
                    "—"}
                </strong>

              </div>


              <div>

                <span>
                  Requested Venue
                </span>

                <strong>
                  {selectedRequest.requested_venue ||
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
                  Rejection Reason
                </strong>

                <br />

                {selectedRequest.rejection_reason}

              </div>

            )}


            {selectedRequest.approval_status ===
              "APPROVED" && (

              <div className="club-request-note">

                <strong>
                  Final Venue
                </strong>

                <br />

                {selectedRequest.assigned_venue ||
                  selectedRequest.requested_venue ||
                  "Venue not assigned"}

                {selectedRequest.faculty_acknowledgement && (
                  <>
                    <br />
                    <br />

                    <strong>
                      Faculty Acknowledgement
                    </strong>

                    <br />

                    {selectedRequest.faculty_acknowledgement}
                  </>
                )}

              </div>

            )}


            <div className="club-request-actions">

              {selectedRequest.approval_status ===
                "APPROVED" && (

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    openApproval(
                      selectedRequest
                    )
                  }
                >
                  View Approval
                </button>

              )}


              <button
                type="button"
                className="primary-button"
                onClick={() =>
                  setSelectedRequest(
                    null
                  )
                }
              >
                Close
              </button>

            </div>

          </section>

        </div>

      )}


      {/* =====================================================
          OFFICIAL APPROVAL DOCUMENT
      ===================================================== */}

      {showApproval &&
        approvalEvent && (

        <div
          className="club-request-overlay"
          onMouseDown={(
            event
          ) => {

            if (
              event.target ===
              event.currentTarget
            ) {
              closeApproval()
            }

          }}
        >

          <section
            className="club-approval-modal"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >

            {/* TOOLBAR */}

            <div className="club-approval-toolbar">

              <h2>
                Event Approval
              </h2>


              <div className="club-approval-toolbar-actions">

                <button
                  type="button"
                  className="secondary-button"
                  disabled
                  title="PDF export will be added later"
                >
                  Print / Save as PDF
                </button>


                <button
                  type="button"
                  className="club-request-close"
                  onClick={
                    closeApproval
                  }
                >
                  ×
                </button>

              </div>

            </div>


            {/* DOCUMENT */}

            <article className="club-approval-document">

              {approvalAssets?.watermark_url && (

                <img
                  src={
                    approvalAssets.watermark_url
                  }
                  alt=""
                  aria-hidden="true"
                  className="club-approval-watermark"
                />

              )}


              <div className="club-approval-document-content">

                {/* HEADER */}

                <header className="club-approval-header">

                  <div className="club-approval-brand">

                    <div className="club-approval-brand-mark">
                      CE
                    </div>

                    <div>

                      <h1>
                        {approvalAssets?.institution_name ||
                          "CAMPUS EVENT"}
                      </h1>

                      <p>
                        Events • Clubs • Community
                      </p>

                    </div>

                  </div>


                  <div className="club-approval-office">

                    <strong>
                      {approvalAssets?.office_name ||
                        "Office of Student Affairs"}
                    </strong>

                    <span>
                      Event Approval Division
                    </span>

                    <small>
                      Official Event Communication
                    </small>

                  </div>

                </header>


                {/* APPROVED */}

                <section className="club-approval-status">

                  <div className="club-approval-check">
                    ✓
                  </div>

                  <div>

                    <p>
                      OFFICIAL NOTIFICATION
                    </p>

                    <h2>
                      EVENT APPROVED
                    </h2>

                    <span>
                      Your event request has been
                      approved by the Faculty
                      Approval Authority.
                    </span>

                  </div>

                </section>


                {/* EVENT INFORMATION */}

                <section className="club-approval-grid">

                  <div className="club-approval-panel">

                    <div className="club-approval-panel-title">

                      <span>
                        ▣
                      </span>

                      <h3>
                        Event Information
                      </h3>

                    </div>


                    <div className="club-approval-row">

                      <span>
                        Event Title
                      </span>

                      <strong>
                        {approvalEvent.title}
                      </strong>

                    </div>


                    <div className="club-approval-row">

                      <span>
                        Organized by
                      </span>

                      <strong>
                        {approvalEvent.clubs?.name ||
                          club?.name ||
                          "Club"}
                      </strong>

                    </div>


                    <div className="club-approval-row">

                      <span>
                        Category
                      </span>

                      <strong>
                        {approvalEvent.category ||
                          "Not specified"}
                      </strong>

                    </div>

                  </div>


                  {/* APPROVED DETAILS */}

                  <div className="club-approval-panel">

                    <div className="club-approval-panel-title">

                      <span>
                        ▦
                      </span>

                      <h3>
                        Approved Event Details
                      </h3>

                    </div>


                    <div className="club-approval-row">

                      <span>
                        Date
                      </span>

                      <strong>
                        {formatApprovalEventDate(
                          approvalEvent.event_date
                        )}
                      </strong>

                    </div>


                    <div className="club-approval-row">

                      <span>
                        Time
                      </span>

                      <strong>

                        {formatTime(
                          approvalEvent.start_time
                        )}

                        {" – "}

                        {formatTime(
                          approvalEvent.end_time
                        )}

                      </strong>

                    </div>


                    <div className="club-approval-row">

                      <span>
                        Final Venue
                      </span>

                      <strong>
                        {approvalEvent.assigned_venue ||
                          approvalEvent.requested_venue ||
                          "Venue not specified"}
                      </strong>

                    </div>


                    <div className="club-approval-row">

                      <span>
                        Expected Participants
                      </span>

                      <strong>
                        {approvalEvent.expected_participants ??
                          "Not specified"}
                      </strong>

                    </div>

                  </div>

                </section>


                {/* FACULTY ACKNOWLEDGEMENT */}

                <section className="club-approval-acknowledgement">

                  <div className="club-approval-panel-title">

                    <span>
                      ▤
                    </span>

                    <h3>
                      Faculty Acknowledgement
                    </h3>

                  </div>


                  <div className="club-approval-acknowledgement-body">

                    <span>
                      “
                    </span>

                    <p>
                      {approvalEvent.faculty_acknowledgement ||
                        "Your event request has been approved. Please proceed according to the approved event details and institutional guidelines."}
                    </p>

                  </div>

                </section>


                {/* SIGNATURE + STAMP */}

                <section className="club-approval-authority">

                  <div className="club-approval-authority-text">

                    <span>
                      Approved by
                    </span>

                    <strong>
                      {approvalAssets?.signature_designation ||
                        "Faculty Approval Authority"}
                    </strong>

                    <small>
                      {approvalAssets?.office_name ||
                        "Office of Student Affairs"}
                    </small>

                  </div>


                  <div className="club-approval-signature">

                    {approvalAssets?.signature_url ? (

                      <img
                        src={
                          approvalAssets.signature_url
                        }
                        alt="Official digital signature"
                      />

                    ) : (

                      <div className="club-approval-signature-placeholder">
                        Official Digital Signature
                      </div>

                    )}

                    <span>
                      OFFICIAL DIGITAL SIGNATURE
                    </span>

                  </div>


                  <div className="club-approval-stamp">

                    {approvalAssets?.stamp_url ? (

                      <img
                        src={
                          approvalAssets.stamp_url
                        }
                        alt="Official approval stamp"
                      />

                    ) : (

                      <div className="club-approval-stamp-placeholder">
                        OFFICIAL
                        <br />
                        APPROVAL
                      </div>

                    )}

                  </div>

                </section>


                {/* TIMESTAMP */}

                <footer className="club-approval-footer">

                  <div>

                    <span>
                      Approved on
                    </span>

                    <strong>
                      {formatApprovalTimestamp(
                        approvalEvent.approved_at
                      )}{" "}
                      IST
                    </strong>

                  </div>

                  <div>
                    Student Activities Today.
                    A Better Tomorrow.
                  </div>

                </footer>

              </div>

            </article>


            {approvalLoading && (

              <p className="club-approval-loading">
                Loading official approval assets...
              </p>

            )}


            {approvalError && (

              <p className="club-approval-error">
                {approvalError}
              </p>

            )}

          </section>

        </div>

      )}


      {/* =====================================================
          NEW EVENT REQUEST MODAL
      ===================================================== */}

      {showRequestForm && (

        <div
          className="club-request-overlay"
          onMouseDown={(
            event
          ) => {

            if (
              event.target ===
              event.currentTarget
            ) {
              closeRequestForm()
            }

          }}
        >

          <section
            className="club-request-modal"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >

            <div className="club-request-header">

              <div>

                <p className="club-section-kicker">
                  EVENT REQUEST
                </p>

                <h2>
                  New Event Request
                </h2>

              </div>


              <button
                type="button"
                className="club-request-close"
                onClick={
                  closeRequestForm
                }
                disabled={
                  submitting
                }
              >
                ×
              </button>

            </div>


            <form
              className="club-request-form"
              onSubmit={
                handleRequestSubmit
              }
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
                  value={
                    form.title
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Enter event title"
                  maxLength={150}
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
                  value={
                    form.category
                  }
                  onChange={
                    handleChange
                  }
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
                  Description
                </label>

                <textarea
                  id="event-description"
                  name="description"
                  value={
                    form.description
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Add a description"
                  rows="4"
                  maxLength={2000}
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
                    value={
                      form.event_date
                    }
                    onChange={
                      handleChange
                    }
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
                    value={
                      form.start_time
                    }
                    onChange={
                      handleChange
                    }
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
                    value={
                      form.end_time
                    }
                    onChange={
                      handleChange
                    }
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
                    max="100000"
                    value={
                      form.expected_participants
                    }
                    onChange={
                      handleChange
                    }
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
                    value={
                      form.requested_venue
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="e.g. Seminar Hall"
                    maxLength={200}
                    required
                  />

                </div>

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
                  onClick={
                    closeRequestForm
                  }
                  disabled={
                    submitting
                  }
                >
                  Cancel
                </button>


                <button
                  type="submit"
                  className="primary-button"
                  disabled={
                    submitting
                  }
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