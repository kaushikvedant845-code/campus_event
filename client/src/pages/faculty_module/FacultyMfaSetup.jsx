import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabase"
import "./FacultyLogin.css"

const FACTOR_NAME = "Campus Event Faculty Authenticator"

function FacultyMfaSetup() {
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)

  const [factorId, setFactorId] = useState("")
  const [qrCode, setQrCode] = useState("")
  const [secret, setSecret] = useState("")
  const [code, setCode] = useState("")
  const [message, setMessage] = useState("")

  // =========================================================
  // PREPARE MFA SETUP
  // =========================================================

  useEffect(() => {
    let mounted = true

    const startSetup = async () => {
      try {
        setLoading(true)
        setMessage("")

        // ---------------------------------------------------
        // 1. CURRENT SESSION
        // ---------------------------------------------------

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (sessionError) {
          throw sessionError
        }

        if (!session?.user) {
          navigate("/faculty-login", {
            replace: true,
          })
          return
        }

        // ---------------------------------------------------
        // 2. FACULTY AUTHORIZATION
        // ---------------------------------------------------

        const {
          data: authorized,
          error: authzError,
        } = await supabase.rpc(
          "is_authorized_faculty"
        )

        if (authzError) {
          throw authzError
        }

        if (!authorized) {
          await supabase.auth.signOut()

          navigate("/faculty-login", {
            replace: true,
          })

          return
        }

        // ---------------------------------------------------
        // 3. CHECK CURRENT MFA ASSURANCE
        // ---------------------------------------------------

        const {
          data: aal,
          error: aalError,
        } =
          await supabase.auth.mfa
            .getAuthenticatorAssuranceLevel()

        if (aalError) {
          throw aalError
        }

        // Already authenticated with MFA
        if (aal?.currentLevel === "aal2") {
          navigate("/faculty", {
            replace: true,
          })

          return
        }

        // ---------------------------------------------------
        // 4. GET EXISTING FACTORS
        // ---------------------------------------------------

        const {
          data: factors,
          error: factorsError,
        } =
          await supabase.auth.mfa.listFactors()

        if (factorsError) {
          throw factorsError
        }

        const existingFactors =
          factors?.totp || []

        // ---------------------------------------------------
        // 5. IF VERIFIED FACTOR EXISTS
        // ---------------------------------------------------

        const verifiedFactor =
          existingFactors.find(
            (factor) =>
              factor.status === "verified"
          )

        if (verifiedFactor) {
          // Faculty already has an Authenticator.
          // Send them back to login so normal MFA
          // verification can happen there.

          navigate("/faculty-login", {
            replace: true,
          })

          return
        }

        // ---------------------------------------------------
        // 6. REMOVE ALL OLD UNVERIFIED TOTP FACTORS
        // ---------------------------------------------------
        //
        // IMPORTANT:
        // The previous version only removed factors
        // having our exact friendly name.
        //
        // That can leave another incomplete factor behind
        // and Supabase can then reject the new enrollment.
        //
        // We are safe here because we already confirmed
        // there is NO verified factor.
        // ---------------------------------------------------

        const unverifiedFactors =
          existingFactors.filter(
            (factor) =>
              factor.status !== "verified"
          )

        for (const factor of unverifiedFactors) {
          try {
            const {
              error: unenrollError,
            } =
              await supabase.auth.mfa.unenroll(
                {
                  factorId: factor.id,
                }
              )

            if (unenrollError) {
              console.warn(
                "Could not remove old MFA factor:",
                unenrollError
              )
            }
          } catch (unenrollError) {
            console.warn(
              "Old MFA factor cleanup failed:",
              unenrollError
            )
          }
        }

        // ---------------------------------------------------
        // 7. CREATE FRESH TOTP FACTOR
        // ---------------------------------------------------

        let enrollment = null
        let enrollmentError = null

        // First attempt with normal friendly name
        const firstEnrollment =
          await supabase.auth.mfa.enroll({
            factorType: "totp",
            friendlyName: FACTOR_NAME,
          })

        enrollment =
          firstEnrollment.data

        enrollmentError =
          firstEnrollment.error

        // ---------------------------------------------------
        // 8. FALLBACK FOR FRIENDLY-NAME DUPLICATE
        // ---------------------------------------------------
        //
        // If Supabase still says the friendly name exists,
        // retry with a unique name.
        // ---------------------------------------------------

        if (
          enrollmentError &&
          enrollmentError.message
            ?.toLowerCase()
            .includes("friendly name")
        ) {
          const fallbackName =
            `${FACTOR_NAME} ${Date.now()}`

          const fallbackEnrollment =
            await supabase.auth.mfa.enroll({
              factorType: "totp",
              friendlyName: fallbackName,
            })

          enrollment =
            fallbackEnrollment.data

          enrollmentError =
            fallbackEnrollment.error
        }

        if (enrollmentError) {
          throw enrollmentError
        }

        // ---------------------------------------------------
        // 9. VALIDATE ENROLLMENT RESPONSE
        // ---------------------------------------------------

        if (
          !enrollment?.id ||
          !enrollment?.totp
        ) {
          throw new Error(
            "Supabase did not return a valid Authenticator setup."
          )
        }

        const rawQrCode =
          enrollment.totp.qr_code

        const rawSecret =
          enrollment.totp.secret

        if (!rawQrCode) {
          throw new Error(
            "Authenticator QR code was not returned."
          )
        }

        if (!rawSecret) {
          throw new Error(
            "Authenticator secret was not returned."
          )
        }

        // ---------------------------------------------------
        // 10. PREPARE QR CODE
        // ---------------------------------------------------

        let finalQrCode = rawQrCode

        // Supabase normally returns a data URI.
        // If it returns raw SVG instead, convert it safely.

        if (
          typeof rawQrCode === "string" &&
          rawQrCode.trim().startsWith("<svg")
        ) {
          finalQrCode =
            `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
              rawQrCode
            )}`
        }

        // Some responses may return an encoded SVG
        // without the data prefix.
        else if (
          typeof rawQrCode === "string" &&
          !rawQrCode.startsWith("data:image/")
        ) {
          finalQrCode =
            `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
              rawQrCode
            )}`
        }

        // ---------------------------------------------------
        // 11. UPDATE UI
        // ---------------------------------------------------

        if (!mounted) {
          return
        }

        setFactorId(enrollment.id)
        setQrCode(finalQrCode)
        setSecret(rawSecret)
        setLoading(false)
      } catch (error) {
        console.error(
          "Faculty MFA setup error:",
          error
        )

        if (!mounted) {
          return
        }

        setMessage(
          error?.message ||
            "Unable to start Authenticator setup. Please try again."
        )

        setLoading(false)
      }
    }

    startSetup()

    return () => {
      mounted = false
    }
  }, [navigate])

  // =========================================================
  // ENABLE AUTHENTICATOR
  // =========================================================

  const handleEnable = async (event) => {
    event.preventDefault()

    setMessage("")

    // -------------------------------------------------------
    // Validate code
    // -------------------------------------------------------

    if (!/^\d{6}$/.test(code)) {
      setMessage(
        "Enter the 6-digit code shown in your Authenticator app."
      )

      return
    }

    // -------------------------------------------------------
    // Validate factor
    // -------------------------------------------------------

    if (!factorId) {
      setMessage(
        "Authenticator setup session is missing. Please reload."
      )

      return
    }

    setWorking(true)

    try {
      // ---------------------------------------------------
      // 1. CREATE MFA CHALLENGE
      // ---------------------------------------------------

      const {
        data: challenge,
        error: challengeError,
      } =
        await supabase.auth.mfa.challenge({
          factorId,
        })

      if (challengeError) {
        throw challengeError
      }

      if (!challenge?.id) {
        throw new Error(
          "Unable to create MFA verification challenge."
        )
      }

      // ---------------------------------------------------
      // 2. VERIFY AUTHENTICATOR CODE
      // ---------------------------------------------------

      const {
        error: verifyError,
      } =
        await supabase.auth.mfa.verify({
          factorId,
          challengeId: challenge.id,
          code,
        })

      if (verifyError) {
        throw verifyError
      }

      // ---------------------------------------------------
      // 3. CONFIRM AAL2
      // ---------------------------------------------------

      const {
        data: aal,
        error: aalError,
      } =
        await supabase.auth.mfa
          .getAuthenticatorAssuranceLevel()

      if (aalError) {
        throw aalError
      }

      if (aal?.currentLevel !== "aal2") {
        throw new Error(
          "Authenticator verification did not complete."
        )
      }

      // ---------------------------------------------------
      // 4. SUCCESS
      // ---------------------------------------------------

      navigate("/faculty", {
        replace: true,
      })
    } catch (error) {
      console.error(
        "Faculty MFA verification error:",
        error
      )

      setMessage(
        error?.message?.toLowerCase().includes("expired")
          ? "This authentication code has expired. Enter the latest code from your Authenticator app."
          : "Invalid authentication code. Make sure your phone time is automatic and try again."
      )

      setCode("")
    } finally {
      setWorking(false)
    }
  }

  // =========================================================
  // LOADING SCREEN
  // =========================================================

  if (loading) {
    return (
      <main className="faculty-auth-page">
        <section className="faculty-auth-card">

          <p className="faculty-auth-kicker">
            FACULTY SECURITY
          </p>

          <h1>
            Preparing Authenticator
          </h1>

          <p className="faculty-auth-muted">
            Preparing your secure second-factor
            authentication.
          </p>

          <div className="faculty-auth-spinner" />

        </section>
      </main>
    )
  }

  // =========================================================
  // MFA SETUP SCREEN
  // =========================================================

  return (
    <main className="faculty-auth-page">

      <section className="faculty-auth-card">

        <p className="faculty-auth-kicker">
          FACULTY SECURITY
        </p>

        <h1>
          Set up Authenticator
        </h1>

        <p className="faculty-auth-muted">
          Scan this QR code with Google Authenticator
          or another TOTP authenticator, then enter
          the 6-digit code it generates.
        </p>

        {/* ================================================
            ERROR
        ================================================ */}

        {message && (
          <div className="faculty-auth-message faculty-auth-error">
            {message}
          </div>
        )}

        {/* ================================================
            QR CODE
        ================================================ */}

        {qrCode && (
          <div className="faculty-qr-wrapper">

            <img
              src={qrCode}
              alt="Authenticator setup QR code"
              className="faculty-qr-image"
              onError={(event) => {
                console.error(
                  "QR image failed to render."
                )

                event.currentTarget.style.display =
                  "none"
              }}
            />

          </div>
        )}

        {/* ================================================
            MANUAL SECRET
        ================================================ */}

        {secret && (
          <details className="faculty-secret-details">

            <summary>
              Can't scan the QR code?
            </summary>

            <p>
              Enter this setup key manually
              in Google Authenticator.
            </p>

            <code>
              {secret}
            </code>

          </details>
        )}

        {/* ================================================
            AUTHENTICATION FORM
        ================================================ */}

        <form onSubmit={handleEnable}>

          <label htmlFor="faculty-setup-code">
            Authentication code
          </label>

          <input
            id="faculty-setup-code"
            className="faculty-mfa-input"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(event) => {
              const value =
                event.target.value
                  .replace(/\D/g, "")
                  .slice(0, 6)

              setCode(value)

              if (message) {
                setMessage("")
              }
            }}
            placeholder="000000"
            autoFocus
          />

          <button
            type="submit"
            className="faculty-primary-button"
            disabled={
              working ||
              code.length !== 6
            }
          >
            {working
              ? "Enabling..."
              : "Enable Authenticator"}
          </button>

        </form>

      </section>

    </main>
  )
}

export default FacultyMfaSetup