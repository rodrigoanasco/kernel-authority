import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function ConsentFormPublic({ onSaved }) {
  const [willing, setWilling] = useState(null); // null | true | false
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    participant_code: "",
    age: "",
    sex: "",
    handedness: "",
    sleep_hours: "",
    neurological_notes: "",
    agreed: false,
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setBool = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.checked }));

  function validate() {
    if (!form.agreed) return "You must agree to the consent terms.";
    if (!form.sex) return "Please select sex.";
    if (!form.handedness) return "Please select handedness.";
    if (form.age && isNaN(Number(form.age))) return "Age must be a number.";
    if (form.sleep_hours && isNaN(Number(form.sleep_hours))) return "Sleep hours must be a number.";
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errMsg = validate();
    if (errMsg) return alert(errMsg);

    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("user_consent")
        .insert({
            consent_signed: true,
            consent_date: new Date().toISOString(),
            participant_code: form.participant_code || null,
            age: form.age ? Number(form.age) : null,
            sex: form.sex || null,
            handedness: form.handedness || null,
            sleep_hours_last_night: form.sleep_hours ? Number(form.sleep_hours) : null,
            neurological_history: form.neurological_notes || null,
        })
        .select("id")
        .single();


      if (error) throw error;
      onSaved?.({ participantId: data.id }); // pass participant UUID
    } catch (err) {
      alert("Saving consent failed: " + err.message);
    } finally {
      setSubmitting(false);
    }
  }

  // Step 1: ask if willing
  if (willing === null) {
    return (
      <div
        style={{
          display: "grid",
          gap: 12,
          background: "rgba(0,0,0,0.5)",
          borderRadius: 12,
          padding: 20,
          color: "#fff",
          backdropFilter: "blur(8px)",
        }}
      >
        <h3 style={{ margin: 0 }}>Consent to Participate</h3>
        <p style={{ opacity: 0.9 }}>
          Before uploading EEG data, we ask you to complete a short consent form.
          Do you agree to fill the consent?
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button onClick={() => setWilling(true)} style={btnStyle(true)}>
            Yes, show the form
          </button>
          <button onClick={() => setWilling(false)} style={btnStyle(false)}>
            No
          </button>
        </div>
        {willing === false && (
          <small style={{ color: "#ffd7d7" }}>
            You need to accept and fill the consent to proceed with data upload.
          </small>
        )}
      </div>
    );
  }

  // Step 2: actual consent form
  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: "grid",
        gap: 12,
        background: "rgba(0,0,0,0.5)",
        borderRadius: 12,
        padding: 20,
        color: "#fff",
        backdropFilter: "blur(8px)",
      }}
    >
      <h3 style={{ margin: 0 }}>Participant Consent Form</h3>

      <p style={{ fontSize: 14, lineHeight: 1.6, opacity: 0.9 }}>
        By uploading your EEG data, you consent to storage and analysis of anonymized data for research and visualization.
        No personal identifiers will be shared. You may withdraw at any time by contacting the team.
      </p>

      <div style={{ display: "grid", gap: 10 }}>
        <label>
          <div>Participant / Study Code (optional)</div>
          <input
            value={form.participant_code}
            onChange={set("participant_code")}
            placeholder="STUDY-ABC-001"
            style={inputStyle}
          />
        </label>

        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
          <label>
            <div>Age (optional)</div>
            <input
              value={form.age}
              onChange={set("age")}
              placeholder="e.g., 23"
              style={inputStyle}
              inputMode="numeric"
            />
          </label>

          <label>
            <div>Sex</div>
            <select value={form.sex} onChange={set("sex")} style={inputStyle}>
              <option value="">Select…</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
              <option value="prefer_not_to_say">Prefer not to say</option>
            </select>
          </label>
        </div>

        <label>
          <div>Handedness</div>
          <select value={form.handedness} onChange={set("handedness")} style={inputStyle}>
            <option value="">Select…</option>
            <option value="right">Right-handed</option>
            <option value="left">Left-handed</option>
            <option value="ambidextrous">Ambidextrous</option>
          </select>
        </label>

        <label>
          <div>Sleep hours last night (optional)</div>
          <input
            value={form.sleep_hours}
            onChange={set("sleep_hours")}
            placeholder="e.g., 7.5"
            style={inputStyle}
            inputMode="decimal"
          />
        </label>

        <label>
          <div>Neurological history / notes (optional)</div>
          <textarea
            value={form.neurological_notes}
            onChange={set("neurological_notes")}
            placeholder="Any relevant neurological conditions, medications, etc."
            style={{ ...inputStyle, minHeight: 80, resize: "vertical" }}
          />
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="checkbox"
            checked={form.agreed}
            onChange={setBool("agreed")}
            style={{ transform: "scale(1.2)" }}
          />
          <span>I have read and agree to the consent terms.</span>
        </label>
      </div>

      <button
        type="submit"
        disabled={!form.agreed || submitting}
        style={submitStyle(!submitting && form.agreed)}
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

const btnStyle = (primary) => ({
  background: primary ? "linear-gradient(90deg,#34d399,#3b82f6)" : "rgba(255,255,255,0.12)",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "10px 16px",
  fontWeight: 600,
  cursor: "pointer",
});

const submitStyle = (enabled) => ({
  background: enabled ? "linear-gradient(90deg,#34d399,#3b82f6)" : "gray",
  color: "white",
  border: "none",
  borderRadius: 8,
  padding: "10px 16px",
  fontWeight: 600,
  cursor: enabled ? "pointer" : "not-allowed",
});
