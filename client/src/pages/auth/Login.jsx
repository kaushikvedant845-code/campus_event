import { Link, useLocation } from "react-router-dom"
import { supabase } from "../../lib/supabase"

function Login() {
  const location = useLocation()

  const handleGoogleLogin = async () => {

    const {
      error,
    } = await supabase.auth.signInWithOAuth({
      provider: "google",

      options: {
        redirectTo:
          `${window.location.origin}${
            location.state?.from ||
            "/dashboard"
          }`,
      },
    })

    if (error) {
      alert(error.message)
    }
  }

  return (
    <main className="auth-page-shell">

      <section className="auth-layout">

        <div className="auth-brand-panel">

          <div className="auth-brand-content">

            <p className="auth-kicker">
              CAMPUS EVENT
            </p>

            <h1>
              Your campus.
              <br />
              One place.
            </h1>

            <p>
              Discover events, register in seconds,
              and keep your campus participation
              organized.
            </p>

            <div className="auth-mini-points">

              <span>
                01
              </span>

              <div>
                <strong>
                  Discover
                </strong>

                <small>
                  Find what is happening around campus.
                </small>
              </div>

            </div>

            <div className="auth-mini-points">

              <span>
                02
              </span>

              <div>

                <strong>
                  Register
                </strong>

                <small>
                  Use your campus profile to join events.
                </small>

              </div>

            </div>

          </div>

        </div>

        <div className="auth-card-wrap">

          <div className="auth-card">

            <div className="auth-card-heading">

              <p className="page-kicker">
                WELCOME BACK
              </p>

              <h2>
                Student Login
              </h2>

              <p>
                Continue with your Google account
                to access your campus account.
              </p>

            </div>

            <button
              type="button"
              className="google-button"
              onClick={handleGoogleLogin}
            >

              <span className="google-mark">
                G
              </span>

              <span>
                Continue with Google
              </span>

              <span className="google-arrow">
                →
              </span>

            </button>

            <div className="auth-divider">
              <span>
                SECURE SIGN-IN
              </span>
            </div>

            <p className="auth-footer-text">

              Don't have an account?{" "}

              <Link to="/signup">
                Create one
              </Link>

            </p>

          </div>

        </div>

      </section>

    </main>
  )
}

export default Login