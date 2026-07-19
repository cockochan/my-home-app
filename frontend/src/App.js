import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './Navbar';
import './App.css';

const apiBaseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function App() {
  const [apiStatus, setApiStatus] = useState('Checking...');
  const [apiMessage, setApiMessage] = useState('');
  const [databaseStatus, setDatabaseStatus] = useState('');
  const [rowCount, setRowCount] = useState(0);
  const [rows, setRows] = useState([]);

  useEffect(() => {
    let isMounted = true;

    fetch(`${apiBaseUrl}/api`)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Backend request failed');
        }
        return response.json();
      })
      .then((data) => {
        if (isMounted) {
          setApiStatus('Online');
          setApiMessage(data.message);
          setDatabaseStatus(data.database?.status || 'unknown');
          setRowCount(data.summary?.rowCount || 0);
          setRows(data.rows || []);
        }
      })
      .catch(() => {
        if (isMounted) {
          setApiStatus('Offline');
          setApiMessage('The backend is not reachable yet.');
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <Router>
      <div className="App">
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={
              <div className="landing-page">
                <section className="hero-section">
                  <h1>Welcome to Raspberry Pi Dashboard</h1>
                  <p>Your gateway to managing Raspberry Pi devices</p>
                  <button className="cta-button">Get Started</button>
                </section>

                <section className="features-section">
                  <div className="feature-card">
                    <h3>Real-time Monitoring</h3>
                    <p>Monitor your Raspberry Pi devices in real-time with detailed metrics and logs.</p>
                  </div>
                  <div className="feature-card">
                    <h3>Remote Access</h3>
                    <p>Access your devices remotely from anywhere using secure connections.</p>
                  </div>
                  <div className="feature-card">
                    <h3>Device Management</h3>
                    <p>Easily manage multiple Raspberry Pi devices with a centralized dashboard.</p>
                  </div>
                </section>

                <section className="feature-card">
                  <h3>API Status</h3>
                  <p>{apiStatus}</p>
                  {apiMessage ? <p>{apiMessage}</p> : null}
                  {databaseStatus ? <p>Database: {databaseStatus}</p> : null}
                  <p>Database rows returned by the API: {rowCount}</p>
                  {rows.length > 0 ? (
                    <ul>
                      {rows.map((row, index) => (
                        <li key={`${row.name}-${index}`}>
                          {row.name}: {row.value}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </section>
              </div>
            } />

            <Route path="/database" element={
              <div className="page-content">
                <h2>Database Access</h2>
                <p>This is the database page where you can manage your data.</p>
              </div>
            } />

            <Route path="/authentication" element={
              <div className="page-content">
                <h2>Authentication</h2>
                <p>This is the authentication page with future login/logout functionality.</p>
              </div>
            } />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
