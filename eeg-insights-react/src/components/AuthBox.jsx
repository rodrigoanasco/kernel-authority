import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AuthBox() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [userId, setUserId] = useState(null)
  const [msg, setMsg] = useState('')

  async function handleSignIn(e) {
    e.preventDefault()
    setMsg('Signing in…')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      // try sign-up then sign-in
      const { error: signUpErr } = await supabase.auth.signUp({ email, password })
      if (signUpErr) return setMsg(signUpErr.message)
      const { data: d2, error: e2 } = await supabase.auth.signInWithPassword({ email, password })
      if (e2) return setMsg(e2.message)
      setUserId(d2.user.id); setMsg('Signed up & in ✅')
    } else {
      setUserId(data.user.id); setMsg('Signed in ✅')
    }
  }

  return (
    <form onSubmit={handleSignIn} style={{display:'grid', gap:8, maxWidth:360}}>
      <h3>Sign in</h3>
      <input placeholder="email" value={email} onChange={e=>setEmail(e.target.value)} />
      <input placeholder="password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
      <button className="btn btn-primary">Continue</button>
      <small>{msg}{userId ? ` • user: ${userId}` : ''}</small>
    </form>
  )
}
