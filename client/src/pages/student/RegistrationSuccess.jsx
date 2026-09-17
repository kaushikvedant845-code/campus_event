import React from "react";
import { Link } from "react-router-dom";

const RegistrationSuccess = () => {
  return (
    <main className="registration-success-page">
      <section className="registration-success-card">

        <p className="page-kicker">
          CAMPUS EVENT
        </p>

        <h1>Registration Successful !</h1>


        <p className="registration-success-description">
          You have successfully registered for the event.
          Your registration has been recorded successfully.
        </p>

        <div className="registration-success-actions">
          <Link
            to="/dashboard"
            className="ui-primary-button"
          >
            View My Registered Events
          </Link>

          <Link
            to="/events"
            className="ui-secondary-button"
          >
            Browse More Events
          </Link>
        </div>

      </section>
    </main>
  );
};

export default RegistrationSuccess;