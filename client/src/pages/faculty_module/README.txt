# Campus Event — Faculty Authentication Module

Copy these files into the existing React project:

client/src/pages/FacultyLogin.jsx
client/src/pages/FacultyMfaSetup.jsx
client/src/components/FacultyRoute.jsx
client/src/pages/FacultyDashboard.jsx
client/src/pages/FacultyLogin.css

## App.jsx additions

Add imports:

import FacultyLogin from "./pages/FacultyLogin"
import FacultyMfaSetup from "./pages/FacultyMfaSetup"
import FacultyDashboard from "./pages/FacultyDashboard"
import FacultyRoute from "./components/FacultyRoute"

Add routes:

<Route path="/faculty-login" element={<FacultyLogin />} />

<Route
  path="/faculty-mfa-setup"
  element={<FacultyMfaSetup />}
/>

<Route
  path="/faculty"
  element={
    <FacultyRoute>
      <FacultyDashboard />
    </FacultyRoute>
  }
/>

## Important Supabase configuration

Add these redirect URLs to Supabase Auth URL Configuration:

http://localhost:5173/faculty-login
http://localhost:5173/faculty-mfa-setup
http://localhost:5173/faculty

Also add the equivalent production URLs when the domain is deployed.

The existing public.faculty_profiles table already has:
- google_subject_id
- status
- google_email
- gu_id
- contact_no
- designation

The database authorization RPC `is_authorized_faculty()` already matches the authenticated Google identity (`auth.identities.identity_data->>'sub'`) to an active faculty row.

The database was updated so faculty_profiles SELECT access requires JWT `aal = aal2`.
The authorization RPC is executable only by authenticated users.

## First faculty login

1. Open /faculty-login.
2. Continue with Google using the pre-approved Google account.
3. If no TOTP factor exists, the account is sent to the setup screen.
4. Scan the QR code in Google Authenticator.
5. Enter the 6-digit code.
6. Supabase promotes the session to aal2.
7. Faculty dashboard becomes accessible.

After setup, every faculty login requires:
Google OAuth + 6-digit Authenticator code.

Do not put service-role keys or TOTP secrets into frontend source code.
