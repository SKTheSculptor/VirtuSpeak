import React, { useState, useEffect, useMemo } from 'react';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, RadarChart, Radar, PolarGrid, 
  PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell, Legend 
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Award, Zap, Clock, 
  BarChart2, Shield, MessageSquare, Target, Info,
  Filter, Calendar, ChevronDown
} from 'lucide-react';
import { db } from '../firebase';
import { collection, query, orderBy, limit, getDocs, where, Timestamp } from 'firebase/firestore';

// Types for our session reports
interface SessionReport {
  id: string;
  confidenceScore: number;
  fluencyRate: number; // WPM
  fillerWordCount: number;
  clarityScore: number;
  engagementScore: number; // 0-100
  sessionDuration: number; // seconds
  timestamp: any; // Firestore Timestamp or Date
}

// Colors for charts and UI
const COLORS = {
  primary: '#2563eb',
  secondary: '#64748b',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  purple: '#8b5cf6',
  cyan: '#06b6d4',
  pink: '#ec4899',
  chart: ['#2563eb', '#22c55e', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899']
};

const ProgressPage: React.FC = () => {
  const [reports, setReports] = useState<SessionReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'7d' | '30d' | 'all'>('all');
  const [error, setError] = useState<string | null>(null);

  // Fetch reports from Firestore
  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      try {
        const reportsRef = collection(db, 'reports');
        let q = query(reportsRef, orderBy('timestamp', 'desc'));

        // Apply time filters if needed (Note: Requires Firestore indices)
        if (filter !== 'all') {
          const days = filter === '7d' ? 7 : 30;
          const dateLimit = new Date();
          dateLimit.setDate(dateLimit.getDate() - days);
          q = query(reportsRef, where('timestamp', '>=', Timestamp.fromDate(dateLimit)), orderBy('timestamp', 'desc'));
        }

        const querySnapshot = await getDocs(q);
        const fetchedReports: SessionReport[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          fetchedReports.push({
            id: doc.id,
            ...data,
            timestamp: data.timestamp?.toDate() || new Date(data.timestamp)
          } as SessionReport);
        });

        // Fallback to localStorage if Firestore is empty (for dev/demo)
        if (fetchedReports.length === 0) {
          const localReports = JSON.parse(localStorage.getItem('speech_reports') || '[]');
          if (localReports.length > 0) {
            // Map local format to our required format
            const mapped = localReports.map((r: any) => {
              const d = r.data || {};
              return {
                id: r.id,
                // Handle different possible field names from interview vs seminar vs manual entries
                confidenceScore: d.confidenceScore || d.confidence || d.confidence_score || 0,
                fluencyRate: d.fluencyRate || d.fluency || d.fluency_score || d.tempo || 0,
                fillerWordCount: d.fillerWordCount || d.filler_count || 0,
                clarityScore: d.clarityScore || d.clarity || d.clarity_score || 0,
                engagementScore: d.engagementScore || d.engagement_score || 60,
                sessionDuration: d.sessionDuration || d.duration || 0,
                timestamp: new Date(r.timestamp)
              };
            });
            setReports(mapped.reverse()); // Chronological order for charts
          } else {
            setReports([]);
          }
        } else {
          setReports(fetchedReports.reverse()); // Chronological order
        }
      } catch (err) {
        console.error("Error fetching reports:", err);
        setError("Failed to fetch reports. Please check your connection.");
        setReports([]);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [filter]);

  // Data Aggregation Logic
  const analytics = useMemo(() => {
    if (reports.length === 0) return null;

    const latest = reports[reports.length - 1];
    const previous = reports.slice(0, -1);
    
    // 1. Overall Performance Score (Weighted Average)
    const computeScore = (r: SessionReport) => {
      return (
        (r.confidenceScore * 0.3) + 
        (r.clarityScore * 0.3) + 
        (Math.min(100, (r.fluencyRate / 160) * 100) * 0.2) + // Normalize WPM
        (Math.max(0, 100 - r.fillerWordCount * 10) * 0.2) // Heavily penalize fillers
      );
    };

    const overallScore = computeScore(latest);
    const avgPrevScore = previous.length > 0 
      ? previous.reduce((acc, r) => acc + computeScore(r), 0) / previous.length 
      : overallScore;

    // 2. Improvement Rate (Latest vs Average of previous)
    const improvementRate = previous.length > 0 
      ? ((overallScore - avgPrevScore) / avgPrevScore) * 100 
      : 0;

    // 3. Consistency Score (Variance calculation over last 10)
    const recentReports = reports.slice(-10);
    const recentScores = recentReports.map(computeScore);
    const mean = recentScores.reduce((a, b) => a + b) / recentScores.length;
    const variance = recentScores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / recentScores.length;
    const consistencyScore = Math.max(0, 100 - Math.sqrt(variance) * 4);

    // 4. Radar Chart Data (Skill Distribution)
    const skillData = [
      { subject: 'Confidence', A: latest.confidenceScore, fullMark: 100 },
      { subject: 'Clarity', A: latest.clarityScore, fullMark: 100 },
      { subject: 'Fluency', A: Math.min(100, (latest.fluencyRate / 160) * 100), fullMark: 100 },
      { subject: 'Engagement', A: latest.engagementScore, fullMark: 100 },
      { subject: 'Conciseness', A: Math.max(0, 100 - latest.fillerWordCount * 10), fullMark: 100 },
    ];

    // 5. Insights (Dynamic based on latest session compared to history)
    const insights = [];
    const latestDate = new Date(latest.timestamp).toLocaleDateString();
    
    // Improvement Insights
    if (improvementRate > 3) {
      insights.push(`On ${latestDate}, you outperformed your previous average by ${improvementRate.toFixed(1)}%! Great momentum.`);
    } else if (improvementRate < -3) {
      insights.push(`Your recent performance score (${overallScore.toFixed(1)}) is slightly below your usual standard. Analyze the feedback to pinpoint the cause.`);
    } else {
      const stabilityMsgs = [
        "Your performance remains very stable. Consistent practice is building your muscle memory!",
        "You are maintaining a steady, professional standard in your delivery.",
        "Your communication metrics are consistent, showing reliable skill retention."
      ];
      insights.push(stabilityMsgs[reports.length % stabilityMsgs.length]);
    }

    // Confidence Insights
    if (latest.confidenceScore > 80 && latest.confidenceScore > avgPrevScore) {
      insights.push("Your vocal presence is reaching new heights. Your confidence score is now trending upwards!");
    } else if (latest.confidenceScore < 60) {
      insights.push("Your confidence was lower than usual in this session. Focus on your posture and breath to project more authority.");
    }

    // Filler Word Insights
    if (latest.fillerWordCount === 0) {
      insights.push("Excellent conciseness! You used zero filler words in your latest session.");
    } else if (previous.length > 0 && latest.fillerWordCount < previous[previous.length-1].fillerWordCount) {
      insights.push(`Progress detected: You reduced your filler word count from ${previous[previous.length-1].fillerWordCount} to ${latest.fillerWordCount}.`);
    } else if (latest.fillerWordCount > 6) {
      insights.push(`We noticed ${latest.fillerWordCount} filler words in your last session. Use intentional silence instead of 'um' or 'ah'.`);
    }

    // Clarity Insights
    if (latest.clarityScore > 85) {
      insights.push("Your articulation is exceptionally crisp. Your clarity score is in the top bracket!");
    } else if (latest.clarityScore < 60) {
      insights.push("Your articulation was a bit low. Focus on enunciating each word more deliberately.");
    }
    
    // 6. Suggestions (Dynamic based on weakest metrics in LATEST session)
    const weakMetrics = [...skillData].sort((a, b) => a.A - b.A).slice(0, 2);
    const suggestions = weakMetrics.map(m => {
      const options = {
        'Conciseness': [
          "Try the 'Silent Pause' technique: Whenever you feel a filler word coming, just take a breath instead.",
          "Record yourself for 2 minutes daily and count your filler words. Self-awareness is the first step to elimination.",
          "Slow down your speech slightly to give your brain more time to find the next word without using fillers."
        ],
        'Fluency': [
          "Your speaking rate (WPM) is a bit uneven. Practice reading simple text at a constant pace.",
          "Try reading poetry or rhythmic text aloud to improve your natural speech cadence.",
          "Focus on connecting short sentences into longer, fluid thoughts."
        ],
        'Confidence': [
          "Boost your confidence by recording yourself while standing tall and making intentional hand gestures.",
          "Practice your opening 30 seconds multiple times until it's effortless. A strong start builds momentum.",
          "Vary your pitch and volume to make your voice sound more dynamic and certain."
        ],
        'Clarity': [
          "Warm up your jaw and tongue with 2 minutes of articulation exercises before your next session.",
          "Practice 'over-enunciating' your words in a slow drill to improve your clarity score.",
          "Focus on making your ending consonants (like 't', 'd', 'k') more distinct."
        ],
        'Engagement': [
          "Vary your pitch more often to make your speech sound more dynamic and engaging to your audience.",
          "Try to incorporate more storytelling or specific examples to keep the audience's attention.",
          "Focus on your vocal energy. A more enthusiastic tone naturally increases engagement scores."
        ]
      };
      
      const category = m.subject as keyof typeof options;
      const suggestionsList = options[category] || [`Focus on improving your ${m.subject} by practicing specific drills.`];
      return suggestionsList[reports.length % suggestionsList.length];
    });

    return {
      overallScore,
      improvementRate,
      consistencyScore,
      skillData,
      insights,
      suggestions,
      latestMetrics: {
        confidence: latest.confidenceScore,
        fluency: latest.fluencyRate,
        filler: latest.fillerWordCount,
        clarity: latest.clarityScore,
        duration: latest.sessionDuration
      }
    };
  }, [reports]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <div className="loader">Loading Analytics...</div>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', color: 'var(--text-primary)', textAlign: 'center' }}>
        <div style={{ marginBottom: '2.5rem' }}>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Performance Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Track your growth and communication milestones.</p>
        </div>
        
        <div style={{ 
          backgroundColor: 'var(--bg-card)', 
          padding: '4rem 2rem', 
          borderRadius: '24px', 
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.5rem',
          boxShadow: 'var(--shadow-md)'
        }}>
          <div style={{ 
            width: '80px', 
            height: '80px', 
            backgroundColor: 'rgba(37, 99, 235, 0.1)', 
            borderRadius: '50%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: 'var(--primary-color)'
          }}>
            <BarChart2 size={40} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.75rem' }}>No Reports Yet</h2>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto', lineHeight: '1.6' }}>
              Your progress dashboard is empty because you haven't completed any sessions yet. 
              Start an analysis or an interview in the VR Room to see your communication analytics!
            </p>
          </div>
          <button 
            onClick={() => window.location.href = '/dashboard'}
            style={{
              marginTop: '1rem',
              padding: '0.8rem 2rem',
              backgroundColor: 'var(--primary-color)',
              color: 'white',
              borderRadius: '12px',
              border: 'none',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'transform 0.2s',
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', color: 'var(--text-primary)' }}>
      {/* Header & Filters */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Performance Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Track your growth and communication milestones.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '0.75rem', backgroundColor: 'var(--bg-card)', padding: '0.5rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          {(['7d', '30d', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: filter === f ? 'var(--primary-color)' : 'transparent',
                color: filter === f ? 'white' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontWeight: '600',
                transition: 'all 0.2s'
              }}
            >
              {f === '7d' ? 'Last 7 Days' : f === '30d' ? 'Last 30 Days' : 'All Time'}
            </button>
          ))}
        </div>
      </div>

      {analytics && (
        <>
          {/* Top Metric Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            <MetricCard 
              title="Overall Score" 
              value={analytics.overallScore.toFixed(1)} 
              icon={<Award color={COLORS.primary} />} 
              trend={analytics.improvementRate}
              suffix="/100"
            />
            <MetricCard 
              title="Confidence" 
              value={analytics.latestMetrics.confidence.toFixed(0)} 
              icon={<Shield color={COLORS.purple} />} 
              suffix="%"
            />
            <MetricCard 
              title="Fluency" 
              value={analytics.latestMetrics.fluency.toFixed(0)} 
              icon={<Zap color={COLORS.success} />} 
              suffix=" WPM"
            />
            <MetricCard 
              title="Consistency" 
              value={analytics.consistencyScore.toFixed(0)} 
              icon={<Target color={COLORS.cyan} />} 
              suffix="%"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '1.5rem' }}>
            {/* Main Trend Chart */}
            <div style={{ gridColumn: 'span 8', backgroundColor: 'var(--bg-card)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <h3 style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>Performance Trends</h3>
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><div style={{ width: 10, height: 10, borderRadius: '50%', background: COLORS.primary }} /> Confidence</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><div style={{ width: 10, height: 10, borderRadius: '50%', background: COLORS.success }} /> Fluency</span>
                </div>
              </div>
              <div style={{ height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={reports}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={(date) => new Date(date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      stroke="var(--text-secondary)"
                      fontSize={12}
                    />
                    <YAxis stroke="var(--text-secondary)" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: '8px' }}
                      labelFormatter={(date) => new Date(date).toLocaleString()}
                    />
                    <Line type="monotone" dataKey="confidenceScore" stroke={COLORS.primary} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="fluencyRate" stroke={COLORS.success} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Skill Distribution Radar */}
            <div style={{ gridColumn: 'span 4', backgroundColor: 'var(--bg-card)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
              <h3 style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '1rem' }}>Skill Radar</h3>
              <div style={{ height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={analytics.skillData}>
                    <PolarGrid stroke="var(--border-color)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
                    <Radar
                      name="Skills"
                      dataKey="A"
                      stroke={COLORS.primary}
                      fill={COLORS.primary}
                      fillOpacity={0.6}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Filler Words Reduction Bar Chart */}
            <div style={{ gridColumn: 'span 6', backgroundColor: 'var(--bg-card)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
              <h3 style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '1.5rem' }}>Filler Word Reduction</h3>
              <div style={{ height: '250px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reports.slice(-10)}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={(date) => new Date(date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      stroke="var(--text-secondary)"
                      fontSize={10}
                    />
                    <YAxis stroke="var(--text-secondary)" fontSize={10} label={{ value: 'Count', angle: -90, position: 'insideLeft', fill: 'var(--text-secondary)' }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: '8px' }}
                      labelFormatter={(date) => new Date(date).toLocaleString()}
                    />
                    <Bar dataKey="fillerWordCount" name="Filler Words" fill={COLORS.danger} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Engagement vs Clarity Comparison */}
            <div style={{ gridColumn: 'span 6', backgroundColor: 'var(--bg-card)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
              <h3 style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '1.5rem' }}>Engagement vs Clarity</h3>
              <div style={{ height: '250px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reports.slice(-7)}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={(date) => new Date(date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      stroke="var(--text-secondary)"
                      fontSize={10}
                    />
                    <YAxis stroke="var(--text-secondary)" fontSize={10} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: '8px' }}
                      labelFormatter={(date) => new Date(date).toLocaleString()}
                    />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: '10px' }} />
                    <Bar dataKey="engagementScore" name="Engagement" fill={COLORS.cyan} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="clarityScore" name="Clarity" fill={COLORS.warning} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Insights & Suggestions */}
            <div style={{ gridColumn: 'span 6', backgroundColor: 'var(--bg-card)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <Info size={20} color={COLORS.primary} />
                <h3 style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>Personalized Insights</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {analytics.insights.map((insight, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', backgroundColor: 'rgba(37, 99, 235, 0.05)', borderRadius: '10px', fontSize: '0.95rem' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: COLORS.primary }} />
                    {insight}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ gridColumn: 'span 6', backgroundColor: 'var(--bg-card)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <TrendingUp size={20} color={COLORS.success} />
                <h3 style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>Next Improvement Suggestions</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {analytics.suggestions.map((sug, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', backgroundColor: 'rgba(34, 197, 94, 0.05)', borderRadius: '10px', fontSize: '0.95rem' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: COLORS.success }} />
                    {sug}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// Sub-components
const MetricCard = ({ title, value, icon, trend, suffix = "" }: any) => {
  const isPositive = trend > 0;
  return (
    <div style={{
      backgroundColor: 'var(--bg-card)',
      padding: '1.5rem',
      borderRadius: '16px',
      border: '1px solid var(--border-color)',
      boxShadow: 'var(--shadow-sm)',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: '500' }}>{title}</span>
        <div style={{ padding: '0.5rem', backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: '10px' }}>{icon}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
        <span style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{value}</span>
        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{suffix}</span>
      </div>
      {trend !== undefined && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', color: isPositive ? COLORS.success : COLORS.danger }}>
          {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          <span>{Math.abs(trend).toFixed(1)}% {isPositive ? 'improvement' : 'decrease'}</span>
        </div>
      )}
    </div>
  );
};

export default ProgressPage;
