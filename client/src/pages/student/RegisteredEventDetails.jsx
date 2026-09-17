import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { supabase } from "../../lib/supabase"
import "./Student.css"

function RegisteredEventDetails() {
  const { id } = useParams()

  const [loading, setLoading] = useState(true)
  const [event, setEvent] = useState(null)
  const [registration, setRegistration] = useState(null)
  const [error, setError] = useState("")

  useEffect(() => {
    let mounted = true

    const loadRegisteredEvent = async () => {
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
          throw new Error("You are not logged in.")
        }

        // IMPORTANT:
        // Fetch only this student's own registration.
        // The route id is the registration id, NOT the event id.
        const {
          data,
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
          .eq("id", id)
          .eq("profile_id", user.id)
          .maybeSingle()

        if (registrationError) {
          throw registrationError
        }

        if (!data) {
          throw new Error(
            "Registered event not found or you are not registered for this event."
          )
        }

        if (!mounted) {
          return
        }

        setRegistration(data)
        setEvent(data.events || null)
      } catch (err) {
        console.error(
          "Registered event details error:",
          err
        )

        if (!mounted) {
          return
        }

        setError(
          err?.message ||
            "Unable to load the registered event."
        )
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadRegisteredEvent()

    return () => {
      mounted = false
    }
  }, [id])

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

  const getVenue = () => {
    return (
      event?.assigned_venue ||
      event?.requested_venue ||
      "Venue to be announced"
    )
  }

  if (loading) {
    return (
      <main className="registered-event-details-page">
        <section className="registered-event-details-card">
          <p className="dashboard-section-kicker">
            REGISTERED EVENT
          </p>

          <h1>
            Loading event details...
          </h1>

          <div className="loading-spinner" />
        </section>
      </main>
    )
  }

  if (error || !event) {
    return (
      <main className="registered-event-details-page">
        <section className="registered-event-details-card">
          <p className="dashboard-section-kicker">
            REGISTERED EVENT
          </p>

          <h1>
            Unable to load event
          </h1>

          <p>
            {error || "This registered event could not be found."}
          </p>

          <div className="registered-event-details-actions">
            <Link
              to="/dashboard"
              className="primary-button"
            >
              Back to Dashboard
            </Link>

            <Link
              to="/events"
              className="secondary-button"
            >
              Browse Events
            </Link>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="registered-event-details-page">

      <section className="registered-event-details-card">

        <div className="registered-event-details-top">

          <div>
            <span className="registered-event-details-badge">
              REGISTERED
            </span>

            <p className="dashboard-section-kicker">
              CAMPUS EVENT
            </p>

            <h1>
              {event.title || "Event"}
            </h1>

            <p className="registered-event-details-category">
              {event.category || "Campus Event"}
            </p>
          </div>

        </div>


        <div className="registered-event-details-grid">

          <div className="registered-event-detail">
            <span>Date</span>
            <strong>
              {formatDate(event.event_date)}
            </strong>
          </div>

          <div className="registered-event-detail">
            <span>Time</span>
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

          <div className="registered-event-detail">
            <span>Venue</span>
            <strong>
              {getVenue()}
            </strong>
          </div>

          <div className="registered-event-detail">
            <span>Registration</span>
            <strong>
              {registration?.registered_at
                ? new Date(
                    registration.registered_at
                  ).toLocaleString("en-IN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })
                : "Recorded"}
            </strong>
          </div>

        </div>


        <div className="registered-event-description">

          <span>Description</span>

          <p>
            {event.description ||
              "You are registered for this event."}
          </p>

        </div>


        <div className="registered-event-status">

          <span>Registration Status</span>

          <strong>
            Registered
          </strong>

        </div>


        <div className="registered-event-details-actions">

          <Link
            to="/dashboard"
            className="primary-button"
          >
            Back to Dashboard
          </Link>

          <Link
            to="/events"
            className="secondary-button"
          >
            Browse More Events
          </Link>

        </div>

      </section>

    </main>
  )
}

export default RegisteredEventDetails
