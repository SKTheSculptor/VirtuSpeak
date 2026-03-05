import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mic, Activity, TrendingUp, Users } from 'lucide-react';

const Landing = () => {
  const { user } = useAuth();

  // If user is already logged in, redirect to dashboard
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: 'var(--bg-primary)',
      color: 'var(--text-primary)'
    }}>
      {/* Navigation */}
      <nav style={{ 
        padding: '1.5rem 2rem', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        borderBottom: '1px solid var(--border-color)',
        backgroundColor: 'var(--bg-card)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ 
            background: 'var(--primary-color)', 
            padding: '0.5rem', 
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Mic color="white" size={24} />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>VirtuSpeak</h1>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Link to="/login" style={{ textDecoration: 'none' }}>
            <button style={{
              padding: '0.6rem 1.2rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'transparent',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '1rem'
            }}>Log In</button>
          </Link>
          <Link to="/signup" style={{ textDecoration: 'none' }}>
            <button style={{
              padding: '0.6rem 1.2rem',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'var(--primary-color)',
              color: 'white',
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '1rem'
            }}>Sign Up</button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        padding: '4rem 2rem' 
      }}>
        <div style={{ maxWidth: '800px', textAlign: 'center', marginBottom: '5rem' }}>
          <h2 style={{ 
            fontSize: '3.5rem', 
            fontWeight: '800', 
            marginBottom: '1.5rem', 
            lineHeight: 1.2 
          }}>
            Master Your Speech.<br />
            <span style={{ color: 'var(--primary-color)' }}>Conquer the Stage.</span>
          </h2>
          <p style={{ 
            fontSize: '1.25rem', 
            color: 'var(--text-secondary)', 
            marginBottom: '2.5rem', 
            lineHeight: 1.6,
            maxWidth: '700px',
            marginLeft: 'auto',
            marginRight: 'auto'
          }}>
            VirtuSpeak is your AI-powered communication coach. We help you overcome stage fear and improve your public speaking skills through detailed analysis and real-time feedback.
          </p>
          <Link to="/signup" style={{ textDecoration: 'none' }}>
            <button style={{
              padding: '1rem 2.5rem',
              borderRadius: '12px',
              border: 'none',
              backgroundColor: 'var(--primary-color)',
              color: 'white',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '1.1rem',
              boxShadow: '0 4px 14px 0 rgba(0, 118, 255, 0.39)'
            }}>Get Started for Free</button>
          </Link>
        </div>

        {/* Feature Grid */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
          gap: '2rem', 
          maxWidth: '1200px', 
          width: '100%' 
        }}>
          {/* The Problem */}
          <div style={cardStyle}>
            <div style={iconContainerStyle}>
              <Activity size={32} color="var(--primary-color)" />
            </div>
            <h3 style={titleStyle}>The Problem</h3>
            <p style={textStyle}>
              Many people possess the knowledge but struggle with <strong>stage fear, anxiety, and lack of confidence</strong>, leading to poor performance in interviews and presentations.
            </p>
          </div>

          {/* The Solution */}
          <div style={cardStyle}>
            <div style={iconContainerStyle}>
              <TrendingUp size={32} color="var(--primary-color)" />
            </div>
            <h3 style={titleStyle}>Our Solution</h3>
            <p style={textStyle}>
              VirtuSpeak provides a <strong>safe environment</strong> to practice. Our AI analyzes your pitch, tempo, pauses, and fluency to give you objective, actionable metrics.
            </p>
          </div>

          {/* Why It Matters */}
          <div style={cardStyle}>
            <div style={iconContainerStyle}>
              <Users size={32} color="var(--primary-color)" />
            </div>
            <h3 style={titleStyle}>Why It Matters</h3>
            <p style={textStyle}>
              Effective communication is key to success. Use VirtuSpeak to prepare for <strong>job interviews, public speeches, and leadership roles</strong> with confidence.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{ 
        padding: '2rem', 
        textAlign: 'center', 
        color: 'var(--text-secondary)', 
        borderTop: '1px solid var(--border-color)',
        backgroundColor: 'var(--bg-card)'
      }}>
        <p>&copy; {new Date().getFullYear()} VirtuSpeak. All rights reserved.</p>
      </footer>
    </div>
  );
};

// Internal styles for clean code
const cardStyle = {
  backgroundColor: 'var(--bg-card)',
  padding: '2rem',
  borderRadius: '16px',
  border: '1px solid var(--border-color)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  transition: 'transform 0.2s ease-in-out',
  height: '100%'
};

const iconContainerStyle = {
  backgroundColor: 'var(--bg-secondary)',
  padding: '1rem',
  borderRadius: '12px',
  marginBottom: '1.5rem',
  display: 'inline-flex'
};

const titleStyle = {
  fontSize: '1.5rem',
  fontWeight: 'bold',
  marginBottom: '1rem',
  color: 'var(--text-primary)'
};

const textStyle = {
  color: 'var(--text-secondary)',
  lineHeight: 1.6,
  fontSize: '1rem'
};

export default Landing;
