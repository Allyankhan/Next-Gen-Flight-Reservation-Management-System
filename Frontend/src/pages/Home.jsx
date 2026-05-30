import { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

function Home() {
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Search state
  const [originFilter, setOriginFilter] = useState('');
  const [destFilter, setDestFilter] = useState('');

  useEffect(() => {
    const fetchFlights = async () => {
      try {
        const response = await axios.get('http://127.0.0.1:5000/api/flights');
        setFlights(response.data.data);
        setLoading(false);
      } catch (error) {
        setError("Failed to load flights. Make sure the backend is running.");
        setLoading(false);
      }
    };
    fetchFlights();
  }, []);

  // Filter logic: Only show flights that match both inputs
  const filteredFlights = flights.filter(flight => {
    const matchOrigin = flight.origin_city.toLowerCase().includes(originFilter.toLowerCase()) || 
                        flight.origin_code.toLowerCase().includes(originFilter.toLowerCase());
    const matchDest = flight.destination_city.toLowerCase().includes(destFilter.toLowerCase()) || 
                      flight.destination_code.toLowerCase().includes(destFilter.toLowerCase());
    return matchOrigin && matchDest;
  });

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="text-xl text-white font-semibold animate-pulse drop-shadow-md">Loading available flights...</div>
    </div>
  );

  if (error) return (
    <div className="max-w-7xl mx-auto px-4 mt-8">
      <div className="bg-red-500/20 backdrop-blur-md border border-red-500/50 p-4 rounded-xl shadow-lg">
        <p className="text-red-100 font-medium">{error}</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      
      <div className="mb-8">
        <h1 className="text-4xl font-extrabold text-white tracking-tight drop-shadow-lg">
          Search Flights
        </h1>
        <p className="mt-2 text-sm text-emerald-100 drop-shadow">
          Find real-time availability for your next destination.
        </p>
      </div>

      {/* Glassmorphism Search Bar */}
      <div className="mb-8 p-6 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-lg flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <label className="block text-xs font-bold text-emerald-100 uppercase tracking-wider mb-2">From</label>
          <input 
            type="text" 
            placeholder="e.g. Islamabad or ISB" 
            value={originFilter}
            onChange={(e) => setOriginFilter(e.target.value)}
            className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-emerald-100/50 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition"
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs font-bold text-emerald-100 uppercase tracking-wider mb-2">To</label>
          <input 
            type="text" 
            placeholder="e.g. Karachi or KHI" 
            value={destFilter}
            onChange={(e) => setDestFilter(e.target.value)}
            className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-emerald-100/50 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition"
          />
        </div>
      </div>
      
      {/* Glassmorphism Data Table Card */}
      <div className="bg-white/10 backdrop-blur-xl rounded-3xl overflow-hidden border border-white/20 shadow-2xl">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-white/20">
            <thead className="bg-white/5">
              <tr>
                <th className="px-6 py-5 text-left text-xs font-bold text-emerald-100 uppercase tracking-wider">Flight No.</th>
                <th className="px-6 py-5 text-left text-xs font-bold text-emerald-100 uppercase tracking-wider">Origin</th>
                <th className="px-6 py-5 text-left text-xs font-bold text-emerald-100 uppercase tracking-wider">Destination</th>
                <th className="px-6 py-5 text-left text-xs font-bold text-emerald-100 uppercase tracking-wider">Departure</th>
                <th className="px-6 py-5 text-right text-xs font-bold text-emerald-100 uppercase tracking-wider">Price (PKR)</th>
                <th className="px-6 py-5 text-right text-xs font-bold text-emerald-100 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            
            <tbody className="divide-y divide-white/10">
              {filteredFlights.length > 0 ? (
                filteredFlights.map((flight) => (
                  <tr key={flight.id} className="hover:bg-white/10 transition-colors duration-200 ease-in-out">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-white border border-white/30 shadow-sm backdrop-blur-md">
                        ✈️ {flight.flight_number}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-medium">
                      {flight.origin_city} <span className="text-emerald-200 text-xs ml-1">({flight.origin_code})</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-medium">
                      {flight.destination_city} <span className="text-emerald-200 text-xs ml-1">({flight.destination_code})</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-emerald-50">
                      {new Date(flight.departure_time).toLocaleString('en-US', { 
                        weekday: 'short', month: 'short', day: 'numeric', 
                        hour: '2-digit', minute: '2-digit' 
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-extrabold text-white text-right">
                      Rs. {Number(flight.base_price).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
  <Link 
    to={`/book/${flight.id}`}
    className="bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-2 px-4 rounded-lg shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all duration-200 backdrop-blur-sm"
  >
    Book Now
  </Link>
</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-emerald-100 font-medium">
                    No flights found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
    </div>
  );
}

export default Home;