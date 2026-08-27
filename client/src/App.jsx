import { BrowserRouter, Routes, Route } from "react-router-dom"
import Home from "./pages/Home"
import Events from "./pages/Events"
import EventDetails from "./pages/EventDetails"
import Navbar from "./components/Navbar"
import Login from "./pages/Login"
import Signup from "./pages/Signup"
import StudentDashboard from "./pages/StudentDashboard"
import RegistrationSuccess from "./pages/RegistrationSuccess"
import NotFound from "./pages/NotFound"
import EventRegistration from "./pages/EventRegistration"
import RegistrationReview from "./pages/RegistrationReview"



function App() {
  return (
    <BrowserRouter>
      <Navbar />

      <Routes>
  <Route path="/" element={<Home />} />
  <Route path="/events" element={<Events />} />
  <Route path="/events/:id" element={<EventDetails />} />
  <Route path="/login" element={<Login />} />
  <Route path="/signup" element={<Signup />} />
  <Route path="/dashboard" element={<StudentDashboard />} />
  <Route path="/events/:id/register" element={<EventRegistration />} />
  <Route path="/events/:id/review" element={<RegistrationReview />} />
  <Route path="/events/:id/review" element={<RegistrationReview />} />


  <Route
    path="/registration-success"
    element={<RegistrationSuccess />}
  />
  <Route path="*" element={<NotFound />} />
</Routes>
    </BrowserRouter>
  )
}

export default App