import { useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabase"

function Settings() {
  const navigate = useNavigate()

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut()

    if (error) {
      alert(error.message)
      return
    }

    localStorage.removeItem("studentUser")

    navigate("/login", {
      replace: true,
    })
  }

  return (
    <main>
      <h1>Settings</h1>

      <p>Manage your account and preferences.</p>

      <section>
        <h2>
          <button
            type="button"
            onClick={() => navigate("/settings/profile")}
          >
            Customize Profile
          </button>
        </h2>

        <p>
          Manage your student profile information.
        </p>
      </section>

      <section>
        <h2>
          <button
            type="button"
            onClick={() => navigate("/settings/dashboard")}
          >
            Dashboard Preferences
          </button>
        </h2>

        <p>
          Customize what appears on your dashboard.
        </p>
      </section>

      <section>
        <h2>
          <button
            type="button"
            onClick={() => navigate("/settings/account")}
          >
            Account
          </button>
        </h2>

        <p>
          View your account information.
        </p>
      </section>

      <section>
        <button
          type="button"
          onClick={handleSignOut}
        >
          Sign Out
        </button>
      </section>
    </main>
  )
}

export default Settings