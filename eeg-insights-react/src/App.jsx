// src/App.jsx  (minimal integration showing consent form + file uploader)
import { useState } from 'react'
import ConsentFormPublic from './components/ConsentFormPublic'
import StreamUserData from './components/StreamUserData'
import './App.css'

export default function App() {
  const [readyForUpload, setReadyForUpload] = useState(false)

  return (
    <div className="app">
      <header className="app-header">
        <h1>🧠 EEG Insights</h1>
      </header>

      <main className="app-main" style={{display:'grid', gap:24}}>
        <section>
          <ConsentFormPublic onSaved={() => setReadyForUpload(true)} />
        </section>

        {readyForUpload && (
          <section>
            <h3>Upload EEG file</h3>
            <StreamUserData />
          </section>
        )}
      </main>
    </div>
  )
}
