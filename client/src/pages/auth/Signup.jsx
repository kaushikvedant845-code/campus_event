import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"

import { supabase } from "../../lib/supabase"

function Signup() {
  const navigate = useNavigate()

  const [detailsValid, setDetailsValid] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [checkingGoogle, setCheckingGoogle] = useState(true)

  const [fullName, setFullName] = useState("")
  const [contactNo, setContactNo] = useState("")
  const [programName, setProgramName] = useState("")
  const [academicSession, setAcademicSession] = useState("")
  const [admissionNo, setAdmissionNo] = useState("")
  const [department, setDepartment] = useState("")
  const [course, setCourse] = useState("")

  /*
   * Complete Google signup after returning from Google.
   */
  useEffect(() => {
    let mounted = true

    const completeGoogleSignup = async () => {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (sessionError) {
          throw sessionError
        }

        if (!session) {
          if (mounted) {
            setCheckingGoogle(false)
          }

          return
        }

        const pendingData =
          sessionStorage.getItem("pendingSignup")

        /*
         * If there is no pending signup, this is simply
         * an already authenticated user visiting /signup.
         */
        if (!pendingData) {
          if (mounted) {
            setCheckingGoogle(false)
          }

          return
        }

        const details = JSON.parse(pendingData)

        if (!mounted) return

        setSaving(true)
        setMessage("")

        const user = session.user

        /*
         * -----------------------------------------
         * 1. COMMON PROFILE
         * -----------------------------------------
         */

        const { error: profileError } =
          await supabase
            .from("profiles")
            .upsert(
              {
                id: user.id,
                email: user.email || "",
                full_name:
                  details.fullName ||
                  user.user_metadata?.full_name ||
                  user.user_metadata?.name ||
                  "",
                role: "student",
                is_student: true,
                is_faculty: false,
              },
              {
                onConflict: "id",
              }
            )

        if (profileError) {
          throw profileError
        }

        /*
         * -----------------------------------------
         * 2. STUDENT PROFILE
         * -----------------------------------------
         *
         * Academic identity fields are written here
         * during account creation.
         *
         * They are protected at DB level from later
         * authenticated updates.
         */

        const { error: studentProfileError } =
          await supabase
            .from("student_profiles")
            .upsert(
              {
                profile_id: user.id,

                admission_no:
                  details.admissionNo,

                program_name:
                  details.programName,

                department:
                  details.department,

                course:
                  details.course,

                academic_session:
                  details.academicSession,

                phone:
                  details.contactNo,

                profile_complete: true,

                verification_status: "verified",
              },
              {
                onConflict: "profile_id",
              }
            )

        if (studentProfileError) {
          throw studentProfileError
        }

        /*
         * Signup completed.
         */
        sessionStorage.removeItem("pendingSignup")

        if (!mounted) return

        setSaving(false)

        navigate("/dashboard", {
          replace: true,
        })
      } catch (error) {
        console.error(
          "Google signup completion error:",
          error
        )

        if (!mounted) return

        setSaving(false)
        setCheckingGoogle(false)

        setMessage(
          error?.message ||
            "Unable to complete account setup. Please try again."
        )
      }
    }

    completeGoogleSignup()

    return () => {
      mounted = false
    }
  }, [navigate])

  /*
   * -----------------------------------------
   * VALIDATION
   * -----------------------------------------
   */

  const validateDetails = () => {
    setMessage("")
    setDetailsValid(false)

    if (
      !fullName.trim() ||
      !contactNo.trim() ||
      !programName.trim() ||
      !academicSession.trim() ||
      !admissionNo.trim() ||
      !department.trim() ||
      !course.trim()
    ) {
      setMessage(
        "Please complete all required details."
      )

      return false
    }

    if (!/^\d{10}$/.test(contactNo.trim())) {
      setMessage(
        "Contact number must contain exactly 10 digits."
      )

      return false
    }

    const sessionMatch =
      academicSession
        .trim()
        .match(/^(\d{4})-(\d{2})$/)

    if (!sessionMatch) {
      setMessage(
        "Academic session must look like 2025-29."
      )

      return false
    }

    const sessionStartShort =
      sessionMatch[1].slice(-2)

    if (
      !admissionNo
        .trim()
        .startsWith(sessionStartShort)
    ) {
      setMessage(
        "Please check your admission number and academic session."
      )

      return false
    }

    setDetailsValid(true)

    setMessage(
      "Details verified. Continue with Google to finish signup."
    )

    return true
  }

  /*
   * -----------------------------------------
   * GOOGLE SIGNUP
   * -----------------------------------------
   */

  const handleGoogleSignup = async () => {
    if (!detailsValid && !validateDetails()) {
      return
    }

    const pendingSignup = {
      fullName: fullName.trim(),
      contactNo: contactNo.trim(),
      programName: programName.trim(),
      academicSession: academicSession.trim(),
      admissionNo: admissionNo.trim(),
      department: department.trim(),
      course: course.trim(),
    }

    sessionStorage.setItem(
      "pendingSignup",
      JSON.stringify(pendingSignup)
    )

    setSaving(true)
    setMessage("")

    const {
      error,
    } = await supabase.auth.signInWithOAuth({
      provider: "google",

      options: {
        redirectTo:
          `${window.location.origin}/signup`,
      },
    })

    if (error) {
      sessionStorage.removeItem(
        "pendingSignup"
      )

      setSaving(false)

      setMessage(
        "Unable to continue with Google."
      )

      console.error(
        "Google signup error:",
        error
      )
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    validateDetails()
  }

  const resetValidation = () => {
    setDetailsValid(false)
    setMessage("")
  }

  /*
   * -----------------------------------------
   * GOOGLE CALLBACK LOADING
   * -----------------------------------------
   */

  if (checkingGoogle && saving) {
    return (
      <main className="auth-page-shell">
        <section className="auth-centered-state">

          <div className="page-spinner" />

          <p className="page-kicker">
            ACCOUNT SETUP
          </p>

          <h1>
            Completing your account...
          </h1>

          <p>
            Please wait while we finish
            your Google verification.
          </p>

        </section>
      </main>
    )
  }

  /*
   * -----------------------------------------
   * PAGE
   * -----------------------------------------
   */

  return (
    <main className="auth-page-shell">

      <section className="signup-layout">

        {/* INTRO */}

        <div className="signup-intro">

          <p className="auth-kicker">
            CAMPUS EVENT
          </p>

          <h1>
            Create your
            <br />
            campus account.
          </h1>

          <p>
            Create your student account using
            your official academic information.
            Google authentication securely connects
            the account to you.
          </p>

          <div className="signup-flow">

            <div className="signup-flow-item signup-flow-active">

              <span>
                01
              </span>

              <div>
                <strong>
                  Your Details
                </strong>

                <small>
                  Enter your campus information.
                </small>
              </div>

            </div>

            <div className="signup-flow-line" />

            <div
              className={
                `signup-flow-item ${
                  detailsValid
                    ? "signup-flow-active"
                    : ""
                }`
              }
            >

              <span>
                02
              </span>

              <div>
                <strong>
                  Google Verification
                </strong>

                <small>
                  Connect your Google account.
                </small>
              </div>

            </div>

            <div className="signup-flow-line" />

            <div className="signup-flow-item">

              <span>
                03
              </span>

              <div>
                <strong>
                  Ready
                </strong>

                <small>
                  Access your campus dashboard.
                </small>
              </div>

            </div>

          </div>

        </div>

        {/* CARD */}

        <div className="signup-card">

          <div className="auth-card-heading">

            <p className="page-kicker">
              CREATE STUDENT ACCOUNT
            </p>

            <h2>
              Tell us about you
            </h2>

            <p>
              Enter the academic information
              associated with your campus identity.
            </p>

          </div>

          <form
            className="signup-form"
            onSubmit={handleSubmit}
          >

            {/* SECTION */}

            <div className="signup-section-heading">

              <span>
                01
              </span>

              <div>

                <h3>
                  Student Details
                </h3>

                <p>
                  Use the information associated with
                  your campus record.
                </p>

              </div>

            </div>

            <div className="signup-form-grid">

              {/* NAME */}

              <div className="form-field form-field-full">

                <label htmlFor="fullName">
                  Student Name
                </label>

                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value)
                    resetValidation()
                  }}
                  placeholder="Enter your full name"
                  autoComplete="name"
                  required
                />

              </div>

              {/* ADMISSION */}

              <div className="form-field">

                <label htmlFor="admissionNo">
                  Admission No.
                </label>

                <input
                  id="admissionNo"
                  type="text"
                  value={admissionNo}
                  onChange={(e) => {
                    setAdmissionNo(e.target.value)
                    resetValidation()
                  }}
                  placeholder="e.g. 25115462"
                  required
                />

              </div>

              {/* PROGRAM */}

              <div className="form-field">

                <label htmlFor="programName">
                  Program Name
                </label>

                <input
                  id="programName"
                  type="text"
                  value={programName}
                  onChange={(e) => {
                    setProgramName(e.target.value)
                    resetValidation()
                  }}
                  placeholder="e.g. B.Tech"
                  required
                />

              </div>

              {/* DEPARTMENT */}

              <div className="form-field">

                <label htmlFor="department">
                  Department
                </label>

                <input
                  id="department"
                  type="text"
                  value={department}
                  onChange={(e) => {
                    setDepartment(e.target.value)
                    resetValidation()
                  }}
                  placeholder="e.g. Computer Science"
                  required
                />

              </div>

              {/* COURSE */}

              <div className="form-field">

                <label htmlFor="course">
                  Course
                </label>

                <input
                  id="course"
                  type="text"
                  value={course}
                  onChange={(e) => {
                    setCourse(e.target.value)
                    resetValidation()
                  }}
                  placeholder="e.g. CSE"
                  required
                />

              </div>

              {/* SESSION */}

              <div className="form-field">

                <label htmlFor="academicSession">
                  Academic Session
                </label>

                <input
                  id="academicSession"
                  type="text"
                  value={academicSession}
                  onChange={(e) => {
                    setAcademicSession(e.target.value)
                    resetValidation()
                  }}
                  placeholder="e.g. 2025-29"
                  required
                />

              </div>

              {/* PHONE */}

              <div className="form-field">

                <label htmlFor="contactNo">
                  Contact Number
                </label>

                <input
                  id="contactNo"
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={contactNo}
                  onChange={(e) => {
                    setContactNo(
                      e.target.value
                        .replace(/\D/g, "")
                        .slice(0, 10)
                    )

                    resetValidation()
                  }}
                  placeholder="10-digit number"
                  autoComplete="tel"
                  required
                />

              </div>

            </div>

            {/* MESSAGE */}

            {message && (
              <div
                className={
                  detailsValid
                    ? "form-message form-message-success"
                    : "form-message form-message-error"
                }
              >

                <span>
                  {detailsValid ? "✓" : "!"}
                </span>

                <p>
                  {message}
                </p>

              </div>
            )}

            {/* VALIDATE */}

            <button
              type="submit"
              className="ui-primary-button signup-validate-button"
            >
              Validate Details →
            </button>

          </form>

          {/* GOOGLE */}

          {detailsValid && (

            <div className="google-verification-card">

              <div>

                <span className="verification-badge">
                  READY
                </span>

                <h3>
                  Continue with Google
                </h3>

                <p>
                  Your academic details are ready.
                  Google will securely verify the
                  account email used for your campus profile.
                </p>

              </div>

              <button
                type="button"
                className="google-button google-button-compact"
                onClick={handleGoogleSignup}
                disabled={saving}
              >

                <span className="google-mark">
                  G
                </span>

                <span>
                  {saving
                    ? "Connecting..."
                    : "Continue with Google"}
                </span>

                <span className="google-arrow">
                  →
                </span>

              </button>

            </div>

          )}

          {/* FOOTER */}

          <p className="auth-footer-text signup-footer">

            Already have an account?{" "}

            <Link to="/login">
              Sign In
            </Link>

          </p>

        </div>

      </section>

    </main>
  )
}

export default Signup