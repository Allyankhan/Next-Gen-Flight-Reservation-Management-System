import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function AdminDashboard() {
  const [allBookings, setAllBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Security Check: If they aren't an admin, kick them out!
    const userString = localStorage.getItem('user');
    const user = userString ? JSON.parse(userString) : null;
    
    if (!user || user.role !== 'admin') {
      navigate('/');
      return;
    }

    const fetchAllBookings = async () => {
      try {
        const response = await axios.get('http://127.0.0.1:5000/api/admin/bookings');
        setAllBookings(response.data.data);
        setLoading(false);
      } catch (error) {
        console.error("Failed to load admin data");
        setLoading(false);
      }
    };
    
    fetchAllBookings();
  }, [navigate]);

  if (loading) return (
    <div className="flex justify-center items-center h-64 text-white text-xl animate-pulse">
      Loading System Data...
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight drop-shadow-lg">
            Admin Control Panel
          </h1>
          <p className="mt-2 text-sm text-emerald-100 drop-shadow">
            System-wide booking and passenger management.
          </p>
        </div>
        
        {/* Quick Stats Cards */}
        <div className="flex gap-4">
          <div className="bg-white/10 backdrop-blur-md px-6 py-3 rounded-xl border border-white/20">
            <span className="block text-xs text-emerald-200 uppercase tracking-wider">Total Bookings</span>
            <span className="text-2xl font-bold text-white">{allBookings.length}</span>
          </div>
          <div className="bg-emerald-500/20 backdrop-blur-md px-6 py-3 rounded-xl border border-emerald-400/30">
            <span className="block text-xs text-emerald-200 uppercase tracking-wider">Total Revenue</span>
            <span className="text-2xl font-bold text-white">
              Rs. {allBookings.reduce((sum, b) => sum + Number(b.total_price), 0).toLocaleString()}
            </span>
          </div>
        </div>
      </div>
      
      {/* System Bookings Table */}
      <div className="bg-white/10 backdrop-blur-xl rounded-3xl overflow-hidden border border-white/20 shadow-2xl">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-white/20">
            <thead className="bg-white/5">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-emerald-100 uppercase tracking-wider">Ticket Ref</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-emerald-100 uppercase tracking-wider">Passenger</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-emerald-100 uppercase tracking-wider">Flight</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-emerald-100 uppercase tracking-wider">Route</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-emerald-100 uppercase tracking-wider">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {allBookings.map((booking) => (
                <tr key={booking.booking_id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-emerald-300">
                    {booking.ticket_ref}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-bold text-white">{booking.passenger_name}</div>
                    <div className="text-xs text-emerald-100/70">{booking.passenger_email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                    ✈️ {booking.flight_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                    {booking.origin_code} → {booking.destination_code}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-extrabold text-white text-right">
                    Rs. {Number(booking.total_price).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;