import { useEffect, useState } from "react"
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom"

import { supabase } from "../../lib/supabase"

function EventRegistration() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    admissionNo: "",
    programName: "",
    department: "",
    year: "",
    phone: "",
  })

  useEffect(() => {
    const loadRegistrationData = async () => {
      setLoading(true)
      setError("")

      try {
        /*
         * -------------------------------------------------------
         * 1. Check authentication
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
              from: `/events/${id}/register`,
            },
            replace: true,
          })

          return
        }

        /*
         * -------------------------------------------------------
         * 2. Load actual event from database
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

        setEvent(eventData)

        /*
         * -------------------------------------------------------
         * 3. Registration must be explicitly open
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

        if (
          !isPublished ||
          !registrationOpen
        ) {
          setError(
            "Registration is currently closed for this event."
          )

          setLoading(false)
          return
        }

        /*
         * -------------------------------------------------------
         * 4. Members Only event
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
         * 5. Check if already registered
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

        /*
         * -------------------------------------------------------
         * 6. Load actual student profile
         * -------------------------------------------------------
         */

        const {
          data: profile,
          error: profileError,
        } = await supabase
          .from("profiles")
          .select(`
            id,
            email,
            full_name
          `)
          .eq(
            "id",
            session.user.id
          )
          .maybeSingle()

        if (profileError) {
          throw profileError
        }

        const {
          data: studentProfile,
          error: studentProfileError,
        } = await supabase
          .from("student_profiles")
          .select(`
            admission_no,
            program_name,
            department,
            year,
            phone,
            profile_complete
          `)
          .eq(
            "profile_id",
            session.user.id
          )
          .maybeSingle()

        if (studentProfileError) {
          throw studentProfileError
        }

        if (!profile) {
          navigate("/signup", {
            replace: true,
          })

          return
        }

        if (
          !studentProfile ||
          studentProfile.profile_complete !== true
        ) {
          navigate("/signup", {
            replace: true,
          })

          return
        }

        const previous =
          location.state?.formData

        setFormData({
          fullName:
            previous?.fullName ||
            profile.full_name ||
            "",

          email:
            previous?.email ||
            profile.email ||
            session.user.email ||
            "",

          admissionNo:
            studentProfile.admission_no ||
            "",

          programName:
            studentProfile.program_name ||
            "",

          department:
            previous?.department ||
            studentProfile.department ||
            "",

          year:
            previous?.year ||
            studentProfile.year ||
            "",

          phone:
            previous?.phone ||
            studentProfile.phone ||
            "",
        })

        setLoading(false)
      } catch (err) {
        console.error(
          "REGISTRATION LOAD ERROR:",
          err
        )

        setError(
          err?.message ||
            "Unable to prepare registration."
        )

        setLoading(false)
      }
    }

    loadRegistrationData()
  }, [
    id,
    navigate,
    location.state,
  ])

  const formatDate = (date) => {
    if (!date) {
      return ""
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

    return new Date(
      `1970-01-01T${time}`
    ).toLocaleTimeString(
      "en-IN",
      {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }
    )
  }

  function handleChange(e) {
    const {
      name,
      value,
    } = e.target

    setFormData(
      (previousData) => ({
        ...previousData,
        [name]: value,
      })
    )
  }

  function handleSubmit(e) {
    e.preventDefault()

    if (!event) {
      return
    }

    if (
      !formData.fullName?.trim() ||
      !formData.email?.trim() ||
      !formData.admissionNo?.trim() ||
      !formData.programName?.trim() ||
      !formData.department?.trim() ||
      !formData.year?.trim() ||
      !formData.phone?.trim()
    ) {
      setError(
        "Please complete all registration details."
      )

      return
    }

    setError("")

    navigate(
      `/events/${event.id}/review`,
      {
        state: {
          formData,
          eventId: event.id,
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
            REGISTRATION
          </p>

          <h1>
            Preparing your registration
          </h1>

          <p>
            Loading your event and saved student details...
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
            REGISTRATION
          </p>

          <h1>
            {event
              ? "Registration Unavailable"
              : "Event Not Found"}
          </h1>

          <p>
            {error ||
              "The event you are trying to register for does not exist."}
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

  return (
    <main className="form-page-shell">

      <div className="form-page-heading">

        <Link
          to={`/events/${event.id}`}
          className="back-link"
        >
          ← Event Details
        </Link>

        <p className="page-kicker">
          REGISTRATION
        </p>

        <h1>
          Register for {event.title}
        </h1>

        <p>
          Confirm your details below. Information saved
          to your student profile is filled automatically.
        </p>

        {event.clubs?.name && (
          <p>
            Organised by {event.clubs.name}
          </p>
        )}

        <p>
          {formatDate(event.event_date)}
          {" · "}
          {formatTime(event.start_time)}
          {event.end_time &&
            ` – ${formatTime(
              event.end_time
            )}`}
        </p>

      </div>

      <form
        className="registration-card"
        onSubmit={handleSubmit}
      >

        <div className="form-card-header">

          <div>

            <span className="form-step">
              STEP 01
            </span>

            <h2>
              Student Information
            </h2>

          </div>

          <span className="required-note">
            * Required
          </span>

        </div>

        <div className="registration-form-grid">

          <div className="form-field form-field-full">

            <label htmlFor="fullName">
              Student Name
            </label>

            <input
              id="fullName"
              name="fullName"
              type="text"
              value={formData.fullName}
              onChange={handleChange}
              autoComplete="name"
              required
            />

          </div>

          <div className="form-field form-field-full">

            <label htmlFor="email">
              Google Account Email
            </label>

            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              autoComplete="email"
              required
            />

          </div>

          <div className="form-field">

            <label htmlFor="admissionNo">
              Admission No.
            </label>

            <div className="locked-input-wrap">

              <input
                id="admissionNo"
                name="admissionNo"
                type="text"
                value={formData.admissionNo}
                readOnly
                required
              />

              <span>
                Locked
              </span>

            </div>

          </div>

          <div className="form-field">

            <label htmlFor="programName">
              Program Name
            </label>

            <div className="locked-input-wrap">

              <input
                id="programName"
                name="programName"
                type="text"
                value={formData.programName}
                readOnly
                required
              />

              <span>
                Locked
              </span>

            </div>

          </div>

          <div className="form-field">

            <label htmlFor="department">
              Department
            </label>

            <input
              id="department"
              name="department"
              type="text"
              placeholder="e.g. Computer Science"
              value={formData.department}
              onChange={handleChange}
              required
            />

          </div>

          <div className="form-field">

            <label htmlFor="year">
              Year
            </label>

            <select
              id="year"
              name="year"
              value={formData.year}
              onChange={handleChange}
              required
            >

              <option value="">
                Select year
              </option>

              <option value="1st Year">
                1st Year
              </option>

              <option value="2nd Year">
                2nd Year
              </option>

              <option value="3rd Year">
                3rd Year
              </option>

              <option value="4th Year">
                4th Year
              </option>

            </select>

          </div>

          <div className="form-field form-field-full">

            <label htmlFor="phone">
              Contact Number
            </label>

            <input
              id="phone"
              name="phone"
              type="tel"
              inputMode="numeric"
              maxLength={10}
              pattern="[0-9]{10}"
              title="Phone number must contain exactly 10 digits"
              placeholder="10-digit contact number"
              value={formData.phone}
              onChange={(e) => {

                const value =
                  e.target.value
                    .replace(/\D/g, "")
                    .slice(0, 10)

                setFormData(
                  (previousData) => ({
                    ...previousData,
                    phone: value,
                  })
                )

              }}
              autoComplete="tel"
              required
            />

          </div>

        </div>

        <div className="form-card-footer">

          <Link
            to={`/events/${event.id}`}
            className="ui-secondary-button"
          >
            Cancel
          </Link>

          <button
            type="submit"
            className="ui-primary-button"
          >
            Review Registration →
          </button>

        </div>

      </form>

    </main>
  )
}

export default EventRegistration