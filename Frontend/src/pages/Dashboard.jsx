import { useState, useEffect } from 'react';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react'; 
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

function Dashboard() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const userString = localStorage.getItem('user');
    
    if (!userString) {
      setError("Please log in to view your travel wallet.");
      setLoading(false);
      return;
    }

    const user = JSON.parse(userString);

    const fetchBookings = async () => {
      try {
        const response = await axios.get(`http://127.0.0.1:5000/api/users/${user.id}/bookings`);
        setBookings(response.data.data);
        setLoading(false);
      } catch (err) {
        setError("Failed to load your bookings. Please try again.");
        setLoading(false);
      }
    };
    fetchBookings();
  }, []);

  const handleDownloadPDF = async (ticketRef) => {
    try {
      const element = document.getElementById(`ticket-${ticketRef}`);
      if (!element) return;

      const dataUrl = await toPng(element, { 
        quality: 1.0,
        pixelRatio: 2,
        backgroundColor: '#022c22' 
      });

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const imgProps = pdf.getImageProperties(dataUrl);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(dataUrl, 'PNG', 0, 15, pdfWidth, pdfHeight);
      pdf.save(`${ticketRef}-BoardingPass.pdf`);

    } catch (err) {
      console.error("PDF Generation failed:", err);
      alert("Failed to generate PDF. Check console for details.");
    }
  };

  // --- NEW: CANCELLATION LOGIC ---
  const handleCancelBooking = async (bookingId, ticketRef) => {
    // 1. Ask for confirmation before deleting
    const confirmCancel = window.confirm(`Are you sure you want to cancel ticket ${ticketRef}? This will release your seat and cannot be undone.`);
    
    if (!confirmCancel) return;

    try {
      // 2. Send the DELETE request to your updated Flask backend
      await axios.delete(`http://127.0.0.1:5000/api/bookings/${bookingId}`);
      
      // 3. Instantly remove the cancelled ticket from the screen without refreshing the page
      setBookings(prevBookings => prevBookings.filter(b => b.booking_id !== bookingId));
      
      alert(`Ticket ${ticketRef} has been successfully cancelled.`);
    } catch (err) {
      console.error("Cancellation failed:", err);
      alert("Failed to cancel the ticket. Please check the backend connection.");
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="text-xl text-white font-semibold animate-pulse drop-shadow-md">Loading your travel wallet...</div>
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
    <div className="max-w-5xl mx-auto px-4 py-10">
      
      <div className="mb-10 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight drop-shadow-lg">
            My Travel Wallet
          </h1>
          <p className="mt-2 text-sm text-emerald-100 drop-shadow">
            Manage your upcoming flights and download boarding passes.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {bookings.length > 0 ? bookings.map((booking) => (
          
          <div key={booking.booking_id} className="flex flex-col gap-3">
            <div 
              id={`ticket-${booking.ticket_ref}`}
              className="relative bg-white/10 backdrop-blur-xl rounded-3xl overflow-hidden border border-white/20 shadow-2xl flex flex-col"
            >
              
              <div className="p-6 pb-4 border-b border-white/10 border-dashed relative">
                <div className="absolute -bottom-4 -left-4 w-8 h-8 bg-[#034a36] rounded-full shadow-inner border-t border-r border-white/10"></div>
                <div className="absolute -bottom-4 -right-4 w-8 h-8 bg-[#034a36] rounded-full shadow-inner border-t border-l border-white/10"></div>

                <div className="flex justify-between items-start mb-6">
                  <div>
                    <span className="text-xs font-bold text-emerald-200 uppercase tracking-widest">Flight</span>
                    <div className="text-2xl font-black text-white drop-shadow-sm flex items-center gap-2">
                      ✈️ {booking.flight_number}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-emerald-200 uppercase tracking-widest">Status</span>
                    <div className="mt-1">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-400/20 text-emerald-100 border border-emerald-400/30">
                        {booking.booking_status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center relative">
                  <div className="flex flex-col">
                    <span className="text-4xl font-black text-white">{booking.origin_code}</span>
                    <span className="text-sm font-medium text-emerald-100 mt-1">{booking.origin_city}</span>
                  </div>
                  <div className="flex-1 flex justify-center px-4">
                    <div className="w-full h-0.5 bg-white/20 relative">
                      <div className="absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 bg-white/40 rotate-45 border-t-2 border-r-2 border-white"></div>
                    </div>
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-4xl font-black text-white">{booking.destination_code}</span>
                    <span className="text-sm font-medium text-emerald-100 mt-1">{booking.destination_city}</span>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-white/5 flex justify-between items-center">
                <div className="flex gap-8">
                  <div>
                    <span className="block text-xs text-emerald-200/70 uppercase tracking-wider mb-1">Date & Time</span>
                    <span className="text-sm font-bold text-white">
                      {new Date(booking.departure_time).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs text-emerald-200/70 uppercase tracking-wider mb-1">Seat</span>
                    <span className="text-sm font-bold text-white">{booking.seat_number} <span className="text-xs font-normal text-white/70 capitalize">({booking.seat_class})</span></span>
                  </div>
                </div>
                
                <div className="bg-white p-2 rounded-xl shadow-inner">
                  <QRCodeSVG 
                    value={`Flight: ${booking.flight_number} | Ref: ${booking.ticket_ref} | Seat: ${booking.seat_number}`} 
                    size={64} 
                    bgColor={"#ffffff"}
                    fgColor={"#022c22"}
                    level={"Q"}
                  />
                </div>
              </div>
            </div>

            {/* ACTION BUTTONS (Split into 2 columns) */}
            <div className="flex gap-3">
              <button 
                onClick={() => handleDownloadPDF(booking.ticket_ref)}
                className="flex-1 bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-100 border border-emerald-500/50 font-bold py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 backdrop-blur-md cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                PDF
              </button>

              <button 
                onClick={() => handleCancelBooking(booking.booking_id, booking.ticket_ref)}
                className="flex-1 bg-red-500/10 hover:bg-red-500/30 text-red-200 border border-red-500/30 font-bold py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 backdrop-blur-md cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                Cancel Ticket
              </button>
            </div>
            
          </div>
        )) : (
          <div className="col-span-full py-12 text-center bg-white/5 backdrop-blur-md rounded-3xl border border-white/10">
            <span className="text-4xl mb-4 block">🎫</span>
            <h3 className="text-xl font-bold text-white mb-2">No trips booked yet</h3>
            <p className="text-emerald-100/70">When you book a flight, your boarding passes will appear here.</p>
          </div>
        )}
      </div>

    </div>
  );
}

export default Dashboard;