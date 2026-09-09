import {
  Link,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom"

import { supabase } from "../lib/supabase"

const events = {
  1: {
    title: "Tech Fest 2026",
  },

  2: {
    title: "Cultural Night",
  },

  3: {
    title: "Inter College Tournament",
  },
}

function RegistrationReview() {
  const { id } = useParams()

  const location = useLocation()

  const navigate = useNavigate()

  const event = events[id]

  const formData =
    location.state?.formData

  if (!event) {
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
            Event Not Found
          </h1>

          <p>
            The event you are trying to register for
            does not exist.
          </p>

          <Link
            to="/events"
            className="ui-primary-button"
          >
            Back to Events
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
            to={`/events/${id}/register`}
            className="ui-primary-button"
          >
            Go to Registration
          </Link>

        </section>

      </main>
    )
  }

  async function handleConfirm() {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      navigate("/login", {
        state: {
          from: `/events/${id}/review`,
        },
      })

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
      alert(
        "Please complete all registration details."
      )

      return
    }

    try {
      const {
        error,
      } = await supabase
        .from("registrations")
        .insert({
          student_id: session.user.id,
          event_id: Number(id),

          full_name:
            formData.fullName.trim(),

          email:
            formData.email.trim(),

          admission_no:
            formData.admissionNo.trim(),

          program_name:
            formData.programName.trim(),

          department:
            formData.department.trim(),

          year:
            formData.year.trim(),

          phone:
            formData.phone.trim(),
        })

      if (error) {
        console.error(
          "REGISTRATION ERROR:",
          error
        )

        if (error.code === "23505") {
          alert(
            "You are already registered for this event."
          )

          return
        }

        alert(
          `Registration failed.\n\nMessage: ${error.message}\nCode: ${
            error.code || "N/A"
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
        "UNEXPECTED ERROR:",
        error
      )

      alert(
        `Something went wrong.\n\n${error.message}`
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

  return (
    <main className="form-page-shell">

      <div className="form-page-heading">

        <Link
          to={`/events/${id}/register`}
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