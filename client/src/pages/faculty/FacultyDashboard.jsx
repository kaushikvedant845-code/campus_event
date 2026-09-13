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
  // LOAD PENDING EVENT REQUESTS
  // =========================================================

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true)
      setError("")

      const {
        data,
        error: rpcError,
      } = await supabase.rpc(
        "faculty_event_requests"
      )

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
  // OPEN REQUEST
  // =========================================================

  const openRequest = (request) => {
    setSelectedRequest(request)

    // Default to requested venue.
    setVenueOption("same")
    setNewVenue("")

    // Start with an empty acknowledgement.
    setAcknowledgement("")

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
  // DETERMINE FINAL VENUE
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
  // APPROVE EVENT
  // =========================================================

  const handleApprove = async () => {
    if (!selectedRequest) return

    setError("")
    setSuccess("")

    const finalVenue = getFinalVenue()

    // -------------------------------------------------------
    // VENUE VALIDATION
    // -------------------------------------------------------

    if (!finalVenue) {
      setError(
        "Please assign a final venue before approving the event."
      )
      return
    }

    // -------------------------------------------------------
    // ACKNOWLEDGEMENT VALIDATION
    // -------------------------------------------------------

    const finalAcknowledgement =
      acknowledgement.trim()

    if (!finalAcknowledgement) {
      setError(
        "Please provide an acknowledgement before approving the event."
      )
      return
    }

    if (finalAcknowledgement.length > 1000) {
      setError(
        "Acknowledgement must be 1000 characters or less."
      )
      return
    }

    try {
      setActionLoading(true)

      // -----------------------------------------------------
      // SECURE FACULTY APPROVAL RPC
      // -----------------------------------------------------

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
        "Faculty approved event:",
        data
      )

      // -----------------------------------------------------
      // SUCCESS
      // -----------------------------------------------------

      setSuccess(
        "Event request approved successfully."
      )

      setSelectedRequest(null)

      setVenueOption("same")
      setNewVenue("")
      setAcknowledgement("")

      setRejectionReason("")
      setActionType(null)

      // Refresh pending requests.
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
    if (!selectedRequest) return

    const reason =
      rejectionReason.trim()

    if (!reason) {
      setError(
        "Please provide a rejection reason."
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
        "Faculty rejected event:",
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
  // FORMAT DATE
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
        day: "numeric",
        month: "short",
        year: "numeric",
      }
    )
  }

  // =========================================================
  // FORMAT TIME
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
  // LOADING SCREEN
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

      {/* ===================================================
          HEADER
      =================================================== */}

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

      {/* ===================================================
          SUCCESS MESSAGE
      =================================================== */}

      {success && (
        <section>
          <p>
            {success}
          </p>
        </section>
      )}

      {/* ===================================================
          ERROR MESSAGE
      =================================================== */}

      {error && !selectedRequest && (
        <section>
          <p>
            {error}
          </p>
        </section>
      )}

      {/* ===================================================
          EVENT MANAGEMENT
      =================================================== */}

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
            NO REQUESTS
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

      {/* ===================================================
          REQUEST REVIEW
      =================================================== */}

      {selectedRequest && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="faculty-request-title"
        >

          <section>

            {/* =================================================
                REQUEST HEADER
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
                FACULTY DECISION
            ================================================= */}

            <h3>
              Faculty Decision
            </h3>

            <button
              type="button"
              onClick={() => {
                setActionType("approve")
                setError("")
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
                APPROVAL FLOW
            ================================================= */}

            {actionType === "approve" && (
              <div>

                <hr />

                <h3>
                  Assign Venue
                </h3>

                <p>
                  Select the final venue for
                  the approved event.
                </p>

                {/* =================================================
                    SAME AS REQUESTED
                ================================================= */}

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

                {/* =================================================
                    NEW VENUE
                ================================================= */}

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
                        placeholder="Enter new venue"
                        maxLength={200}
                        disabled={actionLoading}
                      />

                    </div>
                  )}

                </div>

                {/* =================================================
                    FINAL VENUE PREVIEW
                ================================================= */}

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

                {/* =================================================
                    ACKNOWLEDGEMENT
                ================================================= */}

                <div>

                  <h3>
                    Acknowledgement
                  </h3>

                  <p>
                    This message will be stored
                    with the approval and shown
                    to the Club Head.
                  </p>

                  <label
                    htmlFor="faculty-acknowledgement"
                  >
                    Acknowledgement Message
                  </label>

                  <textarea
                    id="faculty-acknowledgement"
                    value={acknowledgement}
                    onChange={(event) => {
                      setAcknowledgement(
                        event.target.value
                      )
                      setError("")
                    }}
                    placeholder="Example: Your event request has been approved. The final venue has been assigned as requested."
                    rows={5}
                    maxLength={1000}
                    disabled={actionLoading}
                  />

                  <p>
                    {acknowledgement.length}/1000
                  </p>

                </div>

                {/* =================================================
                    APPROVAL ERROR
                ================================================= */}

                {error && (
                  <p>
                    {error}
                  </p>
                )}

                {/* =================================================
                    CONFIRM APPROVAL
                ================================================= */}

                <div>

                  <button
                    type="button"
                    onClick={handleApprove}
                    disabled={
                      actionLoading ||
                      !getFinalVenue() ||
                      !acknowledgement.trim()
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
                REJECTION FLOW
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