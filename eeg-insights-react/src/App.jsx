import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Analyzer from './pages/Analyzer';
import Ingest from './pages/Ingest';
import Marketplace from './pages/Marketplace';
import MarketplaceUpload from './pages/MarketplaceUpload';
import Navbar from './components/Navbar';
import './App.css';

function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/analyzer" element={<Analyzer />} />
        <Route path="/ingest" element={<Ingest />} />
        <Route path="/marketplace" element={<Marketplace />} />
        <Route path="/marketplace/upload" element={<MarketplaceUpload />} />
      </Routes>
    </Router>
  );
}

export default App;
