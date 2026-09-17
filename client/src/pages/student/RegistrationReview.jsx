import {
  Link,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom"

import { useEffect, useState } from "react"

import { supabase } from "../../lib/supabase"

function RegistrationReview() {
  const { id } = useParams()

  const location = useLocation()

  const navigate = useNavigate()

  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const formData =
    location.state?.formData

  useEffect(() => {
    const loadEvent = async () => {
      setLoading(true)
      setError("")

      try {
        /*
         * -------------------------------------------------------
         * 1. Authentication
         * -------------------------------------------------------
         */

        const {
          data: {
            session,
          },
        } = await supabase.auth.getSession()

        if (!session) {
          navigate("/login", {
            state: {
              from: `/events/${id}/review`,
            },
            replace: true,
          })

          return
        }

        /*
         * -------------------------------------------------------
         * 2. Load real event using UUID
         * -------------------------------------------------------
         */

        const {
          data: eventData,
          error: eventError,
        } = await supabase
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
            approval_status,
            head_decision,
            publication_mode,
            visibility,
            registration_access,
            club_id,
            clubs (
              id,
              name
            )
          `)
          .eq("id", id)
          .maybeSingle()

        if (eventError) {
          throw eventError
        }

        if (!eventData) {
          setError(
            "The event you are trying to register for does not exist."
          )

          setLoading(false)
          return
        }

        /*
         * -------------------------------------------------------
         * 3. Event must still be published + registration open
         * -------------------------------------------------------
         */

        const isPublished =
          eventData.approval_status ===
            "APPROVED" &&
          eventData.head_decision ===
            "PUBLISHED"

        const registrationOpen =
          eventData.publication_mode ===
          "DETAILS_AND_REGISTRATION"

        if (!isPublished) {
          setError(
            "This event is no longer published."
          )

          setLoading(false)
          return
        }

        if (!registrationOpen) {
          setError(
            "Registration is currently closed for this event."
          )

          setLoading(false)
          return
        }

        /*
         * -------------------------------------------------------
         * 4. Members Only check
         * -------------------------------------------------------
         */

        if (
          eventData.visibility ===
            "private" &&
          eventData.club_id
        ) {
          const {
            data: membership,
            error: membershipError,
          } = await supabase
            .from("club_memberships")
            .select("id")
            .eq(
              "club_id",
              eventData.club_id
            )
            .eq(
              "profile_id",
              session.user.id
            )
            .eq(
              "membership_role",
              "member"
            )
            .eq(
              "membership_status",
              "active"
            )
            .maybeSingle()

          if (membershipError) {
            throw membershipError
          }

          if (!membership) {
            setError(
              "This event is restricted to active members of the organising club."
            )

            setLoading(false)
            return
          }
        }

        /*
         * -------------------------------------------------------
         * 5. Duplicate registration check
         * -------------------------------------------------------
         */

        const {
          data: existingRegistration,
          error: registrationCheckError,
        } = await supabase
          .from("registrations")
          .select("id")
          .eq(
            "profile_id",
            session.user.id
          )
          .eq(
            "event_id",
            eventData.id
          )
          .maybeSingle()

        if (registrationCheckError) {
          throw registrationCheckError
        }

        if (existingRegistration) {
          setError(
            "You are already registered for this event."
          )

          setLoading(false)
          return
        }

        setEvent(eventData)
      } catch (err) {
        console.error(
          "REGISTRATION REVIEW LOAD ERROR:",
          err
        )

        setError(
          err?.message ||
            "Unable to load the registration review."
        )
      } finally {
        setLoading(false)
      }
    }

    loadEvent()
  }, [
    id,
    navigate,
  ])

  async function handleConfirm() {
    /*
     * -------------------------------------------------------
     * 1. Make sure session still exists
     * -------------------------------------------------------
     */

    const {
      data: {
        session,
      },
    } = await supabase.auth.getSession()

    if (!session) {
      navigate("/login", {
        state: {
          from: `/events/${id}/review`,
        },
      })

      return
    }

    /*
     * -------------------------------------------------------
     * 2. Validate form data
     * -------------------------------------------------------
     */

    if (
      !formData?.fullName?.trim() ||
      !formData?.email?.trim() ||
      !formData?.admissionNo?.trim() ||
      !formData?.programName?.trim() ||
      !formData?.department?.trim() ||
      !formData?.year?.trim() ||
      !formData?.phone?.trim()
    ) {
      alert(
        "Please complete all registration details."
      )

      return
    }

    if (!event) {
      alert(
        "Event information could not be loaded."
      )

      return
    }

    try {
      /*
       * -------------------------------------------------------
       * 3. Re-check event state immediately before insert
       * -------------------------------------------------------
       */

      const {
        data: currentEvent,
        error: currentEventError,
      } = await supabase
        .from("events")
        .select(`
          id,
          approval_status,
          head_decision,
          publication_mode,
          visibility,
          club_id
        `)
        .eq("id", event.id)
        .maybeSingle()

      if (currentEventError) {
        throw currentEventError
      }

      if (!currentEvent) {
        alert(
          "This event no longer exists."
        )

        return
      }

      if (
        currentEvent.approval_status !==
          "APPROVED" ||
        currentEvent.head_decision !==
          "PUBLISHED"
      ) {
        alert(
          "This event is no longer available for registration."
        )

        return
      }

      if (
        currentEvent.publication_mode !==
        "DETAILS_AND_REGISTRATION"
      ) {
        alert(
          "Registration for this event is currently closed."
        )

        return
      }

      /*
       * -------------------------------------------------------
       * 4. Re-check Members Only access
       * -------------------------------------------------------
       */

      if (
        currentEvent.visibility ===
          "private" &&
        currentEvent.club_id
      ) {
        const {
          data: membership,
          error: membershipError,
        } = await supabase
          .from("club_memberships")
          .select("id")
          .eq(
            "club_id",
            currentEvent.club_id
          )
          .eq(
            "profile_id",
            session.user.id
          )
          .eq(
            "membership_role",
            "member"
          )
          .eq(
            "membership_status",
            "active"
          )
          .maybeSingle()

        if (membershipError) {
          throw membershipError
        }

        if (!membership) {
          alert(
            "Only active members of the organising club can register for this event."
          )

          return
        }
      }

      /*
       * -------------------------------------------------------
       * 5. Final duplicate check
       * -------------------------------------------------------
       */

      const {
        data: existingRegistration,
        error: duplicateCheckError,
      } = await supabase
        .from("registrations")
        .select("id")
        .eq(
          "profile_id",
          session.user.id
        )
        .eq(
          "event_id",
          event.id
        )
        .maybeSingle()

      if (duplicateCheckError) {
        throw duplicateCheckError
      }

      if (existingRegistration) {
        alert(
          "You are already registered for this event."
        )

        return
      }

      /*
       * -------------------------------------------------------
       * 6. Insert using the REAL registrations schema
       *
       * registrations:
       * profile_id
       * event_id
       * registered_at
       * -------------------------------------------------------
       */

      const {
        error: registrationError,
      } = await supabase
        .from("registrations")
        .insert({
          profile_id:
            session.user.id,

          event_id:
            event.id,

          registered_at:
            new Date().toISOString(),
        })

      if (registrationError) {
        console.error(
          "REGISTRATION ERROR:",
          registrationError
        )

        if (
          registrationError.code ===
          "23505"
        ) {
          alert(
            "You are already registered for this event."
          )

          return
        }

        alert(
          `Registration failed.\n\nMessage: ${
            registrationError.message
          }\nCode: ${
            registrationError.code ||
            "N/A"
          }`
        )

        return
      }

      navigate(
        "/registration-success",
        {
          replace: true,
        }
      )
    } catch (error) {
      console.error(
        "UNEXPECTED REGISTRATION ERROR:",
        error
      )

      alert(
        `Something went wrong.\n\n${
          error?.message ||
          "Please try again."
        }`
      )
    }
  }

  function handleEdit() {
    navigate(
      `/events/${id}/register`,
      {
        state: {
          formData,
        },
      }
    )
  }

  if (loading) {
    return (
      <main className="form-page-shell">

        <section className="form-state-card">

          <div className="page-spinner" />

          <p className="page-kicker">
            REVIEW
          </p>

          <h1>
            Preparing Review
          </h1>

          <p>
            Checking event availability and registration access...
          </p>

        </section>

      </main>
    )
  }

  if (error || !event) {
    return (
      <main className="form-page-shell">

        <section className="form-state-card">

          <span className="event-state-icon">
            !
          </span>

          <p className="page-kicker">
            REVIEW
          </p>

          <h1>
            Registration Unavailable
          </h1>

          <p>
            {error ||
              "The event information could not be loaded."}
          </p>

          <Link
            to={
              event
                ? `/events/${event.id}`
                : "/events"
            }
            className="ui-primary-button"
          >
            {event
              ? "Back to Event"
              : "Back to Events"}
          </Link>

        </section>

      </main>
    )
  }

  if (!formData) {
    return (
      <main className="form-page-shell">

        <section className="form-state-card">

          <span className="event-state-icon">
            !
          </span>

          <p className="page-kicker">
            REVIEW
          </p>

          <h1>
            Registration Data Not Found
          </h1>

          <p>
            Please fill the registration form again
            before reviewing it.
          </p>

          <Link
            to={`/events/${event.id}/register`}
            className="ui-primary-button"
          >
            Go to Registration
          </Link>

        </section>

      </main>
    )
  }

  return (
    <main className="form-page-shell">

      <div className="form-page-heading">

        <Link
          to={`/events/${event.id}/register`}
          className="back-link"
        >
          ← Edit Registration
        </Link>

        <p className="page-kicker">
          REGISTRATION • STEP 02
        </p>

        <h1>
          Review Registration
        </h1>

        <p>
          Check your details carefully before confirming
          your registration for {event.title}.
        </p>

      </div>

      <section className="review-card">

        <div className="review-card-header">

          <div>

            <span className="form-step">
              FINAL CHECK
            </span>

            <h2>
              {event.title}
            </h2>

          </div>

          <div
            className="review-checkmark"
            aria-hidden="true"
          >
            ✓
          </div>

        </div>

        <div className="review-list">

          <div className="review-row">
            <span>
              Full Name
            </span>

            <strong>
              {formData.fullName}
            </strong>
          </div>

          <div className="review-row">
            <span>
              College Email
            </span>

            <strong>
              {formData.email}
            </strong>
          </div>

          <div className="review-row">
            <span>
              Admission No.
            </span>

            <strong>
              {formData.admissionNo}
            </strong>
          </div>

          <div className="review-row">
            <span>
              Program Name
            </span>

            <strong>
              {formData.programName}
            </strong>
          </div>

          <div className="review-row">
            <span>
              Department
            </span>

            <strong>
              {formData.department}
            </strong>
          </div>

          <div className="review-row">
            <span>
              Year
            </span>

            <strong>
              {formData.year}
            </strong>
          </div>

          <div className="review-row">
            <span>
              Phone
            </span>

            <strong>
              {formData.phone}
            </strong>
          </div>

        </div>

        <div className="review-notice">

          <span>
            i
          </span>

          <p>
            Your registration will be submitted to
            the event once you confirm below.
          </p>

        </div>

        <div className="review-actions">

          <button
            type="button"
            onClick={handleEdit}
            className="ui-secondary-button"
          >
            Edit Details
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            className="ui-primary-button"
          >
            Confirm Registration →
          </button>

        </div>

      </section>

    </main>
  )
}

export default RegistrationReview