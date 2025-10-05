import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function Marketplace() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        // fetch from the exact table name you're inserting into
        const { data, error } = await supabase
          .from("marketplace_items")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;

        // resolve a public URL for each file_path (don’t store url in DB)
        const withUrls = (data || []).map((row) => {
          const { data: pub } = supabase
            .storage
            .from("marketplace")
            .getPublicUrl(row.file_path);
          return { ...row, downloadUrl: pub?.publicUrl ?? "" };
        });
        setItems(withUrls);
      } catch (e) {
        setErr(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="home-container" style={{ padding: "2rem", color: "white" }}>
      <h1 className="hero-title" style={{ marginBottom: 8 }}>🧠 EEG Data Marketplace</h1>
      <p className="hero-subtitle" style={{ marginBottom: 16 }}>
        Free posts appear here. Paid posts coming soon.
      </p>

      <div style={{ marginBottom: 16 }}>
        <Link to="/marketplace/upload" style={{ color: "#38bdf8" }}>➕ Upload dataset</Link>
      </div>

      {loading && <p>Loading…</p>}
      {err && <p style={{ color: "#f88" }}>Error: {err}</p>}

      {!loading && !items.length && <p>No datasets yet. Be the first to upload!</p>}

      <div style={{ display: "grid", gap: 16 }}>
        {items.map((it) => (
          <div key={it.id} style={{ background: "rgba(0,0,0,.5)", borderRadius: 12, padding: 16 }}>
            <h3 style={{ margin: 0 }}>{it.title}</h3>
            <small style={{ opacity: .8 }}>Posted: {new Date(it.created_at).toLocaleString()}</small>
            {it.description && <p style={{ marginTop: 8 }}>{it.description}</p>}
            <p style={{ marginTop: 4 }}>{it.is_free ? "🆓 Free" : "💲 Paid (soon)"}</p>
            {it.is_free && it.downloadUrl && (
              <a href={it.downloadUrl} download style={{ color: "#38bdf8" }}>
                Download
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
