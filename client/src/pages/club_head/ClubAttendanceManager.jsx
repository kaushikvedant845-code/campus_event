import { useMemo, useState } from "react"
import { supabase } from "../../lib/supabase"
import AttendanceQR from "../../components/AttendanceQR"

function ClubAttendanceManager({
  events = [],
  selectedClubId = null,
  clubHeadId = null,
}) {
  const getToday = () => {
    const value = new Date()
    value.setHours(0, 0, 0, 0)
    return value
  }

  const [calendarDate, setCalendarDate] = useState(getToday())
  const [selectedDate, setSelectedDate] = useState(getToday())
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [participants, setParticipants] = useState([])
  const [participantsLoading, setParticipantsLoading] = useState(false)
  const [participantsError, setParticipantsError] = useState("")
  const [showQR, setShowQR] = useState(false)

  const dateKey = (date) => {
    if (!date) return ""
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
  }

  const parseDateKey = (value) => {
    if (value instanceof Date) {
      const date = new Date(value)
      date.setHours(0, 0, 0, 0)
      return date
    }

    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split("-").map(Number)
      return new Date(year, month - 1, day)
    }

    const date = new Date(value)
    date.setHours(0, 0, 0, 0)
    return date
  }

  const formatDate = (value) => {
    if (!value) return "Date pending"
    return parseDateKey(value).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  }

  const formatTime = (time) => {
    if (!time) return "Time pending"
    const clean = String(time).slice(0, 8)
    const [hours, minutes] = clean.split(":").map(Number)
    const date = new Date()
    date.setHours(hours || 0, minutes || 0, 0, 0)
    return date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const eventStart = (event) => {
    const time = String(event?.start_time || "00:00:00").slice(0, 8)
    return new Date(`${event.event_date}T${time}`)
  }

  const eventEnd = (event) => {
    const time = String(event?.end_time || "23:59:59").slice(0, 8)
    return new Date(`${event.event_date}T${time}`)
  }

  const isApproved = (event) =>
    event?.approval_status === "APPROVED" &&
    event?.head_decision === "PUBLISHED"

  const today = getToday()
  const todayKey = dateKey(today)

  const isYesterday = (value) => {
    const date = parseDateKey(value)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    return date.getTime() === yesterday.getTime()
  }

  const isToday = (value) => dateKey(parseDateKey(value)) === todayKey

  const isFutureDate = (value) => parseDateKey(value) > today

  const isOlderDate = (value) => parseDateKey(value) < today && !isYesterday(value)

  const canTakeAttendance = (event) => {
    if (!event?.event_date || !event?.start_time || !isApproved(event)) return false

    if (isYesterday(event.event_date)) return true

    if (isToday(event.event_date)) {
      return new Date() >= eventStart(event)
    }

    return false
  }

  const getEventState = (event) => {
    if (isYesterday(event.event_date)) return "YESTERDAY"

    if (isToday(event.event_date)) {
      const now = new Date()
      if (now < eventStart(event)) return "NOT STARTED"
      if (now <= eventEnd(event)) return "LIVE"
      return "COMPLETED"
    }

    if (isFutureDate(event.event_date)) return "UPCOMING"
    return "COMPLETED"
  }

  const clubEvents = useMemo(
    () =>
      events
        .filter(
          (event) =>
            event?.club_id === selectedClubId &&
            event?.event_date &&
            isApproved(event)
        )
        .sort((a, b) => eventStart(a).getTime() - eventStart(b).getTime()),
    [events, selectedClubId]
  )

  const eventsByDate = useMemo(() => {
    const map = new Map()
    clubEvents.forEach((event) => {
      const key = event.event_date
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(event)
    })
    return map
  }, [clubEvents])

  const calendarDays = useMemo(() => {
    const year = calendarDate.getFullYear()
    const month = calendarDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startOffset = (firstDay.getDay() + 6) % 7
    const days = []

    for (let index = 0; index < startOffset; index += 1) days.push(null)
    for (let day = 1; day <= lastDay.getDate(); day += 1) {
      days.push(new Date(year, month, day))
    }

    return days
  }, [calendarDate])

  const selectedDateKey = dateKey(selectedDate)
  const selectedDayEvents = eventsByDate.get(selectedDateKey) || []

  const selectedDateLabel = selectedDate.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  const selectedDateState = isToday(selectedDate)
    ? "TODAY"
    : isYesterday(selectedDate)
    ? "YESTERDAY"
    : isFutureDate(selectedDate)
    ? "UPCOMING DATE"
    : "ATTENDANCE RECORD"

  const openEvent = async (event) => {
    setSelectedEvent(event)
    setParticipants([])
    setParticipantsError("")
    setShowQR(false)
    setParticipantsLoading(true)

    try {
      const actionable = canTakeAttendance(event)

      if (!actionable) {
        setParticipantsLoading(false)
        return
      }

      const { data: registrationRows, error: registrationError } = await supabase
        .from("registrations")
        .select("id, profile_id, registered_at")
        .eq("event_id", event.id)
        .order("registered_at", { ascending: true })

      if (registrationError) throw registrationError

      const profileIds = [
        ...new Set(
          (registrationRows || []).map((row) => row.profile_id).filter(Boolean)
        ),
      ]

      if (profileIds.length === 0) return

      const { data: activeMemberRows, error: activeMemberError } =
        await supabase.rpc("club_head_active_members", {
          p_club_id: event.club_id,
        })

      if (activeMemberError) throw activeMemberError

      const activeMemberIds = new Set(
        (activeMemberRows || [])
          .map((member) => member.profile_id || member.student_id || member.id)
          .filter(Boolean)
      )

      const eligibleRegistrations = (registrationRows || []).filter((row) =>
        activeMemberIds.has(row.profile_id)
      )

      const eligibleProfileIds = eligibleRegistrations.map(
        (row) => row.profile_id
      )

      if (eligibleProfileIds.length === 0) return

      const [
        { data: profiles, error: profilesError },
        { data: studentProfiles, error: studentProfilesError },
        { data: attendanceRows, error: attendanceError },
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", eligibleProfileIds),
        supabase
          .from("student_profiles")
          .select(
            "profile_id, admission_no, phone, program_name, department, year, academic_session"
          )
          .in("profile_id", eligibleProfileIds),
        supabase
          .from("attendance")
          .select("id, profile_id, event_id, verified_at, attendance_source")
          .eq("event_id", event.id)
          .in("profile_id", eligibleProfileIds),
      ])

      if (profilesError) throw profilesError
      if (studentProfilesError) throw studentProfilesError
      if (attendanceError) throw attendanceError

      const profileMap = new Map((profiles || []).map((item) => [item.id, item]))
      const studentProfileMap = new Map(
        (studentProfiles || []).map((item) => [item.profile_id, item])
      )
      const attendanceMap = new Map(
        (attendanceRows || []).map((item) => [item.profile_id, item])
      )

      setParticipants(
        eligibleRegistrations.map((registration) => ({
          ...registration,
          profile: profileMap.get(registration.profile_id) || {},
          studentProfile:
            studentProfileMap.get(registration.profile_id) || {},
          attendance: attendanceMap.get(registration.profile_id) || null,
        }))
      )
    } catch (error) {
      console.error("Attendance participant load error:", error)
      setParticipantsError(
        error?.message || "Unable to load eligible event participants."
      )
    } finally {
      setParticipantsLoading(false)
    }
  }

  const changeMonth = (offset) => {
    setCalendarDate(
      (previous) =>
        new Date(previous.getFullYear(), previous.getMonth() + offset, 1)
    )
  }

  const resetToToday = () => {
    const current = getToday()
    setCalendarDate(current)
    setSelectedDate(current)
  }

  const monthLabel = calendarDate.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  })

  return (
    <div className="club-attendance-manager">
      <div className="club-attendance-main-grid">
        <section className="club-attendance-calendar-card">
          <div className="club-attendance-calendar-header">
            <div>
              <span className="club-attendance-kicker">ATTENDANCE CALENDAR</span>
              <h3>Club Events Calendar</h3>
              <p>
                Click a date to view events and manage attendance. Attendance
                can be marked for yesterday and for events that have already
                started today.
              </p>
            </div>

            <button
              type="button"
              className="club-attendance-today-button"
              onClick={resetToToday}
            >
              Today
            </button>
          </div>

          <div className="club-attendance-calendar-controls">
            <button type="button" onClick={() => changeMonth(-1)}>
              ←&nbsp; Previous
            </button>
            <strong>{monthLabel}</strong>
            <button type="button" onClick={() => changeMonth(1)}>
              Next&nbsp; →
            </button>
          </div>

          <div className="club-attendance-weekdays">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
              (day) => <span key={day}>{day}</span>
            )}
          </div>

          <div className="club-attendance-calendar-grid">
            {calendarDays.map((date, index) => {
              if (!date) {
                return (
                  <div
                    className="club-attendance-calendar-empty"
                    key={`empty-${index}`}
                  />
                )
              }

              const key = dateKey(date)
              const dayEvents = eventsByDate.get(key) || []
              const current = isToday(date)
              const yesterday = isYesterday(date)
              const future = isFutureDate(date)
              const older = isOlderDate(date)
              const selected = key === selectedDateKey

              return (
                <button
                  type="button"
                  key={key}
                  className={[
                    "club-attendance-calendar-day",
                    current ? "today" : "",
                    yesterday ? "yesterday" : "",
                    future ? "future" : "",
                    older ? "older" : "",
                    selected ? "selected" : "",
                    dayEvents.length ? "has-events" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => setSelectedDate(new Date(date))}
                >
                  <strong>{date.getDate()}</strong>

                  {dayEvents.length > 0 && (
                    <span className="club-attendance-day-count">
                      {String(dayEvents.length).padStart(2, "0")} {dayEvents.length === 1 ? "event" : "events"}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          <div className="club-attendance-calendar-legend">
            <span><i className="legend-dot upcoming" /> Upcoming event(s)</span>
            <span><i className="legend-dot live" /> Ongoing event(s)</span>
            <span><i className="legend-dot past" /> Past event(s)</span>
          </div>
        </section>

        <aside className="club-attendance-selected-card">
          <div className="club-attendance-day-header">
            <div>
              <span className="club-attendance-kicker">SELECTED DATE</span>
              <h3>{selectedDateLabel}</h3>
              <p>
                {selectedDayEvents.length} {selectedDayEvents.length === 1 ? "event" : "events"} scheduled
              </p>
            </div>
          </div>

          {selectedDayEvents.length === 0 ? (
            <div className="club-attendance-empty">
              <strong>No club events on this date.</strong>
            </div>
          ) : (
            <div className="club-attendance-selected-events">
              {selectedDayEvents.map((event) => {
                const state = getEventState(event)
                const actionable = canTakeAttendance(event)
                const eventEnded = new Date() > eventEnd(event)

                return (
                  <article
                    className={`club-attendance-selected-event ${actionable ? "actionable" : "locked"}`}
                    key={event.id}
                  >
                    <div className="club-attendance-event-topline">
                      <span>
                        {formatTime(event.start_time)} – {formatTime(event.end_time)}
                      </span>
                      <span className={`club-attendance-status ${state.toLowerCase().replace(" ", "-")}`}>
                        {state === "LIVE" ? "Ongoing" : state === "NOT STARTED" ? "Not Started" : state === "YESTERDAY" ? "Yesterday" : state === "UPCOMING" ? "Upcoming" : "Past"}
                      </span>
                    </div>

                    <h4>{event.title}</h4>

                    <div className="club-attendance-event-meta">
                      <span>
                        {event.assigned_venue || event.requested_venue || "Venue not assigned"}
                      </span>
                    </div>

                    <div className="club-attendance-event-footer">
                      <span className="club-attendance-registration-count">
                        {event.registration_count || event.registered_count || "—"} registered
                      </span>

                      {actionable ? (
                        <button
                          type="button"
                          className="club-attendance-take-button"
                          onClick={() => openEvent(event)}
                        >
                          Take Attendance
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="club-attendance-disabled-button"
                          disabled
                          title={
                            eventEnded && isToday(event.event_date)
                              ? "Today's event has ended."
                              : "Attendance is locked for this event."
                          }
                        >
                          Locked
                        </button>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          )}

          <div className="club-attendance-rules-card">
            <strong>Attendance Rules</strong>
            <ul>
              <li>You can mark attendance for yesterday's events.</li>
              <li>For today, attendance can only be marked after the event has started.</li>
              <li>Future dates and events that have not started are locked.</li>
              <li>Only active members of the event's club are eligible.</li>
            </ul>
          </div>

          <div className="club-attendance-total-card">
            <strong>{selectedDayEvents.length}</strong>
            <span>
              Total: {selectedDayEvents.length} {selectedDayEvents.length === 1 ? "event" : "events"} on this date
            </span>
          </div>
        </aside>
      </div>

      {selectedEvent && canTakeAttendance(selectedEvent) && !showQR && (
        <div
          className="club-attendance-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedEvent(null)
              setShowQR(false)
            }
          }}
        >
          <section className="club-attendance-modal">
            <div className="club-attendance-modal-header">
              <div>
                <span className="club-attendance-kicker">ATTENDANCE CHECKLIST</span>
                <h3>{selectedEvent.title}</h3>
                <p>
                  {formatDate(selectedEvent.event_date)} · {formatTime(selectedEvent.start_time)} – {formatTime(selectedEvent.end_time)}
                </p>
              </div>

              <button
                type="button"
                className="club-attendance-close"
                onClick={() => {
                  setSelectedEvent(null)
                  setShowQR(false)
                }}
              >
                Close
              </button>
            </div>

            <div className="club-attendance-rule">
              Only students registered for this event and active members of this event's club are eligible for attendance.
            </div>

            {participantsLoading ? (
              <div className="club-attendance-loading">Loading participants...</div>
            ) : participantsError ? (
              <div className="club-attendance-error">{participantsError}</div>
            ) : (
              <>
                <div className="club-attendance-participant-summary">
                  <strong>{participants.length}</strong>
                  <span>Eligible Participants</span>
                  <strong>{participants.filter((participant) => participant.attendance).length}</strong>
                  <span>Attendance Recorded</span>
                </div>

                <div className="club-attendance-participant-list">
                  {participants.length === 0 ? (
                    <div className="club-attendance-empty">
                      <strong>No eligible registered participants.</strong>
                    </div>
                  ) : (
                    participants.map((participant) => (
                      <div className="club-attendance-participant-row" key={participant.id}>
                        <div>
                          <strong>{participant.profile?.full_name || "Student"}</strong>
                          <span>{participant.studentProfile?.admission_no || "Admission No. unavailable"}</span>
                        </div>
                        <span className={participant.attendance ? "club-attendance-present" : "club-attendance-not-marked"}>
                          {participant.attendance ? "Present" : "Not Marked"}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                <div className="club-attendance-modal-actions">
                  <button
                    type="button"
                    className="club-attendance-qr-button"
                    onClick={() => setShowQR(true)}
                    disabled={!clubHeadId}
                  >
                    Generate QR
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      )}

      {showQR && selectedEvent && (
        <AttendanceQR
          eventId={selectedEvent.id}
          clubHeadId={clubHeadId}
          onClose={() => setShowQR(false)}
        />
      )}
    </div>
  )
}

export default ClubAttendanceManager
