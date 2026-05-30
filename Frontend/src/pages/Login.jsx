import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function Login() {
  const [email, setEmail] = useState('test@example.com');
  const [password, setPassword] = useState('hashedpassword');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post('http://127.0.0.1:5000/api/login', {
        email,
        password
      });

      // Save the user data to the browser's local storage
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      // Redirect to the dashboard
      navigate('/dashboard');
      // Refresh the page slightly so the Navbar updates
      window.location.reload(); 
      
    } catch (err) {
      setError(err.response?.data?.error || "Failed to connect to server.");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-20">
      <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl">
        
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-white drop-shadow-md">Welcome Back</h2>
          <p className="text-emerald-100 mt-2 text-sm">Sign in to manage your flights.</p>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 p-3 rounded-lg mb-6 text-center">
            <p className="text-red-100 text-sm font-bold">{error}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-emerald-100 uppercase tracking-wider mb-2">Email Address</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-emerald-100/50 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-emerald-100 uppercase tracking-wider mb-2">Password</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-emerald-100/50 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-4 rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all duration-200 mt-4"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

      </div>
    </div>
  );
}

export default Login;