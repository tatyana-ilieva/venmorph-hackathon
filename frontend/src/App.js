import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Web3Provider } from './contexts/Web3Context';

// Components
import Header from './components/Header';
import Footer from './components/Footer';

// Pages
import Home from './pages/Home';
import CreateRequest from './pages/CreateRequest';
import PublicRequests from './pages/PublicRequests';
import RequestDetail from './pages/RequestDetail';
import MyRequests from './pages/MyRequests';

// Styles
import './index.css';

function App() {
  return (
    <Web3Provider>
      <Router>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: '#4ade80',
                  secondary: '#fff',
                },
              },
              error: {
                duration: 5000,
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />
          
          <Header />
          
          <main className="container mx-auto px-4 py-8 min-h-screen">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/create" element={<CreateRequest />} />
              <Route path="/public" element={<PublicRequests />} />
              <Route path="/my-requests" element={<MyRequests />} />
              <Route path="/request/:id" element={<RequestDetail />} />
            </Routes>
          </main>
          
          <Footer />
        </div>
      </Router>
    </Web3Provider>
  );
}

export default App;