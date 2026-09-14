import { useCallback, useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import "./Faculty.css"


function FacultyDashboard() {
  const [requests, setRequests] = useState([])
  const [approvedEvents, setApprovedEvents] = useState([])
  const [approvedTimelineMinimized, setApprovedTimelineMinimized] = useState(false)
  const [expandedApprovedEvents, setExpandedApprovedEvents] = useState(new Set())

  const [loading, setLoading] = useState(true)
  const [approvedEventsLoading, setApprovedEventsLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const [selectedRequest, setSelectedRequest] = useState(null)

  // =========================================================
  // APPROVAL STATE
  // =========================================================

  const [venueOption, setVenueOption] = useState("same")
  const [newVenue, setNewVenue] = useState("")
  const [acknowledgement, setAcknowledgement] = useState("")

  // =========================================================
  // REJECTION STATE
  // =========================================================

  const [rejectionReason, setRejectionReason] = useState("")
  const [actionType, setActionType] = useState(null)

  // =========================================================
  // LOAD PENDING REQUESTS
  // =========================================================

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true)
      setApprovedEventsLoading(true)
      setError("")

      const [
        { data: requestData, error: requestError },
        { data: approvedData, error: approvedError },
      ] = await Promise.all([
        supabase.rpc("faculty_event_requests"),

        supabase.rpc("faculty_approved_events"),
      ])

      if (requestError) {
        throw requestError
      }

      if (approvedError) {
        throw approvedError
      }

      setRequests(requestData || [])

      const sortedApprovedEvents = [...(approvedData || [])].sort((a, b) => {
        const aDateTime = new Date(
          `${a.event_date || ""}T${a.start_time || "00:00:00"}`
        ).getTime()

        const bDateTime = new Date(
          `${b.event_date || ""}T${b.start_time || "00:00:00"}`
        ).getTime()

        if (Number.isNaN(aDateTime) && Number.isNaN(bDateTime)) return 0
        if (Number.isNaN(aDateTime)) return 1
        if (Number.isNaN(bDateTime)) return -1

        return aDateTime - bDateTime
      })

      setApprovedEvents(sortedApprovedEvents)
    } catch (err) {
      console.error(
        "Faculty dashboard loading error:",
        err
      )

      setError(
        err.message ||
          "Unable to load faculty dashboard data."
      )
    } finally {
      setLoading(false)
      setApprovedEventsLoading(false)
    }
  }, [])

  // =========================================================
  // INITIAL LOAD
  // =========================================================

  useEffect(() => {
    loadRequests()
  }, [loadRequests])

  // =========================================================
  // AUTOMATIC ACKNOWLEDGEMENT
  // =========================================================

  const buildAcknowledgement = (
    finalVenue
  ) => {
    return (
      `Your event request has been approved. ` +
      `The final venue has been assigned as ${finalVenue}. ` +
      `Please ensure all arrangements are made as per the institution's event guidelines.`
    )
  }

  // =========================================================
  // OPEN REQUEST
  // =========================================================

  const openRequest = (request) => {
    setSelectedRequest(request)

    setVenueOption("same")
    setNewVenue("")

    const requestedVenue =
      request.requested_venue?.trim() || ""

    if (requestedVenue) {
      setAcknowledgement(
        buildAcknowledgement(requestedVenue)
      )
    } else {
      setAcknowledgement("")
    }

    setRejectionReason("")
    setActionType(null)

    setError("")
    setSuccess("")
  }

  // =========================================================
  // CLOSE REQUEST
  // =========================================================

  const closeRequest = () => {
    if (actionLoading) return

    setSelectedRequest(null)

    setVenueOption("same")
    setNewVenue("")
    setAcknowledgement("")

    setRejectionReason("")
    setActionType(null)

    setError("")
  }

  // =========================================================
  // FINAL VENUE
  // =========================================================

  const getFinalVenue = () => {
    if (!selectedRequest) {
      return ""
    }

    if (venueOption === "same") {
      return (
        selectedRequest.requested_venue?.trim() ||
        ""
      )
    }

    return newVenue.trim()
  }

  // =========================================================
  // UPDATE AUTOMATIC ACKNOWLEDGEMENT
  // WHEN VENUE CHANGES
  // =========================================================

  useEffect(() => {
    if (
      !selectedRequest ||
      actionType !== "approve"
    ) {
      return
    }

    const finalVenue = getFinalVenue()

    if (!finalVenue) {
      setAcknowledgement("")
      return
    }

    setAcknowledgement(
      buildAcknowledgement(finalVenue)
    )
  }, [
    venueOption,
    newVenue,
    selectedRequest,
    actionType,
  ])

  // =========================================================
  // APPROVE EVENT
  // =========================================================

  const handleApprove = async () => {
    if (!selectedRequest) {
      return
    }

    setError("")
    setSuccess("")

    const finalVenue = getFinalVenue()

    if (!finalVenue) {
      setError(
        "Please assign a final venue before approving the event."
      )
      return
    }

    const finalAcknowledgement =
      acknowledgement.trim()

    if (!finalAcknowledgement) {
      setError(
        "Approval acknowledgement could not be generated."
      )
      return
    }

    if (finalAcknowledgement.length > 1000) {
      setError(
        "Approval acknowledgement is too long."
      )
      return
    }

    try {
      setActionLoading(true)

      // =====================================================
      // SECURE DATABASE APPROVAL
      // =====================================================

      const {
        data,
        error: rpcError,
      } = await supabase.rpc(
        "faculty_approve_event",
        {
          p_event_id:
            selectedRequest.id,

          p_assigned_venue:
            finalVenue,

          p_acknowledgement:
            finalAcknowledgement,
        }
      )

      if (rpcError) {
        throw rpcError
      }

      console.log(
        "Faculty approval completed. A fresh server-generated verification credential was created for this approval.",
        data
      )

      setSuccess(
        "Event approved. Official acknowledgement and a new verification credential have been generated."
      )

      setSelectedRequest(null)

      setVenueOption("same")
      setNewVenue("")
      setAcknowledgement("")

      setRejectionReason("")
      setActionType(null)

      await loadRequests()
    } catch (err) {
      console.error(
        "Faculty approval error:",
        err
      )

      setError(
        err.message ||
          "Unable to approve this event."
      )
    } finally {
      setActionLoading(false)
    }
  }

  // =========================================================
  // REJECT EVENT
  // =========================================================

  const handleReject = async () => {
    if (!selectedRequest) {
      return
    }

    const reason =
      rejectionReason.trim()

    if (!reason) {
      setError(
        "Please provide a rejection reason."
      )
      return
    }

    if (reason.length > 1000) {
      setError(
        "Rejection reason must be 1000 characters or less."
      )
      return
    }

    try {
      setActionLoading(true)
      setError("")
      setSuccess("")

      const {
        data,
        error: rpcError,
      } = await supabase.rpc(
        "faculty_reject_event",
        {
          p_event_id:
            selectedRequest.id,

          p_rejection_reason:
            reason,
        }
      )

      if (rpcError) {
        throw rpcError
      }

      console.log(
        "Faculty rejection completed:",
        data
      )

      setSuccess(
        "Event request rejected successfully."
      )

      setSelectedRequest(null)

      setVenueOption("same")
      setNewVenue("")
      setAcknowledgement("")

      setRejectionReason("")
      setActionType(null)

      await loadRequests()
    } catch (err) {
      console.error(
        "Faculty rejection error:",
        err
      )

      setError(
        err.message ||
          "Unable to reject this event."
      )
    } finally {
      setActionLoading(false)
    }
  }

  // =========================================================
  // DATE FORMAT
  // =========================================================

  const formatDate = (date) => {
    if (!date) {
      return "Not available"
    }

    const parsedDate =
      new Date(`${date}T00:00:00`)

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

  // =========================================================
  // TIME FORMAT
  // =========================================================

  const formatTime = (time) => {
    if (!time) {
      return "Not available"
    }

    const parts = time.split(":")

    if (parts.length < 2) {
      return time
    }

    const hours =
      Number(parts[0])

    const minutes =
      parts[1]

    if (Number.isNaN(hours)) {
      return time
    }

    const suffix =
      hours >= 12
        ? "PM"
        : "AM"

    const displayHour =
      hours % 12 || 12

    return `${displayHour}:${minutes} ${suffix}`
  }

  // =========================================================
  // APPROVED EVENT TIMELINE HELPERS
  // =========================================================

  const normalizeEventStatus = (status, eventDate) => {
    const value = String(status || "").trim().toLowerCase()

    if (value.includes("cancel")) return "cancelled"
    if (value.includes("reject")) return "rejected"
    if (value.includes("complete") || value.includes("closed") || value.includes("ended")) {
      return "completed"
    }
    if (value.includes("active") || value.includes("ongoing") || value.includes("live")) {
      return "active"
    }
    if (value.includes("upcoming") || value.includes("scheduled")) {
      return "upcoming"
    }

    // Only a fallback when the DB has no usable status.
    if (eventDateIsPast(eventDate)) return "completed"
    return "upcoming"
  }

  const eventDateIsPast = (value) => {
    const dateValue = value ? new Date(`${value}T23:59:59`) : null
    return dateValue && !Number.isNaN(dateValue.getTime()) &&
      dateValue.getTime() < Date.now()
  }

  const getStatusLabel = (status, eventDate) => {
    const normalized = normalizeEventStatus(status, eventDate)

    if (normalized === "active") return "Active"
    if (normalized === "completed") return "Completed"
    if (normalized === "cancelled") return "Cancelled"
    if (normalized === "rejected") return "Rejected"
    if (normalized === "upcoming") return "Upcoming"

    return status || "Upcoming"
  }

  const formatTimelineDateParts = (date) => {
    if (!date) {
      return { day: "--", month: "---", year: "----", weekday: "" }
    }

    const parsedDate = new Date(`${date}T00:00:00`)

    if (Number.isNaN(parsedDate.getTime())) {
      return { day: date, month: "", year: "", weekday: "" }
    }

    return {
      day: parsedDate.toLocaleDateString("en-IN", { day: "2-digit" }),
      month: parsedDate.toLocaleDateString("en-IN", { month: "short" }),
      year: parsedDate.toLocaleDateString("en-IN", { year: "numeric" }),
      weekday: parsedDate.toLocaleDateString("en-IN", { weekday: "short" }),
    }
  }

  const formatTimelineDate = (date) => {
    if (!date) return "Date not available"

    const parsedDate = new Date(`${date}T00:00:00`)
    if (Number.isNaN(parsedDate.getTime())) return date

    return parsedDate.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    })
  }

  const toggleApprovedEvent = (eventId) => {
    setExpandedApprovedEvents((current) => {
      const next = new Set(current)

      if (next.has(eventId)) {
        next.delete(eventId)
      } else {
        next.add(eventId)
      }

      return next
    })
  }


  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <main className="dashboard-page faculty-dashboard-page faculty-loading-page">

        <section className="dashboard-empty-state faculty-dashboard-hero faculty-loading-card">

          <p className="dashboard-section-kicker">
            FACULTY DASHBOARD
          </p>

          <h1>
            Faculty Dashboard
          </h1>

          <p>
            Loading event requests...
          </p>

        </section>

      </main>
    )
  }

  // =========================================================
  // FACULTY DASHBOARD
  // =========================================================

  return (
    <main className="dashboard-page faculty-dashboard-page">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <section className="dashboard-empty-state faculty-dashboard-hero">

        <p className="dashboard-section-kicker">
          FACULTY DASHBOARD
        </p>

        <h1>
          Faculty Dashboard
        </h1>

        <p>
          Review and manage club event
          requests.
        </p>

      </section>

      {/* =====================================================
          SUCCESS
      ===================================================== */}

      {success && (
        <section className="faculty-success-message">
          <p>{success}</p>
        </section>
      )}

      {/* =====================================================
          ERROR
      ===================================================== */}

      {error && !selectedRequest && (
        <section className="faculty-error-message">
          <p>{error}</p>
        </section>
      )}

      {/* =====================================================
          APPROVED EVENTS TIMELINE
      ===================================================== */}

      <section className="faculty-approved-events-section faculty-approved-timeline-panel">

        <div className="faculty-approved-events-header">
          <div>
            <p className="dashboard-section-kicker">
              APPROVED EVENTS
            </p>

            <h2>
              Event Timeline
            </h2>

            <p>
              All faculty-approved events arranged chronologically by event date.
            </p>
          </div>

          <div className="faculty-approved-events-controls">
            <button
              type="button"
              className="faculty-timeline-control-button"
              onClick={() => setApprovedTimelineMinimized((value) => !value)}
              aria-expanded={!approvedTimelineMinimized}
            >
              <span aria-hidden="true">
                {approvedTimelineMinimized ? "⌄" : "⌃"}
              </span>
              {approvedTimelineMinimized ? "Expand" : "Minimize"}
            </button>


            <button
              type="button"
              className="faculty-timeline-control-button"
              onClick={loadRequests}
              disabled={loading || approvedEventsLoading}
            >
              <span aria-hidden="true">↻</span>
              {approvedEventsLoading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        <>
            {approvedEventsLoading ? (
              <div className="faculty-timeline-loading">
                <span className="faculty-loading-dot" />
                <p>Loading approved events...</p>
              </div>
            ) : approvedEvents.length === 0 ? (
              <div className="faculty-timeline-empty">
                <div className="faculty-empty-icon">✓</div>
                <h3>No approved events yet</h3>
                <p>
                  Approved events will appear here automatically after faculty approval.
                </p>
              </div>
            ) : (
              <div className="faculty-approved-table">

                <div className="faculty-approved-table-head">
                  <div>DATE &amp; TIME</div>
                  <div>EVENT DETAILS</div>
                  <div>CLUB</div>
                  <div>CATEGORY</div>
                  <div>VENUE</div>
                  <div>EXPECTED PARTICIPANTS</div>
                  <div>STATUS</div>
                  <div>ACTIONS</div>
                </div>

                <div className="faculty-approved-table-body">
                  {(approvedTimelineMinimized ? approvedEvents.slice(0, 1) : approvedEvents).map((event) => {
                    const dateParts = formatTimelineDateParts(event.event_date)
                    const normalizedStatus = normalizeEventStatus(event.status, event.event_date)
                    const statusLabel = getStatusLabel(event.status, event.event_date)
                    const isExpanded = expandedApprovedEvents.has(event.id)

                    return (
                      <div
                        className={`faculty-approved-row faculty-approved-row-${normalizedStatus} ${
                          isExpanded ? "is-expanded" : ""
                        }`}
                        key={event.id}
                      >

                        <div className="faculty-approved-cell faculty-approved-date-cell">
                          <span className="faculty-approved-timeline-dot" />

                          <div className="faculty-approved-date">
                            <strong>{dateParts.day}</strong>
                            <span>{dateParts.month} {dateParts.year}</span>
                            <small>{dateParts.weekday}</small>

                            <b className="faculty-approved-event-time">
                              {formatTime(event.start_time)}
                              <em> – </em>
                              {formatTime(event.end_time)}
                            </b>
                          </div>
                        </div>

                        <div className="faculty-approved-cell faculty-approved-event-cell">
                          <h3>
                            {event.title || "Untitled Event"}
                          </h3>

                          <p>
                            {event.description || "No event description provided."}
                          </p>
                        </div>

                        <div className="faculty-approved-cell faculty-approved-club-cell">
                          <strong>
                            {event.club_name || event.club?.name || "Club not available"}
                          </strong>
                        </div>

                        <div className="faculty-approved-cell faculty-approved-category-cell">
                          <strong>
                            {event.category || "General"}
                          </strong>
                        </div>

                        <div className="faculty-approved-cell faculty-approved-venue-cell">
                          <span className="faculty-approved-cell-icon">⌖</span>
                          <span>
                            {event.assigned_venue ||
                              event.requested_venue ||
                              "Not specified"}
                          </span>
                        </div>

                        <div className="faculty-approved-cell faculty-approved-participants-cell">
                          <span className="faculty-approved-cell-icon">♙</span>
                          <strong>
                            {event.expected_participants ?? "—"}
                          </strong>
                        </div>

                        <div className="faculty-approved-cell faculty-approved-status-cell">
                          <span className={`faculty-status-pill faculty-status-${normalizedStatus}`}>
                            <i />
                            {statusLabel}
                          </span>

                          {normalizedStatus === "active" && (
                            <small>Happening now</small>
                          )}

                          {normalizedStatus === "upcoming" && (
                            <small>
                              {formatTimelineDate(event.event_date)}
                            </small>
                          )}

                          {normalizedStatus === "completed" && (
                            <small>Event completed</small>
                          )}
                        </div>

                        <div className="faculty-approved-cell faculty-approved-action-cell">
                          <button
                            type="button"
                            className="faculty-approved-details-button"
                            onClick={() => toggleApprovedEvent(event.id)}
                            aria-label={`${isExpanded ? "Hide" : "View"} details for ${event.title || "event"}`}
                            aria-expanded={isExpanded}
                          >
                            <span>{isExpanded ? "Hide" : "View Details"}</span>
                            <b aria-hidden="true">{isExpanded ? "⌃" : "→"}</b>
                          </button>
                        </div>

                        {isExpanded && (
                          <div className="faculty-approved-expanded">

                            <div className="faculty-approved-expanded-top">
                              <div className="faculty-expanded-description">
                                <span>Event Description</span>
                                <p>
                                  {event.description || "No event description provided."}
                                </p>
                              </div>

                              <div>
                                <span>Event Date</span>
                                <strong>{formatTimelineDate(event.event_date)}</strong>
                                <small>{dateParts.weekday}</small>
                              </div>

                              <div>
                                <span>Event Time</span>
                                <strong>
                                  {formatTime(event.start_time)}
                                  {" – "}
                                  {formatTime(event.end_time)}
                                </strong>
                              </div>
                            </div>

                            <div className="faculty-approved-expanded-meta">
                              <div>
                                <span>Category</span>
                                <strong>{event.category || "General"}</strong>
                              </div>

                              <div>
                                <span>Organizing Club</span>
                                <strong>
                                  {event.club_name || event.club?.name || "Club not available"}
                                </strong>
                              </div>

                              <div>
                                <span>Venue</span>
                                <strong>
                                  {event.assigned_venue ||
                                    event.requested_venue ||
                                    "Not specified"}
                                </strong>
                              </div>

                              <div>
                                <span>Expected Participants</span>
                                <strong>
                                  {event.expected_participants ?? "Not specified"}
                                </strong>
                              </div>
                            </div>

                            {event.faculty_acknowledgement && (
                              <div className="faculty-expanded-acknowledgement">
                                <span>Faculty Acknowledgement</span>
                                <p>{event.faculty_acknowledgement}</p>
                              </div>
                            )}

                            <div className="faculty-approved-expanded-footer">
                              <span>
                                Approved by{" "}
                                <strong>
                                  {event.approved_by_name || "Faculty Authority"}
                                </strong>
                              </span>

                              {event.approved_at && (
                                <span>
                                  Approved on{" "}
                                  {new Date(event.approved_at).toLocaleDateString(
                                    "en-IN",
                                    {
                                      day: "2-digit",
                                      month: "long",
                                      year: "numeric",
                                    }
                                  )}
                                </span>
                              )}
                            </div>

                          </div>
                        )}

                      </div>
                    )
                  })}
                </div>

              </div>
            )}
        </>

      </section>

      {/* =====================================================
          EVENT MANAGEMENT
      ===================================================== */}

      <section className="faculty-event-management">

        <p className="dashboard-section-kicker">
          EVENT MANAGEMENT
        </p>

        <h2>
          Pending Event Requests
        </h2>

        <p>
          Event requests submitted by Club
          Heads are waiting for faculty review.
        </p>

        {/* =================================================
            EMPTY
        ================================================= */}

        {requests.length === 0 ? (
          <div className="faculty-empty-state">

            <h3>
              No pending requests
            </h3>

            <p>
              There are currently no event
              requests waiting for approval.
            </p>

            <button
              type="button"
              onClick={loadRequests}
            >
              Refresh
            </button>

          </div>
        ) : (

          /* =================================================
             REQUEST LIST
          ================================================= */

          <div className="faculty-request-grid">

            {requests.map((request) => (
              <article
                className="faculty-request-card"
                key={request.id}
              >

                <p className="faculty-status-badge faculty-status-pending">
                  WAITING FOR APPROVAL
                </p>

                <h3>
                  {request.title}
                </h3>

                <p>
                  Club:{" "}
                  <strong>
                    {request.club_name ||
                      "Unknown club"}
                  </strong>
                </p>

                <p>
                  Category:{" "}
                  <strong>
                    {request.category ||
                      "Not specified"}
                  </strong>
                </p>

                <p>
                  Date:{" "}
                  <strong>
                    {formatDate(
                      request.event_date
                    )}
                  </strong>
                </p>

                <p>
                  Time:{" "}
                  <strong>
                    {formatTime(
                      request.start_time
                    )}
                    {" - "}
                    {formatTime(
                      request.end_time
                    )}
                  </strong>
                </p>

                <p>
                  Expected Participants:{" "}
                  <strong>
                    {request.expected_participants ??
                      "Not specified"}
                  </strong>
                </p>

                <p>
                  Requested Venue:{" "}
                  <strong>
                    {request.requested_venue ||
                      "Not specified"}
                  </strong>
                </p>

                <button
                  type="button"
                  onClick={() =>
                    openRequest(request)
                  }
                >
                  View Request
                </button>

              </article>
            ))}

          </div>
        )}

      </section>

      {/* =====================================================
          REQUEST REVIEW
      ===================================================== */}

      {selectedRequest && (
        <div
          className="club-request-overlay faculty-request-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="faculty-request-title"
        >

          <section className="club-request-modal faculty-request-modal">

            {/* =================================================
                HEADER
            ================================================= */}

            <div className="club-request-header">
              <div>
                <p className="dashboard-section-kicker">
                  EVENT REQUEST
                </p>

                <h2 id="faculty-request-title">
                  {selectedRequest.title}
                </h2>

                <p>
                  Submitted by club:{" "}
                  <strong>
                    {selectedRequest.club_name ||
                      "Unknown club"}
                  </strong>
                </p>
              </div>

              {!actionLoading && (
                <button
                  type="button"
                  className="club-request-close"
                  onClick={closeRequest}
                  aria-label="Close request"
                >
                  ×
                </button>
              )}
            </div>

            {/* Modal content starts here */}
            <div className="faculty-modal-content">



            {/* =================================================
                EVENT DETAILS
            ================================================= */}

            <div className="club-request-details">

              <div>
                <p>
                  <strong>Category</strong>
                </p>
                <p>
                  {selectedRequest.category ||
                    "Not specified"}
                </p>
              </div>

              <div>
                <p>
                  <strong>Description</strong>
                </p>
                <p>
                  {selectedRequest.description ||
                    "No description provided."}
                </p>
              </div>

              <div>
                <p>
                  <strong>Date</strong>
                </p>
                <p>
                  {formatDate(
                    selectedRequest.event_date
                  )}
                </p>
              </div>

              <div>
                <p>
                  <strong>Time</strong>
                </p>
                <p>
                  {formatTime(
                    selectedRequest.start_time
                  )}
                  {" - "}
                  {formatTime(
                    selectedRequest.end_time
                  )}
                </p>
              </div>

              <div>
                <p>
                  <strong>Expected Participants</strong>
                </p>
                <p>
                  {selectedRequest.expected_participants ??
                    "Not specified"}
                </p>
              </div>

              <div>
                <p>
                  <strong>Requested Venue</strong>
                </p>
                <p>
                  {selectedRequest.requested_venue ||
                    "Not specified"}
                </p>
              </div>

            </div>

            <hr />

            {/* =================================================
                DECISION
            ================================================= */}

            <h3>
              Faculty Decision
            </h3>

            <button
              type="button"
              className="faculty-primary-button"
              onClick={() => {
                setActionType("approve")
                setError("")

                const venue =
                  getFinalVenue()

                if (venue) {
                  setAcknowledgement(
                    buildAcknowledgement(venue)
                  )
                }
              }}
              disabled={actionLoading}
            >
              Approve Event
            </button>

            <button
              type="button"
              className="faculty-danger-button"
              onClick={() => {
                setActionType("reject")
                setError("")
              }}
              disabled={actionLoading}
            >
              Reject Event
            </button>

            {/* =================================================
                APPROVAL
            ================================================= */}

            {actionType === "approve" && (
              <div className="faculty-decision-panel faculty-approval-panel">

                <hr />

                <h3>
                  Assign Venue
                </h3>

                <p>
                  Select the final venue that
                  will appear on the official
                  approval acknowledgement.
                </p>

                {/* =============================================
                    SAME VENUE
                ============================================= */}

                <div>

                  <label>
                    <input
                      type="radio"
                      name="venue-option"
                      value="same"
                      checked={
                        venueOption === "same"
                      }
                      onChange={() => {
                        setVenueOption("same")
                        setNewVenue("")
                        setError("")
                      }}
                      disabled={actionLoading}
                    />

                    {" "}
                    Same as requested
                  </label>

                  <p>
                    Requested venue:{" "}
                    <strong>
                      {selectedRequest.requested_venue ||
                        "No venue requested"}
                    </strong>
                  </p>

                </div>

                {/* =============================================
                    NEW VENUE
                ============================================= */}

                <div>

                  <label>
                    <input
                      type="radio"
                      name="venue-option"
                      value="new"
                      checked={
                        venueOption === "new"
                      }
                      onChange={() => {
                        setVenueOption("new")
                        setError("")
                      }}
                      disabled={actionLoading}
                    />

                    {" "}
                    New venue
                  </label>

                  {venueOption === "new" && (
                    <div>

                      <label htmlFor="new-venue">
                        New Assigned Venue
                      </label>

                      <input
                        id="new-venue"
                        type="text"
                        value={newVenue}
                        onChange={(event) => {
                          setNewVenue(
                            event.target.value
                          )
                          setError("")
                        }}
                        placeholder="Enter final venue"
                        maxLength={200}
                        disabled={actionLoading}
                      />

                    </div>
                  )}

                </div>

                {/* =============================================
                    FINAL VENUE
                ============================================= */}

                <div>

                  <p>
                    Final venue:
                  </p>

                  <strong>
                    {getFinalVenue() ||
                      "Not assigned"}
                  </strong>

                </div>

                <hr />

                {/* =============================================
                    OFFICIAL ACKNOWLEDGEMENT PREVIEW
                ============================================= */}

                <section className="faculty-acknowledgement-preview">

                  <p className="dashboard-section-kicker">
                    OFFICIAL ACKNOWLEDGEMENT
                  </p>

                  <h3>
                    Event Approval Message
                  </h3>

                  <p>
                    This acknowledgement will
                    be permanently stored with
                    the faculty approval.
                  </p>

                  <div>

                    <p>
                      “{acknowledgement ||
                        "Approval message will be generated after a final venue is assigned."}”
                    </p>

                  </div>

                  <small>
                    The final approval timestamp,
                    approving faculty identity,
                    digital signature and official
                    stamp will be attached to the
                    acknowledgement after approval.
                  </small>

                </section>

                {/* =============================================
                    ERROR
                ============================================= */}

                {error && (
                  <p>
                    {error}
                  </p>
                )}

                {/* =============================================
                    CONFIRM
                ============================================= */}

                <div>

                  <button
                    type="button"
                    className="faculty-primary-button"
                    onClick={handleApprove}
                    disabled={
                      actionLoading ||
                      !getFinalVenue()
                    }
                  >
                    {actionLoading
                      ? "Approving..."
                      : "Confirm Approval"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!actionLoading) {
                        setActionType(null)
                        setError("")
                      }
                    }}
                    disabled={actionLoading}
                  >
                    Cancel
                  </button>

                </div>

              </div>
            )}

            {/* =================================================
                REJECTION
            ================================================= */}

            {actionType === "reject" && (
              <div className="faculty-decision-panel faculty-rejection-panel">

                <hr />

                <h3>
                  Reject Event
                </h3>

                <p>
                  A rejection reason is required.
                </p>

                <label
                  className="faculty-form-label"
                  htmlFor="rejection-reason"
                >
                  Rejection Reason
                </label>

                <textarea
                  id="rejection-reason"
                  value={rejectionReason}
                  onChange={(event) => {
                    setRejectionReason(
                      event.target.value
                    )
                    setError("")
                  }}
                  placeholder="Explain why this event request is being rejected."
                  rows={5}
                  maxLength={1000}
                  disabled={actionLoading}
                />

                <p>
                  {rejectionReason.length}/1000
                </p>

                {error && (
                  <p>
                    {error}
                  </p>
                )}

                <div>

                  <button
                    type="button"
                    className="faculty-danger-button"
                    onClick={handleReject}
                    disabled={
                      actionLoading ||
                      !rejectionReason.trim()
                    }
                  >
                    {actionLoading
                      ? "Rejecting..."
                      : "Confirm Rejection"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!actionLoading) {
                        setActionType(null)
                        setError("")
                      }
                    }}
                    disabled={actionLoading}
                  >
                    Cancel
                  </button>

                </div>

              </div>
            )}

            {/* =================================================
                CLOSE
            ================================================= */}

            </div>

            {!actionLoading && (
              <div className="club-request-actions faculty-modal-close-action">
                <button
                  type="button"
                  onClick={closeRequest}
                >
                  Close
                </button>
              </div>
            )}

          </section>

        </div>
      )}

    </main>
  )
}

export default FacultyDashboard