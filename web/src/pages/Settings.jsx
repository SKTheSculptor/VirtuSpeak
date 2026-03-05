import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Input from '../components/Input';
import Button from '../components/Button';
import { User, Lock, Moon, Sun } from 'lucide-react';

const Settings = () => {
  const { user, updateProfile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const handleProfileUpdate = (e) => {
    e.preventDefault();
    updateProfile({ name, email });
    alert('Profile updated successfully!');
  };

  const handlePasswordUpdate = (e) => {
    e.preventDefault();
    // Mock password update
    setCurrentPassword('');
    setNewPassword('');
    alert('Password updated successfully!');
  };

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Settings</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Manage your account settings and preferences.</p>
      </div>

      <div style={{ display: 'grid', gap: '2rem', maxWidth: '800px' }}>
        {/* Profile Settings */}
        <div style={{
           backgroundColor: 'var(--bg-card)',
           padding: '2rem',
           borderRadius: '12px',
           border: '1px solid var(--border-color)',
           boxShadow: 'var(--shadow-sm)'
        }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
             <User size={24} color="var(--primary-color)" />
             <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Profile Information</h2>
           </div>
           
           <form onSubmit={handleProfileUpdate}>
             <div style={{ display: 'grid', gap: '1rem' }}>
               <Input 
                 label="Full Name" 
                 value={name} 
                 onChange={(e) => setName(e.target.value)} 
               />
               <Input 
                 label="Email Address" 
                 value={email} 
                 onChange={(e) => setEmail(e.target.value)} 
               />
               <div>
                 <Button type="submit">Save Changes</Button>
               </div>
             </div>
           </form>
        </div>

        {/* Password Settings */}
        <div style={{
           backgroundColor: 'var(--bg-card)',
           padding: '2rem',
           borderRadius: '12px',
           border: '1px solid var(--border-color)',
           boxShadow: 'var(--shadow-sm)'
        }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
             <Lock size={24} color="var(--primary-color)" />
             <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Change Password</h2>
           </div>
           
           <form onSubmit={handlePasswordUpdate}>
             <div style={{ display: 'grid', gap: '1rem' }}>
               <Input 
                 label="Current Password" 
                 type="password"
                 value={currentPassword} 
                 onChange={(e) => setCurrentPassword(e.target.value)} 
               />
               <Input 
                 label="New Password" 
                 type="password"
                 value={newPassword} 
                 onChange={(e) => setNewPassword(e.target.value)} 
               />
               <div>
                 <Button type="submit" variant="secondary">Update Password</Button>
               </div>
             </div>
           </form>
        </div>

        {/* Appearance Settings */}
        <div style={{
           backgroundColor: 'var(--bg-card)',
           padding: '2rem',
           borderRadius: '12px',
           border: '1px solid var(--border-color)',
           boxShadow: 'var(--shadow-sm)'
        }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
             {theme === 'dark' ? <Moon size={24} color="var(--primary-color)" /> : <Sun size={24} color="var(--primary-color)" />}
             <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Appearance</h2>
           </div>
           
           <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
             <div>
               <p style={{ fontWeight: '500' }}>Theme Preference</p>
               <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                 Switch between light and dark mode.
               </p>
             </div>
             <Button onClick={toggleTheme} variant="secondary">
               {theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
             </Button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
