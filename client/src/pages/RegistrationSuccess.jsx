import { Link } from "react-router-dom"

function RegistrationSuccess() {
  return (
    <main>
      <h1>Registration Successful</h1>

      <p>You have successfully registered for the event.</p>

      <Link to="/dashboard">
        View My Registered Events
      </Link>

      <br />

      <Link to="/events">
        Browse More Events
      </Link>
    </main>
  )
}

export default RegistrationSuccess