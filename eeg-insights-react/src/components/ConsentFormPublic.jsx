// src/components/ConsentFormPublic.jsx
import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function ConsentFormPublic({ onSaved }) {
  const [status, setStatus] = useState('')
  const [form, setForm] = useState({
    participant_code: '',
    consent_signed: false,
    consent_date: '',
    age: '',
    sex: '',
    handedness: '',
    sleep_hours_last_night: '',
    neurological_history: '',
  })

  function setField(k, v) { setStatus(''); setForm(prev => ({ ...prev, [k]: v })) }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.participant_code.trim()) {
      setStatus('Please enter a participant code (e.g., P001).')
      return
    }
    setStatus('Saving…')

    const payload = {
      participant_code: form.participant_code.trim(),
      consent_signed: !!form.consent_signed,
      consent_date: form.consent_date ? new Date(form.consent_date).toISOString() : null,
      age: form.age === '' ? null : Number(form.age),
      sex: form.sex || null,
      handedness: form.handedness || null,
      sleep_hours_last_night: form.sleep_hours_last_night === '' ? null : Number(form.sleep_hours_last_night),
      neurological_history: form.neurological_history || null,
    }

    // PLAIN INSERT — no auth required, no onConflict needed
    const { error } = await supabase.from('user_consent').insert(payload)

    if (error) setStatus(`Error: ${error.message}`)
    else {
      setStatus('Saved ✅')
      onSaved?.(payload.participant_code)
    }
  }

  return (
    <form onSubmit={handleSave} style={{display:'grid', gap:12, maxWidth:600}}>
      <h3>Participant consent (no login)</h3>

      <label>Participant code
        <input value={form.participant_code}
               onChange={e=>setField('participant_code', e.target.value)}
               placeholder="P001" />
      </label>

      <label>Consent signed
        <select value={String(form.consent_signed)}
                onChange={e=>setField('consent_signed', e.target.value==='true')}>
          <option value="false">No</option>
          <option value="true">Yes</option>
        </select>
      </label>

      <label>Consent date
        <input type="datetime-local"
               value={form.consent_date}
               onChange={e=>setField('consent_date', e.target.value)} />
      </label>

      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
        <label>Age
          <input type="number" value={form.age}
                 onChange={e=>setField('age', e.target.value)} />
        </label>
        <label>Sex
          <input value={form.sex}
                 onChange={e=>setField('sex', e.target.value)}
                 placeholder="male/female/other" />
        </label>
      </div>

      <label>Handedness
        <input value={form.handedness}
               onChange={e=>setField('handedness', e.target.value)}
               placeholder="right/left/ambidextrous" />
      </label>

      <label>Sleep hours last night
        <input type="number" step="0.1"
               value={form.sleep_hours_last_night}
               onChange={e=>setField('sleep_hours_last_night', e.target.value)} />
      </label>

      <label>Neurological history
        <textarea value={form.neurological_history}
                  onChange={e=>setField('neurological_history', e.target.value)}
                  placeholder="none / migraine / …" />
      </label>

      <button className="btn btn-primary">Save</button>
      <small>{status}</small>
    </form>
  )
}
