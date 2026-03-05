import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Presentation, Mic, Briefcase, Users, Monitor } from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Dashboard</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Select an environment to start your speech training.</p>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
        gap: '2rem' 
      }}>
        {/* Seminar Hall Card */}
        <div 
            onClick={() => navigate('/vr-room?type=seminar')}
            style={{
                backgroundColor: 'var(--bg-card)',
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                boxShadow: 'var(--shadow-sm)'
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-5px)';
                e.currentTarget.style.boxShadow = 'var(--shadow-md)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
            }}
        >
            <div style={{ 
                height: '180px', 
                backgroundColor: '#2563eb', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: 'white'
            }}>
                <Presentation size={64} />
            </div>
            <div style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: '600', margin: 0 }}>Seminar Hall</h3>
                    <span style={{ 
                        backgroundColor: '#dbeafe', 
                        color: '#1e40af', 
                        fontSize: '0.75rem', 
                        padding: '0.1rem 0.5rem', 
                        borderRadius: '12px',
                        fontWeight: '600'
                    }}>VR Ready</span>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                    Practice public speaking in a large seminar hall environment. Great for stage fear.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary-color)', fontWeight: '500', fontSize: '0.9rem' }}>
                    <Mic size={16} />
                    <span>Speech Analysis Enabled</span>
                </div>
            </div>
        </div>

        {/* Interview Room Card */}
        <div 
            onClick={() => navigate('/vr-room?type=interview')}
            style={{
                backgroundColor: 'var(--bg-card)',
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                boxShadow: 'var(--shadow-sm)'
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-5px)';
                e.currentTarget.style.boxShadow = 'var(--shadow-md)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
            }}
        >
            <div style={{ 
                height: '180px', 
                backgroundColor: '#059669', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: 'white'
            }}>
                <Briefcase size={64} />
            </div>
            <div style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: '600', margin: 0 }}>Interview Room</h3>
                    <span style={{ 
                        backgroundColor: '#d1fae5', 
                        color: '#065f46', 
                        fontSize: '0.75rem', 
                        padding: '0.1rem 0.5rem', 
                        borderRadius: '12px',
                        fontWeight: '600'
                    }}>VR Ready</span>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                    Simulate a one-on-one interview setting. Upload your resume to begin.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontWeight: '500', fontSize: '0.9rem' }}>
                    <Monitor size={16} />
                    <span>Simulation Mode</span>
                </div>
            </div>
        </div>

        {/* Group Discussion Card */}
        <div 
            onClick={() => navigate('/vr-room?type=group')}
            style={{
                backgroundColor: 'var(--bg-card)',
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                boxShadow: 'var(--shadow-sm)'
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-5px)';
                e.currentTarget.style.boxShadow = 'var(--shadow-md)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
            }}
        >
            <div style={{ 
                height: '180px', 
                backgroundColor: '#7c3aed', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: 'white'
            }}>
                <Users size={64} />
            </div>
            <div style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: '600', margin: 0 }}>Group Discussion</h3>
                    <span style={{ 
                        backgroundColor: '#ede9fe', 
                        color: '#5b21b6', 
                        fontSize: '0.75rem', 
                        padding: '0.1rem 0.5rem', 
                        borderRadius: '12px',
                        fontWeight: '600'
                    }}>VR Ready</span>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                    Practice group discussions in a conference room setting.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontWeight: '500', fontSize: '0.9rem' }}>
                    <Monitor size={16} />
                    <span>Simulation Mode</span>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};


export default Dashboard;
