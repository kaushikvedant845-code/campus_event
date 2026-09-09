import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabase"

function DashboardPreferences() {
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [userId, setUserId] =
    useState("")

  const [showEmail, setShowEmail] =
    useState(true)

  const [showAdmissionNo, setShowAdmissionNo] =
    useState(true)

  const [showProgram, setShowProgram] =
    useState(true)

  const [showAcademicSession, setShowAcademicSession] =
    useState(true)

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          navigate("/login", {
            replace: true,
          })
          return
        }

        setUserId(user.id)

        const userKey =
          `dashboardPreferences:${user.id}`

        const saved =
          localStorage.getItem(userKey) ||
          localStorage.getItem(
            "dashboardPreferences"
          )

        if (saved) {
          const preferences =
            JSON.parse(saved)

          setShowEmail(
            preferences.showEmail ?? true
          )

          setShowAdmissionNo(
            preferences.showAdmissionNo ??
              true
          )

          setShowProgram(
            preferences.showProgram ??
              true
          )

          setShowAcademicSession(
            preferences.showAcademicSession ??
              true
          )
        }
      } catch (error) {
        console.error(
          "Preferences error:",
          error
        )
      } finally {
        setLoading(false)
      }
    }

    loadPreferences()
  }, [navigate])

  const handleSave = () => {
    setSaving(true)

    const preferences = {
      showEmail,
      showAdmissionNo,
      showProgram,
      showAcademicSession,
    }

    localStorage.setItem(
      `dashboardPreferences:${userId}`,
      JSON.stringify(preferences)
    )

    // Keep old key as fallback
    // for compatibility with existing MVP data.
    localStorage.setItem(
      "dashboardPreferences",
      JSON.stringify(preferences)
    )

    setTimeout(() => {
      setSaving(false)

      alert(
        "Dashboard preferences saved."
      )

      navigate("/dashboard")
    }, 300)
  }

  if (loading) {
    return (
      <main className="settings-page">

        <div className="settings-card">

          <h1>
            Dashboard Preferences
          </h1>

          <p>
            Loading preferences...
          </p>

        </div>

      </main>
    )
  }

  return (
    <main className="settings-page">

      <section className="settings-card">

        <div className="settings-header">

          <p className="dashboard-section-kicker">
            DASHBOARD
          </p>

          <h1>
            Dashboard Preferences
          </h1>

          <p>
            Choose which information appears
            on your student dashboard.
          </p>

        </div>


        <section className="settings-section">

          <div className="settings-section-heading">

            <h2>
              Visible Information
            </h2>

            <p>
              Turn dashboard information
              on or off.
            </p>

          </div>


          <label className="settings-toggle-row">

            <div>

              <strong>
                Google Account Email
              </strong>

              <span>
                Show your account email
                on the dashboard.
              </span>

            </div>

            <input
              type="checkbox"
              checked={showEmail}
              onChange={(e) =>
                setShowEmail(
                  e.target.checked
                )
              }
            />

          </label>


          <label className="settings-toggle-row">

            <div>

              <strong>
                Admission No.
              </strong>

              <span>
                Show your admission number.
              </span>

            </div>

            <input
              type="checkbox"
              checked={showAdmissionNo}
              onChange={(e) =>
                setShowAdmissionNo(
                  e.target.checked
                )
              }
            />

          </label>


          <label className="settings-toggle-row">

            <div>

              <strong>
                Program Name
              </strong>

              <span>
                Show your academic program.
              </span>

            </div>

            <input
              type="checkbox"
              checked={showProgram}
              onChange={(e) =>
                setShowProgram(
                  e.target.checked
                )
              }
            />

          </label>


          <label className="settings-toggle-row">

            <div>

              <strong>
                Academic Session
              </strong>

              <span>
                Show your current academic session.
              </span>

            </div>

            <input
              type="checkbox"
              checked={showAcademicSession}
              onChange={(e) =>
                setShowAcademicSession(
                  e.target.checked
                )
              }
            />

          </label>

        </section>


        <div className="settings-actions">

          <Link
            to="/settings"
            className="secondary-button"
          >
            Cancel
          </Link>

          <button
            type="button"
            className="primary-button"
            onClick={handleSave}
            disabled={saving}
          >
            {saving
              ? "Saving..."
              : "Save Preferences"}
          </button>

        </div>

      </section>

    </main>
  )
}

export default DashboardPreferences