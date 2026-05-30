import { Link, useNavigate } from 'react-router-dom';

function Navbar() {
  const navigate = useNavigate();
  // Check if a user is logged in
  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : null;

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/10 backdrop-blur-lg border-b border-white/20 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          <div className="shrink-0 flex items-center">
            <Link to="/" className="text-2xl font-bold tracking-wider text-white hover:text-emerald-200 transition duration-200 drop-shadow-md">
              ✈️ FlightSystem
            </Link>
          </div>

          <div className="flex space-x-6 items-center">
            <Link to="/" className="px-3 py-2 rounded-lg text-sm font-medium text-white hover:bg-white/20 transition duration-200">
              Search Flights
            </Link>
            
            {user ? (
              <>
                {/* Regular Dashboard Link */}
                <Link to="/dashboard" className="px-3 py-2 rounded-lg text-sm font-medium text-white hover:bg-white/20 transition duration-200">
                  Dashboard
                </Link>

                {/* ONLY SHOW THIS IF THE USER IS AN ADMIN */}
                {user.role === 'admin' && (
                  <Link to="/admin" className="px-3 py-2 rounded-lg text-sm font-bold text-emerald-300 hover:bg-white/20 transition duration-200 flex items-center gap-1">
                    🛡️ Admin Panel
                  </Link>
                )}

                <div className="flex items-center gap-4 ml-4 pl-4 border-l border-white/20">
                  <span className="text-emerald-200 text-sm font-bold">Hi, {user.name}</span>
                  <button onClick={handleLogout} className="bg-red-500/20 text-red-100 border border-red-500/30 px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-500/40 transition duration-200">
                    Logout
                  </button>
                </div>
              </>
            ) : (
              /* The missing "Login" button for logged-out users */
              <Link to="/login" className="bg-white/20 text-white border border-white/30 px-5 py-2 rounded-lg text-sm font-bold hover:bg-white/30 transition duration-200 shadow-sm backdrop-blur-sm">
                Login
              </Link>
            )}
          </div>

        </div>
      </div>
    </nav>
  );
}

export default Navbar;