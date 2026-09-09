import { useEffect, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabase"
import "./FacultyLogin.css"

function FacultyLogin() {
  const navigate = useNavigate()
  const location = useLocation()

  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [step, setStep] = useState("google")
  const [factorId, setFactorId] = useState("")
  const [challengeId, setChallengeId] = useState("")
  const [code, setCode] = useState("")
  const [message, setMessage] = useState("")

  useEffect(() => {
    let mounted = true

    const finishGoogleLogin = async () => {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (sessionError) throw sessionError
        if (!session) {
          if (mounted) setLoading(false)
          return
        }

        // Server-side authorization check.
        // The function compares the authenticated Google `sub`
        // against an active faculty_profiles row.
        const { data: authorized, error: authzError } =
          await supabase.rpc("is_authorized_faculty")

        if (authzError) throw authzError

        if (!authorized) {
          await supabase.auth.signOut()
          if (mounted) {
            setMessage(
              "This Google account is not assigned to the faculty platform."
            )
            setLoading(false)
          }
          return
        }

        const { data: aal, error: aalError } =
          await supabase.auth.mfa.getAuthenticatorAssuranceLevel()

        if (aalError) throw aalError

        if (aal?.currentLevel === "aal2") {
          navigate(location.state?.from || "/faculty", { replace: true })
          return
        }

      if (aal?.nextLevel !== "aal2") {
  navigate("/faculty-mfa-setup", { replace: true })
  return
}

        const { data: factors, error: factorsError } =
          await supabase.auth.mfa.listFactors()

        if (factorsError) throw factorsError

        const verifiedTotp =
          (factors?.totp || []).find(
            (factor) => factor.status === "verified"
          )

       if (!verifiedTotp) {
  navigate("/faculty-mfa-setup", { replace: true })
  return
}

        const { data: challenge, error: challengeError } =
          await supabase.auth.mfa.challenge({
            factorId: verifiedTotp.id,
          })

        if (challengeError) throw challengeError

        if (mounted) {
          setFactorId(verifiedTotp.id)
          setChallengeId(challenge.id)
          setStep("mfa")
          setLoading(false)
        }
      } catch (error) {
        console.error("Faculty login error:", error)

        if (mounted) {
          setMessage(
            "Unable to complete faculty sign-in. Please try again."
          )
          setLoading(false)
        }
      }
    }

    finishGoogleLogin()

    return () => {
      mounted = false
    }
  }, [navigate, location.state])

  const handleGoogleLogin = async () => {
    setWorking(true)
    setMessage("")

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/faculty-login`,
      },
    })

    if (error) {
      console.error(error)
      setMessage("Unable to start Google sign-in.")
      setWorking(false)
    }
  }

  const handleVerifyMfa = async (event) => {
    event.preventDefault()

    if (!/^\d{6}$/.test(code)) {
      setMessage("Enter the 6-digit Authenticator code.")
      return
    }

    setWorking(true)
    setMessage("")

    try {
      const { error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId,
        code,
      })

      if (error) throw error

      const { data: aal, error: aalError } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel()

      if (aalError) throw aalError

      if (aal?.currentLevel !== "aal2") {
        throw new Error("Multi-factor authentication was not completed.")
      }

      navigate(location.state?.from || "/faculty", { replace: true })
    } catch (error) {
      console.error("Faculty MFA error:", error)
      setMessage("Invalid or expired code. Please try again.")
      setCode("")
    } finally {
      setWorking(false)
    }
  }

  const handleBack = async () => {
    await supabase.auth.signOut()
    setStep("google")
    setFactorId("")
    setChallengeId("")
    setCode("")
    setMessage("")
  }

  if (loading) {
    return (
      <main className="faculty-auth-page">
        <section className="faculty-auth-card">
          <p className="faculty-auth-kicker">CAMPUS EVENT</p>
          <h1>Verifying faculty access</h1>
          <p className="faculty-auth-muted">
            Checking your approved faculty identity and security requirements.
          </p>
          <div className="faculty-auth-spinner" />
        </section>
      </main>
    )
  }

  return (
    <main className="faculty-auth-page">
      <section className="faculty-auth-card">
        <p className="faculty-auth-kicker">FACULTY ACCESS</p>

        {step === "google" && (
          <>
            <h1>Faculty Login</h1>
            <p className="faculty-auth-muted">
              Sign in with the Google account assigned to your faculty profile.
            </p>

            {message && (
              <div className="faculty-auth-message faculty-auth-error">
                {message}
              </div>
            )}

            <button
              type="button"
              className="faculty-google-button"
              onClick={handleGoogleLogin}
              disabled={working}
            >
              <span className="faculty-google-mark">G</span>
              <span>
                {working ? "Connecting..." : "Continue with Google"}
              </span>
              <span>→</span>
            </button>
          </>
        )}

        {step === "mfa" && (
          <>
            <h1>Authenticator verification</h1>
            <p className="faculty-auth-muted">
              Open your Authenticator app and enter the current 6-digit code.
            </p>

            {message && (
              <div className="faculty-auth-message faculty-auth-error">
                {message}
              </div>
            )}

            <form onSubmit={handleVerifyMfa}>
              <label htmlFor="faculty-mfa-code">
                Authentication code
              </label>

              <input
                id="faculty-mfa-code"
                className="faculty-mfa-input"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(event) =>
                  setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="000000"
                autoFocus
              />

              <button
                type="submit"
                className="faculty-primary-button"
                disabled={working}
              >
                {working ? "Verifying..." : "Verify and continue"}
              </button>
            </form>

            <button
              type="button"
              className="faculty-secondary-button"
              onClick={handleBack}
              disabled={working}
            >
              Use another account
            </button>
          </>
        )}

        {step === "setup" && (
          <>
            <h1>Authenticator setup required</h1>

            <div className="faculty-auth-message faculty-auth-error">
              {message}
            </div>

            <p className="faculty-auth-muted">
              Faculty accounts must have an approved Authenticator factor
              before the faculty dashboard can be opened.
            </p>

            <button
              type="button"
              className="faculty-secondary-button"
              onClick={handleBack}
            >
              Sign out
            </button>
          </>
        )}
      </section>
    </main>
  )
}

export default FacultyLogin
