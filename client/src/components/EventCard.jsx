import { Link } from "react-router-dom"
import "./EventCard.css"

function EventCard({ id, title, date, location, category }) {
  return (
    <div className="event-card">
      <p className="event-category">{category}</p>

      <h2 className="event-title">{title}</h2>

      <p className="event-info">{date}</p>

      <p className="event-info">{location}</p>

      <Link to={`/events/${id}`} className="event-button">
        View Event
      </Link>
    </div>
  )
}

export default EventCard