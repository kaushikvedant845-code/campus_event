import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabase"

import StudentDashboard from "./StudentDashboard"
import ClubHeadDashboard from "./ClubHeadDashboard"

function DashboardRouter() {
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [clubHeads, setClubHeads] = useState([])

  useEffect(() => {
    let mounted = true

    const loadDashboardIdentity = async () => {
      try {
        setLoading(true)

        // -----------------------------------------
        // AUTH USER
        // -----------------------------------------

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser()

        if (authError) {
          throw authError
        }

        if (!user) {
          navigate("/login", {
            replace: true,
          })
          return
        }

        // -----------------------------------------
        // COMMON PROFILE
        // -----------------------------------------

        const {
          data: baseProfile,
          error: profileError,
        } = await supabase
          .from("profiles")
          .select(
            "id, email, full_name, avatar_url, role"
          )
          .eq("id", user.id)
          .maybeSingle()

        if (profileError) {
          throw profileError
        }

        if (!baseProfile) {
          throw new Error(
            "Profile not found for authenticated user."
          )
        }

        // -----------------------------------------
        // FACULTY
        // -----------------------------------------

        if (baseProfile.role === "faculty") {

          if (mounted) {
            setProfile(baseProfile)
            setLoading(false)
          }

          /*
           * Faculty/Admin platform will be designed separately.
           * Do not build that frontend here.
           */
          return
        }

        // -----------------------------------------
        // STUDENT PROFILE
        // -----------------------------------------

        const {
          data: studentProfile,
          error: studentError,
        } = await supabase
          .from("student_profiles")
          .select(
            "profile_id, admission_no, program_name, department, course, year, phone, profile_complete, verification_status"
          )
          .eq("profile_id", user.id)
          .maybeSingle()

        if (studentError) {
          throw studentError
        }

        // -----------------------------------------
        // CLUB MEMBERSHIPS
        // -----------------------------------------

        const {
          data: memberships,
          error: membershipError,
        } = await supabase
          .from("club_memberships")
          .select(`
            id,
            club_id,
            membership_role,
            membership_status,
            clubs (
              id,
              name
            )
          `)
          .eq("profile_id", user.id)
          .eq("membership_status", "active")

        if (membershipError) {
          throw membershipError
        }

        // -----------------------------------------
        // FIND CLUB HEAD MEMBERSHIPS
        // -----------------------------------------

        const activeHeadClubs = (memberships || [])
          .filter(
            (membership) =>
              membership.membership_role === "head" &&
              membership.clubs
          )
          .map((membership) => ({
            membership_id: membership.id,
            club_id: membership.club_id,
            club_name: membership.clubs.name,
            membership_role:
              membership.membership_role,
            membership_status:
              membership.membership_status,
          }))

        if (!mounted) return

        // -----------------------------------------
        // FINAL PROFILE
        // -----------------------------------------

        setProfile({
          ...baseProfile,

          email:
            baseProfile.email ||
            user.email ||
            "",

          student_profile:
            studentProfile || null,

          memberships:
            memberships || [],
        })

        setClubHeads(activeHeadClubs)

        setLoading(false)

      } catch (error) {

        console.error(
          "Dashboard identity error:",
          error
        )

        if (!mounted) return

        setProfile(null)
        setClubHeads([])
        setLoading(false)
      }
    }

    loadDashboardIdentity()

    return () => {
      mounted = false
    }
  }, [navigate])

  // -----------------------------------------
  // LOADING
  // -----------------------------------------

  if (loading) {
    return (
      <main className="dashboard-page">

        <div className="loading-card">

          <div className="loading-spinner" />

          <p>
            Loading your dashboard...
          </p>

        </div>

      </main>
    )
  }

  // -----------------------------------------
  // FACULTY
  // -----------------------------------------

  if (profile?.role === "faculty") {
    return (
      <main className="dashboard-page">

        <section className="dashboard-empty-state">

          <p className="dashboard-section-kicker">
            FACULTY PLATFORM
          </p>

          <h1>
            Faculty Dashboard
          </h1>

          <p>
            The faculty and administrator platform
            will be handled separately.
          </p>

        </section>

      </main>
    )
  }

  // -----------------------------------------
  // PROFILE NOT FOUND
  // -----------------------------------------

  if (!profile) {
    return (
      <main className="dashboard-page">

        <section className="dashboard-empty-state">

          <p className="dashboard-section-kicker">
            ACCOUNT
          </p>

          <h1>
            Profile unavailable
          </h1>

          <p>
            We could not load your account
            information.
          </p>

        </section>

      </main>
    )
  }

  // -----------------------------------------
  // CLUB HEAD
  // -----------------------------------------

  if (clubHeads.length > 0) {

    return (
      <ClubHeadDashboard
        profile={profile}
        headClubs={clubHeads}
      />
    )

  }

  // -----------------------------------------
  // NORMAL STUDENT
  // -----------------------------------------

  return (
    <StudentDashboard
      profile={profile}
    />
  )
}

export default DashboardRouter