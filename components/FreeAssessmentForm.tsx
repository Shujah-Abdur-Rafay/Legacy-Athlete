import React, { useState } from "react";
import MagneticButton from "./MagneticButton";

// ─── Firebase Functions base URL ──────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_FUNCTIONS_URL || "";
const getApiUrl = (endpoint: string) => API_BASE ? `${API_BASE}/${endpoint}` : `/api/${endpoint}`;

const LEVELS = ["Beginner", "Intermediate"];
const COMMITMENTS = ["1x per week", "2x per week", "3x per week"];

interface FormState {
  athleteName: string;
  grade: string;
  school: string;
  level: string;
  commitment: string;
  preferredDate: string;
  parentName: string;
  parentEmail: string;
  parentPhone: string;
}

const EMPTY_FORM: FormState = {
  athleteName: "",
  grade: "",
  school: "",
  level: "",
  commitment: "",
  preferredDate: "",
  parentName: "",
  parentEmail: "",
  parentPhone: "",
};

const inputClass = "w-full bg-stone-950 border border-stone-800 px-6 py-4 text-white focus:outline-none focus:border-orange-500 transition-colors uppercase tracking-widest text-xs placeholder:text-stone-600";

const FreeAssessmentForm: React.FC = () => {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const update = (field: keyof FormState) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch(getApiUrl("submitAssessment"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit request");
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-center py-16 bg-stone-900/50 border border-stone-800 rounded-lg p-12">
        <div className="w-16 h-16 bg-orange-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(234,88,12,0.3)]">
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="font-athletic text-3xl mb-3 text-white uppercase">Request Received</h3>
        <p className="text-stone-400 text-sm max-w-sm mx-auto mb-8">
          A confirmation has been sent to <span className="text-white">{form.parentEmail}</span>. A coach will reach out to confirm a time for {form.athleteName}.
        </p>
        <button
          onClick={() => { setSubmitted(false); setForm(EMPTY_FORM); }}
          className="text-orange-500 hover:text-orange-400 text-xs tracking-widest uppercase underline"
        >
          Submit Another Request
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto bg-stone-900/40 border border-stone-800 rounded-lg p-8 md:p-12">
      <div className="mb-6">
        <span className="text-xs tracking-[0.3em] text-orange-500 uppercase">Free · No Commitment</span>
        <h3 className="font-athletic text-2xl md:text-4xl text-white uppercase mt-1">Book a Free Assessment</h3>
        <p className="text-stone-400 text-xs mt-3">Tell us a bit about your athlete. We'll confirm a time within 48 hours.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          required
          type="text"
          placeholder="ATHLETE'S NAME"
          value={form.athleteName}
          onChange={update("athleteName")}
          className={inputClass}
        />

        <div className="grid grid-cols-2 gap-4">
          <input
            required
            type="text"
            placeholder="GRADE"
            value={form.grade}
            onChange={update("grade")}
            className={inputClass}
          />
          <input
            required
            type="text"
            placeholder="SCHOOL"
            value={form.school}
            onChange={update("school")}
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <select required value={form.level} onChange={update("level")} className={`${inputClass} appearance-none cursor-pointer`}>
            <option value="" disabled>LEVEL</option>
            {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
          <select required value={form.commitment} onChange={update("commitment")} className={`${inputClass} appearance-none cursor-pointer`}>
            <option value="" disabled>COMMITMENT</option>
            {COMMITMENTS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-[10px] text-stone-500 uppercase tracking-widest mb-2 pl-1">Preferred Assessment Date</label>
          <input
            required
            type="date"
            min={new Date().toISOString().split("T")[0]}
            value={form.preferredDate}
            onChange={update("preferredDate")}
            className={inputClass}
          />
        </div>

        <div className="border-t border-stone-800 pt-4 space-y-4">
          <input
            required
            type="text"
            placeholder="PARENT / GUARDIAN NAME"
            value={form.parentName}
            onChange={update("parentName")}
            className={inputClass}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              required
              type="email"
              placeholder="PARENT EMAIL"
              value={form.parentEmail}
              onChange={update("parentEmail")}
              className={inputClass}
            />
            <input
              type="tel"
              placeholder="PARENT PHONE (OPTIONAL)"
              value={form.parentPhone}
              onChange={update("parentPhone")}
              className={inputClass}
            />
          </div>
        </div>

        {error && <div className="text-red-500 text-xs">{error}</div>}

        <MagneticButton className="w-full !py-4">
          {submitting ? (
            <span className="flex items-center gap-2 justify-center">
              <div className="w-3 h-3 border border-black border-t-transparent rounded-full animate-spin" />
              SUBMITTING...
            </span>
          ) : (
            "REQUEST FREE ASSESSMENT →"
          )}
        </MagneticButton>
      </form>
    </div>
  );
};

export default FreeAssessmentForm;
