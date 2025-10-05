import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function ConsentForm() {
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')

  // form state (match your columns)
  const [consent_signed, setConsentSigned] = useState(false)
  const [consent_date, setConsentDate] = useState('') // yyyy-mm-dd or datetime-local
  const [participant_code, setParticipantCode] = useState('')
  const [age, setAge] = useState('')
  const [sex, setSex] = useState('')
  const [handedness, setHandedness] = useState('')
  const [sleep_hours_last_night, setSleepHours] = useState('')
  const [neurological_history, setNeuro] = useState('')

  // Load existing row for this user (if any)
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setStatus('Please sign in first.'); setLoading(false); return }
      const { data, error } = await supabase
        .from('user_consent')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()
      if (!error && data) {
        setConsentSigned(!!data.consent_signed)
        setConsentDate(data.consent_date ? new Date(data.consent_date).toISOString().slice(0,16) : '')
        setParticipantCode(data.participant_code ?? '')
        setAge(data.age ?? '')
        setSex(data.sex ?? '')
        setHandedness(data.handedness ?? '')
        setSleepHours(data.sleep_hours_last_night ?? '')
        setNeuro(data.neurological_history ?? '')
        setStatus('Loaded your saved consent.')
      }
      setLoading(false)
    })()
  }, [])

  function toISOorNull(v) {
    if (!v) return null
    // if it's just a date (YYYY-MM-DD), make it midnight; if datetime-local, trust it
    return v.length === 10 ? new Date(v + 'T00:00:00').toISOString() : new Date(v).toISOString()
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setStatus('Saving…')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setStatus('Please sign in first.'); return }

    const payload = {
      id: user.id,                                    // default auth.uid(), but we set it explicitly for upsert
      consent_signed,
      consent_date: toISOorNull(consent_date),
      participant_code: participant_code || null,
      age: age === '' ? null : Number(age),
      sex: sex || null,
      handedness: handedness || null,
      sleep_hours_last_night: sleep_hours_last_night === '' ? null : Number(sleep_hours_last_night),
      neurological_history: neurological_history || null
    }

    const { error } = await supabase
      .from('user_consent')
      .upsert(payload, { onConflict: 'id' })

    setStatus(error ? `Error: ${error.message}` : 'Saved ✅')
  }

  if (loading) return <p>Loading…</p>

  return (
    <form onSubmit={handleSubmit} style={{display:'grid', gap:12, maxWidth:600}}>
      <h3>Participant consent</h3>

      <label>
        Consent signed:
        <select value={String(consent_signed)} onChange={e=>setConsentSigned(e.target.value === 'true')}>
          <option value="false">No</option>
          <option value="true">Yes</option>
        </select>
      </label>

      <label>
        Consent date:
        <input type="datetime-local" value={consent_date} onChange={e=>setConsentDate(e.target.value)} />
      </label>

      <label>
        Participant code:
        <input value={participant_code} onChange={e=>setParticipantCode(e.target.value)} placeholder="P001" />
      </label>

      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
        <label>Age:
          <input type="number" min="0" value={age} onChange={e=>setAge(e.target.value)} />
        </label>
        <label>Sex:
          <input value={sex} onChange={e=>setSex(e.target.value)} placeholder="male / female / other" />
        </label>
      </div>

      <label>
        Handedness:
        <input value={handedness} onChange={e=>setHandedness(e.target.value)} placeholder="right / left / ambidextrous" />
      </label>

      <label>
        Sleep hours last night:
        <input type="number" step="0.1" value={sleep_hours_last_night} onChange={e=>setSleepHours(e.target.value)} />
      </label>

      <label>
        Neurological history:
        <textarea value={neurological_history} onChange={e=>setNeuro(e.target.value)} placeholder="none / migraine / …" />
      </label>

      <button className="btn btn-primary">Save</button>
      <small>{status}</small>
    </form>
  )
}
