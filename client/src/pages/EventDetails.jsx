import { useEffect, useState } from "react"
import {
  Link,
  useParams,
} from "react-router-dom"

import { supabase } from "../lib/supabase"

function EventDetails() {
  const { id } = useParams()

  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const loadEvent = async () => {
      try {
        setLoading(true)
        setError("")

        const { data, error } = await supabase
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
            member_early_access,
            visibility,
            registration_access
          `)
          .eq("id", id)
          .maybeSingle()

        if (error) {
          throw error
        }

        if (!data) {
          setError("Event not found.")
          return
        }

        setEvent(data)
      } catch (err) {
        console.error("Event details error:", err)
        setError("Unable to load this event.")
      } finally {
        setLoading(false)
      }
    }

    loadEvent()
  }, [id])

  const formatDate = (date) => {
    if (!date) return "Date to be announced"

    return new Date(`${date}T00:00:00`).toLocaleDateString(
      "en-IN",
      {
        day: "numeric",
        month: "long",
        year: "numeric",
      }
    )
  }

  const formatTime = (time) => {
    if (!time) return null

    return new Date(
      `1970-01-01T${time}`
    ).toLocaleTimeString(
      "en-IN",
      {
        hour: "numeric",
        minute: "2-digit",
      }
    )
  }

  const venue =
    event?.assigned_venue ||
    event?.requested_venue ||
    "Venue to be announced"

  if (loading) {
    return (
      <main className="event-details-page">
        <div className="event-details-state">
          <div className="events-spinner" />
          <p>Loading event...</p>
        </div>
      </main>
    )
  }

  if (error || !event) {
    return (
      <main className="event-details-page">
        <div className="event-details-state">

          <h1>Event Not Found</h1>

          <p>
            {error ||
              "The event you are looking for does not exist."}
          </p>

          <Link to="/events">
            Back to Events
          </Link>

        </div>
      </main>
    )
  }

  const canRegister =
    event.approval_status === "APPROVED" &&
    (
      event.head_decision === "PUBLISHED" ||
      event.member_early_access === true
    )

  return (
    <main className="event-details-page">

      <section className="event-details-card">

        <p className="event-details-category">
          {event.category}
        </p>

        <h1>
          {event.title}
        </h1>

        {event.description && (
          <p className="event-details-description">
            {event.description}
          </p>
        )}

        <div className="event-details-info">

          <div>
            <span>Date</span>
            <strong>
              {formatDate(event.event_date)}
            </strong>
          </div>

          {(event.start_time ||
            event.end_time) && (
            <div>
              <span>Time</span>

              <strong>
                {formatTime(event.start_time)}

                {event.end_time &&
                  ` – ${formatTime(event.end_time)}`}
              </strong>
            </div>
          )}

          <div>
            <span>Venue</span>
            <strong>
              {venue}
            </strong>
          </div>

          {event.expected_participants && (
            <div>
              <span>Expected Participants</span>

              <strong>
                {event.expected_participants}
              </strong>
            </div>
          )}

        </div>

        <div className="event-details-actions">

          {canRegister ? (

            <Link
              to={`/events/${event.id}/register`}
              className="event-register-button"
            >
              Register for Event
            </Link>

          ) : (

            <div className="event-registration-closed">
              Registration is currently closed.
            </div>

          )}

          <Link
            to="/events"
            className="event-back-link"
          >
            ← Back to Events
          </Link>

        </div>

      </section>

    </main>
  )
}

export default EventDetails