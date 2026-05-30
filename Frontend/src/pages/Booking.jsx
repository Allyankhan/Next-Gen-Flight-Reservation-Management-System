import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';

// Initialize the WebSocket connection outside the component
const socket = io('http://127.0.0.1:5000');

function Booking() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [seats, setSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSeat, setSelectedSeat] = useState(null);
  
  // NEW: Keep track of seats locked by OTHER users in real-time
  const [lockedSeats, setLockedSeats] = useState([]);
  
  const [passengerName, setPassengerName] = useState('');
  const [passportNumber, setPassportNumber] = useState('');
  const [address, setAddress] = useState('');

  useEffect(() => {
    // 1. Fetch initial seat data
    const fetchSeats = async () => {
      try {
        const response = await axios.get(`http://127.0.0.1:5000/api/flights/${id}/seats`);
        setSeats(response.data.data);
        setLoading(false);
      } catch (err) {
        setError("Failed to load seat map. Please try again.");
        setLoading(false);
      }
    };
    fetchSeats();

    // 2. WebSocket: Join this specific flight's live room
    socket.emit('join_flight', { flight_id: id });

    // 3. WebSocket: Listen for others locking a seat
    socket.on('seat_locked', (data) => {
      setLockedSeats((prev) => [...prev, data.seat_id]);
    });

    // 4. WebSocket: Listen for others unlocking a seat
    socket.on('seat_unlocked', (data) => {
      setLockedSeats((prev) => prev.filter(seatId => seatId !== data.seat_id));
    });

    // Cleanup: Leave room and turn off listeners when user leaves the page
    return () => {
      socket.emit('leave_flight', { flight_id: id });
      // If they had a seat selected when they left, unlock it for others
      if (selectedSeat) {
        socket.emit('deselect_seat', { flight_id: id, seat_id: selectedSeat.id });
      }
      socket.off('seat_locked');
      socket.off('seat_unlocked');
    };
  }, [id, selectedSeat]);

  const handleSeatClick = (seat) => {
    if (seat.status === 'booked' || lockedSeats.includes(seat.id)) return;
    
    // If we already have a seat selected, we are deselecting it
    if (selectedSeat) {
      socket.emit('deselect_seat', { flight_id: id, seat_id: selectedSeat.id });
    }

    // If we are clicking a new seat, select it and tell the server to lock it
    if (!selectedSeat || selectedSeat.id !== seat.id) {
      socket.emit('select_seat', { flight_id: id, seat_id: seat.id });
      setSelectedSeat(seat);
    } else {
      setSelectedSeat(null);
    }
  };

  const handleConfirmBooking = async () => {
    if (!selectedSeat || !passengerName || !passportNumber) {
      alert("Please fill in all passenger details and select a seat.");
      return;
    }
    
    setLoading(true);

    try {
      const userString = localStorage.getItem('user');
      const user = userString ? JSON.parse(userString) : null;

      const payload = {
        user_id: user ? user.id : 1, 
        flight_id: id,
        seat_id: selectedSeat.id,
        total_price: selectedSeat.class === 'first' ? 25000 : selectedSeat.class === 'business' ? 15000 : 8500,
        passenger_name: passengerName,
        passport_number: passportNumber,
        address: address
      };

      const response = await axios.post('http://127.0.0.1:5000/api/bookings', payload);
      
      // Tell everyone else this seat is permanently gone
      socket.emit('deselect_seat', { flight_id: id, seat_id: selectedSeat.id });
      
      alert(`Success! Your ticket reference is: ${response.data.ticket_ref}`);
      navigate('/dashboard');
      
    } catch (err) {
      console.error(err);
      alert("Failed to process booking. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      
      <div className="mb-8">
        <h1 className="text-4xl font-extrabold text-white tracking-tight drop-shadow-lg">
          Select Your Seat
        </h1>
        <p className="mt-2 text-sm text-emerald-100 drop-shadow">
          Flight ID: {id} • Choose from the available options below.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        
        {/* Seat Map Panel */}
        <div className="flex-2 bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl">
          
          {/* Legend */}
          <div className="flex justify-center gap-6 mb-8 pb-6 border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-white/20 border border-white/30"></div>
              <span className="text-xs text-white uppercase tracking-wider">Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-emerald-400 border border-emerald-300 shadow-[0_0_10px_rgba(52,211,153,0.8)]"></div>
              <span className="text-xs text-white uppercase tracking-wider">Selected</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-orange-500 border border-orange-400 shadow-[0_0_10px_rgba(249,115,22,0.8)]"></div>
              <span className="text-xs text-white uppercase tracking-wider">Locked by Another User</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-500/20 border border-red-500/30 opacity-50"></div>
              <span className="text-xs text-white uppercase tracking-wider">Booked</span>
            </div>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 place-items-center">
            {seats.length > 0 ? seats.map((seat) => {
              const isBooked = seat.status === 'booked';
              const isSelected = selectedSeat && selectedSeat.id === seat.id;
              const isLockedByOther = lockedSeats.includes(seat.id);
              
              return (
                <button
                  key={seat.id}
                  onClick={() => handleSeatClick(seat)}
                  disabled={isBooked || isLockedByOther}
                  className={`
                    relative w-16 h-20 rounded-t-2xl rounded-b-lg flex flex-col items-center justify-center font-bold text-lg transition-all duration-200
                    ${isBooked ? 'bg-red-500/20 text-red-200 cursor-not-allowed opacity-50 border border-red-500/30' : ''}
                    ${isLockedByOther ? 'bg-orange-500 text-orange-100 cursor-not-allowed border border-orange-400 shadow-md animate-pulse' : ''}
                    ${isSelected ? 'bg-emerald-400 text-emerald-900 border-emerald-300 shadow-[0_0_20px_rgba(52,211,153,0.6)] scale-110 z-10' : ''}
                    ${!isBooked && !isSelected && !isLockedByOther ? 'bg-white/10 text-white hover:bg-white/20 border border-white/20 shadow-md hover:shadow-lg hover:-translate-y-1' : ''}
                  `}
                >
                  <span className="text-xs font-normal opacity-70 absolute top-2">{seat.class === 'economy' ? 'ECO' : seat.class === 'business' ? 'BIZ' : '1ST'}</span>
                  <span className="mt-2">{seat.seat_number}</span>
                  {isLockedByOther && <span className="absolute -bottom-2 text-xs">🔒</span>}
                </button>
              );
            }) : (
              <p className="col-span-full text-emerald-100">No seats configured for this flight yet.</p>
            )}
          </div>
        </div>

        {/* Booking Summary Sidebar */}
        <div className="flex-1 h-fit bg-white/5 backdrop-blur-md rounded-3xl p-6 border border-white/10 shadow-lg flex flex-col">
          <h3 className="text-xl font-bold text-white mb-4 pb-4 border-b border-white/10">Booking Summary</h3>
          
          <div className="flex justify-between items-center mb-4">
            <span className="text-emerald-100">Selected Seat:</span>
            <span className="text-2xl font-extrabold text-white">
              {selectedSeat ? selectedSeat.seat_number : '--'}
            </span>
          </div>

          <div className="flex justify-between items-center mb-6">
            <span className="text-emerald-100">Class:</span>
            <span className="text-lg font-bold text-white capitalize">
              {selectedSeat ? selectedSeat.class : '--'}
            </span>
          </div>

          {selectedSeat && (
            <div className="mt-4 mb-6 bg-white/10 p-5 rounded-2xl border border-white/20 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <h3 className="text-sm font-bold text-emerald-200 mb-4 uppercase tracking-wider">Passenger Details</h3>
              
              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-bold text-white mb-1">Full Legal Name *</label>
                  <input 
                    type="text" 
                    required
                    value={passengerName}
                    onChange={(e) => setPassengerName(e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition"
                    placeholder="e.g. John Doe"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-white mb-1">Passport / ID Number *</label>
                  <input 
                    type="text" 
                    required
                    value={passportNumber}
                    onChange={(e) => setPassportNumber(e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition"
                    placeholder="e.g. AB1234567"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-white mb-1">Billing Address</label>
                  <input 
                    type="text" 
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition"
                    placeholder="123 Main St..."
                  />
                </div>
              </div>
            </div>
          )}

          <button 
            onClick={handleConfirmBooking} 
            disabled={loading || !selectedSeat}
            className={`w-full font-bold py-4 rounded-xl transition-all duration-200 flex justify-center items-center gap-2
              ${selectedSeat 
                ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]' 
                : 'bg-white/10 text-white/50 cursor-not-allowed border border-white/10'
              }
            `}
          >
            {loading ? 'Processing...' : 'Confirm Reservation'}
          </button>
          
        </div>

      </div>
    </div>
  );
}

export default Booking;