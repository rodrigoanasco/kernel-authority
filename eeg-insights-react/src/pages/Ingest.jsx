import { useState } from "react";
import ConsentFormPublic from "../components/ConsentFormPublic";
import StreamUserData from "../components/StreamUserData";
import "./Ingest.css";

export default function Ingest() {
  const [participantId, setParticipantId] = useState(null);

  return (
    <div className="home-container">
      <video autoPlay loop muted playsInline className="background-video">
        <source src={"wallpaper.mp4"} type="video/mp4" />
      </video>

      <section className="content-two-col">
        <div className="col card-like">
          <h1 className="hero-title" style={{ marginBottom: 8 }}>Data Ingestion</h1>
          <p className="hero-subtitle">
            Fill consent, then upload EEG data linked to your session.
          </p>
        </div>

        <div className="col card-like">
          {!participantId ? (
            <ConsentFormPublic onSaved={({ participantId }) => setParticipantId(participantId)} />
          ) : (
            <StreamUserData participantId={participantId} />
          )}
        </div>
      </section>
    </div>
  );
}
