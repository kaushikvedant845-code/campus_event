import { Link } from "react-router-dom"
import "./EventCard.css"

function EventCard({
  id,
  title,
  date,
  location,
  category,
}) {
  return (
    <article className="event-card">

      <p className="event-category">
        {category}
      </p>

      <h2 className="event-title">
        {title}
      </h2>

      <div className="event-details">

        <p className="event-info">
          {date}
        </p>

        <p className="event-info">
          {location}
        </p>

      </div>

      <Link
        to={`/events/${id}`}
        className="event-button"
      >
        View Event
      </Link>

    </article>
  )
}

export default EventCard