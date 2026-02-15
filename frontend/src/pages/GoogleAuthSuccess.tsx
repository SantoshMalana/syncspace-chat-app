import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const GoogleAuthSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    const userStr = searchParams.get('user');
    const error = searchParams.get('error');

    if (error) {
      console.error('OAuth error:', error);
      navigate(`/login?error=${error}`);
      return;
    }

    if (token && userStr) {
      try {
        console.log('✅ Google authentication successful');
        const user = JSON.parse(decodeURIComponent(userStr));
        
        // Save to localStorage
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));

        console.log('📦 User data saved, redirecting to dashboard...');
        // Redirect to dashboard
        navigate('/dashboard');
      } catch (error) {
        console.error('❌ Error parsing user data:', error);
        navigate('/login?error=invalid_data');
      }
    } else {
      console.error('❌ Missing token or user data');
      navigate('/login?error=missing_data');
    }
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-400">Completing sign in...</p>
      </div>
    </div>
  );
};

export default GoogleAuthSuccess;
