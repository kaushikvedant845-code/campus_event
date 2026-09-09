import { useEffect, useState } from "react"
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

function EventRegistration() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  const event = events[id]

  const [loading, setLoading] = useState(true)

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
    const loadStudentProfile = async () => {
      setLoading(true)

      const {
        data: { session },
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

      const { data, error } = await supabase
        .from("students")
        .select(
          "id, email, full_name, admission_no, program_name, contact_no, profile_complete"
        )
        .eq("id", session.user.id)
        .maybeSingle()

      if (error) {
        console.error("PROFILE LOAD ERROR:", error)

        setLoading(false)

        return
      }

      if (!data) {
        navigate("/signup", {
          replace: true,
        })

        return
      }

      if (data.profile_complete !== true) {
        navigate("/signup", {
          replace: true,
        })

        return
      }

      const previous = location.state?.formData

      setFormData({
        fullName:
          previous?.fullName ||
          data.full_name ||
          "",

        email:
          previous?.email ||
          data.email ||
          session.user.email ||
          "",

        admissionNo:
          data.admission_no ||
          "",

        programName:
          data.program_name ||
          "",

        department:
          previous?.department ||
          "",

        year:
          previous?.year ||
          "",

        phone:
          previous?.phone ||
          data.contact_no ||
          "",
      })

      setLoading(false)
    }

    loadStudentProfile()
  }, [id, navigate, location.state])

  if (!event) {
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
            Loading your saved student details...
          </p>

        </section>

      </main>
    )
  }

  function handleChange(e) {
    const {
      name,
      value,
    } = e.target

    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }))
  }

  function handleSubmit(e) {
    e.preventDefault()

    navigate(`/events/${id}/review`, {
      state: {
        formData,
        eventId: id,
      },
    })
  }

  return (
    <main className="form-page-shell">

      <div className="form-page-heading">

        <Link
          to={`/events/${id}`}
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

                setFormData((previousData) => ({
                  ...previousData,
                  phone: value,
                }))

              }}
              autoComplete="tel"
              required
            />

          </div>

        </div>

        <div className="form-card-footer">

          <Link
            to={`/events/${id}`}
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