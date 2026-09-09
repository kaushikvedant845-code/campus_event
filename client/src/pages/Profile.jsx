import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabase"

function Profile() {
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState("")

  useEffect(() => {
    let mounted = true

    const loadProfile = async () => {
      try {
        setLoading(true)
        setError("")

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

        // =================================================
        // COMMON PROFILE
        // =================================================

        const {
          data: baseProfile,
          error: profileError,
        } = await supabase
          .from("profiles")
          .select(
            `
              id,
              email,
              full_name,
              avatar_url,
              role,
              account_status
            `
          )
          .eq("id", user.id)
          .maybeSingle()

        if (profileError) {
          throw profileError
        }

        if (!baseProfile) {
          throw new Error(
            "No profile found for this account."
          )
        }

        // =================================================
        // STUDENT PROFILE
        // =================================================

        const {
          data: studentProfile,
          error: studentError,
        } = await supabase
          .from("student_profiles")
          .select(
            `
              profile_id,
              roll_number,
              department,
              course,
              year,
              phone,
              program_name,
              academic_session,
              admission_no,
              profile_complete,
              verification_status
            `
          )
          .eq("profile_id", user.id)
          .maybeSingle()

        if (studentError) {
          throw studentError
        }

        // =================================================
        // ACTIVE CLUB MEMBERSHIPS
        // =================================================

        const {
          data: memberships,
          error: membershipError,
        } = await supabase
          .from("club_memberships")
          .select(
            `
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
            `
          )
          .eq("profile_id", user.id)
          .eq(
            "membership_status",
            "active"
          )
          .order("joined_at", {
            ascending: false,
          })

        if (membershipError) {
          throw membershipError
        }

        if (!mounted) {
          return
        }

        const activeMemberships =
          (memberships || [])
            .filter(
              (membership) =>
                membership.clubs
            )
            .map((membership) => ({
              id: membership.id,
              club_id:
                membership.club_id,
              club_name:
                membership.clubs.name,
              role:
                membership.membership_role,
              status:
                membership.membership_status,
            }))

        // =================================================
        // ROLE LABEL
        // =================================================

        let roleLabel = "Student"

        const clubHeadMemberships =
          activeMemberships.filter(
            (membership) =>
              membership.role ===
              "head"
          )

        if (
          clubHeadMemberships.length > 0
        ) {
          roleLabel =
            clubHeadMemberships
              .map(
                (membership) =>
                  `${membership.club_name} • Club Head`
              )
              .join("  |  ")
        }

        // =================================================
        // FINAL PROFILE
        // =================================================

        setProfile({
          id: baseProfile.id,

          full_name:
            baseProfile.full_name ||
            user.user_metadata
              ?.full_name ||
            user.user_metadata
              ?.name ||
            "Student",

          email:
            baseProfile.email ||
            user.email ||
            "",

          avatar_url:
            baseProfile.avatar_url ||
            "",

          role:
            baseProfile.role ||
            "student",

          role_label:
            roleLabel,

          student_profile:
            studentProfile || null,

          memberships:
            activeMemberships,
        })
      } catch (err) {
        console.error(
          "Profile loading error:",
          err
        )

        if (!mounted) {
          return
        }

        setProfile(null)

        setError(
          err?.message ||
            "Unable to load your profile information."
        )
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadProfile()

    return () => {
      mounted = false
    }
  }, [navigate])

  // =================================================
  // LOADING
  // =================================================

  if (loading) {
    return (
      <main className="profile-page">

        <div className="profile-loading">
          Loading your profile...
        </div>

      </main>
    )
  }

  // =================================================
  // ERROR
  // =================================================

  if (!profile) {
    return (
      <main className="profile-page">

        <section className="profile-card">

          <p className="dashboard-section-kicker">
            ACCOUNT
          </p>

          <h1>
            Profile unavailable
          </h1>

          <p>
            {error ||
              "We could not load your profile information."}
          </p>

        </section>

      </main>
    )
  }

  const student =
    profile.student_profile || {}

  // =================================================
  // PAGE
  // =================================================

  return (
    <main className="profile-page">

      <section className="profile-card">

        {/* ============================================
            HEADER
        ============================================ */}

        <div className="profile-header">

          <div className="profile-avatar-container">

            {profile.avatar_url ? (

              <img
                src={profile.avatar_url}
                alt="Profile avatar"
                className="profile-avatar"
              />

            ) : (

              <div className="profile-avatar-fallback">

                {profile.full_name
                  ?.charAt(0)
                  ?.toUpperCase() || "U"}

              </div>

            )}

          </div>


          <div className="profile-identity">

            <h1>
              {profile.full_name}
            </h1>

            <p>
              {profile.role_label}
            </p>

          </div>

        </div>


        {/* ============================================
            BASIC INFORMATION
        ============================================ */}

        <div className="profile-information">

          <div className="profile-info-row">

            <span>
              Email
            </span>

            <strong>
              {profile.email ||
                "Not available"}
            </strong>

          </div>


          <div className="profile-info-row">

            <span>
              Admission No.
            </span>

            <strong>
              {student.admission_no ||
                "Not available"}
            </strong>

          </div>


          <div className="profile-info-row">

            <span>
              Program
            </span>

            <strong>
              {student.program_name ||
                "Not available"}
            </strong>

          </div>


          <div className="profile-info-row">

            <span>
              Department
            </span>

            <strong>
              {student.department ||
                "Not available"}
            </strong>

          </div>


          <div className="profile-info-row">

            <span>
              Course
            </span>

            <strong>
              {student.course ||
                "Not available"}
            </strong>

          </div>


          <div className="profile-info-row">

            <span>
              Academic Year
            </span>

            <strong>
              {student.year ||
                "Not available"}
            </strong>

          </div>


          <div className="profile-info-row">

            <span>
              Academic Session
            </span>

            <strong>
              {student.academic_session ||
                "Not available"}
            </strong>

          </div>


          <div className="profile-info-row">

            <span>
              Contact
            </span>

            <strong>
              {student.phone ||
                "Not available"}
            </strong>

          </div>

        </div>


        {/* ============================================
            CLUB MEMBERSHIPS
        ============================================ */}

        {profile.memberships?.length > 0 && (

          <div className="profile-clubs">

            <div className="profile-section-heading">

              <span>
                CLUBS
              </span>

            </div>


            {profile.memberships.map(
              (membership) => (

                <div
                  key={membership.id}
                  className="profile-club-row"
                >

                  <div>

                    <strong>
                      {membership.club_name}
                    </strong>

                  </div>

                  <span>
                    {membership.role ===
                    "head"
                      ? "Club Head"
                      : "Member"}
                  </span>

                </div>

              )
            )}

          </div>

        )}


        {/* ============================================
            ACTION
        ============================================ */}

        <div className="profile-actions">

          <Link
            to="/settings/profile"
            className="edit-profile-button"
          >
            Edit Profile
          </Link>

        </div>

      </section>

    </main>
  )
}

export default Profile