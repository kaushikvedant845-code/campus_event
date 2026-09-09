import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { supabase } from "../lib/supabase"

const getTitle = (event) =>
  event?.title || event?.name || event?.event_name || "Campus Event"

const getCategory = (event) =>
  event?.category || event?.event_category || event?.type || "Campus Event"

const getLocation = (event) =>
  event?.location || event?.venue || event?.venue_name || "Campus Venue"

const getDate = (event) =>
  event?.event_date ||
  event?.date ||
  event?.start_date ||
  event?.event_datetime ||
  event?.starts_at ||
  event?.start_time ||
  null

const formatDate = (event) => {
  const value = getDate(event)
  if (!value) return "Date to be announced"

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return String(value)

  return parsed.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

const getDescription = (event) =>
  event?.description ||
  event?.short_description ||
  event?.theme ||
  "Discover this upcoming campus event and view all its details."

const sortUpcoming = (list) =>
  [...list].sort((a, b) => {
    const aDate = getDate(a)
    const bDate = getDate(b)

    if (!aDate) return 1
    if (!bDate) return -1

    const aTime = new Date(aDate).getTime()
    const bTime = new Date(bDate).getTime()

    if (Number.isNaN(aTime) || Number.isNaN(bTime)) return 0
    return aTime - bTime
  })

function Home() {
  const [events, setEvents] = useState([])
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [entered, setEntered] = useState(false)

  useEffect(() => {
    let mounted = true

    const loadHome = async () => {
      setLoading(true)
      setError("")

      const [{ data: sessionData }, { data, error: eventsError }] =
        await Promise.all([
          supabase.auth.getSession(),
          supabase.from("events").select("*"),
        ])

      if (!mounted) return

      setSession(sessionData.session)

      if (eventsError) {
        console.error("Home events error:", eventsError)
        setError("Failed to load events. Please try again later.")
      } else {
        setEvents(sortUpcoming(data || []))
      }

      setLoading(false)
    }

    loadHome()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (mounted) setSession(currentSession)
    })

    const timer = setTimeout(() => {
      if (mounted) setEntered(true)
    }, 60)

    return () => {
      mounted = false
      subscription.unsubscribe()
      clearTimeout(timer)
    }
  }, [])

  const featuredEvents = useMemo(() => events.slice(0, 5), [events])
  const heroEvent = featuredEvents[0]
  const isSignedIn = Boolean(session)

  return (
    <main className="home-page">
      {/* HERO */}
      <section className="home-hero">
        <div className="home-hero-inner">
          <div
            className={`home-hero-copy ${
              entered ? "home-hero-copy-visible" : ""
            }`}
          >
            <p className="home-eyebrow home-float-text home-delay-1">
              YOUR CAMPUS, YOUR EVENTS
            </p>

            <h1 className="home-hero-title home-float-text home-delay-2">
              Discover
              <span>Campus Events.</span>
            </h1>

            <p className="home-hero-description home-float-text home-delay-3">
              Find workshops, cultural fests, sports meets, competitions,
              and everything happening around your campus — all in one place.
            </p>

            <div className="home-hero-actions home-float-text home-delay-4">
              <Link to="/events" className="home-primary-button">
                Browse Events
              </Link>

              {isSignedIn ? (
                <Link to="/dashboard" className="home-secondary-button">
                  Open Dashboard
                </Link>
              ) : (
                <Link to="/login" className="home-secondary-button">
                  Get Started
                </Link>
              )}
            </div>

            <p className="home-hero-note home-float-text home-delay-5">
              {isSignedIn
                ? "You are signed in. Continue exploring your campus."
                : "Browse publicly. Sign in when you are ready to register."}
            </p>
          </div>

          <div
            className={`home-hero-visual ${
              entered ? "home-hero-visual-visible" : ""
            }`}
          >
            <div className="home-visual-glow" />

            {loading ? (
              <div className="home-hero-loading">
                <span />
                <p>Finding upcoming events...</p>
              </div>
            ) : heroEvent ? (
              <div className="home-event-stack">
                {featuredEvents[1] && (
                  <Link
                    to={`/events/${featuredEvents[1].id}`}
                    className="home-floating-card home-floating-card-back"
                  >
                    <p className="home-floating-card-label">UP NEXT</p>
                    <h3>{getTitle(featuredEvents[1])}</h3>
                    <div className="home-floating-meta">
                      <span>{formatDate(featuredEvents[1])}</span>
                      <span>{getLocation(featuredEvents[1])}</span>
                    </div>
                  </Link>
                )}

                <Link
                  to={`/events/${heroEvent.id}`}
                  className="home-floating-card home-floating-card-main"
                >
                  <p className="home-floating-card-label">
                    FEATURED EVENT
                  </p>
                  <h3>{getTitle(heroEvent)}</h3>

                  <div className="home-floating-meta">
                    <span>{formatDate(heroEvent)}</span>
                    <span>{getLocation(heroEvent)}</span>
                  </div>

                  <span className="home-floating-status">
                    View event details →
                  </span>
                </Link>
              </div>
            ) : (
              <div className="home-hero-empty">
                <span className="home-empty-calendar">◎</span>
                <p>No upcoming events yet.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* TRENDING / FEATURED — intentionally inspired by streaming-service
          discovery layouts, but using only real campus events from Supabase. */}
      <section className="home-featured-section">
        <div className="home-featured-inner">
          <div className="home-featured-heading">
            <div>
              <p className="home-section-kicker">DON'T MISS THESE</p>
              <h2>Trending on Campus</h2>
              <p>
                A quick look at the events most likely to catch your attention.
              </p>
            </div>

            <Link to="/events" className="home-view-all">
              View All Events →
            </Link>
          </div>

          {loading ? (
            <div className="home-events-state">
              <div className="home-events-spinner" />
              <p>Loading upcoming events...</p>
            </div>
          ) : error ? (
            <div className="home-events-state home-events-error">
              <p>{error}</p>
            </div>
          ) : featuredEvents.length === 0 ? (
            <div className="home-events-state">
              <p>No upcoming events are available right now.</p>
            </div>
          ) : (
            <div className="home-trending-row">
              {featuredEvents.map((event, index) => (
                <Link
                  key={event.id}
                  to={`/events/${event.id}`}
                  className="home-trending-card"
                >
                  <div className="home-trending-rank">
                    {String(index + 1).padStart(2, "0")}
                  </div>

                  <div className="home-trending-content">
                    <span className="home-featured-category">
                      {getCategory(event)}
                    </span>

                    <h3>{getTitle(event)}</h3>

                    <p>{getDescription(event)}</p>

                    <div className="home-featured-meta">
                      <span>{formatDate(event)}</span>
                      <span>{getLocation(event)}</span>
                    </div>

                    <span className="home-featured-link">
                      View Event Details →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="home-how">
        <div className="home-how-inner">
          <div className="home-centered-heading">
            <p className="home-section-kicker">SIMPLE & FAST</p>
            <h2>How It Works</h2>
            <p>
              Three simple steps to discover events, register, and get your
              participation verified.
            </p>
          </div>

          <div className="home-steps">
            <article className="home-step">
              <div className="home-step-number">01</div>
              <div className="home-step-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="12" cy="8" r="3.5" />
                  <path d="M5 20c.6-3.5 2.8-5.5 7-5.5s6.4 2 7 5.5" />
                </svg>
              </div>
              <h3>Sign in with Google</h3>
              <p>
                Create your campus account quickly using Google. No separate
                password to remember.
              </p>
            </article>

            <article className="home-step">
              <div className="home-step-number">02</div>
              <div className="home-step-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="4" y="5.5" width="16" height="15" rx="2" />
                  <path d="M8 3.5v4M16 3.5v4M4 10h16" />
                </svg>
              </div>
              <h3>Browse & Register</h3>
              <p>
                Explore upcoming campus events and register for the ones you
                want to attend.
              </p>
            </article>

            <article className="home-step">
              <div className="home-step-number">03</div>
              <div className="home-step-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
                  <path d="M5 12.5l4 4L19 6.5" />
                </svg>
              </div>
              <h3>Attend & Get Verified</h3>
              <p>
                Check in using the event attendance session and keep a verified
                record of your participation.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="home-cta">
        <div className="home-cta-inner">
          <h2>{isSignedIn ? "Keep exploring." : "Ready to join?"}</h2>

          <p>
            {isSignedIn
              ? "Your campus events, registrations, and participation — organized in one place."
              : "Start discovering what your campus has to offer and keep your event participation organized in one place."}
          </p>

          {isSignedIn ? (
            <Link to="/dashboard" className="home-cta-button">
              Open Dashboard
            </Link>
          ) : (
            <Link to="/signup" className="home-cta-button">
              Create Account
            </Link>
          )}
        </div>
      </section>
    </main>
  )
}

export default Home
