import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { supabase } from "../../lib/supabase"

function EventDetails() {
  const { id } = useParams()

  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let mounted = true

    const loadEvent = async () => {
      setLoading(true)
      setError("")

      try {
        const { data, error: eventError } = await supabase
          .from("events")
          .select(`
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
            approval_status,
            head_decision,
            publication_mode,
            visibility,
            registration_access,
            member_early_access,
            published_at,
            clubs (
              id,
              name,
              club_code
            )
          `)
          .eq("id", id)
          .maybeSingle()

        if (eventError) {
          throw eventError
        }

        if (!data) {
          throw new Error("Event not found.")
        }

        if (mounted) {
          setEvent(data)
        }
      } catch (err) {
        console.error("Event Details Error:", err)

        if (mounted) {
          setError(
            err?.message || "Unable to load event details."
          )
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadEvent()

    return () => {
      mounted = false
    }
  }, [id])

  // =========================================================
  // DATE
  // =========================================================

  const formatDate = (date) => {
    if (!date) {
      return "Date to be announced"
    }

    return new Date(`${date}T00:00:00`).toLocaleDateString(
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
  // TIME
  // =========================================================

  const formatTime = (time) => {
    if (!time) {
      return ""
    }

    const [hours, minutes] = time.split(":")

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

  const getVenue = () => {
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
      <main className="event-page-shell">
        <div className="event-state-card">
          <div className="event-state-icon">
            ...
          </div>

          <h1>
            Loading event
          </h1>

          <p>
            Please wait while we load the event details.
          </p>
        </div>
      </main>
    )
  }

  // =========================================================
  // ERROR
  // =========================================================

  if (error || !event) {
    return (
      <main className="event-page-shell">
        <div className="event-state-card">
          <div className="event-state-icon">
            !
          </div>

          <h1>
            Event unavailable
          </h1>

          <p>
            {error || "This event could not be found."}
          </p>

          <Link
            to="/events"
            className="ui-primary-button"
          >
            Back to Events
          </Link>
        </div>
      </main>
    )
  }

  // =========================================================
  // REGISTRATION ACCESS
  // =========================================================

  const registrationOpen =
    event.approval_status === "APPROVED" &&
    event.head_decision === "PUBLISHED" &&
    event.publication_mode === "DETAILS_AND_REGISTRATION"

  // =========================================================
  // MAIN
  // =========================================================

  return (
    <main className="event-page-shell">

      <Link
        to="/events"
        className="back-link"
      >
        ← Back to Events
      </Link>

      <section className="event-detail-card">

        <div className="event-detail-content">

          {/* =================================================
              EVENT CATEGORY
          ================================================= */}

          <span className="event-detail-category">
            {event.category || "Campus Event"}
          </span>

          {/* =================================================
              EVENT TITLE
          ================================================= */}

          <h1>
            {event.title}
          </h1>

          {/* =================================================
              DESCRIPTION
          ================================================= */}

          <p className="event-detail-description">
            {event.description ||
              "Join us for this campus event."}
          </p>

          {/* =================================================
              EVENT INFORMATION
          ================================================= */}

          <div className="event-detail-meta">

            <div className="event-meta-item">
              <span className="event-meta-label">
                DATE
              </span>

              <strong>
                {formatDate(event.event_date)}
              </strong>
            </div>

            <div className="event-meta-item">
              <span className="event-meta-label">
                TIME
              </span>

              <strong>
                {event.start_time
                  ? `${formatTime(event.start_time)}${
                      event.end_time
                        ? ` – ${formatTime(event.end_time)}`
                        : ""
                    }`
                  : "Time to be announced"}
              </strong>
            </div>

            <div className="event-meta-item">
              <span className="event-meta-label">
                VENUE
              </span>

              <strong>
                {getVenue()}
              </strong>
            </div>

            <div className="event-meta-item">
              <span className="event-meta-label">
                EXPECTED PARTICIPANTS
              </span>

              <strong>
                {event.expected_participants ??
                  "Not specified"}
              </strong>
            </div>

            <div className="event-meta-item">
              <span className="event-meta-label">
                ORGANIZED BY
              </span>

              <strong>
                {event.clubs?.name ||
                  "Campus Event"}
              </strong>
            </div>

            <div className="event-meta-item">
              <span className="event-meta-label">
                ACCESS
              </span>

              <strong>
                {event.registration_access ===
                "members_only"
                  ? "Club Members Only"
                  : "Public"}
              </strong>
            </div>

          </div>

          {/* =================================================
              ACTIONS
          ================================================= */}

          <div className="event-detail-actions">

            {registrationOpen ? (
              <Link
                to={`/events/${event.id}/register`}
                className="ui-primary-button"
              >
                Register for Event
              </Link>
            ) : (
              <span className="ui-secondary-button">
                Registration Closed
              </span>
            )}

            <Link
              to="/events"
              className="ui-secondary-button"
            >
              All Events
            </Link>

          </div>

        </div>

      </section>

    </main>
  )
}

export default EventDetails