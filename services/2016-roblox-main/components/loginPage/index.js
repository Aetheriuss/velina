// Discord-only auth: the sole registration/login path is Discord OAuth, handled by the backend at
// /auth/discord/login (which redirects to Discord, then back to /auth/discord/callback). The legacy
// username/password + .ROBLOSECURITY-cookie-import UI has been removed.
import React from "react";

const Login = () => {
  return <div className='container mt-4'>
    <div className='row'>
      <div className='col-12 col-md-6 offset-md-3 col-lg-4 offset-lg-4'>
        <div className='card card-body text-center'>
          <h2 className='fw-bold mb-3'>Log In</h2>
          <p className='mb-4'>Velina uses Discord to sign in. Click below to log in or create your account — it only takes a moment.</p>
          <a href='/auth/discord/login'
             className='btn btn-lg w-100 text-white fw-bold'
             style={{ backgroundColor: '#5865F2' }}>
            Continue with Discord
          </a>
        </div>
      </div>
    </div>
  </div>
}

export default Login;
