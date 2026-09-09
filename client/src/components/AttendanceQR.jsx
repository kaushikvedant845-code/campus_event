import { useEffect, useState } from "react"
import { QRCodeCanvas } from "qrcode.react"
import { supabase } from "../lib/supabase"

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

function AttendanceQR({ eventId, clubHeadId, onClose }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [remaining, setRemaining] = useState(0)
  const [error, setError] = useState("")

  useEffect(() => {
    const startSession = async () => {
      try {
        setLoading(true)

        const code = generateCode()

        const expiresAt = new Date(
          Date.now() + 5 * 60 * 1000
        )

        const { data, error } = await supabase
          .from("attendance_sessions")
          .insert({
            event_id: eventId,
            club_head_id: clubHeadId,
            attendance_code: code,
            expires_at: expiresAt.toISOString(),
            is_active: true,
          })
          .select()
          .single()

        if (error) throw error

        setSession(data)
      } catch (err) {
        console.error(err)
        setError("Unable to start attendance.")
      } finally {
        setLoading(false)
      }
    }

    startSession()
  }, [eventId, clubHeadId])

  useEffect(() => {
    if (!session) return

    const updateTimer = () => {
      const difference =
        new Date(session.expires_at).getTime() -
        Date.now()

      const seconds = Math.max(
        0,
        Math.floor(difference / 1000)
      )

      setRemaining(seconds)

      if (seconds === 0) {
        endSession()
      }
    }

    updateTimer()

    const timer = setInterval(updateTimer, 1000)

    return () => clearInterval(timer)
  }, [session])

  const endSession = async () => {
    if (!session) return

    await supabase
      .from("attendance_sessions")
      .update({
        is_active: false,
      })
      .eq("id", session.id)

    onClose()
  }

  const minutes = Math.floor(remaining / 60)
  const seconds = remaining % 60

  if (loading) {
    return (
      <div className="attendance-modal">
        <p>Starting attendance...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="attendance-modal">
        <h2>Attendance Error</h2>
        <p>{error}</p>

        <button onClick={onClose}>
          Close
        </button>
      </div>
    )
  }

  if (!session) return null

  const scanUrl =
    `${window.location.origin}/attendance/check-in?session=${session.id}`

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
            onClick={endSession}
          >
            ×
          </button>
        </div>

        <div className="attendance-qr-wrapper">

          <QRCodeCanvas
            value={scanUrl}
            size={250}
            level="H"
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
          Students can scan this QR code
          from the Campus Event app.
        </p>

        <button
          type="button"
          className="attendance-stop-button"
          onClick={endSession}
        >
          Stop Attendance
        </button>

      </div>

    </div>
  )
}

export default AttendanceQR