import { Link } from "react-router-dom"

function Navbar() {
  return (
    <nav>
      <div>
        <h2>Campus Event</h2>
      </div>

      <div>
        <Link to="/">Home</Link>
        <Link to="/events">Events</Link>
        <Link to="/login">Login</Link>
      </div>
    </nav>
  )
}

export default Navbar