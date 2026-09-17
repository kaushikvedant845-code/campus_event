import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { supabase } from "../../lib/supabase"
import "./ClubHeadDashboard.css"
import ClubAttendanceManager from "./ClubAttendanceManager"

function ClubHeadDashboard() {
  // =========================================================
  // PROFILE / CLUB
  // =========================================================

  const [profile, setProfile] = useState(null)
  const [club, setClub] = useState(null)
  const [clubs, setClubs] = useState([])
  const [selectedClubId, setSelectedClubId] = useState(null)

  // =========================================================
  // EVENTS
  // =========================================================

  const [events, setEvents] = useState([])

  // =========================================================
  // PAGE STATE
  // =========================================================

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // =========================================================
  // EVENT FILTER
  // =========================================================

  const [eventFilter, setEventFilter] = useState("all")
  const [showMyEvents, setShowMyEvents] = useState(true)

  // =========================================================
  // CLUB MANAGEMENT PANELS
  // =========================================================

  const [clubManagementPanel, setClubManagementPanel] = useState(null)
  const [recruitmentSubpanel, setRecruitmentSubpanel] = useState("form")

  // =========================================================
  // CLUB ATTENDANCE MANAGEMENT
  // =========================================================

  const [showClubAttendance, setShowClubAttendance] = useState(false)

  // =========================================================
  // RECRUITMENT MANAGEMENT
  // =========================================================

  const [recruitmentConfig, setRecruitmentConfig] = useState(null)
  const [recruitmentLoading, setRecruitmentLoading] = useState(false)
  const [recruitmentSaving, setRecruitmentSaving] = useState(false)
  const [recruitmentError, setRecruitmentError] = useState("")
  const [recruitmentSuccess, setRecruitmentSuccess] = useState("")
  const [recruitmentFilter, setRecruitmentFilter] = useState("ALL")
  const [applications, setApplications] = useState([])
  const [applicationsLoading, setApplicationsLoading] = useState(false)

  // =========================================================
  // ACTIVE CLUB MEMBERS
  // =========================================================

  const [activeMembers, setActiveMembers] = useState([])
  const [activeMembersLoading, setActiveMembersLoading] = useState(false)
  const [activeMembersError, setActiveMembersError] = useState("")
  const [questionDraft, setQuestionDraft] = useState({
    label: "",
    type: "short_text",
    required: true,
    options: ["", ""],
  })

  const defaultRecruitmentFields = [
    { key: "full_name", label: "Full Name" },
    { key: "phone", label: "Phone Number" },
    { key: "admission_no", label: "Admission Number" },
    { key: "academic_session", label: "Academic Session" },
    { key: "email", label: "Email" },
    { key: "department", label: "Branch / Department" },
    { key: "year", label: "Year / Semester" },
  ]

  // =========================================================
  // RECRUITMENT HELPERS
  // =========================================================

  const blankRecruitmentConfig = () => ({
    recruitment_status: "CLOSED",
    application_start_at: "",
    application_end_at: "",
    required_fields: [
      "full_name",
      "phone",
      "admission_no",
      "academic_session",
    ],
    custom_questions: [],
    fee_amount: 0,
    ticket_collection_start: "",
    ticket_collection_end: "",
    ticket_instruction:
      "Please get your ticket after successful fee submission between the mentioned dates.",
    terms_text:
      "I have read and agree to the above Terms & Conditions.",
    terms_version: 1,
  })

  const loadRecruitment = async (clubId = selectedClubId) => {
    if (!clubId) return

    setRecruitmentLoading(true)
    setRecruitmentError("")

    try {
      const { data, error: configError } = await supabase
        .from("club_recruitment_configs")
        .select(`
          club_id,
          recruitment_status,
          application_start_at,
          application_end_at,
          required_fields,
          custom_questions,
          fee_amount,
          ticket_collection_start,
          ticket_collection_end,
          ticket_instruction,
          terms_text,
          terms_version,
          updated_at
        `)
        .eq("club_id", clubId)
        .maybeSingle()

      if (configError) throw configError

      setRecruitmentConfig(
        data
          ? {
              ...blankRecruitmentConfig(),
              ...data,
              required_fields: Array.isArray(data.required_fields)
                ? data.required_fields
                : blankRecruitmentConfig().required_fields,
              custom_questions: Array.isArray(data.custom_questions)
                ? data.custom_questions
                : [],
              fee_amount: Number(data.fee_amount || 0),
              application_start_at: data.application_start_at
                ? data.application_start_at.slice(0, 16)
                : "",
              application_end_at: data.application_end_at
                ? data.application_end_at.slice(0, 16)
                : "",
              // The offline ticket workflow uses one fee + ticket collection date.
              // Keep the legacy end column aligned with the same date for compatibility.
              ticket_collection_start: data.ticket_collection_start || "",
              ticket_collection_end:
                data.ticket_collection_start ||
                data.ticket_collection_end ||
                "",
            }
          : blankRecruitmentConfig()
      )

      await loadRecruitmentApplications(clubId)
    } catch (err) {
      console.error("Recruitment load error:", err)
      setRecruitmentError(
        err?.message || "Unable to load recruitment configuration."
      )
      setRecruitmentConfig(blankRecruitmentConfig())
    } finally {
      setRecruitmentLoading(false)
    }
  }

  const loadRecruitmentApplications = async (clubId = selectedClubId) => {
    if (!clubId) return

    setApplicationsLoading(true)

    try {
      // Applicant profile data is loaded through a server-side RPC so the
      // club head can see the required student details without weakening
      // the student_profiles RLS policy for everyone else.
      const { data, error: applicationsError } = await supabase
        .rpc("club_head_recruitment_applicants", { p_club_id: clubId })

      if (applicationsError) throw applicationsError

      const normalizedApplications = (data || []).map((application) => ({
        ...application,
        student: {
          id: application.student_id,
          full_name: application.full_name,
          email: application.email,
          student_profiles: [{
            phone: application.phone,
            admission_no: application.admission_no,
            academic_session: application.academic_session,
            department: application.department,
            year: application.year,
          }],
        },
      }))

      setApplications(normalizedApplications)
    } catch (err) {
      console.error("Recruitment applications load error:", err)
      setApplications([])
      setRecruitmentError(
        err?.message || "Unable to load recruitment applications."
      )
    } finally {
      setApplicationsLoading(false)
    }
  }

  const loadActiveMembers = async (clubId = selectedClubId) => {
    if (!clubId) return

    setActiveMembersLoading(true)
    setActiveMembersError("")

    try {
      const { data, error: membersError } = await supabase
        .rpc("club_head_active_members", { p_club_id: clubId })

      if (membersError) throw membersError

      setActiveMembers(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("Active members load error:", err)
      setActiveMembers([])
      setActiveMembersError(
        err?.message || "Unable to load active club members."
      )
    } finally {
      setActiveMembersLoading(false)
    }
  }

  const updateRecruitmentConfig = (key, value) => {
    setRecruitmentConfig((current) => ({
      ...(current || blankRecruitmentConfig()),
      [key]: value,
    }))
    setRecruitmentSuccess("")
    setRecruitmentError("")
  }

  const toggleRequiredField = (fieldKey) => {
    setRecruitmentConfig((current) => {
      const config = current || blankRecruitmentConfig()
      const fields = new Set(config.required_fields || [])

      if (fields.has(fieldKey)) fields.delete(fieldKey)
      else fields.add(fieldKey)

      return {
        ...config,
        required_fields: Array.from(fields),
      }
    })
  }

  const addRecruitmentQuestion = () => {
    const label = questionDraft.label.trim()
    if (!label) {
      setRecruitmentError("Enter a question before adding it.")
      return
    }

    const choiceTypes = ["single_choice", "multiple_choice"]
    const options = questionDraft.options
      .map((item) => item.trim())
      .filter(Boolean)

    if (choiceTypes.includes(questionDraft.type) && options.length < 2) {
      setRecruitmentError("Add at least two options for a choice question.")
      return
    }

    setRecruitmentConfig((current) => ({
      ...(current || blankRecruitmentConfig()),
      custom_questions: [
        ...((current && current.custom_questions) || []),
        {
          id: crypto.randomUUID(),
          label,
          type: questionDraft.type,
          required: questionDraft.required,
          options: choiceTypes.includes(questionDraft.type) ? options : [],
        },
      ],
    }))

    setQuestionDraft({
      label: "",
      type: "short_text",
      required: true,
      options: ["", ""],
    })
    setRecruitmentError("")
  }

  const removeRecruitmentQuestion = (questionId) => {
    setRecruitmentConfig((current) => ({
      ...(current || blankRecruitmentConfig()),
      custom_questions: (current?.custom_questions || []).filter(
        (question) => question.id !== questionId
      ),
    }))
  }

  const updateQuestionOption = (index, value) => {
    setQuestionDraft((current) => ({
      ...current,
      options: current.options.map((item, optionIndex) =>
        optionIndex === index ? value : item
      ),
    }))
  }

  const addQuestionOption = () => {
    setQuestionDraft((current) => ({
      ...current,
      options: [...current.options, ""],
    }))
  }

  const removeQuestionOption = (index) => {
    setQuestionDraft((current) => ({
      ...current,
      options: current.options.filter((_, optionIndex) => optionIndex !== index),
    }))
  }

  const getTicketInstruction = (startDate, endDate) => {
    if (!startDate && !endDate) {
      return "Please get your ticket after successful fee submission between the mentioned dates."
    }

    const formatDate = (value) => {
      if (!value) return "the mentioned date"
      const date = new Date(`${value}T00:00:00`)
      if (Number.isNaN(date.getTime())) return value
      return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    }

    if (startDate && endDate) {
      return `Please get your ticket after successful fee submission between ${formatDate(startDate)} and ${formatDate(endDate)}.`
    }

    return `Please get your ticket after successful fee submission on ${formatDate(startDate || endDate)}.`
  }

  const saveRecruitmentConfig = async () => {
    if (!selectedClubId || !recruitmentConfig) return

    setRecruitmentSaving(true)
    setRecruitmentError("")
    setRecruitmentSuccess("")

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) throw new Error("Your session has expired. Please log in again.")

      if (
        recruitmentConfig.application_start_at &&
        recruitmentConfig.application_end_at &&
        recruitmentConfig.application_end_at <= recruitmentConfig.application_start_at
      ) {
        throw new Error("Application end must be after application start.")
      }

      const ticketCollectionDate =
        recruitmentConfig.ticket_collection_start || null

      if (
        recruitmentConfig.ticket_collection_start &&
        recruitmentConfig.ticket_collection_end &&
        recruitmentConfig.ticket_collection_end < recruitmentConfig.ticket_collection_start
      ) {
        throw new Error("Fee & ticket collection last date must be on or after the start date.")
      }

      const payload = {
        club_id: selectedClubId,
        recruitment_status: recruitmentConfig.recruitment_status,
        application_start_at: recruitmentConfig.application_start_at
          ? new Date(recruitmentConfig.application_start_at).toISOString()
          : null,
        application_end_at: recruitmentConfig.application_end_at
          ? new Date(recruitmentConfig.application_end_at).toISOString()
          : null,
        required_fields: recruitmentConfig.required_fields || [],
        custom_questions: recruitmentConfig.custom_questions || [],
        fee_amount: Number(recruitmentConfig.fee_amount || 0),
        ticket_collection_start: recruitmentConfig.ticket_collection_start || null,
        ticket_collection_end: recruitmentConfig.ticket_collection_end || null,
        ticket_instruction: getTicketInstruction(
          recruitmentConfig.ticket_collection_start,
          recruitmentConfig.ticket_collection_end
        ),
        terms_text:
          recruitmentConfig.terms_text?.trim() ||
          "I have read and agree to the above Terms & Conditions.",
        terms_version: Number(recruitmentConfig.terms_version || 1),
        updated_by: user.id,
      }

      const { data, error: saveError } = await supabase
        .from("club_recruitment_configs")
        .upsert(payload, { onConflict: "club_id" })
        .select()
        .single()

      if (saveError) throw saveError

      setRecruitmentConfig((current) => ({
        ...(current || {}),
        ...data,
        application_start_at: data.application_start_at
          ? data.application_start_at.slice(0, 16)
          : "",
        application_end_at: data.application_end_at
          ? data.application_end_at.slice(0, 16)
          : "",
        fee_amount: Number(data.fee_amount || 0),
        ticket_collection_start: data.ticket_collection_start || "",
        ticket_collection_end:
          data.ticket_collection_start ||
          data.ticket_collection_end ||
          "",
      }))
      setRecruitmentSuccess("Recruitment configuration saved successfully.")
    } catch (err) {
      console.error("Recruitment save error:", err)
      setRecruitmentError(err?.message || "Unable to save recruitment configuration.")
    } finally {
      setRecruitmentSaving(false)
    }
  }

  const updateApplicationStatus = async (applicationId, status) => {
    setRecruitmentError("")
    setRecruitmentSuccess("")

    try {
      if (!["SELECTED", "NOT_SURE", "REJECTED"].includes(status)) {
        throw new Error("Invalid recruitment decision.")
      }

      const { error: updateError } = await supabase
        .from("club_membership_applications")
        .update({ status })
        .eq("id", applicationId)
        .eq("club_id", selectedClubId)

      if (updateError) throw updateError

      setApplications((current) =>
        current.map((application) =>
          application.id === applicationId
            ? { ...application, status }
            : application
        )
      )
    } catch (err) {
      console.error("Application status error:", err)
      setRecruitmentError(err?.message || "Unable to update application status.")
    }
  }

  const finaliseRecruitmentSelection = async () => {
    setRecruitmentError("")
    setRecruitmentSuccess("")

    const selectedApplications = applications.filter(
      (application) => application.status === "SELECTED"
    )

    if (!selectedApplications.length) {
      setRecruitmentError("Select at least one applicant before finalising.")
      return
    }

    setRecruitmentSaving(true)

    try {
      const applicationIds = selectedApplications.map(
        (application) => application.id
      )

      const { data, error: finaliseError } = await supabase.rpc(
        "finalize_club_recruitment_selection",
        {
          p_club_id: selectedClubId,
          p_application_ids: applicationIds,
        }
      )

      if (finaliseError) throw finaliseError

      const publishedCount =
        data?.published_count || selectedApplications.length

      setRecruitmentSuccess(
        `${publishedCount} selected candidate${publishedCount === 1 ? "" : "s"} finalised successfully. Acknowledgement is now available to them.`
      )

      await loadRecruitmentApplications(selectedClubId)
    } catch (err) {
      console.error("Recruitment finalisation error:", err)
      setRecruitmentError(
        err?.message || "Unable to finalise the selected members."
      )
    } finally {
      setRecruitmentSaving(false)
    }
  }


  const finalSelectedApplications = applications.filter(
    (application) => application.status === "SELECTED"
  )

  const filteredApplications = applications.filter((application) => {
    if (recruitmentFilter === "ALL") return true
    return application.status === recruitmentFilter
  })

  // =========================================================
  // REQUEST FORM
  // =========================================================

  const [showRequestForm, setShowRequestForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState("")
  const [formSuccess, setFormSuccess] = useState("")

  const [form, setForm] = useState({
    title: "",
    category: "",
    description: "",
    event_date: "",
    start_time: "",
    end_time: "",
    expected_participants: "",
    requested_venue: "",
  })

  // =========================================================
  // REQUEST DETAILS
  // =========================================================

  const [selectedRequest, setSelectedRequest] = useState(null)

  // =========================================================
  // APPROVAL ACKNOWLEDGEMENT
  // =========================================================

  const [approvalEvent, setApprovalEvent] = useState(null)
  const [showApproval, setShowApproval] = useState(false)
  const [approvalAssets, setApprovalAssets] = useState(null)
  const [approvalLoading, setApprovalLoading] = useState(false)
  const [approvalError, setApprovalError] = useState("")
  const [approvalVerification, setApprovalVerification] = useState(null)

  // =========================================================
  // APPROVED EVENT MANAGEMENT
  // =========================================================

  const [managementEvent, setManagementEvent] = useState(null)
  const [showEventManager, setShowEventManager] = useState(false)
  const [managementAction, setManagementAction] = useState("")
  const [managementVisibility, setManagementVisibility] = useState("public")
  const [managementRegistration, setManagementRegistration] = useState(true)
  const [managementLoading, setManagementLoading] = useState(false)
  const [managementError, setManagementError] = useState("")
  const [managementSuccess, setManagementSuccess] = useState("")

  // =========================================================
  // LOAD DASHBOARD
  // =========================================================

  const loadDashboard = async (requestedClubId = null) => {
    setLoading(true)
    setError("")

    try {
      // -------------------------------------------------------
      // AUTH USER
      // -------------------------------------------------------

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) {
        throw userError
      }

      if (!user) {
        throw new Error(
          "Your session has expired. Please log in again."
        )
      }

      // -------------------------------------------------------
      // PROFILE
      // -------------------------------------------------------

      const {
        data: profileData,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select(`
          id,
          email,
          full_name,
          avatar_url,
          account_status
        `)
        .eq("id", user.id)
        .maybeSingle()

      if (profileError) {
        throw profileError
      }

      if (!profileData) {
        throw new Error(
          "Profile not found for your account."
        )
      }

      setProfile(profileData)

      // -------------------------------------------------------
      // ACTIVE CLUB HEAD MEMBERSHIPS
      // -------------------------------------------------------

      const {
        data: membershipData,
        error: membershipError,
      } = await supabase
        .from("club_memberships")
        .select(`
          id,
          club_id,
          membership_role,
          membership_status,
          joined_at,
          clubs (
            id,
            name,
            club_code,
            description,
            is_active
          )
        `)
        .eq("profile_id", user.id)
        .eq("membership_role", "head")
        .eq("membership_status", "active")

      if (membershipError) {
        throw membershipError
      }

      // -------------------------------------------------------
      // ACTIVE CLUBS
      // -------------------------------------------------------

      const activeClubs = (membershipData || [])
        .map((membership) => membership.clubs)
        .filter(
          (item) =>
            item &&
            item.is_active !== false
        )

      if (!activeClubs.length) {
        throw new Error(
          "No active Club Head membership was found for your account."
        )
      }

      setClubs(activeClubs)

      // -------------------------------------------------------
      // SELECT CLUB
      // -------------------------------------------------------

      const preferredClubId =
        requestedClubId || selectedClubId

      const selectedClub =
        activeClubs.find(
          (item) =>
            item.id === preferredClubId
        ) || activeClubs[0]

      setClub(selectedClub)
      setSelectedClubId(selectedClub.id)

      // -------------------------------------------------------
      // LOAD EVENTS
      // -------------------------------------------------------

      const {
        data: eventData,
        error: eventError,
      } = await supabase
        .from("events")
        .select(`
          id,
          club_id,
          title,
          category,
          description,
          event_date,
          start_time,
          end_time,
          requested_venue,
          assigned_venue,
          expected_participants,
          status,
          approval_status,
          head_decision,
          publication_mode,
          member_early_access,
          visibility,
          registration_access,

          approved_by,
          approved_by_name,
          approved_by_designation,
          approved_at,

          approval_asset_id,
          faculty_acknowledgement,

          rejection_reason,
          rejected_at,
          published_at,
          created_at,
          updated_at,

          clubs (
            id,
            name,
            club_code
          )
        `)
        .in(
          "club_id",
          activeClubs.map(
            (item) => item.id
          )
        )
        .order("created_at", {
          ascending: false,
        })

      if (eventError) {
        throw eventError
      }

      setEvents(eventData || [])
    } catch (err) {
      console.error(
        "Club Head Dashboard Error:",
        err
      )

      setError(
        err?.message ||
          "Unable to load Club Head Dashboard."
      )
    } finally {
      setLoading(false)
    }
  }

  // =========================================================
  // INITIAL LOAD
  // =========================================================

  useEffect(() => {
    loadDashboard()
  }, [])

  useEffect(() => {
    if (selectedClubId && clubManagementPanel === "recruitment") {
      loadRecruitment(selectedClubId)
    }

    if (selectedClubId && clubManagementPanel === "members") {
      loadActiveMembers(selectedClubId)
    }
  }, [selectedClubId, clubManagementPanel])




  // =========================================================
  // CLUB SWITCH
  // =========================================================

  const handleClubChange = (event) => {
    const nextClubId = event.target.value

    setSelectedClubId(nextClubId)

    const nextClub = clubs.find(
      (item) =>
        item.id === nextClubId
    )

    if (nextClub) {
      setClub(nextClub)
    }

    loadDashboard(nextClubId)
  }

  // =========================================================
  // REQUEST FORM
  // =========================================================

  const openRequestForm = () => {
    setFormError("")
    setFormSuccess("")
    setShowRequestForm(true)
  }

  const closeRequestForm = () => {
    if (submitting) {
      return
    }

    setShowRequestForm(false)
    setFormError("")
    setFormSuccess("")

    setForm({
      title: "",
      category: "",
      description: "",
      event_date: "",
      start_time: "",
      end_time: "",
      expected_participants: "",
      requested_venue: "",
    })
  }

  const handleChange = (event) => {
    const {
      name,
      value,
    } = event.target

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }))
  }

  // =========================================================
  // SUBMIT EVENT REQUEST
  // =========================================================

  const handleRequestSubmit = async (event) => {
    event.preventDefault()

    setFormError("")
    setFormSuccess("")

    if (
      !form.title.trim() ||
      !form.category ||
      !form.event_date ||
      !form.start_time ||
      !form.end_time ||
      !form.requested_venue.trim()
    ) {
      setFormError(
        "Please fill in all required fields."
      )
      return
    }

    if (
      form.end_time <=
      form.start_time
    ) {
      setFormError(
        "End time must be later than start time."
      )
      return
    }

    if (
      form.expected_participants &&
      Number(
        form.expected_participants
      ) < 1
    ) {
      setFormError(
        "Expected participants must be at least 1."
      )
      return
    }

    if (!club?.id) {
      setFormError(
        "Club information is unavailable."
      )
      return
    }

    setSubmitting(true)

    try {
      const {
        data: { user },
        error: userError,
      } =
        await supabase.auth.getUser()

      if (userError) {
        throw userError
      }

      if (!user) {
        throw new Error(
          "Your session has expired. Please log in again."
        )
      }

      // -------------------------------------------------------
      // DATABASE INSERT
      // RLS remains the actual authorization boundary.
      // -------------------------------------------------------

      const {
        error: insertError,
      } = await supabase
        .from("events")
        .insert({
          club_id: club.id,

          title:
            form.title.trim(),

          category:
            form.category,

          description:
            form.description.trim() ||
            null,

          event_date:
            form.event_date,

          start_time:
            form.start_time,

          end_time:
            form.end_time,

          expected_participants:
            form.expected_participants
              ? Number(
                  form.expected_participants
                )
              : null,

          requested_venue:
            form.requested_venue.trim(),

          approval_status:
            "WAITING",

          head_decision:
            "HOLD",

          publication_mode:
            "DETAILS_ONLY",

          member_early_access:
            false,

          visibility:
            "public",

          registration_access:
            "students_and_members",

          status:
            "UPCOMING",
        })

      if (insertError) {
        throw insertError
      }

      setFormSuccess(
        "Event request submitted successfully."
      )

      await loadDashboard(
        selectedClubId
      )

      setTimeout(() => {
        closeRequestForm()
      }, 1000)
    } catch (err) {
      console.error(
        "Event Request Error:",
        err
      )

      setFormError(
        err?.message ||
          "Unable to submit event request."
      )
    } finally {
      setSubmitting(false)
    }
  }

  // =========================================================
  // HELPERS
  // =========================================================

  const getApprovalLabel = (event) => {
    if (
      event.approval_status ===
      "APPROVED"
    ) {
      if (
        event.head_decision ===
        "PUBLISHED"
      ) {
        return "Listed"
      }

      return "Approved"
    }

    if (
      event.approval_status ===
      "REJECTED"
    ) {
      return "Rejected"
    }

    return "Pending"
  }

  const getApprovalClass = (event) => {
    if (
      event.approval_status ===
      "APPROVED"
    ) {
      return "approved"
    }

    if (
      event.approval_status ===
      "REJECTED"
    ) {
      return "rejected"
    }

    return "waiting"
  }

  const getVisibilityLabel = (event) => {
    if (event?.visibility === "private") {
      return "Members Only"
    }

    return "Public"
  }

  const getVisibilityClass = (event) => {
    if (event?.visibility === "private") {
      return "members-only"
    }

    return "public"
  }

  // registration_access describes WHO may register (members_only vs students_and_members).
  // publication_mode describes WHETHER registration is available (DETAILS_AND_REGISTRATION vs DETAILS_ONLY).
  const getRegistrationLabel = (event) => {
    return event?.publication_mode === "DETAILS_AND_REGISTRATION"
      ? "Registration Open"
      : "Registration Closed"
  }

  const getRegistrationClass = (event) => {
    return event?.publication_mode === "DETAILS_AND_REGISTRATION"
      ? "open"
      : "closed"
  }

  const formatDate = (date) => {
    if (!date) {
      return "Date pending"
    }

    const parsedDate =
      new Date(
        `${date}T00:00:00`
      )

    if (
      Number.isNaN(
        parsedDate.getTime()
      )
    ) {
      return date
    }

    return parsedDate.toLocaleDateString(
      "en-IN",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      }
    )
  }

  const formatApprovalEventDate = (date) => {
    if (!date) {
      return "Not specified"
    }

    const parsedDate =
      new Date(
        `${date}T00:00:00`
      )

    if (
      Number.isNaN(
        parsedDate.getTime()
      )
    ) {
      return date
    }

    return parsedDate.toLocaleDateString(
      "en-IN",
      {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }
    )
  }

  const formatTime = (time) => {
    if (!time) {
      return ""
    }

    const parsed =
      new Date(
        `1970-01-01T${time}`
      )

    if (
      Number.isNaN(
        parsed.getTime()
      )
    ) {
      return time
    }

    return parsed.toLocaleTimeString(
      "en-IN",
      {
        hour: "numeric",
        minute: "2-digit",
      }
    )
  }

  const formatApprovalTimestamp = (
    timestamp
  ) => {
    if (!timestamp) {
      return "Not available"
    }

    const parsed =
      new Date(timestamp)

    if (
      Number.isNaN(
        parsed.getTime()
      )
    ) {
      return "Not available"
    }

    return parsed.toLocaleString(
      "en-IN",
      {
        timeZone:
          "Asia/Kolkata",

        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",

        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",

        hour12: true,
      }
    )
  }

  // =========================================================
  // APPROVED EVENT MANAGEMENT
  // =========================================================

  const openEventManager = (event) => {
    if (!event || event.approval_status !== "APPROVED") {
      return
    }

    setManagementEvent(event)
    setManagementAction("")
    setManagementVisibility(
      event.visibility === "private"
        ? "private"
        : "public"
    )
    setManagementRegistration(
      event.publication_mode ===
        "DETAILS_AND_REGISTRATION"
    )
    setManagementError("")
    setManagementSuccess("")
    setShowEventManager(true)
  }

  const closeEventManager = () => {
    if (managementLoading) {
      return
    }

    setShowEventManager(false)
    setManagementEvent(null)
    setManagementAction("")
    setManagementVisibility("public")
    setManagementRegistration(true)
    setManagementError("")
    setManagementSuccess("")
  }

  const handlePublishEvent = async () => {
    if (!managementEvent) {
      return
    }

    setManagementError("")
    setManagementSuccess("")

    try {
      setManagementLoading(true)

      const {
        data,
        error: rpcError,
      } = await supabase.rpc(
        "club_head_set_event_publication",
        {
          p_event_id: managementEvent.id,
          p_decision: "PUBLISHED",
          p_visibility: managementVisibility,
          p_publication_mode:
            managementRegistration
              ? "DETAILS_AND_REGISTRATION"
              : "DETAILS_ONLY",
          p_registration_access:
            managementVisibility === "private"
              ? "members_only"
              : "students_and_members",
          p_member_early_access: false,
        }
      )

      if (rpcError) {
        throw rpcError
      }

      const updatedEvent =
        Array.isArray(data)
          ? data[0]
          : data

      if (updatedEvent) {
        setEvents((previous) =>
          previous.map((item) =>
            item.id === updatedEvent.id
              ? {
                  ...item,
                  ...updatedEvent,
                }
              : item
          )
        )
      }

      setManagementSuccess(
        managementVisibility === "public"
          ? managementRegistration
            ? "Event published publicly with registration open."
            : "Event published publicly with registration closed."
          : managementRegistration
          ? "Event published for club members with registration open."
          : "Event published for club members with registration closed."
      )

      setManagementAction("")
      await loadDashboard(selectedClubId)
    } catch (err) {
      console.error(
        "Club Head Event Publication Error:",
        err
      )

      setManagementError(
        err?.message ||
          "Unable to publish event."
      )
    } finally {
      setManagementLoading(false)
    }
  }

  const handleCancelEvent = async () => {
    if (!managementEvent) {
      return
    }

    const confirmed = window.confirm(
      "Are you sure you want to cancel this approved event?"
    )

    if (!confirmed) {
      return
    }

    setManagementError("")
    setManagementSuccess("")

    try {
      setManagementLoading(true)

      const {
        data,
        error: rpcError,
      } = await supabase.rpc(
        "club_head_set_event_publication",
        {
          p_event_id: managementEvent.id,
          p_decision: "CANCELLED",
          p_visibility: "private",
          p_publication_mode: "DETAILS_ONLY",
          p_registration_access: "members_only",
          p_member_early_access: false,
        }
      )

      if (rpcError) {
        throw rpcError
      }

      const updatedEvent =
        Array.isArray(data)
          ? data[0]
          : data

      if (updatedEvent) {
        setEvents((previous) =>
          previous.map((item) =>
            item.id === updatedEvent.id
              ? {
                  ...item,
                  ...updatedEvent,
                }
              : item
          )
        )
      }

      setManagementSuccess(
        "Event cancelled successfully."
      )

      setManagementAction("")
      await loadDashboard(selectedClubId)
    } catch (err) {
      console.error(
        "Club Head Event Cancellation Error:",
        err
      )

      setManagementError(
        err?.message ||
          "Unable to cancel event."
      )
    } finally {
      setManagementLoading(false)
    }
  }

  // =========================================================
  // APPROVAL VERIFICATION HELPERS
  // =========================================================

  const getApprovalVerificationUrl = (token) => {
    if (!token) {
      return ""
    }

    return `${window.location.origin}/verify/${encodeURIComponent(token)}`
  }

  const getApprovalQrUrl = (code) => {
    const verificationUrl =
      getApprovalVerificationUrl(code)

    if (!verificationUrl) {
      return ""
    }

    return `https://quickchart.io/qr?text=${encodeURIComponent(
      verificationUrl
    )}&size=132&margin=2&ecLevel=H`
  }

  // =========================================================
  // =========================================================
  // PRINT APPROVAL SNAPSHOT
  // =========================================================
  const printApprovalSnapshot = () => {
    window.print()
  }

  // OPEN APPROVAL
  // =========================================================

  const openApproval = async (event) => {
    setApprovalEvent(event)
    setShowApproval(true)

    setApprovalAssets(null)
    setApprovalError("")
    setApprovalLoading(true)
    setApprovalVerification(null)

    try {
      // -----------------------------------------------------
      // SECURE VERIFICATION CREDENTIAL
      // -----------------------------------------------------

      const {
        data: verificationData,
        error: verificationError,
      } = await supabase.rpc(
        "club_head_approval_verification",
        { p_event_id: event.id }
      )

      if (verificationError) {
        throw verificationError
      }

      setApprovalVerification(
        verificationData?.[0] || null
      )

      let assetData = null

      // -------------------------------------------------------
      // LINKED ASSET
      // -------------------------------------------------------

      if (
        event.approval_asset_id
      ) {
        const {
          data,
          error,
        } =
          await supabase
            .from(
              "faculty_approval_assets"
            )
            .select(`
              id,
              institution_name,
              office_name,
              certificate_title,
              signature_name,
              signature_designation,
              signature_url,
              stamp_url
            `)
            .eq(
              "id",
              event.approval_asset_id
            )
            .maybeSingle()

        if (error) {
          throw error
        }

        assetData = data
      }

      // -------------------------------------------------------
      // ACTIVE ASSET FALLBACK
      // -------------------------------------------------------

      if (!assetData) {
        const {
          data,
          error,
        } =
          await supabase
            .from(
              "faculty_approval_assets"
            )
            .select(`
              id,
              institution_name,
              office_name,
              certificate_title,
              signature_name,
              signature_designation,
              signature_url,
              stamp_url
            `)
            .eq(
              "is_active",
              true
            )
            .order(
              "updated_at",
              {
                ascending: false,
              }
            )
            .limit(1)
            .maybeSingle()

        if (error) {
          throw error
        }

        assetData = data
      }

      setApprovalAssets(
        assetData || null
      )
    } catch (err) {
      console.error(
        "Approval Asset Error:",
        err
      )

      setApprovalError(
        "Official approval assets could not be loaded."
      )
    } finally {
      setApprovalLoading(false)
    }
  }

  // =========================================================
  // CLOSE APPROVAL
  // =========================================================

  const closeApproval = () => {
    setShowApproval(false)
    setApprovalEvent(null)
    setApprovalAssets(null)
    setApprovalError("")
    setApprovalVerification(null)
  }

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <main className="club-dashboard-page">

        <div className="loading-card">

          <div className="loading-spinner" />

          <p>
            Loading...
          </p>

        </div>

      </main>
    )
  }

  // =========================================================
  // ERROR
  // =========================================================

  if (error) {
    return (
      <main className="club-dashboard-page">

        <div className="error-card">

          <h2>
            Unable to load dashboard
          </h2>

          <p>
            {error}
          </p>

          <button
            type="button"
            className="primary-button"
            onClick={() =>
              loadDashboard()
            }
          >
            Try Again
          </button>

        </div>

      </main>
    )
  }

  // =========================================================
  // CURRENT CLUB EVENTS
  // =========================================================

  const currentClubEvents =
    events.filter(
      (event) =>
        event.club_id ===
        selectedClubId &&
        event.head_decision !== "CANCELLED"
    )

  // =========================================================
  // DATE HELPERS FOR STATS
  // =========================================================

  const today =
    new Date()

  today.setHours(
    0,
    0,
    0,
    0
  )

  const completedEvents =
    currentClubEvents.filter(
      (event) => {
        if (!event.event_date) {
          return false
        }

        const eventDate =
          new Date(
            `${event.event_date}T00:00:00`
          )

        return (
          event.approval_status ===
            "APPROVED" &&
          eventDate < today
        )
      }
    )

  const pendingRequests =
    currentClubEvents.filter(
      (event) =>
        event.approval_status ===
        "WAITING"
    )

  const approvedEvents =
    currentClubEvents.filter(
      (event) =>
        event.approval_status ===
        "APPROVED"
    )

  const listedEvents =
    currentClubEvents.filter(
      (event) =>
        event.approval_status ===
          "APPROVED" &&
        event.head_decision ===
          "PUBLISHED"
    )

  // =========================================================
  // FILTERED EVENTS
  // =========================================================

  const visibleEvents =
    eventFilter === "completed"
      ? completedEvents
      : eventFilter === "pending"
      ? pendingRequests
      : eventFilter === "approved"
      ? approvedEvents
      : eventFilter === "listed"
      ? listedEvents
      : currentClubEvents

  // =========================================================
  // MAIN DASHBOARD
  // =========================================================

  return (
    <main className="club-dashboard-page">

      

      <section className="club-profile-header">

        <div className="club-profile-identity">

          <div className="club-profile-avatar">

            {club?.name
              ?.charAt(0)
              ?.toUpperCase() ||
              "C"}

          </div>

          <div className="club-profile-name">

            <h1>
              {club?.name ||
                "Your Club"}
            </h1>

            <p>
              Club Head
            </p>

          </div>

        </div>

        

        {clubs.length > 1 && (

          <div className="club-profile-selector">

            <label htmlFor="managed-club">
              Club
            </label>

            <select
              id="managed-club"
              value={
                selectedClubId ||
                ""
              }
              onChange={
                handleClubChange
              }
            >

              {clubs.map(
                (item) => (

                  <option
                    key={item.id}
                    value={item.id}
                  >
                    {item.name}
                  </option>

                )
              )}

            </select>

          </div>

        )}

      </section>

      

      <section className="club-profile-stats">

        <button
          type="button"
          className={
            eventFilter ===
            "completed"
              ? "club-stat active"
              : "club-stat"
          }
          onClick={() =>
            setEventFilter(
              "completed"
            )
          }
        >

          <strong>
            {completedEvents.length}
          </strong>

          <span>
            COMPLETED
          </span>

        </button>

        <button
          type="button"
          className={
            eventFilter ===
            "pending"
              ? "club-stat active"
              : "club-stat"
          }
          onClick={() =>
            setEventFilter(
              "pending"
            )
          }
        >

          <strong>
            {pendingRequests.length}
          </strong>

          <span>
            PENDING REQ
          </span>

        </button>

        <button
          type="button"
          className={
            eventFilter ===
            "approved"
              ? "club-stat active"
              : "club-stat"
          }
          onClick={() =>
            setEventFilter(
              "approved"
            )
          }
        >

          <strong>
            {approvedEvents.length}
          </strong>

          <span>
            APPROVED
          </span>

        </button>

      </section>

      

      <section className="club-my-events">

        <div className="club-my-events-header">

          <div>

            <h2>
              My Events
            </h2>

            <p>
              Manage your event requests, approvals and published events.
            </p>

          </div>

          <button
            type="button"
            className="club-section-toggle"
            onClick={() =>
              setShowMyEvents(
                (current) => !current
              )
            }
            aria-expanded={showMyEvents}
          >
            {showMyEvents
              ? "Minimize"
              : "Expand"}
          </button>

        </div>

        {showMyEvents && (

          <div className="club-my-events-content">

            

        <div className="club-event-links">

          

          <button
            type="button"
            className={
              eventFilter === "approved"
                ? "club-event-link active"
                : "club-event-link"
            }
            onClick={() =>
              setEventFilter(
                "approved"
              )
            }
          >
            Approved Events
          </button>

          

          <button
            type="button"
            className={
              eventFilter === "listed"
                ? "club-event-link active"
                : "club-event-link"
            }
            onClick={() =>
              setEventFilter(
                "listed"
              )
            }
          >
            Listed Events
          </button>

          

          <button
            type="button"
            className={
              eventFilter === "pending"
                ? "club-event-link active"
                : "club-event-link"
            }
            onClick={() =>
              setEventFilter(
                "pending"
              )
            }
          >
            Pending Requests
          </button>

          

          <button
            type="button"
            className="club-event-link club-event-link-primary"
            onClick={
              openRequestForm
            }
          >
            + New Request
          </button>

        </div>

        

        {eventFilter !==
          "all" && (

          <button
            type="button"
            className="club-clear-filter"
            onClick={() =>
              setEventFilter(
                "all"
              )
            }
          >
            Show all
          </button>

        )}

        

        {visibleEvents.length ===
        0 ? (

          <div className="club-empty-card">

            <h3>

              {eventFilter ===
              "approved"
                ? "No approved events"
                : eventFilter ===
                  "listed"
                ? "No listed events"
                : eventFilter ===
                  "completed"
                ? "No completed events"
                : eventFilter ===
                  "pending"
                ? "No pending requests"
                : "No events yet"}

            </h3>

            {eventFilter ===
              "all" && (

              <button
                type="button"
                className="primary-button"
                onClick={
                  openRequestForm
                }
              >
                + New Request
              </button>

            )}

          </div>

        ) : (

          <div className="club-event-list">

            {visibleEvents.map(
              (event) => (

                <article
                  className="club-event-row"
                  key={event.id}
                >

                  <div className="club-event-row-main">

                    <div className="club-event-status-group">
                      <span
                        className={`club-event-status ${getApprovalClass(
                          event
                        )}`}
                      >
                        {getApprovalLabel(
                          event
                        )}
                      </span>

                      {event.head_decision === "PUBLISHED" && (
                        <>
                          <span
                            className={`club-event-visibility-status ${getVisibilityClass(
                              event
                            )}`}
                          >
                            {getVisibilityLabel(event)}
                          </span>

                          <span
                            className={`club-event-registration-status ${getRegistrationClass(
                              event
                            )}`}
                          >
                            {getRegistrationLabel(event)}
                          </span>
                        </>
                      )}
                    </div>

                    <h3>
                      {event.title}
                    </h3>

                    <div className="club-event-row-details">

                      <span>
                        {formatDate(
                          event.event_date
                        )}
                      </span>

                      <span>

                        {formatTime(
                          event.start_time
                        )}

                        {event.end_time
                          ? ` – ${formatTime(
                              event.end_time
                            )}`
                          : ""}

                      </span>

                      <span>
                        {event.assigned_venue ||
                          event.requested_venue ||
                          "Venue pending"}
                      </span>

                    </div>

                  </div>

                  

                  <div className="club-event-row-actions">

                    {event.approval_status ===
                    "APPROVED" ? (

                      <>

                        <Link
                          to={`/events/${event.id}`}
                          className="secondary-button"
                        >
                          View Event
                        </Link>

                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() =>
                            openApproval(
                              event
                            )
                          }
                        >
                          View Approval
                        </button>

                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() =>
                            openEventManager(
                              event
                            )
                          }
                        >
                          Manage
                        </button>

                      </>

                    ) : (

                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() =>
                          setSelectedRequest(
                            event
                          )
                        }
                      >
                        View Request
                      </button>

                    )}

                  </div>

                </article>

              )
            )}

          </div>

        )}

          </div>

        )}

      </section>

      

      <section className="club-manage-section">

        <div className="club-manage-section-header">

          <div>

            <h2>
              Manage My Club
            </h2>

            <p>
              Manage recruitment and club membership from one place.
            </p>

          </div>

        </div>

        <div className="club-manage-links">

          <button
            type="button"
            className={
              clubManagementPanel === "recruitment"
                ? "club-manage-link active"
                : "club-manage-link"
            }
            onClick={() => {
              setClubManagementPanel((current) =>
                current === "recruitment" ? null : "recruitment"
              )
              setRecruitmentSubpanel("form")
            }}
          >
            <span>Recruitment</span>
            <span aria-hidden="true">→</span>
          </button>

          <button
            type="button"
            className={
              clubManagementPanel === "members"
                ? "club-manage-link active"
                : "club-manage-link"
            }
            onClick={() =>
              setClubManagementPanel((current) =>
                current === "members" ? null : "members"
              )
            }
          >
            <span>Active Members</span>
            <span aria-hidden="true">→</span>
          </button>

        </div>

        {clubManagementPanel === "recruitment" && (

          <div className="club-management-panel">

            <div className="club-management-panel-header">
              <div>
                <h3>Recruitment</h3>
                <p>
                  Recruitment configuration, applications and final selection will be managed here.
                </p>
              </div>

              <button
                type="button"
                className="club-management-panel-close"
                onClick={() => setClubManagementPanel(null)}
              >
                Close
              </button>
            </div>

            {recruitmentLoading || !recruitmentConfig ? (
              <div className="club-management-panel-placeholder">
                Loading recruitment configuration...
              </div>
            ) : (
              <>
                {recruitmentError && (
                  <div className="club-management-message error">
                    {recruitmentError}
                  </div>
                )}

                {recruitmentSuccess && (
                  <div className="club-management-message success">
                    {recruitmentSuccess}
                  </div>
                )}

                <div className="recruitment-subnav">
                  <button
                    type="button"
                    className={recruitmentSubpanel === "form" ? "recruitment-subnav-button active" : "recruitment-subnav-button"}
                    onClick={() => setRecruitmentSubpanel("form")}
                  >
                    <strong>Recruitment Form</strong>
                    <span>Configure the application form and recruitment window.</span>
                  </button>

                  <button
                    type="button"
                    className={recruitmentSubpanel === "applicants" ? "recruitment-subnav-button active" : "recruitment-subnav-button"}
                    onClick={() => setRecruitmentSubpanel("applicants")}
                  >
                    <strong>Applicants List</strong>
                    <span>Review applicants and set Selected, Not Sure or Rejected.</span>
                  </button>

                  <button
                    type="button"
                    className={recruitmentSubpanel === "finalise" ? "recruitment-subnav-button active" : "recruitment-subnav-button"}
                    onClick={() => setRecruitmentSubpanel("finalise")}
                  >
                    <strong>Finalise Selected Members</strong>
                    <span>Review the final list and publish the final selection.</span>
                  </button>
                </div>

                {recruitmentSubpanel === "form" && (

                  <div className="recruitment-subpanel-content">
                <div className="recruitment-status-card">
                  <div>
                    <span className="recruitment-label">Recruitment Status</span>
                    <span
                      className={
                        recruitmentConfig.recruitment_status === "OPEN"
                          ? "recruitment-status open"
                          : "recruitment-status closed"
                      }
                    >
                      {recruitmentConfig.recruitment_status}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="club-manage-panel-close"
                    onClick={() =>
                      updateRecruitmentConfig(
                        "recruitment_status",
                        recruitmentConfig.recruitment_status === "OPEN"
                          ? "CLOSED"
                          : "OPEN"
                      )
                    }
                  >
                    {recruitmentConfig.recruitment_status === "OPEN"
                      ? "Close Recruitment"
                      : "Open Recruitment"}
                  </button>
                </div>

                <div className="recruitment-grid">
                  <div className="recruitment-card">
                    <div className="recruitment-card-heading">
                      <div>
                        <h4>Application Period</h4>
                        <p>Set when students can submit applications.</p>
                      </div>
                    </div>

                    <div className="recruitment-form-grid">
                      <label>
                        Start
                        <input
                          type="datetime-local"
                          value={recruitmentConfig.application_start_at || ""}
                          onChange={(event) =>
                            updateRecruitmentConfig(
                              "application_start_at",
                              event.target.value
                            )}
                        />
                      </label>

                      <label>
                        End
                        <input
                          type="datetime-local"
                          value={recruitmentConfig.application_end_at || ""}
                          onChange={(event) =>
                            updateRecruitmentConfig(
                              "application_end_at",
                              event.target.value
                            )}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="recruitment-card">
                    <div className="recruitment-card-heading">
                      <div>
                        <h4>Offline Fee & Ticket Collection</h4>
                        <p>Configure the offline campus collection workflow.</p>
                      </div>
                    </div>

                    <div className="recruitment-form-grid">
                      <label>
                        Fee Amount (₹)
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={recruitmentConfig.fee_amount ?? 0}
                          onChange={(event) =>
                            updateRecruitmentConfig(
                              "fee_amount",
                              event.target.value
                            )}
                        />
                      </label>

                      <label>
                        Fee & Ticket Collection Start Date
                        <input
                          type="date"
                          value={recruitmentConfig.ticket_collection_start || ""}
                          onChange={(event) =>
                            updateRecruitmentConfig(
                              "ticket_collection_start",
                              event.target.value
                            )}
                        />
                      </label>
                    </div>

                    <div className="recruitment-form-grid" style={{ marginTop: "14px" }}>
                      <label>
                        Fee & Ticket Collection Last Date
                        <input
                          type="date"
                          min={recruitmentConfig.ticket_collection_start || undefined}
                          value={recruitmentConfig.ticket_collection_end || ""}
                          onChange={(event) =>
                            updateRecruitmentConfig(
                              "ticket_collection_end",
                              event.target.value
                            )
                          }
                        />
                      </label>
                    </div>

                    <label style={{ marginTop: "14px" }}>
                      Ticket Instruction
                      <textarea
                        rows="3"
                        value={getTicketInstruction(
                          recruitmentConfig.ticket_collection_start,
                          recruitmentConfig.ticket_collection_end
                        )}
                        readOnly
                      />
                    </label>
                  </div>
                </div>

                <div className="recruitment-card">
                  <div className="recruitment-card-heading">
                    <div>
                      <h4>Required Information</h4>
                      <p>Select the profile information that must be present on the application.</p>
                    </div>
                  </div>

                  <div className="recruitment-field-list">
                    {defaultRecruitmentFields.map((field) => (
                      <label className="recruitment-check-row" key={field.key}>
                        <input
                          type="checkbox"
                          checked={(recruitmentConfig.required_fields || []).includes(field.key)}
                          onChange={() => toggleRequiredField(field.key)}
                        />
                        {field.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="recruitment-card">
                  <div className="recruitment-card-heading">
                    <div>
                      <h4>Custom Questions</h4>
                      <p>Add interview/application questions that are specific to this club.</p>
                    </div>
                  </div>

                  <div className="recruitment-question-list">
                    {(recruitmentConfig.custom_questions || []).map((question) => (
                      <div className="recruitment-question-row" key={question.id}>
                        <div>
                          <strong>{question.label}</strong>
                          <span>
                            {String(question.type).replaceAll("_", " ")} · {question.required ? "Required" : "Optional"}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="recruitment-remove-option"
                          onClick={() => removeRecruitmentQuestion(question.id)}
                          aria-label={`Remove ${question.label}`}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="recruitment-question-builder">
                    <label>
                      Question
                      <input
                        type="text"
                        placeholder="e.g. Why do you want to join this club?"
                        value={questionDraft.label}
                        onChange={(event) =>
                          setQuestionDraft((current) => ({
                            ...current,
                            label: event.target.value,
                          }))
                        }
                      />
                    </label>

                    <label>
                      Type
                      <select
                        value={questionDraft.type}
                        onChange={(event) =>
                          setQuestionDraft((current) => ({
                            ...current,
                            type: event.target.value,
                          }))
                        }
                      >
                        <option value="short_text">Short Answer</option>
                        <option value="long_text">Long Answer</option>
                        <option value="yes_no">Yes / No</option>
                        <option value="single_choice">Single Choice</option>
                        <option value="multiple_choice">Multiple Choice</option>
                      </select>
                    </label>

                    <label className="recruitment-check-row builder-required">
                      <input
                        type="checkbox"
                        checked={questionDraft.required}
                        onChange={(event) =>
                          setQuestionDraft((current) => ({
                            ...current,
                            required: event.target.checked,
                          }))
                        }
                      />
                      Required
                    </label>

                    {["single_choice", "multiple_choice"].includes(questionDraft.type) && (
                      <div className="recruitment-options-builder">
                        {questionDraft.options.map((option, index) => (
                          <div className="recruitment-option-input" key={index}>
                            <input
                              type="text"
                              placeholder={`Option ${index + 1}`}
                              value={option}
                              onChange={(event) =>
                                updateQuestionOption(index, event.target.value)
                              }
                            />
                            {questionDraft.options.length > 2 && (
                              <button
                                type="button"
                                className="recruitment-remove-option"
                                onClick={() => removeQuestionOption(index)}
                              >
                                ×
                              </button>
                            )}
                          </div>
                        ))}

                        <button
                          type="button"
                          className="club-management-panel-close"
                          onClick={addQuestionOption}
                        >
                          + Add Option
                        </button>
                      </div>
                    )}

                    <button
                      type="button"
                      className="club-management-panel-close"
                      onClick={addRecruitmentQuestion}
                    >
                      + Add Question
                    </button>
                  </div>
                </div>

                <div className="recruitment-card">
                  <div className="recruitment-card-heading">
                    <div>
                      <h4>Terms & Conditions</h4>
                      <p>Students must accept these terms before an application can be submitted.</p>
                    </div>
                  </div>

                  <label>
                    Terms Text
                    <textarea
                      rows="4"
                      value={recruitmentConfig.terms_text || ""}
                      onChange={(event) =>
                        updateRecruitmentConfig("terms_text", event.target.value)
                      }
                    />
                  </label>
                </div>

                <div className="recruitment-save-row">
                  <button
                    type="button"
                    className="club-management-panel-close"
                    disabled={recruitmentSaving}
                    onClick={saveRecruitmentConfig}
                  >
                    {recruitmentSaving ? "Saving..." : "Save Recruitment Configuration"}
                  </button>
                </div>
                  </div>

                )}


                {recruitmentSubpanel === "applicants" && (

                  <div className="recruitment-subpanel-content">
                <div className="recruitment-card recruitment-applicants-card">
                  <div className="recruitment-card-heading">
                    <div>
                      <h4>Applicants</h4>
                      <p>All students who have submitted an application for this recruitment drive.</p>
                    </div>
                    <span className="recruitment-count-badge">
                      {applications.length} {applications.length === 1 ? "Applicant" : "Applicants"}
                    </span>
                  </div>

                  {applicationsLoading ? (
                    <div className="club-management-panel-placeholder">
                      Loading applicants...
                    </div>
                  ) : applications.length === 0 ? (
                    <div className="club-management-panel-placeholder">
                      No applicants yet.
                    </div>
                  ) : (
                    <div className="recruitment-applicants-list-wrap">
                      <table className="recruitment-applicants-list">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Name</th>
                            <th>Phone No.</th>
                            <th>Admission No.</th>
                            <th>Academic Session</th>
                            <th>Applied On</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {applications.map((application, index) => {
                            const student = application.student || {}
                            const studentProfile =
                              student.student_profiles?.[0] || student.student_profiles || {}

                            return (
                              <tr key={`applicant-${application.id}`}>
                                <td>{index + 1}</td>
                                <td>
                                  <strong>{student.full_name || "—"}</strong>
                                  <small>{student.email || "—"}</small>
                                </td>
                                <td>{studentProfile.phone || "—"}</td>
                                <td>{studentProfile.admission_no || "—"}</td>
                                <td>{studentProfile.academic_session || "—"}</td>
                                <td>
                                  {application.applied_at
                                    ? new Date(application.applied_at).toLocaleDateString()
                                    : "—"}
                                </td>
                                <td>
                                  <select
                                    className={`application-status-select ${String(application.status || "APPLIED").toLowerCase().replace("_", "-")}`}
                                    value={application.status || "APPLIED"}
                                    onChange={(event) =>
                                      updateApplicationStatus(application.id, event.target.value)
                                    }
                                  >
                                    <option value="APPLIED">Applied</option>
                                    <option value="SELECTED">Selected</option>
                                    <option value="NOT_SURE">Not Sure</option>
                                    <option value="REJECTED">Rejected</option>
                                  </select>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                  </div>

                )}


                {recruitmentSubpanel === "finalise" && (

                  <div className="recruitment-subpanel-content">

                    <div className="recruitment-card recruitment-security-card">
                      <div>
                        <h4>Finalisation</h4>
                        <p>
                          Review the Selected candidates below and publish the final selection when everything is correct.
                        </p>
                      </div>
                    </div>

                    <div className="recruitment-card recruitment-finalise-card">
                      <div className="recruitment-card-heading">
                        <div>
                          <h4>Finalise Selected Members</h4>
                          <p>Only applicants currently marked Selected can be finalised.</p>
                        </div>
                        <span className="recruitment-count-badge">
                          {applications.filter((application) => application.status === "SELECTED").length} Selected
                        </span>
                      </div>

                      {applications.filter((application) => application.status === "SELECTED").length === 0 ? (
                        <div className="club-management-panel-placeholder">
                          No applicants are currently marked Selected. Go to Applicants List and select candidates first.
                        </div>
                      ) : (
                        <div className="recruitment-applications-table-wrap">
                          <table className="recruitment-applications-table">
                            <thead>
                              <tr>
                                <th>Name</th>
                                <th>Phone No.</th>
                                <th>Admission No.</th>
                                <th>Academic Session</th>
                                <th>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {applications
                                .filter((application) => application.status === "SELECTED")
                                .map((application) => {
                                  const student = application.student || {}
                                  const studentProfile =
                                    student.student_profiles?.[0] || student.student_profiles || {}

                                  return (
                                    <tr key={`final-${application.id}`}>
                                      <td>
                                        <strong>{student.full_name || "—"}</strong>
                                        <small>{student.email || "—"}</small>
                                      </td>
                                      <td>{studentProfile.phone || "—"}</td>
                                      <td>{studentProfile.admission_no || "—"}</td>
                                      <td>{studentProfile.academic_session || "—"}</td>
                                      <td>
                                        <span className="recruitment-final-status selected">Selected</span>
                                      </td>
                                    </tr>
                                  )
                                })}
                            </tbody>
                          </table>
                        </div>
                      )}

                      <div className="recruitment-publish-lock">
                        <div>
                          <strong>Publish Final Selection</strong>
                          <p>
                            Review the selected members above. Once everything is correct, publish the final selection.
                          </p>
                        </div>
                        <button
                          type="button"
                          className="club-management-panel-close"
                          onClick={finaliseRecruitmentSelection}
                          disabled={
                            recruitmentSaving ||
                            !applications.some((application) => application.status === "SELECTED")
                          }
                        >
                          {recruitmentSaving
                            ? "Finalising…"
                            : "Publish Final Selection"}
                        </button>
                      </div>
                    </div>
                  </div>

                )}
              </>
            )}

          </div>

        )}

        {clubManagementPanel === "members" && (

          <div className="club-management-panel">

            <div className="club-management-panel-header">
              <div>
                <h3>Active Members</h3>
                <p>
                  Active members of the selected club will be managed here.
                </p>
              </div>

              <button
                type="button"
                className="club-management-panel-close"
                onClick={() => setClubManagementPanel(null)}
              >
                Close
              </button>
            </div>

            {activeMembersError && (
              <div className="club-management-message error">
                {activeMembersError}
              </div>
            )}

            {activeMembersLoading ? (
              <div className="club-management-panel-placeholder">
                Loading active members...
              </div>
            ) : activeMembers.length === 0 ? (
              <div className="club-management-panel-placeholder">
                No active members found for this club.
              </div>
            ) : (
              <div className="club-active-members-wrap">
                <div className="club-active-members-summary">
                  <strong>{activeMembers.length} Active {activeMembers.length === 1 ? "Member" : "Members"}</strong>
                  <span>Students who accepted their final club selection are shown here.</span>
                </div>

                <div className="club-active-members-table-wrap">
                  <table className="club-active-members-table">
                    <thead>
                      <tr>
                        <th>NAME</th>
                        <th>EMAIL</th>
                        <th>PHONE NO.</th>
                        <th>ADMISSION NO.</th>
                        <th>ACADEMIC SESSION</th>
                        <th>DEPARTMENT</th>
                        <th>YEAR / SEMESTER</th>
                        <th>JOINED ON</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeMembers.map((member) => (
                        <tr key={member.id}>
                          <td>
                            <strong>{member.full_name || "Student"}</strong>
                          </td>
                          <td>{member.email || "—"}</td>
                          <td>{member.phone || "—"}</td>
                          <td>{member.admission_no || "—"}</td>
                          <td>{member.academic_session || "—"}</td>
                          <td>{member.department || "—"}</td>
                          <td>{member.year || "—"}</td>
                          <td>
                            {member.joined_at
                              ? new Date(member.joined_at).toLocaleDateString("en-IN", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>

        )}

      </section>

      {/* =====================================================
          MANAGE CLUB ATTENDANCE — THIRD DASHBOARD SECTION
          ===================================================== */}

      <section className="club-manage-section club-attendance-section">

        <div className="club-manage-section-header">

          <div>

            <h2>
              Manage Club Attendance
            </h2>

            <p>
              Manage attendance for your club events using the attendance calendar.
            </p>

          </div>

          <button
            type="button"
            className="club-section-toggle"
            onClick={() => setShowClubAttendance((current) => !current)}
            aria-expanded={showClubAttendance}
          >
            {showClubAttendance ? "Minimize" : "Manage Attendance"}
          </button>

        </div>

        {showClubAttendance && (
          <div className="club-management-panel club-attendance-panel-host">
            <ClubAttendanceManager
              events={currentClubEvents}
              selectedClubId={selectedClubId}
              clubHeadId={profile?.id}
            />
          </div>
        )}

      </section>

      

      {selectedRequest && (

        <div
          className="club-request-overlay"
          onMouseDown={(
            event
          ) => {

            if (
              event.target ===
              event.currentTarget
            ) {
              setSelectedRequest(
                null
              )
            }

          }}
        >

          <section
            className="club-request-modal"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >

            <div className="club-request-header">

              <div>

                <p className="club-section-kicker">
                  EVENT REQUEST
                </p>

                <h2>
                  {selectedRequest.title}
                </h2>

              </div>

              <button
                type="button"
                className="club-request-close"
                onClick={() =>
                  setSelectedRequest(
                    null
                  )
                }
              >
                ×
              </button>

            </div>

            <div className="club-request-details">

              <div>

                <span>
                  Category
                </span>

                <strong>
                  {selectedRequest.category ||
                    "—"}
                </strong>

              </div>

              <div>

                <span>
                  Date
                </span>

                <strong>
                  {formatDate(
                    selectedRequest.event_date
                  )}
                </strong>

              </div>

              <div>

                <span>
                  Time
                </span>

                <strong>

                  {formatTime(
                    selectedRequest.start_time
                  )}

                  {" – "}

                  {formatTime(
                    selectedRequest.end_time
                  )}

                </strong>

              </div>

              <div>

                <span>
                  Expected Participants
                </span>

                <strong>
                  {selectedRequest.expected_participants ||
                    "—"}
                </strong>

              </div>

              <div>

                <span>
                  Requested Venue
                </span>

                <strong>
                  {selectedRequest.requested_venue ||
                    "—"}
                </strong>

              </div>

              <div>

                <span>
                  Approval Status
                </span>

                <strong>
                  {getApprovalLabel(
                    selectedRequest
                  )}
                </strong>

              </div>

            </div>

            {selectedRequest.description && (

              <div className="club-request-description">

                <span>
                  Description
                </span>

                <p>
                  {selectedRequest.description}
                </p>

              </div>

            )}

            {selectedRequest.rejection_reason && (

              <div className="club-request-note">

                <strong>
                  Rejection Reason
                </strong>

                <br />

                {selectedRequest.rejection_reason}

              </div>

            )}

            {selectedRequest.approval_status ===
              "APPROVED" && (

              <div className="club-request-note">

                <strong>
                  Final Venue
                </strong>

                <br />

                {selectedRequest.assigned_venue ||
                  selectedRequest.requested_venue ||
                  "Venue not assigned"}

                {selectedRequest.faculty_acknowledgement && (
                  <>
                    <br />
                    <br />

                    <strong>
                      Faculty Acknowledgement
                    </strong>

                    <br />

                    {selectedRequest.faculty_acknowledgement}
                  </>
                )}

                {selectedRequest.approved_by_name && (
                  <>
                    <br />
                    <br />

                    <strong>
                      Approved By
                    </strong>

                    <br />

                    {selectedRequest.approved_by_name}

                    {selectedRequest.approved_by_designation && (
                      <>
                        <br />
                        {selectedRequest.approved_by_designation}
                      </>
                    )}
                  </>
                )}

                {selectedRequest.approved_at && (
                  <>
                    <br />
                    <br />

                    <strong>
                      Approved On
                    </strong>

                    <br />

                    {formatApprovalTimestamp(
                      selectedRequest.approved_at
                    )}{" "}
                    IST
                  </>
                )}

              </div>

            )}

            <div className="club-request-actions">

              {selectedRequest.approval_status ===
                "APPROVED" && (

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    openApproval(
                      selectedRequest
                    )
                  }
                >
                  View Approval
                </button>

              )}

              <button
                type="button"
                className="primary-button"
                onClick={() =>
                  setSelectedRequest(
                    null
                  )
                }
              >
                Close
              </button>

            </div>

          </section>

        </div>

      )}

      

      {showApproval &&
        approvalEvent && (

        <div
          className="club-request-overlay club-approval-overlay"
          onMouseDown={(
            event
          ) => {

            if (
              event.target ===
              event.currentTarget
            ) {
              closeApproval()
            }

          }}
        >

          <section
            className="club-approval-modal"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >

            

            <div className="club-approval-toolbar">

              <h2>
                Event Approval
              </h2>

              <div className="club-approval-toolbar-actions">

                <button
                  type="button"
                  className="secondary-button"
                  onClick={printApprovalSnapshot}
                >
                  Print / Save as PDF
                </button>

                <button
                  type="button"
                  className="club-request-close"
                  onClick={
                    closeApproval
                  }
                >
                  ×
                </button>

              </div>

            </div>

            

            <article className="club-approval-document">

              <div className="club-approval-document-content">

                

                <header className="club-approval-header">

                  <div className="club-approval-brand">

                    <div className="club-approval-brand-mark">
                      CE
                    </div>

                    <div>

                      <h1>
                        {approvalAssets?.institution_name ||
                          "CAMPUS EVENT"}
                      </h1>

                      <p>
                        Events • Clubs • Community
                      </p>

                    </div>

                  </div>

                  <div className="club-approval-office">

                    <strong>
                      {approvalAssets?.office_name ||
                        "Office of Event Management"}
                    </strong>

                    <span>
                      Event Approval Division
                    </span>

                    <small>
                      Official Event Communication
                    </small>

                  </div>

                </header>

                

                <section className="club-approval-status">

                  <div className="club-approval-check">
                    ✓
                  </div>

                  <div>

                    <p>
                      OFFICIAL NOTIFICATION
                    </p>

                    <h2>
                      EVENT APPROVED
                    </h2>

                    <span>
                      Your event request has been
                      approved by the Faculty
                      Approval Authority.
                    </span>

                  </div>

                </section>

                

                <section className="club-approval-grid">

                  <div className="club-approval-panel">

                    <div className="club-approval-panel-title">

                      <span>
                        ▣
                      </span>

                      <h3>
                        Event Information
                      </h3>

                    </div>

                    <div className="club-approval-row">

                      <span>
                        Event Title
                      </span>

                      <div className="club-approval-title-wrap">

                        <strong className="club-approval-event-title">
                          {approvalEvent.title}
                        </strong>

                        {approvalAssets?.stamp_url && (
                          <img
                            src={approvalAssets.stamp_url}
                            alt=""
                            aria-hidden="true"
                            className="club-approval-title-stamp"
                          />
                        )}

                      </div>

                    </div>

                    <div className="club-approval-row">

                      <span>
                        Organized by
                      </span>

                      <strong>
                        {approvalEvent.clubs?.name ||
                          club?.name ||
                          "Club"}
                      </strong>

                    </div>

                    <div className="club-approval-row">

                      <span>
                        Category
                      </span>

                      <strong>
                        {approvalEvent.category ||
                          "Not specified"}
                      </strong>

                    </div>

                  </div>

                  

                  <div className="club-approval-panel club-approval-details-panel">

                    <div className="club-approval-panel-title">

                      <span>
                        ▦
                      </span>

                      <h3>
                        Approved Event Details
                      </h3>

                    </div>

                    <div className="club-approval-row">

                      <span>
                        Date
                      </span>

                      <strong>
                        {formatApprovalEventDate(
                          approvalEvent.event_date
                        )}
                      </strong>

                    </div>

                    <div className="club-approval-row">

                      <span>
                        Time
                      </span>

                      <strong>

                        {formatTime(
                          approvalEvent.start_time
                        )}

                        {" – "}

                        {formatTime(
                          approvalEvent.end_time
                        )}

                      </strong>

                    </div>

                    <div className="club-approval-row">

                      <span>
                        Final Venue
                      </span>

                      <strong>
                        {approvalEvent.assigned_venue ||
                          approvalEvent.requested_venue ||
                          "Venue not specified"}
                      </strong>

                    </div>

                    <div className="club-approval-row">

                      <span>
                        Expected Participants
                      </span>

                      <strong>
                        {approvalEvent.expected_participants ??
                          "Not specified"}
                      </strong>

                    </div>

                  </div>

                </section>

                

                <section className="club-approval-acknowledgement">

                  <div className="club-approval-panel-title">

                    <span>
                      ▤
                    </span>

                    <h3>
                      Faculty Acknowledgement
                    </h3>

                  </div>

                  <div className="club-approval-acknowledgement-body">

                    <span>
                      “
                    </span>

                    <p>
                      {approvalEvent.faculty_acknowledgement ||
                        "Your event request has been approved. Please proceed according to the approved event details and institutional guidelines."}
                    </p>

                  </div>

                </section>

                

                <section className="club-approval-authority">

                  <div className="club-approval-authority-text">

                    <span>
                      Approved by
                    </span>

                    <strong>
                      {approvalEvent.approved_by_name ||
                        approvalAssets?.signature_name ||
                        approvalAssets?.signature_designation ||
                        "Faculty Approval Authority"}
                    </strong>

                    <small>
                      {approvalEvent.approved_by_designation ||
                        approvalAssets?.signature_designation ||
                        "Faculty Approval Authority"}
                    </small>

                    <small>
                      {approvalAssets?.office_name ||
                        "Office of Event Management"}
                    </small>

                  </div>

                  <div className="club-approval-signature">

                    {approvalAssets?.signature_url ? (

                      <img
                        src={
                          approvalAssets.signature_url
                        }
                        alt="Official digital signature"
                      />

                    ) : (

                      <div className="club-approval-signature-placeholder">
                        Official Digital Signature
                      </div>

                    )}

                    <span>
                      OFFICIAL DIGITAL SIGNATURE
                    </span>

                  </div>

                </section>

                

                <section className="club-approval-verification">

                  <div className="club-approval-verification-heading">
                    <span>VENUE VERIFICATION</span>
                    <strong>Scan this QR code to verify this approval.</strong>
                    <p>
                      Guards should verify the event, date, time and final venue
                      shown on the live verification page.
                    </p>
                  </div>

                  <div className="club-approval-verification-options">

                    
                    <div className="club-approval-qr-card">

                      {approvalVerification?.verification_code ? (
                        <img
                          src={getApprovalQrUrl(
                            approvalVerification.verification_code
                          )}
                          alt="QR code for official event approval verification"
                          width="180"
                          height="180"
                          loading="eager"
                          referrerPolicy="no-referrer"
                          onError={(event) => {
                            event.currentTarget.style.display = "none"
                          }}
                        />
                      ) : (
                        <div className="club-approval-qr-placeholder">
                          QR unavailable
                        </div>
                      )}

                      <small>SCAN TO VERIFY</small>
                      <span>Preferred Method</span>

                    </div>

                    <div className="club-approval-verification-divider">
                      OR
                    </div>

                    
                    <div className="club-approval-code-card">

                      <div className="club-approval-code-icon">
                        ✓
                      </div>

                      <span>
                        VERIFICATION CODE
                      </span>

                      <strong className="club-approval-verification-code">
                        {approvalVerification?.verification_code ||
                          "Verification code unavailable"}
                      </strong>

                      <p>
                        Use this code if the QR code cannot be scanned.
                      </p>

                    </div>

                  </div>

                </section>

                

                <footer className="club-approval-footer">

                  <div>

                    <span>
                      Approved on
                    </span>

                    <strong>
                      {formatApprovalTimestamp(
                        approvalEvent.approved_at
                      )}{" "}
                      IST
                    </strong>

                  </div>

                  <div>
                    Student Activities Today.
                    A Better Tomorrow.
                  </div>

                </footer>

              </div>

            </article>

            {approvalLoading && (

              <p className="club-approval-loading">
                Loading official approval assets...
              </p>

            )}

            {approvalError && (

              <p className="club-approval-error">
                {approvalError}
              </p>

            )}

          </section>

        </div>

      )}

      

      {showEventManager &&
        managementEvent && (

        <div
          className="club-request-overlay club-event-manager-overlay"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeEventManager()
            }
          }}
        >

          <section
            className="club-event-manager-modal"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >

            <div className="club-request-header">

              <div>

                <p className="club-section-kicker">
                  APPROVED EVENT
                </p>

                <h2>
                  {managementEvent.title}
                </h2>

                <p className="club-event-manager-event-name">
                  Manage Event
                </p>

              </div>

              <button
                type="button"
                className="club-request-close"
                onClick={closeEventManager}
                disabled={managementLoading}
              >
                ×
              </button>

            </div>

            {!managementAction && (

              <div className="club-event-manager-actions">

                <button
                  type="button"
                  className="club-event-manager-action club-event-manager-publish"
                  onClick={() =>
                    setManagementAction("publish")
                  }
                  disabled={managementLoading}
                >
                  <strong>
                    Publish Event
                  </strong>

                  <span>
                    Make the faculty-approved event available according to the selected visibility and registration settings.
                  </span>
                </button>

                <button
                  type="button"
                  className="club-event-manager-action club-event-manager-cancel"
                  onClick={
                    handleCancelEvent
                  }
                  disabled={managementLoading}
                >
                  <strong>
                    Cancel Event
                  </strong>

                  <span>
                    Cancel this approved event and remove it from publication.
                  </span>
                </button>

              </div>

            )}

            {managementAction === "publish" && (

              <div className="club-event-manager-form">

                <div className="club-event-manager-section">

                  <h3>
                    Who can see this event?
                  </h3>

                  <div className="club-event-manager-options">

                    <label
                      className={
                        managementVisibility === "public"
                          ? "club-event-manager-option active"
                          : "club-event-manager-option"
                      }
                    >

                      <input
                        type="radio"
                        name="event-visibility"
                        value="public"
                        checked={
                          managementVisibility === "public"
                        }
                        onChange={(event) =>
                          setManagementVisibility(
                            event.target.value
                          )
                        }
                      />

                      <span>
                        <strong>
                          Public
                        </strong>

                        <small>
                          Visible to students and club members.
                        </small>
                      </span>

                    </label>

                    <label
                      className={
                        managementVisibility === "private"
                          ? "club-event-manager-option active"
                          : "club-event-manager-option"
                      }
                    >

                      <input
                        type="radio"
                        name="event-visibility"
                        value="private"
                        checked={
                          managementVisibility === "private"
                        }
                        onChange={(event) =>
                          setManagementVisibility(
                            event.target.value
                          )
                        }
                      />

                      <span>
                        <strong>
                          Club Members Only
                        </strong>

                        <small>
                          Visible only to members of this club.
                        </small>
                      </span>

                    </label>

                  </div>

                </div>

                <div className="club-event-manager-section">

                  <h3>
                    Registration
                  </h3>

                  <label className="club-event-manager-toggle">

                    <input
                      type="checkbox"
                      checked={
                        managementRegistration
                      }
                      onChange={(event) =>
                        setManagementRegistration(
                          event.target.checked
                        )
                      }
                    />

                    <span>
                      <strong>
                        Open registration
                      </strong>

                      <small>
                        {managementRegistration
                          ? managementVisibility === "private"
                            ? "Club members can register for this event."
                            : "Students and club members can register for this event."
                          : "The event will be published without registration being open."}
                      </small>
                    </span>

                  </label>

                </div>

                <div className="club-event-manager-note">

                  <strong>
                    Faculty approval remains unchanged.
                  </strong>

                  <span>
                    Publishing only controls how the already-approved event is exposed to users. It does not change the approval document or faculty decision.
                  </span>

                </div>

                {managementError && (

                  <div className="form-message form-error">
                    {managementError}
                  </div>

                )}

                {managementSuccess && (

                  <div className="form-message form-success">
                    {managementSuccess}
                  </div>

                )}

                <div className="club-request-actions">

                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() =>
                      setManagementAction("")
                    }
                    disabled={managementLoading}
                  >
                    Back
                  </button>

                  <button
                    type="button"
                    className="primary-button"
                    onClick={
                      handlePublishEvent
                    }
                    disabled={managementLoading}
                  >
                    {managementLoading
                      ? "Publishing..."
                      : "Publish Event"}
                  </button>

                </div>

              </div>

            )}

            {managementAction === "cancelled" && null}

            {!managementAction &&
              managementSuccess && (

              <div className="form-message form-success">
                {managementSuccess}
              </div>

            )}

            {!managementAction &&
              managementError && (

              <div className="form-message form-error">
                {managementError}
              </div>

            )}

          </section>

        </div>

      )}

      {showRequestForm && (

        <div
          className="club-request-overlay"
          onMouseDown={(
            event
          ) => {

            if (
              event.target ===
              event.currentTarget
            ) {
              closeRequestForm()
            }

          }}
        >

          <section
            className="club-request-modal"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >

            <div className="club-request-header">

              <div>

                <p className="club-section-kicker">
                  EVENT REQUEST
                </p>

                <h2>
                  New Event Request
                </h2>

              </div>

              <button
                type="button"
                className="club-request-close"
                onClick={
                  closeRequestForm
                }
                disabled={
                  submitting
                }
              >
                ×
              </button>

            </div>

            <form
              className="club-request-form"
              onSubmit={
                handleRequestSubmit
              }
            >

              

              <div className="club-form-field">

                <label htmlFor="event-title">
                  Event Title
                </label>

                <input
                  id="event-title"
                  name="title"
                  type="text"
                  value={
                    form.title
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Enter event title"
                  maxLength={150}
                  required
                />

              </div>

              

              <div className="club-form-field">

                <label htmlFor="event-category">
                  Category
                </label>

                <select
                  id="event-category"
                  name="category"
                  value={
                    form.category
                  }
                  onChange={
                    handleChange
                  }
                  required
                >

                  <option value="">
                    Select category
                  </option>

                  <option value="Technical">
                    Technical
                  </option>

                  <option value="Cultural">
                    Cultural
                  </option>

                  <option value="Sports">
                    Sports
                  </option>

                  <option value="Workshop">
                    Workshop
                  </option>

                  <option value="Competition">
                    Competition
                  </option>

                  <option value="Seminar">
                    Seminar
                  </option>

                  <option value="Other">
                    Other
                  </option>

                </select>

              </div>

              

              <div className="club-form-field">

                <label htmlFor="event-description">
                  Description
                </label>

                <textarea
                  id="event-description"
                  name="description"
                  value={
                    form.description
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Add a description"
                  rows="4"
                  maxLength={2000}
                />

              </div>

              

              <div className="club-form-row">

                <div className="club-form-field">

                  <label htmlFor="event-date">
                    Event Date
                  </label>

                  <input
                    id="event-date"
                    name="event_date"
                    type="date"
                    value={
                      form.event_date
                    }
                    onChange={
                      handleChange
                    }
                    min={
                      new Date()
                        .toISOString()
                        .split("T")[0]
                    }
                    required
                  />

                </div>

                <div className="club-form-field">

                  <label htmlFor="start-time">
                    Start Time
                  </label>

                  <input
                    id="start-time"
                    name="start_time"
                    type="time"
                    value={
                      form.start_time
                    }
                    onChange={
                      handleChange
                    }
                    required
                  />

                </div>

                <div className="club-form-field">

                  <label htmlFor="end-time">
                    End Time
                  </label>

                  <input
                    id="end-time"
                    name="end_time"
                    type="time"
                    value={
                      form.end_time
                    }
                    onChange={
                      handleChange
                    }
                    required
                  />

                </div>

              </div>

              

              <div className="club-form-row">

                <div className="club-form-field">

                  <label htmlFor="expected-participants">
                    Expected Participants
                  </label>

                  <input
                    id="expected-participants"
                    name="expected_participants"
                    type="number"
                    min="1"
                    max="100000"
                    value={
                      form.expected_participants
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="e.g. 100"
                  />

                </div>

                <div className="club-form-field">

                  <label htmlFor="requested-venue">
                    Requested Venue
                  </label>

                  <input
                    id="requested-venue"
                    name="requested_venue"
                    type="text"
                    value={
                      form.requested_venue
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="e.g. Seminar Hall"
                    maxLength={200}
                    required
                  />

                </div>

              </div>

              

              {formError && (

                <div className="form-message form-error">
                  {formError}
                </div>

              )}

              

              {formSuccess && (

                <div className="form-message form-success">
                  {formSuccess}
                </div>

              )}

              

              <div className="club-request-actions">

                <button
                  type="button"
                  className="secondary-button"
                  onClick={
                    closeRequestForm
                  }
                  disabled={
                    submitting
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={
                    submitting
                  }
                >
                  {submitting
                    ? "Submitting..."
                    : "Submit Request"}
                </button>

              </div>

            </form>

          </section>

        </div>

      )}

    </main>
  )
}

export default ClubHeadDashboard
