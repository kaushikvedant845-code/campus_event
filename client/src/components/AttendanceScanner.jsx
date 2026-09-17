import { useEffect, useRef, useState } from "react"
import { Html5Qrcode } from "html5-qrcode"
import { Link } from "react-router-dom"
import { supabase } from "../lib/supabase"

function AttendanceScanner() {
  const scannerRef = useRef(null)
  const scannerRunningRef = useRef(false)
  const mountedRef = useRef(true)

  const [status, setStatus] = useState("scanning")
  const [message, setMessage] = useState("")
  const [sessionId, setSessionId] = useState("")
  const [code, setCode] = useState("")
  const [reportOpen, setReportOpen] = useState(false)
  const [reportText, setReportText] = useState("")
  const [reportSubmitted, setReportSubmitted] = useState(false)

  useEffect(() => {
    mountedRef.current = true

    return () => {
      mountedRef.current = false
    }
  }, [])

  // =========================================================
  // READ SESSION FROM URL
  // =========================================================

  useEffect(() => {
    const params = new URLSearchParams(
      window.location.search
    )

    const session = params.get("session")

    if (session) {
      setSessionId(session)
    }
  }, [])

  // =========================================================
  // START QR SCANNER
  // =========================================================

  useEffect(() => {
    if (sessionId) return

    let scanner = null
    let cancelled = false

    const startScanner = async () => {
      const reader =
        document.getElementById(
          "attendance-qr-reader"
        )

      if (!reader || cancelled) return

      scanner = new Html5Qrcode(
        "attendance-qr-reader"
      )

      scannerRef.current = scanner

      try {
        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: {
              width: 250,
              height: 250,
            },
            aspectRatio: 1,
          },

          async (decodedText) => {
            if (cancelled) return

            try {
              const url = new URL(decodedText)

              const session =
                url.searchParams.get(
                  "session"
                )

              if (!session) {
                setStatus("error")
                setMessage(
                  "Invalid attendance QR."
                )
                return
              }

              if (
                scanner &&
                scannerRunningRef.current
              ) {
                scannerRunningRef.current =
                  false

                try {
                  await scanner.stop()
                } catch (error) {
                  console.warn(
                    "Scanner stop warning:",
                    error
                  )
                }
              }

              if (mountedRef.current) {
                setSessionId(session)
                setStatus("checking")
              }

            } catch (error) {
              console.error(
                "QR error:",
                error
              )

              if (mountedRef.current) {
                setStatus("error")
                setMessage(
                  "Invalid attendance QR."
                )
              }
            }
          },

          () => {}
        )

        if (!cancelled) {
          scannerRunningRef.current =
            true

          setStatus("scanning")
        }

      } catch (error) {
        console.error(
          "Camera start error:",
          error
        )

        scannerRunningRef.current =
          false

        if (mountedRef.current) {
          setStatus("camera-error")
          setMessage(
            "Unable to access your camera. Please allow camera permission or report a problem below."
          )
        }
      }
    }

    startScanner()

    // =======================================================
    // SAFE CLEANUP
    // =======================================================

    return () => {
      cancelled = true

      const currentScanner =
        scannerRef.current

      if (
        currentScanner &&
        scannerRunningRef.current
      ) {
        scannerRunningRef.current =
          false

        currentScanner
          .stop()
          .catch(() => {})
          .finally(() => {
            try {
              currentScanner.clear()
            } catch {}
          })

      } else if (currentScanner) {
        try {
          currentScanner.clear()
        } catch {}
      }

      scannerRef.current = null
    }
  }, [sessionId])

  // =========================================================
  // GET LOCATION
  // =========================================================

  const getLocation = () => {
    return new Promise(
      (resolve, reject) => {

        if (!navigator.geolocation) {
          reject(
            new Error(
              "Location services are not available on this device."
            )
          )
          return
        }

        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              latitude:
                position.coords.latitude,

              longitude:
                position.coords.longitude,

              accuracy:
                position.coords.accuracy,
            })
          },

          () => {
            reject(
              new Error(
                "Your location could not be fetched. Attendance cannot be marked automatically."
              )
            )
          },

          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          }
        )
      }
    )
  }

  // =========================================================
  // VERIFY ATTENDANCE
  // =========================================================

  useEffect(() => {
    if (!sessionId) return

    verifyAttendance(sessionId)
  }, [sessionId])

  const verifyAttendance = async (
    session
  ) => {
    try {
      setStatus("checking")
      setMessage("")

      const {
        data: { user },
        error: authError,
      } =
        await supabase.auth.getUser()

      if (authError) {
        throw authError
      }

      if (!user) {
        setStatus("error")
        setMessage(
          "Please log in before marking attendance."
        )
        return
      }

      // -----------------------------------------------------
      // ATTENDANCE SESSION
      // -----------------------------------------------------

      const {
        data: attendanceSession,
        error: sessionError,
      } =
        await supabase
          .from("attendance_sessions")
          .select(
            "id, event_id, is_active, expires_at"
          )
          .eq("id", session)
          .eq("is_active", true)
          .maybeSingle()

      if (sessionError) {
        throw sessionError
      }

      if (!attendanceSession) {
        setStatus("error")
        setMessage(
          "This attendance session has expired or is no longer active."
        )
        return
      }

      if (
        new Date(
          attendanceSession.expires_at
        ) <= new Date()
      ) {
        setStatus("error")
        setMessage(
          "This attendance session has expired."
        )
        return
      }

      // -----------------------------------------------------
      // EVENT
      // -----------------------------------------------------

      const {
        data: event,
        error: eventError,
      } =
        await supabase
          .from("events")
          .select(
            "id, title, club_id"
          )
          .eq(
            "id",
            attendanceSession.event_id
          )
          .maybeSingle()

      if (eventError) {
        throw eventError
      }

      if (!event) {
        setStatus("error")
        setMessage(
          "Event information could not be found."
        )
        return
      }

      // -----------------------------------------------------
      // ACTIVE CLUB MEMBER REQUIRED
      // -----------------------------------------------------

      const {
        data: membership,
        error: membershipError,
      } =
        await supabase
          .from("club_memberships")
          .select("id")
          .eq(
            "profile_id",
            user.id
          )
          .eq(
            "club_id",
            event.club_id
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
        setStatus("error")
        setMessage(
          "You must be an active member of this event's club to receive attendance."
        )
        return
      }

      // -----------------------------------------------------
      // CHECK EXISTING ATTENDANCE
      // -----------------------------------------------------

      const {
        data: existingAttendance,
        error: existingError,
      } =
        await supabase
          .from("attendance")
          .select("id")
          .eq(
            "profile_id",
            user.id
          )
          .eq(
            "session_id",
            attendanceSession.id
          )
          .maybeSingle()

      if (existingError) {
        throw existingError
      }

      if (existingAttendance) {
        setStatus("already")
        setMessage(
          "Your attendance is already recorded for this session."
        )
        return
      }

      // -----------------------------------------------------
      // LOCATION REQUIRED
      // -----------------------------------------------------

      let location

      try {
        location =
          await getLocation()
      } catch (locationError) {
        setStatus("location-error")
        setMessage(
          locationError.message
        )
        return
      }

      // -----------------------------------------------------
      // RECORD ATTENDANCE
      // -----------------------------------------------------

      const {
        error: attendanceError,
      } =
        await supabase
          .from("attendance")
          .insert({
            profile_id: user.id,

            event_id:
              attendanceSession.event_id,

            session_id:
              attendanceSession.id,

            latitude:
              location.latitude,

            longitude:
              location.longitude,

            accuracy:
              location.accuracy,

            location_name: null,

            attendance_source: "QR",
          })

      if (attendanceError) {

        if (
          attendanceError.code ===
          "23505"
        ) {
          setStatus("already")
          setMessage(
            "Your attendance is already recorded for this session."
          )
          return
        }

        throw attendanceError
      }

      setStatus("success")

    } catch (error) {
      console.error(
        "Attendance verification error:",
        error
      )

      setStatus("error")
      setMessage(
        error?.message ||
          "Unable to verify attendance. Please try again."
      )
    }
  }

  // =========================================================
  // MANUAL CODE
  // =========================================================

  const submitCode = async () => {

    if (!/^\d{6}$/.test(code)) {
      setStatus("error")
      setMessage(
        "Enter a valid 6-digit attendance code."
      )
      return
    }

    try {
      setStatus("checking")
      setMessage("")

      const {
        data: session,
        error,
      } =
        await supabase
          .from("attendance_sessions")
          .select("id")
          .eq(
            "attendance_code",
            code
          )
          .eq(
            "is_active",
            true
          )
          .gt(
            "expires_at",
            new Date().toISOString()
          )
          .maybeSingle()

      if (error) {
        throw error
      }

      if (!session) {
        setStatus("error")
        setMessage(
          "Invalid or expired attendance code."
        )
        return
      }

      await verifyAttendance(
        session.id
      )

    } catch (error) {
      console.error(error)

      setStatus("error")
      setMessage(
        "Unable to verify attendance."
      )
    }
  }

  // =========================================================
  // SUCCESS
  // =========================================================

  if (status === "success") {
    return (
      <>
        <style>{styles}</style>

        <main className="qr-scanner-page">
          <section className="qr-scanner-card qr-scanner-result">

            <div className="qr-scanner-label">
              EVENT ATTENDANCE
            </div>

            <h1>
              Attendance Verified
            </h1>

            <p>
              Your attendance has been
              successfully recorded.
            </p>

            <Link
              to="/dashboard"
              className="qr-scanner-primary-button"
            >
              Back to Dashboard
            </Link>

          </section>
        </main>
      </>
    )
  }

  // =========================================================
  // ALREADY RECORDED
  // =========================================================

  if (status === "already") {
    return (
      <>
        <style>{styles}</style>

        <main className="qr-scanner-page">
          <section className="qr-scanner-card qr-scanner-result">

            <div className="qr-scanner-label">
              EVENT ATTENDANCE
            </div>

            <h1>
              Already Recorded
            </h1>

            <p>
              {message}
            </p>

            <Link
              to="/dashboard"
              className="qr-scanner-primary-button"
            >
              Back to Dashboard
            </Link>

          </section>
        </main>
      </>
    )
  }

  // =========================================================
  // MAIN
  // =========================================================

  return (
    <>
      <style>{styles}</style>

      <main className="qr-scanner-page">

        <section className="qr-scanner-card">

          <div className="qr-scanner-heading">

            <div className="qr-scanner-label">
              EVENT ATTENDANCE
            </div>

            <h1>
              Scan-QR
            </h1>

            <p>
              Scan the live QR displayed by
              your Club Head.
            </p>

          </div>

          <div
            id="attendance-qr-reader"
            className="qr-scanner-reader"
          />

          {status === "scanning" && (
            <p className="qr-scanner-hint">
              Point your camera at the
              attendance QR.
            </p>
          )}

          {status === "checking" && (
            <div className="qr-scanner-message">
              Verifying attendance...
            </div>
          )}

          {message &&
            status !== "checking" && (
              <div className="qr-scanner-error">
                {message}
              </div>
            )}

          <div className="qr-scanner-divider">
            OR
          </div>

          <div className="qr-scanner-code">

            <label htmlFor="attendance-code">
              Enter attendance code
            </label>

            <input
              id="attendance-code"
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(event) =>
                setCode(
                  event.target.value
                    .replace(/\D/g, "")
                    .slice(0, 6)
                )
              }
              placeholder="6-digit code"
            />

            <button
              type="button"
              className="qr-scanner-primary-button"
              onClick={submitCode}
              disabled={
                status === "checking"
              }
            >
              {status === "checking"
                ? "Checking..."
                : "Verify Code"}
            </button>

          </div>

          {/* REPORT PROBLEM */}

          <div className="qr-scanner-report">

            <button
              type="button"
              className="qr-scanner-report-button"
              onClick={() =>
                setReportOpen(
                  (value) => !value
                )
              }
            >
              Report a Problem
            </button>

            {reportOpen && (
              <div className="qr-scanner-report-form">

                {reportSubmitted ? (

                  <p className="qr-scanner-report-success">
                    Your problem has been reported
                    to the Club Head for verification.
                  </p>

                ) : (

                  <>
                    <label htmlFor="attendance-report">
                      Describe the problem
                    </label>

                    <textarea
                      id="attendance-report"
                      rows={4}
                      value={reportText}
                      onChange={(event) =>
                        setReportText(
                          event.target.value
                        )
                      }
                      placeholder="Example: QR scanner is not working."
                    />

                    <button
                      type="button"
                      className="qr-scanner-primary-button"
                      disabled={
                        !reportText.trim()
                      }
                      onClick={() => {
                        setReportSubmitted(
                          true
                        )
                      }}
                    >
                      Submit Report
                    </button>
                  </>
                )}

              </div>
            )}

          </div>

          <Link
            to="/dashboard"
            className="qr-scanner-back"
          >
            Back to Dashboard
          </Link>

        </section>

      </main>
    </>
  )
}

const styles = `
  .qr-scanner-page {
    width: 100%;
    min-height: calc(100vh - 80px);
    box-sizing: border-box;

    padding: 40px 20px 70px;

    display: flex;
    justify-content: center;
    align-items: flex-start;

    background: #f5f7fb;
  }

  .qr-scanner-card {
    width: min(520px, 100%);
    box-sizing: border-box;

    padding: 30px;

    border: 1px solid #dce5f0;
    border-radius: 18px;

    background: #ffffff;

    box-shadow:
      0 12px 35px rgba(20, 45, 75, 0.08);
  }

  .qr-scanner-heading {
    text-align: center;
  }

  .qr-scanner-label {
    margin-bottom: 8px;

    color: #71839b;

    font-size: 10px;
    font-weight: 800;

    letter-spacing: .14em;
  }

  .qr-scanner-card h1 {
    margin: 0;

    color: #132238;

    font-size: 30px;
    line-height: 1.15;
  }

  .qr-scanner-heading p {
    margin: 10px auto 0;

    color: #71839b;

    font-size: 13px;
    line-height: 1.5;
  }

  .qr-scanner-reader {
    width: 100%;
    height: 330px;

    margin-top: 25px;

    overflow: hidden;

    border: 1px solid #dce5f0;
    border-radius: 14px;

    background: #111111;
  }

  .qr-scanner-reader video {
    width: 100% !important;
    height: 100% !important;

    display: block;

    object-fit: cover;
  }

  .qr-scanner-reader > div {
    max-width: 100% !important;
  }

  .qr-scanner-hint {
    margin: 10px 0 0;

    color: #71839b;

    font-size: 11px;

    text-align: center;
  }

  .qr-scanner-message,
  .qr-scanner-error {
    margin-top: 14px;
    padding: 11px 13px;

    border-radius: 9px;

    font-size: 12px;
    line-height: 1.5;

    text-align: center;
  }

  .qr-scanner-message {
    background: #f1f5f9;
    color: #475569;
  }

  .qr-scanner-error {
    border: 1px solid #fecdd3;

    background: #fff1f2;
    color: #9f1239;
  }

  .qr-scanner-divider {
    display: flex;
    align-items: center;
    justify-content: center;

    margin: 24px 0;

    color: #94a3b8;

    font-size: 10px;
    font-weight: 800;
  }

  .qr-scanner-code {
    display: grid;
    gap: 9px;
  }

  .qr-scanner-code label,
  .qr-scanner-report-form label {
    color: #435872;

    font-size: 12px;
    font-weight: 750;
  }

  .qr-scanner-code input,
  .qr-scanner-report-form textarea {
    width: 100%;
    box-sizing: border-box;

    border: 1px solid #ccd8e6;
    border-radius: 10px;

    background: #ffffff;
    color: #172b45;

    font: inherit;
  }

  .qr-scanner-code input {
    height: 45px;

    padding: 0 12px;

    font-size: 14px;
    letter-spacing: .08em;
  }

  .qr-scanner-code input:focus,
  .qr-scanner-report-form textarea:focus {
    outline: none;

    border-color: #315f96;

    box-shadow:
      0 0 0 3px rgba(49, 95, 150, .08);
  }

  .qr-scanner-primary-button {
    min-height: 44px;

    padding: 0 17px;

    border: 1px solid #173f6e;
    border-radius: 10px;

    background: #173f6e;
    color: #ffffff !important;

    display: inline-flex;
    align-items: center;
    justify-content: center;

    font-size: 12px;
    font-weight: 800;

    text-decoration: none !important;

    cursor: pointer;
  }

  .qr-scanner-primary-button:disabled {
    opacity: .55;
    cursor: not-allowed;
  }

  .qr-scanner-report {
    margin-top: 24px;
    padding-top: 19px;

    border-top: 1px solid #edf1f6;

    text-align: center;
  }

  .qr-scanner-report-button {
    border: 0;
    padding: 0;

    background: transparent;

    color: #315f96;

    font: inherit;
    font-size: 12px;
    font-weight: 750;

    cursor: pointer;
  }

  .qr-scanner-report-form {
    display: grid;
    gap: 9px;

    margin-top: 15px;

    text-align: left;
  }

  .qr-scanner-report-form textarea {
    min-height: 90px;

    padding: 11px 12px;

    resize: vertical;

    font-size: 12px;
  }

  .qr-scanner-report-form
    .qr-scanner-primary-button {
    width: 100%;
  }

  .qr-scanner-report-success {
    margin: 0;

    padding: 12px;

    border-radius: 9px;

    background: #f0fdf4;
    color: #166534;

    font-size: 12px;
    line-height: 1.5;
  }

  .qr-scanner-back {
    display: block;

    margin-top: 19px;

    color: #71839b;

    font-size: 11px;
    font-weight: 700;

    text-align: center;

    text-decoration: none !important;
  }

  .qr-scanner-result {
    text-align: center;
  }

  .qr-scanner-result > p {
    margin: 10px 0 0;

    color: #71839b;

    font-size: 13px;
    line-height: 1.5;
  }

  .qr-scanner-result
    .qr-scanner-primary-button {
    width: 100%;
    margin-top: 24px;
  }

  @media (max-width: 560px) {
    .qr-scanner-page {
      padding: 25px 14px 50px;
    }

    .qr-scanner-card {
      padding: 22px 17px;
      border-radius: 15px;
    }

    .qr-scanner-card h1 {
      font-size: 27px;
    }

    .qr-scanner-reader {
      height: 270px;
    }
  }
`

export default AttendanceScanner