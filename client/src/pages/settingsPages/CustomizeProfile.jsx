import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabase"

function CustomizeProfile() {
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [userId, setUserId] = useState("")

  const [email, setEmail] = useState("")
  const [fullName, setFullName] = useState("")

  // READ-ONLY ACADEMIC DATA
  const [admissionNo, setAdmissionNo] = useState("")
  const [programName, setProgramName] = useState("")
  const [department, setDepartment] = useState("")
  const [course, setCourse] = useState("")
  const [year, setYear] = useState("")
  const [academicSession, setAcademicSession] = useState("")

  // EDITABLE
  const [contactNo, setContactNo] = useState("")

  const [selectedAvatar, setSelectedAvatar] = useState("")

  // -----------------------------------------
  // AVATARS
  // -----------------------------------------

  const avatars = [
    {
      name: "Pixel Cat",
      file: "/avatars/pip-01.jpeg",
    },
    {
      name: "Pixel Genius",
      file: "/avatars/pip-02.jpeg",
    },
    {
      name: "Black Pearl",
      file: "/avatars/pip-03.jpeg",
    },
    {
      name: "The Dumm",
      file: "/avatars/pip-04.jpeg",
    },
    {
      name: "Cool Bird",
      file: "/avatars/pip-05.jpeg",
    },
    {
      name: "Dino",
      file: "/avatars/pip-06.jpeg",
    },
    {
      name: "Reader",
      file: "/avatars/pip-07.jpeg",
    },
    {
      name: "Anime Hero",
      file: "/avatars/pip-08.jpeg",
    },
    {
      name: "Anime Soul",
      file: "/avatars/pip-09.jpeg",
    },
    {
      name: "Pink Panther",
      file: "/avatars/pip-10.jpeg",
    },
    {
      name: "Pixel Boy",
      file: "/avatars/pip-11.jpeg",
    },
    {
      name: "Neon Girl",
      file: "/avatars/pip-12.jpeg",
    },
    {
      name: "Headphone",
      file: "/avatars/pip-13.jpeg",
    },
    {
      name: "Neon Boy",
      file: "/avatars/pip-14.jpeg",
    },
  ]

  // -----------------------------------------
  // LOAD PROFILE
  // -----------------------------------------

  useEffect(() => {
    let mounted = true

    const loadProfile = async () => {
      try {
        setLoading(true)

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser()

        if (authError) throw authError

        if (!user) {
          navigate("/login", { replace: true })
          return
        }

        if (!mounted) return

        setUserId(user.id)

        // -----------------------------------------
        // COMMON PROFILE
        // -----------------------------------------

        const {
          data: profile,
          error: profileError,
        } = await supabase
          .from("profiles")
          .select(`
            id,
            email,
            full_name,
            avatar_url
          `)
          .eq("id", user.id)
          .maybeSingle()

        if (profileError) throw profileError

        if (!profile) {
          throw new Error(
            "Profile not found for this account."
          )
        }

        // -----------------------------------------
        // STUDENT PROFILE
        // -----------------------------------------

        const {
          data: student,
          error: studentError,
        } = await supabase
          .from("student_profiles")
          .select(`
            profile_id,
            admission_no,
            program_name,
            department,
            course,
            year,
            phone,
            academic_session
          `)
          .eq("profile_id", user.id)
          .maybeSingle()

        if (studentError) throw studentError

        // -----------------------------------------
        // SET VALUES
        // -----------------------------------------

        setEmail(
          profile.email ||
          user.email ||
          ""
        )

        setFullName(
          profile.full_name ||
          ""
        )

        setSelectedAvatar(
          profile.avatar_url ||
          ""
        )

        setAdmissionNo(
          student?.admission_no ||
          ""
        )

        setProgramName(
          student?.program_name ||
          ""
        )

        setDepartment(
          student?.department ||
          ""
        )

        setCourse(
          student?.course ||
          ""
        )

        setYear(
          student?.year ||
          ""
        )

        setAcademicSession(
          student?.academic_session ||
          ""
        )

        setContactNo(
          student?.phone ||
          ""
        )

      } catch (error) {
        console.error(
          "Customize profile loading error:",
          error
        )

        if (!mounted) return

        alert(
          error?.message ||
          "Unable to load your profile."
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

  // -----------------------------------------
  // SAVE
  // -----------------------------------------

  const handleSave = async (e) => {
    e.preventDefault()

    if (!fullName.trim()) {
      alert("Student name is required.")
      return
    }

    if (!/^\d{10}$/.test(contactNo)) {
      alert(
        "Contact number must contain exactly 10 digits."
      )
      return
    }

    setSaving(true)

    try {

      // -----------------------------------------
      // UPDATE ONLY EDITABLE PROFILE DATA
      // -----------------------------------------

      const {
        error: profileUpdateError,
      } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          avatar_url: selectedAvatar || null,
        })
        .eq("id", userId)

      if (profileUpdateError) {
        throw profileUpdateError
      }

      // -----------------------------------------
      // UPDATE ONLY CONTACT NUMBER
      // -----------------------------------------

      const {
        error: studentUpdateError,
      } = await supabase
        .from("student_profiles")
        .update({
          phone: contactNo,
        })
        .eq("profile_id", userId)

      if (studentUpdateError) {
        throw studentUpdateError
      }

      // -----------------------------------------
      // LOCAL CACHE
      // -----------------------------------------

      const storedUser =
        localStorage.getItem("studentUser")

      if (storedUser) {
        try {
          const updatedUser =
            JSON.parse(storedUser)

          updatedUser.name =
            fullName.trim()

          updatedUser.avatar =
            selectedAvatar || null

          localStorage.setItem(
            "studentUser",
            JSON.stringify(updatedUser)
          )

        } catch (error) {
          console.error(
            "Local cache update error:",
            error
          )
        }
      }

      alert(
        "Profile updated successfully."
      )

    } catch (error) {
      console.error(
        "Profile update error:",
        error
      )

      alert(
        error?.message ||
        "Unable to update your profile."
      )
    } finally {
      setSaving(false)
    }
  }

  // -----------------------------------------
  // LOADING
  // -----------------------------------------

  if (loading) {
    return (
      <main className="customize-profile-page">
        <div className="profile-loading">
          Loading your profile...
        </div>
      </main>
    )
  }

  // -----------------------------------------
  // PAGE
  // -----------------------------------------

  return (
    <main className="customize-profile-page">

      <div className="customize-profile-header">

        <h1>
          Customize Profile
        </h1>

        <p>
          Update your personal profile information.
        </p>

      </div>


      {/* =========================================
          AVATAR
      ========================================= */}

      <section className="avatar-section">

        <div className="section-title">

          <h2>
            Profile Avatar
          </h2>

          <p>
            Choose an avatar for your Campus Event profile.
          </p>

        </div>


        <div className="current-avatar-wrapper">

          {selectedAvatar ? (
            <img
              src={selectedAvatar}
              alt="Selected avatar"
              className="current-avatar"
            />
          ) : (
            <div className="current-avatar-placeholder">
              ?
            </div>
          )}

        </div>


        {selectedAvatar && (
          <button
            type="button"
            className="remove-avatar-button"
            onClick={() => setSelectedAvatar("")}
          >
            Remove Avatar
          </button>
        )}


        <div className="avatar-grid">

          {avatars.map((avatar) => {

            const selected =
              selectedAvatar === avatar.file

            return (
              <button
                key={avatar.file}
                type="button"
                className={`avatar-option ${
                  selected
                    ? "avatar-option-selected"
                    : ""
                }`}
                onClick={() =>
                  setSelectedAvatar(avatar.file)
                }
              >

                <img
                  src={avatar.file}
                  alt={avatar.name}
                  className="avatar-option-image"
                />

                <span className="avatar-name">
                  {avatar.name}
                </span>

                {selected && (
                  <span className="avatar-selected-text">
                    Selected
                  </span>
                )}

              </button>
            )
          })}

        </div>

      </section>


      {/* =========================================
          PROFILE INFORMATION
      ========================================= */}

      <section className="profile-form-section">

        <div className="section-title">

          <h2>
            Profile Information
          </h2>

          <p>
            Personal information can be updated here.
          </p>

        </div>


        <form
          onSubmit={handleSave}
          className="customize-profile-form"
        >

          {/* STUDENT NAME */}

          <div className="profile-form-row">

            <div className="profile-form-label">

              <label>
                Student Name
              </label>

              <span>
                Your display name
              </span>

            </div>

            <input
              type="text"
              value={fullName}
              onChange={(e) =>
                setFullName(e.target.value)
              }
              required
            />

          </div>


          {/* EMAIL */}

          <div className="profile-form-row">

            <div className="profile-form-label">

              <label>
                Google Account Email
              </label>

              <span>
                Linked account
              </span>

            </div>

            <input
              type="email"
              value={email}
              readOnly
            />

          </div>


          {/* ADMISSION */}

          <div className="profile-form-row">

            <div className="profile-form-label">

              <label>
                Admission No.
              </label>

              <span>
                College identification
              </span>

            </div>

            <input
              type="text"
              value={admissionNo}
              readOnly
            />

          </div>


          {/* PROGRAM */}

          <div className="profile-form-row">

            <div className="profile-form-label">

              <label>
                Program Name
              </label>

              <span>
                Academic program
              </span>

            </div>

            <input
              type="text"
              value={programName}
              readOnly
            />

          </div>


          {/* DEPARTMENT */}

          <div className="profile-form-row">

            <div className="profile-form-label">

              <label>
                Department
              </label>

              <span>
                Institution-provided information
              </span>

            </div>

            <input
              type="text"
              value={department}
              readOnly
            />

          </div>


          {/* COURSE */}

          <div className="profile-form-row">

            <div className="profile-form-label">

              <label>
                Course
              </label>

              <span>
                Institution-provided information
              </span>

            </div>

            <input
              type="text"
              value={course}
              readOnly
            />

          </div>


          {/* YEAR */}

          <div className="profile-form-row">

            <div className="profile-form-label">

              <label>
                Year
              </label>

              <span>
                Current academic year
              </span>

            </div>

            <input
              type="text"
              value={year}
              readOnly
            />

          </div>


          {/* ACADEMIC SESSION */}

          <div className="profile-form-row">

            <div className="profile-form-label">

              <label>
                Academic Session
              </label>

              <span>
                Current academic session
              </span>

            </div>

            <input
              type="text"
              value={academicSession}
              readOnly
            />

          </div>


          {/* CONTACT */}

          <div className="profile-form-row">

            <div className="profile-form-label">

              <label>
                Contact No.
              </label>

              <span>
                10-digit contact number
              </span>

            </div>

            <input
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={contactNo}
              onChange={(e) => {
                const value =
                  e.target.value
                    .replace(/\D/g, "")
                    .slice(0, 10)

                setContactNo(value)
              }}
              required
            />

          </div>


          {/* SAVE */}

          <div className="profile-save-area">

            <button
              type="submit"
              className="save-profile-button"
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : "Save Changes"}
            </button>

          </div>

        </form>

      </section>

    </main>
  )
}

export default CustomizeProfile