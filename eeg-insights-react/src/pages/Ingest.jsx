import { useState } from "react";
import ConsentFormPublic from "../components/ConsentFormPublic";
import StreamUserData from "../components/StreamUserData";
import "./Ingest.css";

export default function Ingest() {
  const [sessionId, setSessionId] = useState(null);

  return (
    <div className="home-container">
      <video autoPlay loop muted playsInline className="background-video">
        <source src={"wallpaper.mp4"} type="video/mp4" />
      </video>

      <section className="content-two-col">
        <div className="col card-like">
          <h1 className="hero-title" style={{ marginBottom: 8 }}>
            Data Ingestion
          </h1>
          <p className="hero-subtitle">
            Provide consent and upload EEG files directly to Supabase.
          </p>
          <p className="section-meta" style={{ marginTop: 12 }}>
            Supported: <b>.csv</b>, <b>.rd</b>, <b>.rd.000</b>, <b>.txt</b>
          </p>
        </div>

        <div className="col card-like">
          {!sessionId ? (
            <ConsentFormPublic
              onSaved={({ sessionId: id }) => setSessionId(id)}
            />
          ) : (
            <StreamUserData consentId={sessionId} />
          )}
        </div>
      </section>
    </div>
  );
}
