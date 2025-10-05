import { Link, useLocation } from "react-router-dom";
import "./Navbar.css";

export default function Navbar() {
  const { pathname } = useLocation();
  const isActive = (p) => (pathname === p ? "nav-link active" : "nav-link");

  return (
    <nav className="nav">
      <div className="nav-left">
        <Link to="/" className="brand">🧠 EEG Insights</Link>
      </div>
      <div className="nav-right">
        <Link to="/" className={isActive("/")}>Home</Link>
        <Link to="/ingest" className={isActive("/ingest")}>Data Ingest</Link>
        <Link to="/marketplace" className={isActive("/marketplace")}>Marketplace</Link>
      </div>
    </nav>
  );
}
