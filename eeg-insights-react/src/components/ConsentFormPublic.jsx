import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function ConsentFormPublic({ onSaved }) {
  const [form, setForm] = useState({
    participant_name: "",
    email: "",
    study_code: "",
    consent_version: "v1",
    consent_given: false,
  });
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.consent_given) return alert("Please agree to continue.");
    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("consent_sessions")
        .insert({
          participant_name: form.participant_name || null,
          email: form.email || null,
          study_code: form.study_code || null,
          consent_version: form.consent_version,
          consent_given: true,
        })
        .select("id")
        .single();
      if (error) throw error;

      // return sessionId + form to parent
      onSaved?.({ sessionId: data.id, form });
    } catch (err) {
      alert("Consent save failed: " + err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setBool = (k) => (e) =>
    setForm((f) => ({ ...f, [k]: e.target.checked }));

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: "grid",
        gap: 16,
        background: "rgba(0,0,0,0.5)",
        borderRadius: 12,
        padding: 20,
        color: "#fff",
        backdropFilter: "blur(8px)",
      }}
    >
      <h3 style={{ margin: 0 }}>Participant Consent</h3>

      <p style={{ fontSize: 14, lineHeight: 1.6, opacity: 0.9 }}>
        By uploading your EEG data, you consent to storage and analysis of
        anonymized data for research and visualization. No personal identifiers
        will be shared. You can withdraw by contacting the team.
      </p>

      <div style={{ display: "grid", gap: 10 }}>
        <label>
          <div>Name (optional)</div>
          <input
            value={form.participant_name}
            onChange={set("participant_name")}
            placeholder="Jane Doe"
            style={inputStyle}
          />
        </label>

        <label>
          <div>Email (optional)</div>
          <input
            type="email"
            value={form.email}
            onChange={set("email")}
            placeholder="jane@example.com"
            style={inputStyle}
          />
        </label>

        <label>
          <div>Study Code / Session Label (optional)</div>
          <input
            value={form.study_code}
            onChange={set("study_code")}
            placeholder="STUDY-ABC-001"
            style={inputStyle}
          />
        </label>

        <label>
          <div>Consent Version</div>
          <input
            value={form.consent_version}
            onChange={set("consent_version")}
            style={inputStyle}
          />
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="checkbox"
            checked={form.consent_given}
            onChange={setBool("consent_given")}
            style={{ transform: "scale(1.2)" }}
          />
          <span>I agree to the consent terms.</span>
        </label>
      </div>

      <button
        type="submit"
        disabled={!form.consent_given || submitting}
        style={buttonStyle(form.consent_given && !submitting)}
      >
        {submitting ? "Saving..." : "Submit Consent"}
      </button>
    </form>
  );
}

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid #ddd",
  borderRadius: 6,
};

const buttonStyle = (enabled) => ({
  background: enabled ? "linear-gradient(90deg,#34d399,#3b82f6)" : "gray",
  color: "white",
  border: "none",
  borderRadius: 8,
  padding: "10px 16px",
  fontWeight: 600,
  cursor: enabled ? "pointer" : "not-allowed",
});
