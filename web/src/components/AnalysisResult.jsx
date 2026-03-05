import React from 'react';
import Button from './Button';
import { Download } from 'lucide-react';

const AnalysisResult = ({ result }) => {
  if (!result) return null;

  const downloadReport = () => {
    const feedbackText = Array.isArray(result.feedback) ? result.feedback.join('\n') : '';
    
    // Check if it's an interview result or a speech analysis result
    const isInterview = result.clarity !== undefined;
    
    const reportContent = `
VirtuSpeak Analysis Report - ${isInterview ? 'Interview' : 'Speech Training'}
--------------------------
Date: ${new Date().toLocaleString()}

Metrics:
${isInterview ? `
- Clarity: ${result.clarity || 0}/100
- Confidence: ${result.confidence || 0}/100
- Fluency: ${result.fluency || 0}/100
` : `
- Pitch: ${result.pitch || 0} Hz
- Volume (Intensity): ${result.volume || 0}
- Rate (Tempo): ${result.tempo || 0} BPM
- Silence Ratio: ${(result.silence_ratio * 100 || 0).toFixed(1)}%
- Articulation Score: ${result.articulation || 0}
- Fluency Score: ${result.fluency_score || 0}
`}

Feedback:
${feedbackText}
    `.trim();

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `virtuspeak_${isInterview ? 'interview' : 'speech'}_report.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-in-out' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '1.5rem' 
      }}>
         <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Analysis Results</h2>
         <Button onClick={downloadReport} variant="secondary">
            <Download size={18} /> Download Report
         </Button>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: result.clarity !== undefined ? 'repeat(3, 1fr)' : 'repeat(3, 1fr)',
        gap: '1.5rem', 
        marginBottom: '2rem' 
      }}>
        {result.clarity !== undefined ? (
          // Interview Metrics
          [
              { label: 'Clarity', value: `${result.clarity || 0}/100` },
              { label: 'Confidence', value: `${result.confidence || 0}/100` },
              { label: 'Fluency', value: `${result.fluency || 0}/100` }
          ].map((metric, index) => (
              <div key={index} style={{
                  backgroundColor: 'var(--bg-card)',
                  padding: '1.5rem',
                  borderRadius: '15px',
                  border: '2px solid var(--border-color)',
                  boxShadow: 'var(--shadow-sm)'
              }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>{metric.label}</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>{metric.value}</p>
              </div>
          ))
        ) : (
          // Speech Analysis Metrics
          [
              { label: 'Pitch', value: `${result.pitch || 0} Hz` },
              { label: 'Loudness', value: result.volume || 0 },
              { label: 'Tempo', value: `${result.tempo || 0} BPM` },
              { label: 'Pauses', value: `${(result.silence_ratio * 100 || 0).toFixed(1)}%` },
              { label: 'Articulation', value: result.articulation || 0 },
              { label: 'Fluency', value: result.fluency_score || 0 }
          ].map((metric, index) => (
              <div key={index} style={{
                  backgroundColor: 'var(--bg-card)',
                  padding: '1.5rem',
                  borderRadius: '15px',
                  border: '2px solid var(--border-color)',
                  boxShadow: 'var(--shadow-sm)'
              }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>{metric.label}</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>{metric.value}</p>
              </div>
          ))
        )}
      </div>

      <div style={{
         backgroundColor: 'var(--bg-card)',
         padding: '2rem',
         borderRadius: '16px',
         border: '1px solid var(--border-color)',
         boxShadow: 'var(--shadow-sm)'
      }}>
        <h3 style={{ 
          fontSize: '1.2rem', 
          fontWeight: '600', 
          marginBottom: '1rem' 
        }}>
          Feedback & Suggestions
        </h3>

        <ul style={{ 
          paddingLeft: '1.5rem', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '0.75rem' 
        }}>
          {Array.isArray(result.feedback) && result.feedback.length > 0 ? (
            result.feedback.map((point, index) => (
              <li key={index} style={{ color: 'var(--text-primary)' }}>
                {point}
              </li>
            ))
          ) : (
             <li style={{ color: 'var(--text-secondary)', listStyle: 'none' }}>No feedback available.</li>
          )}
        </ul>
      </div>

      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}
      </style>
    </div>
  );
};

export default AnalysisResult;
