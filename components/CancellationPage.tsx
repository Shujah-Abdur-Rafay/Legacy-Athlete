import React, {useState, useEffect} from "react";

const API_BASE = import.meta.env.VITE_FUNCTIONS_URL || "";
const getApiUrl = (endpoint: string) => API_BASE ? `${API_BASE}/${endpoint}` : `/api/${endpoint}`;

const CancellationPage: React.FC = () => {
  const [status, setStatus] = useState<"checking" | "valid" | "invalid" | "cancelling" | "cancelled" | "error">("checking");
  const [bookingInfo, setBookingInfo] = useState<any>(null);
  const [token, setToken] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    if (!t) {
      setStatus("invalid");
      return;
    }
    setToken(t);
    checkToken(t);
  }, []);

  const checkToken = async (t: string) => {
    try {
      const res = await fetch(`${getApiUrl('checkCancellation')}?token=${encodeURIComponent(t)}`);
      const data = await res.json();
      if (res.ok && data.valid) {
        setBookingInfo(data);
        setStatus("valid");
      } else {
        setStatus("invalid");
      }
    } catch {
      setStatus("error");
    }
  };

  const handleCancel = async () => {
    if (!token) return;
    setStatus("cancelling");
    try {
      const res = await fetch(getApiUrl('cancelBooking'), {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({cancellationToken: token}),
      });
      if (res.ok) {
        setStatus("cancelled");
      } else {
        const data = await res.json();
        throw new Error(data.error || "Cancellation failed");
      }
    } catch {
      setStatus("error");
    }
  };

  const baseStyles = "min-h-screen bg-black flex items-center justify-center px-6";

  if (status === "checking") {
    return (
      <div className={baseStyles}>
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-stone-400 text-xs uppercase tracking-widest">Verifying your cancellation link...</p>
        </div>
      </div>
    );
  }

  if (status === "invalid") {
    return (
      <div className={baseStyles}>
        <div className="text-center max-w-sm">
          <div className="w-12 h-12 border border-red-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="font-athletic text-2xl text-white mb-3">Invalid Link</h2>
          <p className="text-stone-400 text-sm">This cancellation link is invalid or has already been used.</p>
          <a href="/" className="inline-block mt-6 text-orange-500 text-xs uppercase tracking-widest underline hover:text-orange-400">
            Return to Home
          </a>
        </div>
      </div>
    );
  }

  if (status === "cancelled") {
    return (
      <div className={baseStyles}>
        <div className="text-center max-w-sm">
          <div className="w-12 h-12 bg-orange-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="font-athletic text-2xl text-white mb-3">Booking Cancelled</h2>
          <p className="text-stone-400 text-sm">Your session has been cancelled and a confirmation email has been sent.</p>
          <a href="/" className="inline-block mt-6 text-orange-500 text-xs uppercase tracking-widest underline hover:text-orange-400">
            Book Another Session
          </a>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className={baseStyles}>
        <div className="text-center max-w-sm">
          <h2 className="font-athletic text-2xl text-white mb-3">Something Went Wrong</h2>
          <p className="text-stone-400 text-sm mb-4">Please try again or contact us at mw@thelimitlessathlete.com</p>
          <a href="/" className="text-orange-500 text-xs uppercase tracking-widest underline">Return to Home</a>
        </div>
      </div>
    );
  }

  // Status: valid
  return (
    <div className={baseStyles}>
      <div className="w-full max-w-md bg-stone-900/40 border border-stone-800 p-8">
        <div className="mb-2">
          <span className="text-xs tracking-[0.3em] text-orange-500 uppercase">Legacy Athlete</span>
          <h2 className="font-athletic text-2xl text-white uppercase mt-1">Cancel Booking</h2>
        </div>
        <p className="text-stone-400 text-sm mb-6">Are you sure you want to cancel the following session?</p>

        <div className="bg-stone-950 border border-stone-800 p-4 mb-6">
          <div className="text-white text-sm font-medium">{bookingInfo?.date}</div>
          <div className="text-stone-400 text-xs mt-1">{bookingInfo?.time}</div>
          <div className="text-orange-500 text-xs uppercase tracking-widest mt-1">{bookingInfo?.focus}</div>
          <div className="text-stone-500 text-xs mt-2">Athlete: {bookingInfo?.athleteName}</div>
        </div>

        <p className="text-stone-500 text-xs mb-6">
          ⚠️ Cancellations are final. The session slot will be freed for other athletes.
        </p>

        <div className="flex gap-3">
          <a
            href="/"
            className="flex-1 text-center py-3 border border-stone-700 text-stone-400 hover:text-white hover:border-stone-500 transition-colors text-xs uppercase tracking-widest"
          >
            Keep Booking
          </a>
          <button
            onClick={handleCancel}
            disabled={status === "cancelling"}
            className="flex-1 py-3 bg-red-900 hover:bg-red-800 text-white text-xs uppercase tracking-widest transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {status === "cancelling" ? (
              <>
                <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                Cancelling...
              </>
            ) : (
              "Confirm Cancel"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CancellationPage;
