import EventCard from "../components/EventCard"

function Events() {
  return (
    <main>
      <h1>Campus Events</h1>
      <p>Explore upcoming events on your campus.</p>

      <section>
        <EventCard
          id="1"
          category="Technology"
          title="Tech Fest 2026"
          date="12 September 2026"
          location="Main Auditorium"
        />

        <EventCard
          id="2"
          category="Cultural"
          title="Cultural Night"
          date="20 September 2026"
          location="College Ground"
        />

        <EventCard
          id="3"
          category="Sports"
          title="Inter College Tournament"
          date="25 September 2026"
          location="Sports Complex"
        />
      </section>
    </main>
  )
}

export default Events