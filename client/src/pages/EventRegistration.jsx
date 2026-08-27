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

function EventRegistration() {
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
      <h1>Event Registration</h1>

      <h2>{event.title}</h2>

      <form>
        <div>
          <label htmlFor="name">Full Name</label>
          <input
            id="name"
            type="text"
            placeholder="Enter your full name"
          />
        </div>

        <div>
          <label htmlFor="email">College Email</label>
          <input
            id="email"
            type="email"
            placeholder="Enter your college email"
          />
        </div>

        <div>
          <label htmlFor="rollNumber">Roll Number</label>
          <input
            id="rollNumber"
            type="text"
            placeholder="Enter your roll number"
          />
        </div>

        <div>
          <label htmlFor="department">Department</label>
          <input
            id="department"
            type="text"
            placeholder="Enter your department"
          />
        </div>

        <div>
          <label htmlFor="year">Year</label>
          <select id="year">
            <option value="">Select Year</option>
            <option value="1">1st Year</option>
            <option value="2">2nd Year</option>
            <option value="3">3rd Year</option>
            <option value="4">4th Year</option>
          </select>
        </div>

        <div>
          <label htmlFor="phone">Phone Number</label>
          <input
            id="phone"
            type="tel"
            placeholder="Enter your phone number"
          />
        </div>

     <Link to={`/events/${id}/review`}>
  Review Registration
</Link>
      </form>
    </main>
  )
}

export default EventRegistration