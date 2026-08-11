import React, { useState } from 'react';
import { apiUrl } from './config';

const Registration = ({ onExistingUser }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setMessageType('');

    try {
      const response = await fetch(apiUrl('/api/register'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const contentType = response.headers.get('content-type') || '';
      const data = contentType.includes('application/json')
        ? await response.json()
        : { error: await response.text() };

      if (response.ok) {
        setMessage('Registration successful! You can now log in.');
        setMessageType('success');
        setEmail('');
        setPassword('');
        setShowPassword(false);
      } else {
        const errorText = data?.error || data?.message || 'Registration failed. Please try again.';
        setMessage(errorText);
        setMessageType(errorText.toLowerCase().includes('email already taken') ? 'warning' : 'error');
      }
    } catch (error) {
      console.error('Registration error:', error);
      setMessage('An unexpected error occurred during registration. Please try again later.');
      setMessageType('error');
    }
  };

  return (
    <div className="registration-container">
      <h2>User Registration</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="password-field">
          <label>Password:</label>
          <div className="password-input-wrapper">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength="6"
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>
        <button type="submit">Register</button>
      </form>

      {message && (
        <div className={`form-message ${messageType}`}>
          <p>{message}</p>
          {messageType === 'warning' && (
            <div>
              <p>If you already have an account, please log in instead.</p>
              {onExistingUser ? (
                <button type="button" onClick={onExistingUser} className="form-link-button">
                  Go to Login
                </button>
              ) : (
                <p className="small-note">Switch to the login form to continue.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Registration;