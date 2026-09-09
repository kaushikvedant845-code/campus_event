import { useEffect, useState } from "react"
import { Html5Qrcode } from "html5-qrcode"
import { supabase } from "../lib/supabase"

function AttendanceScanner() {
  const [status, setStatus] = useState("scanning")
  const [message, setMessage] = useState("")
  const [code, setCode] = useState("")
  const [sessionId, setSessionId] = useState("")

  useEffect(() => {
    const params = new URLSearchParams(
      window.location.search
    )

    const session = params.get("session")

    if (session) {
      setSessionId(session)
    }
  }, [])

  useEffect(() => {
    if (sessionId) return

    const scanner = new Html5Qrcode(
      "attendance-reader"
    )

    scanner
      .start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: 250,
        },
        async (decodedText) => {

          await scanner.stop()

          try {
            const url = new URL(decodedText)

            const session =
              url.searchParams.get("session")

            if (!session) {
              setStatus("error")
              setMessage("Invalid attendance QR.")
              return
            }

            setSessionId(session)

          } catch {
            setStatus("error")
            setMessage("Invalid attendance QR.")
          }
        },
        () => {}
      )
      .catch((error) => {
        console.error(error)

        setStatus("error")
        setMessage(
          "Unable to access your camera."
        )
      })

    return () => {
      scanner.stop().catch(() => {})
    }
  }, [sessionId])

  useEffect(() => {
    if (!sessionId) return

    markAttendance(sessionId)
  }, [sessionId])

  const markAttendance = async (session) => {
    try {
      setStatus("checking")

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setStatus("error")
        setMessage(
          "Please log in before checking attendance."
        )
        return
      }

      const { data: attendanceSession, error } =
        await supabase
          .from("attendance_sessions")
          .select("*")
          .eq("id", session)
          .eq("is_active", true)
          .maybeSingle()

      if (error) throw error

      if (!attendanceSession) {
        setStatus("error")
        setMessage(
          "This attendance session has expired."
        )
        return
      }

      if (
        new Date(attendanceSession.expires_at) <
        new Date()
      ) {
        setStatus("error")
        setMessage(
          "This attendance session has expired."
        )
        return
      }

      const { data: student, error: studentError } =
        await supabase
          .from("students")
          .select("id")
          .eq("id", user.id)
          .maybeSingle()

      if (studentError) throw studentError

      if (!student) {
        setStatus("error")
        setMessage(
          "Student profile not found."
        )
        return
      }

      const { data: registration, error: registrationError } =
        await supabase
          .from("registrations")
          .select("id")
          .eq("student_id", user.id)
          .eq(
            "event_id",
            attendanceSession.event_id
          )
          .maybeSingle()

      if (registrationError) {
        throw registrationError
      }

      if (!registration) {
        setStatus("error")
        setMessage(
          "You are not registered for this event."
        )
        return
      }

      const { data: existingAttendance } =
        await supabase
          .from("attendance")
          .select("id")
          .eq("student_id", user.id)
          .eq(
            "event_id",
            attendanceSession.event_id
          )
          .maybeSingle()

      if (existingAttendance) {
        setStatus("already")
        setMessage(
          "Your attendance is already verified."
        )
        return
      }

      let latitude = null
      let longitude = null

      if ("geolocation" in navigator) {
        try {
          const position =
            await new Promise((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(
                resolve,
                reject,
                {
                  enableHighAccuracy: false,
                  timeout: 5000,
                }
              )
            })

          latitude =
            position.coords.latitude

          longitude =
            position.coords.longitude

        } catch {
          // GPS is optional.
        }
      }

      const { error: attendanceError } =
        await supabase
          .from("attendance")
          .insert({
            event_id:
              attendanceSession.event_id,

            student_id: user.id,

            session_id: attendanceSession.id,

            verified_at:
              new Date().toISOString(),

            latitude,

            longitude,

            location_name: null,
          })

      if (attendanceError) {

        if (
          attendanceError.code === "23505"
        ) {
          setStatus("already")
          setMessage(
            "Your attendance is already verified."
          )
          return
        }

        throw attendanceError
      }

      setStatus("success")

    } catch (error) {
      console.error(error)

      setStatus("error")
      setMessage(
        "Unable to mark attendance. Please try again."
      )
    }
  }

  const submitCode = async () => {
    if (!/^\d{6}$/.test(code)) {
      setMessage(
        "Enter a valid 6-digit attendance code."
      )
      return
    }

    try {
      setStatus("checking")

      const {
        data: session,
        error,
      } = await supabase
        .from("attendance_sessions")
        .select("id")
        .eq("attendance_code", code)
        .eq("is_active", true)
        .gt(
          "expires_at",
          new Date().toISOString()
        )
        .maybeSingle()

      if (error) throw error

      if (!session) {
        setStatus("error")
        setMessage(
          "Invalid or expired attendance code."
        )
        return
      }

      await markAttendance(session.id)

    } catch (error) {
      console.error(error)

      setStatus("error")
      setMessage(
        "Unable to verify attendance."
      )
    }
  }

  if (status === "success") {
    return (
      <main className="attendance-page">

        <div className="attendance-result success">

          <div className="attendance-result-icon">
            ✓
          </div>

          <h1>Attendance Verified</h1>

          <p>
            Your attendance has been successfully
            recorded.
          </p>

          <button
            onClick={() =>
              window.location.href =
                "/dashboard"
            }
          >
            Back to Dashboard
          </button>

        </div>

      </main>
    )
  }

  if (status === "already") {
    return (
      <main className="attendance-page">

        <div className="attendance-result">

          <div className="attendance-result-icon">
            ✓
          </div>

          <h1>Already Verified</h1>

          <p>{message}</p>

          <button
            onClick={() =>
              window.location.href =
                "/dashboard"
            }
          >
            Back to Dashboard
          </button>

        </div>

      </main>
    )
  }

  return (
    <main className="attendance-page">

      <div className="attendance-checkin-card">

        <p className="attendance-label">
          EVENT ATTENDANCE
        </p>

        <h1>Check In</h1>

        <p>
          Scan the attendance QR displayed
          by your Club Head.
        </p>

        {!sessionId && (
          <div
            id="attendance-reader"
            className="attendance-reader"
          />
        )}

        <div className="attendance-divider">
          <span>OR</span>
        </div>

        <div className="attendance-code-section">

          <label>
            Enter attendance code
          </label>

          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) =>
              setCode(
                e.target.value
                  .replace(/\D/g, "")
                  .slice(0, 6)
              )
            }
            placeholder="6-digit code"
          />

          <button
            type="button"
            onClick={submitCode}
            disabled={status === "checking"}
          >
            {status === "checking"
              ? "Checking..."
              : "Check In"}
          </button>

        </div>

        {message && (
          <p className="attendance-error">
            {message}
          </p>
        )}

      </div>

    </main>
  )
}

export default AttendanceScanner