import React, { useState, useEffect } from 'react';
import { FileAudio, Edit2, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import Button from '../components/Button';
import Input from '../components/Input';
import AnalysisResult from '../components/AnalysisResult';

const Reports = () => {
  const [reports, setReports] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [newName, setNewName] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    const savedReports = JSON.parse(localStorage.getItem('speech_reports') || '[]');
    setReports(savedReports);
  }, []);

  const handleRename = (id) => {
    const updatedReports = reports.map(report => {
      if (report.id === id) {
        return { ...report, name: newName };
      }
      return report;
    });
    setReports(updatedReports);
    localStorage.setItem('speech_reports', JSON.stringify(updatedReports));
    setEditingId(null);
    setNewName('');
  };

  const startEditing = (report) => {
    setEditingId(report.id);
    setNewName(report.name);
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const deleteReport = (id, e) => {
    e.stopPropagation();
    const updatedReports = reports.filter(r => r.id !== id);
    setReports(updatedReports);
    localStorage.setItem('speech_reports', JSON.stringify(updatedReports));
  };

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Past Reports</h1>
        <p style={{ color: 'var(--text-secondary)' }}>View and manage your recent speech analysis reports.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {reports.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '3rem', 
            backgroundColor: 'var(--bg-card)', 
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            color: 'var(--text-secondary)'
          }}>
            No reports found. Analyze some speech on the Dashboard to see them here!
          </div>
        ) : (
          reports.map(report => (
            <div key={report.id} style={{
              backgroundColor: 'var(--bg-card)',
              borderRadius: '12px',
              border: '1px solid var(--border-color)',
              overflow: 'hidden'
            }}>
              <div 
                onClick={() => toggleExpand(report.id)}
                style={{
                  padding: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  cursor: 'pointer',
                  backgroundColor: expandedId === report.id ? 'var(--bg-secondary)' : 'transparent',
                  transition: 'background-color 0.2s'
                }}
              >
                <div style={{ 
                  padding: '0.75rem', 
                  backgroundColor: 'var(--bg-primary)', 
                  borderRadius: '8px',
                  color: 'var(--primary-color)'
                }}>
                  <FileAudio size={24} />
                </div>
                
                <div style={{ flex: 1 }}>
                  {editingId === report.id ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={e => e.stopPropagation()}>
                      <Input 
                        value={newName} 
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Enter report name"
                        style={{ marginBottom: 0 }}
                      />
                      <Button onClick={() => handleRename(report.id)} size="sm">Save</Button>
                      <Button onClick={() => setEditingId(null)} variant="secondary" size="sm">Cancel</Button>
                    </div>
                  ) : (
                    <div>
                      <h3 style={{ fontWeight: '600', marginBottom: '0.25rem' }}>{report.name}</h3>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {new Date(report.timestamp).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {!editingId && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); startEditing(report); }}
                      style={{ 
                        padding: '0.5rem', 
                        color: 'var(--text-secondary)',
                        backgroundColor: 'transparent',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                      title="Rename"
                    >
                      <Edit2 size={18} />
                    </button>
                  )}
                  <button 
                      onClick={(e) => deleteReport(report.id, e)}
                      style={{ 
                        padding: '0.5rem', 
                        color: '#ef4444',
                        backgroundColor: 'transparent',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
                  {expandedId === report.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </div>

              {expandedId === report.id && (
                <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
                  <AnalysisResult result={report.data} />
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Reports;
