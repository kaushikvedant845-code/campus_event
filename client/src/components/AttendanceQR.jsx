import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"

function AttendanceQR({ eventId, clubHeadId, onClose }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [remaining, setRemaining] = useState(0)

  useEffect(() => {
    let mounted = true

    const startSession = async () => {
      try {
        setLoading(true)
        setError("")

        if (!eventId) {
          throw new Error("Event ID is missing.")
        }

        const { data, error: rpcError } = await supabase.rpc(
          "club_head_start_attendance_session",
          {
            p_event_id: eventId,
          }
        )

        if (rpcError) {
          throw rpcError
        }

        const createdSession = Array.isArray(data)
          ? data[0]
          : data

        if (!createdSession?.id) {
          throw new Error(
            "Attendance session was not created."
          )
        }

        if (!mounted) return

        setSession(createdSession)
      } catch (err) {
        console.error(
          "Attendance session creation error:",
          err
        )

        if (!mounted) return

        setError(
          err?.message ||
            "Unable to start attendance. Please try again."
        )
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    startSession()

    return () => {
      mounted = false
    }
  }, [eventId])

  useEffect(() => {
    if (!session?.expires_at) return

    const updateTimer = () => {
      const seconds = Math.max(
        0,
        Math.floor(
          (new Date(session.expires_at).getTime() -
            Date.now()) /
            1000
        )
      )

      setRemaining(seconds)

      if (seconds <= 0) {
        setSession((current) =>
          current
            ? {
                ...current,
                is_active: false,
              }
            : current
        )
      }
    }

    updateTimer()

    const timer = window.setInterval(
      updateTimer,
      1000
    )

    return () => {
      window.clearInterval(timer)
    }
  }, [session?.expires_at])

  const stopSession = async () => {
    try {
      if (session?.id) {
        const { error: stopError } = await supabase
          .from("attendance_sessions")
          .update({
            is_active: false,
          })
          .eq("id", session.id)

        if (stopError) {
          console.error(
            "Attendance session stop error:",
            stopError
          )
        }
      }
    } finally {
      onClose?.()
    }
  }

  const minutes = Math.floor(remaining / 60)
  const seconds = remaining % 60

  /*
   * IMPORTANT:
   * Do NOT use qrcode.react here.
   *
   * The current project has a React/qrcode.react hook
   * compatibility problem. The approval page already uses
   * QuickChart successfully, so attendance uses the same
   * image-based QR approach.
   */
  const attendanceUrl = session?.id
    ? `${window.location.origin}/attendance/check-in?session=${encodeURIComponent(
        session.id
      )}`
    : ""

  const qrUrl = attendanceUrl
    ? `https://quickchart.io/qr?text=${encodeURIComponent(
        attendanceUrl
      )}&size=300&margin=2&ecLevel=H`
    : ""

  if (loading) {
    return (
      <div className="attendance-overlay">
        <div className="attendance-modal">
          <div className="attendance-header">
            <div>
              <p className="attendance-label">
                LIVE ATTENDANCE
              </p>

              <h2>Starting Attendance</h2>
            </div>

            <button
              type="button"
              className="attendance-close"
              onClick={() => onClose?.()}
            >
              ×
            </button>
          </div>

          <div className="attendance-loading">
            Creating a secure attendance session...
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="attendance-overlay">
        <div className="attendance-modal">
          <div className="attendance-header">
            <div>
              <p className="attendance-label">
                ATTENDANCE
              </p>

              <h2>Attendance Error</h2>
            </div>

            <button
              type="button"
              className="attendance-close"
              onClick={() => onClose?.()}
            >
              ×
            </button>
          </div>

          <div className="attendance-error">
            {error}
          </div>

          <button
            type="button"
            className="attendance-stop-button"
            onClick={() => onClose?.()}
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  if (!session?.id || !session?.is_active) {
    return (
      <div className="attendance-overlay">
        <div className="attendance-modal">
          <div className="attendance-header">
            <div>
              <p className="attendance-label">
                ATTENDANCE
              </p>

              <h2>Attendance Session Ended</h2>
            </div>

            <button
              type="button"
              className="attendance-close"
              onClick={() => onClose?.()}
            >
              ×
            </button>
          </div>

          <p className="attendance-help">
            This attendance session is no longer active.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="attendance-overlay">
      <div className="attendance-modal">

        <div className="attendance-header">
          <div>
            <p className="attendance-label">
              LIVE ATTENDANCE
            </p>

            <h2>Scan to Check In</h2>
          </div>

          <button
            type="button"
            className="attendance-close"
            onClick={stopSession}
            aria-label="Close attendance"
          >
            ×
          </button>
        </div>

        <div className="attendance-qr-wrapper">
          <img
            src={qrUrl}
            alt="Live attendance QR code"
            width="300"
            height="300"
            loading="eager"
            referrerPolicy="no-referrer"
          />
        </div>

        <div className="attendance-code-box">
          <span>Backup Attendance Code</span>

          <strong>
            {session.attendance_code}
          </strong>
        </div>

        <div className="attendance-timer">
          Session expires in{" "}

          <strong>
            {minutes}:{seconds
              .toString()
              .padStart(2, "0")}
          </strong>
        </div>

        <p className="attendance-help">
          Students can scan this QR code from the Campus
          Event app.
        </p>

        <button
          type="button"
          className="attendance-stop-button"
          onClick={stopSession}
        >
          Stop Attendance
        </button>

      </div>
    </div>
  )
}

export default AttendanceQR
