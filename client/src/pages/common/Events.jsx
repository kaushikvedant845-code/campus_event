import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { supabase } from "../../lib/supabase"

function Events() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const loadEvents = async () => {
      setLoading(true)
      setError("")

      try {
        const { data, error: eventsError } = await supabase
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
            status,
            approval_status,
            is_public,
            visibility,
            publication_mode,
            member_early_access,
            clubs (
              id,
              name
            )
          `)
          .eq("approval_status", "APPROVED")
          .eq("is_public", true)
          .eq("visibility", "public")
          .order("event_date", {
            ascending: true,
          })
          .order("start_time", {
            ascending: true,
          })

        if (eventsError) {
          throw eventsError
        }

        setEvents(data || [])
      } catch (err) {
        console.error("Events loading error:", err)

        setError(
          err?.message ||
            "Unable to load events."
        )
      } finally {
        setLoading(false)
      }
    }

    loadEvents()
  }, [])

  const formatDate = (date) => {
    if (!date) return "Date unavailable"

    return new Date(`${date}T00:00:00`).toLocaleDateString(
      "en-IN",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      }
    )
  }

  const formatTime = (time) => {
    if (!time) return ""

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
        hour12: true,
      }
    )
  }

  const getVenue = (event) => {
    return (
      event.assigned_venue ||
      event.requested_venue ||
      "Venue to be announced"
    )
  }

  if (loading) {
    return (
      <main className="events-page">
        <section className="events-hero">
          <div>
            <p className="events-page-kicker">
              CAMPUS EVENTS
            </p>

            <h1>
              Discover what's happening.
            </h1>

            <p className="events-page-subtitle">
              Explore upcoming events, activities and
              opportunities across campus.
            </p>
          </div>
        </section>

        <section className="events-listing-section">
          <div className="events-loading-state">
            <p>Loading events...</p>
          </div>
        </section>
      </main>
    )
  }

  if (error) {
    return (
      <main className="events-page">
        <section className="events-hero">
          <div>
            <p className="events-page-kicker">
              CAMPUS EVENTS
            </p>

            <h1>
              Discover what's happening.
            </h1>

            <p className="events-page-subtitle">
              Explore upcoming events, activities and
              opportunities across campus.
            </p>
          </div>
        </section>

        <section className="events-listing-section">
          <div className="events-empty-state">
            <h2>
              Unable to load events
            </h2>

            <p>
              {error}
            </p>

            <button
              type="button"
              className="primary-button"
              onClick={() => window.location.reload()}
            >
              Try Again
            </button>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="events-page">

      {/* HERO */}
      <section className="events-hero">

        <div>
          <p className="events-page-kicker">
            CAMPUS EVENTS
          </p>

          <h1>
            Discover what's happening.
          </h1>

          <p className="events-page-subtitle">
            Explore upcoming events, activities and
            opportunities across campus.
          </p>
        </div>

      </section>


      {/* EVENTS */}
      <section className="events-listing-section">

        <div className="events-listing-header">

          <div>
            <p className="events-section-kicker">
              UPCOMING
            </p>

            <h2>
              Events
            </h2>
          </div>

          <span className="events-count">
            {events.length}{" "}
            {events.length === 1
              ? "event"
              : "events"}
          </span>

        </div>


        {events.length === 0 ? (

          <div className="events-empty-state">

            <h2>
              No upcoming events
            </h2>

            <p>
              There are no published campus events
              available right now. Check back soon.
            </p>

          </div>

        ) : (

          <div className="events-list">

            {events.map((event) => (

              <article
                className="event-card"
                key={event.id}
              >

                <p className="event-category">
                  {event.category}
                </p>

                <h3>
                  {event.title}
                </h3>

                <p className="event-description">
                  {event.description ||
                    "Join us for this campus event."}
                </p>

                <div className="event-date">
                  {formatDate(event.event_date)}

                  {event.start_time && (
                    <>
                      {" · "}
                      {formatTime(event.start_time)}

                      {event.end_time && (
                        <>
                          {" – "}
                          {formatTime(event.end_time)}
                        </>
                      )}
                    </>
                  )}
                </div>

                <div className="event-location">
                  {getVenue(event)}
                </div>

                {event.clubs?.name && (
                  <div className="event-club">
                    {event.clubs.name}
                  </div>
                )}

                <Link
                  to={`/events/${event.id}`}
                  className="details-button"
                >
                  View Details
                </Link>

              </article>

            ))}

          </div>

        )}

      </section>


      <div className="events-bottom-note">
        <span>●</span>
        <b>
          New events will appear here once published.
        </b>
      </div>

    </main>
  )
}

export default Events