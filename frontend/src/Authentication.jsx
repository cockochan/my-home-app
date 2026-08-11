import React, { useState } from 'react';
import './App.css';
import Login from './Login';
import Registration from './Registration';

const Authentication = () => {
  const [isLogin, setIsLogin] = useState(true);

  const handleExistingUser = () => {
    setIsLogin(true);
  };

  return (
    <div className="authentication-container">
      <div className="auth-toggle">
        <button 
          className={isLogin ? 'active' : ''}
          onClick={() => setIsLogin(true)}
        >
          Login
        </button>
        <button 
          className={!isLogin ? 'active' : ''}
          onClick={() => setIsLogin(false)}
        >
          Register
        </button>
      </div>
      
      {isLogin ? <Login /> : <Registration onExistingUser={handleExistingUser} />}
    </div>
  );
};

export default Authentication;