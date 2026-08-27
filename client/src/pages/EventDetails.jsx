import { Link, useParams } from "react-router-dom"

const events = {
  1: {
    title: "Tech Fest 2026",
    category: "Technology",
    date: "12 September 2026",
    location: "Main Auditorium",
    description:
      "A campus technology festival featuring workshops, competitions, and technical activities.",
  },

  2: {
    title: "Cultural Night",
    category: "Cultural",
    date: "20 September 2026",
    location: "College Ground",
    description:
      "An evening celebrating music, dance, art, and cultural performances by students.",
  },

  3: {
    title: "Inter College Tournament",
    category: "Sports",
    date: "25 September 2026",
    location: "Sports Complex",
    description:
      "An inter-college sports tournament featuring multiple competitive events.",
  },
}

function EventDetails() {
  const { id } = useParams()

  const event = events[id]

  if (!event) {
    return (
      <div>
        <h1>Event Not Found</h1>
        <p>The event you are looking for does not exist.</p>
      </div>
    )
  }

  return (
    <div>
      <p>{event.category}</p>

      <h1>{event.title}</h1>

      <p>{event.date}</p>
      <p>{event.location}</p>

      <p>{event.description}</p>

      <Link to={`/events/${id}/register`}>
  Register for Event
</Link>
    </div>
  )
}

export default EventDetails