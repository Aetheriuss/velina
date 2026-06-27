// Discord-only auth: a single "Log In" link to /login, which presents the "Continue with Discord"
// button. Sign-up and login are the same Discord flow, so there's no separate Sign Up link.
import React from "react";
import { createUseStyles } from "react-jss";

const useLoginAreaStyles = createUseStyles({
  text: {
    color: 'white',
    fontWeight: 400,
    fontSize: '16px',
    borderBottom: 0,
    marginTop: '2px',
    marginBottom: 0,
    textAlign: 'right',
    whiteSpace: 'nowrap',
  },
  link: {
    color: 'white',
    textDecoration: 'none',
    padding: '4px 8px',
    '&:hover': {
      color: 'white',
      background: 'rgba(25,25,25,0.1)',
      cursor: 'pointer',
      borderRadius: '4px',
    },
  },
});

const LoginArea = props => {
  const s = useLoginAreaStyles();

  return <div className='row'>
    <div className='col-12'>
      <p className={s.text}>
        <a className={s.link} href='/login'>
          Log In
        </a>
      </p>
    </div>
  </div>
}

export default LoginArea;
