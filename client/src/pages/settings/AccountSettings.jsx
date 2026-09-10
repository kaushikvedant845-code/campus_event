import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabase"

function AccountSettings() {
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    const loadAccount = async () => {
      setLoading(true)

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        navigate("/login", { replace: true })
        return
      }

      const { data, error } = await supabase
        .from("students")
        .select(
          "email, full_name, admission_no, program_name, academic_session, contact_no"
        )
        .eq("id", user.id)
        .maybeSingle()

      if (error) {
        console.error(error)
        alert("Unable to load account information.")
        setLoading(false)
        return
      }

      if (!data) {
        alert("Student profile not found.")
        navigate("/signup", { replace: true })
        return
      }

      setProfile(data)
      setLoading(false)
    }

    loadAccount()
  }, [navigate])

  if (loading) {
    return (
      <main>
        <h1>Account</h1>
        <p>Loading account information...</p>
      </main>
    )
  }

  return (
    <main>
      <h1>Account</h1>

      <p>
        Your registered account and student information.
      </p>

      {profile && (
        <section>
          <h2>Student Information</h2>

          <p>
            <strong>Student Name:</strong>{" "}
            {profile.full_name}
          </p>

          <p>
            <strong>Google Account:</strong>{" "}
            {profile.email}
          </p>

          <p>
            <strong>Admission No.:</strong>{" "}
            {profile.admission_no}
          </p>

          <p>
            <strong>Program Name:</strong>{" "}
            {profile.program_name}
          </p>

          <p>
            <strong>Academic Session:</strong>{" "}
            {profile.academic_session}
          </p>

          <p>
            <strong>Contact No.:</strong>{" "}
            {profile.contact_no}
          </p>
        </section>
      )}

      <br />

      <button
        type="button"
        onClick={() => navigate("/settings/profile")}
      >
        Edit Profile
      </button>

      <br />
      <br />

      <Link to="/settings">
        Back to Settings
      </Link>
    </main>
  )
}

export default AccountSettings