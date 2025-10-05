import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Analyzer from './pages/Analyzer';
import Ingest from './pages/Ingest';
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
      </Routes>
    </Router>
  );
}
export default App;
