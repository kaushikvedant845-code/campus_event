import { Link, useParams } from "react-router-dom"

const events = {
  1: {
    title: "Tech Fest 2026",
  },

  2: {
    title: "Cultural Night",
  },

  3: {
    title: "Inter College Tournament",
  },
}

function RegistrationReview() {
  const { id } = useParams()
  const event = events[id]

  if (!event) {
    return (
      <main>
        <h1>Event Not Found</h1>
        <Link to="/events">Back to Events</Link>
      </main>
    )
  }

  return (
    <main>
      <h1>Review Registration</h1>

      <h2>{event.title}</h2>

      <section>
        <p>
          <strong>Full Name:</strong> Student Name
        </p>

        <p>
          <strong>College Email:</strong> student@college.edu
        </p>

        <p>
          <strong>Roll Number:</strong> 123456
        </p>

        <p>
          <strong>Department:</strong> Computer Science
        </p>

        <p>
          <strong>Year:</strong> 3rd Year
        </p>

        <p>
          <strong>Phone:</strong> 9876543210
        </p>
      </section>

      <button>Confirm Registration</button>

      <br />

      <Link to={`/events/${id}/register`}>
        Edit Registration
      </Link>
    </main>
  )
}

export default RegistrationReview