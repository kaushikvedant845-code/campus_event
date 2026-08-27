function Signup() {
  return (
    <main>
      <h1>Create Student Account</h1>

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
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            placeholder="Enter your email"
          />
        </div>

        <div>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            placeholder="Create a password"
          />
        </div>

        <div>
          <label htmlFor="confirmPassword">Confirm Password</label>
          <input
            id="confirmPassword"
            type="password"
            placeholder="Confirm your password"
          />
        </div>

        <button type="submit">Create Account</button>
      </form>

      <p>
        Already have an account? <a href="/login">Login</a>
      </p>
    </main>
  )
}

export default Signup