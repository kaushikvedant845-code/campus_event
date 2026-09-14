import { useCallback, useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"

function FacultyDashboard() {
  const [requests, setRequests] = useState([])

  const [loading, setLoading] = useState(true)
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
      setError("")

      const {
        data,
        error: rpcError,
      } = await supabase.rpc("faculty_event_requests")

      if (rpcError) {
        throw rpcError
      }

      setRequests(data || [])
    } catch (err) {
      console.error(
        "Faculty event request loading error:",
        err
      )

      setError(
        err.message ||
          "Unable to load event requests."
      )
    } finally {
      setLoading(false)
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
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <main className="dashboard-page">

        <section className="dashboard-empty-state">

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
    <main className="dashboard-page">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <section className="dashboard-empty-state">

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
        <section>
          <p>
            {success}
          </p>
        </section>
      )}

      {/* =====================================================
          ERROR
      ===================================================== */}

      {error && !selectedRequest && (
        <section>
          <p>
            {error}
          </p>
        </section>
      )}

      {/* =====================================================
          EVENT MANAGEMENT
      ===================================================== */}

      <section>

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
          <div>

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

          <div>

            {requests.map((request) => (
              <article
                key={request.id}
              >

                <p>
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
          role="dialog"
          aria-modal="true"
          aria-labelledby="faculty-request-title"
        >

          <section>

            {/* =================================================
                HEADER
            ================================================= */}

            <p>
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

            {/* =================================================
                EVENT DETAILS
            ================================================= */}

            <div>

              <p>
                <strong>
                  Category
                </strong>
              </p>

              <p>
                {selectedRequest.category ||
                  "Not specified"}
              </p>

            </div>

            <div>

              <p>
                <strong>
                  Description
                </strong>
              </p>

              <p>
                {selectedRequest.description ||
                  "No description provided."}
              </p>

            </div>

            <div>

              <p>
                <strong>
                  Date
                </strong>
              </p>

              <p>
                {formatDate(
                  selectedRequest.event_date
                )}
              </p>

            </div>

            <div>

              <p>
                <strong>
                  Time
                </strong>
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
                <strong>
                  Expected Participants
                </strong>
              </p>

              <p>
                {selectedRequest.expected_participants ??
                  "Not specified"}
              </p>

            </div>

            <div>

              <p>
                <strong>
                  Requested Venue
                </strong>
              </p>

              <p>
                {selectedRequest.requested_venue ||
                  "Not specified"}
              </p>

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
              <div>

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

                <section>

                  <p>
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
              <div>

                <hr />

                <h3>
                  Reject Event
                </h3>

                <p>
                  A rejection reason is required.
                </p>

                <label htmlFor="rejection-reason">
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

            {!actionLoading && (
              <button
                type="button"
                onClick={closeRequest}
              >
                Close
              </button>
            )}

          </section>

        </div>
      )}

    </main>
  )
}

export default FacultyDashboard