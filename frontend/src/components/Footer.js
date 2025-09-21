import React from 'react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white/80 backdrop-blur-lg border-t border-gray-200 mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-flare-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">V</span>
              </div>
              <h3 className="text-lg font-bold gradient-text">Venmorph</h3>
            </div>
            <p className="text-gray-600 mb-4 max-w-md">
              The Venmo of Web3. Send payment requests in any asset, settle instantly with XRP, 
              and verify on-chain using Flare's oracles & attestations.
            </p>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">Powered by:</span>
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-1">
                  <div className="w-4 h-4 bg-flare-500 rounded"></div>
                  <span className="text-sm font-medium text-gray-700">Flare</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-4 h-4 bg-xrp-500 rounded"></div>
                  <span className="text-sm font-medium text-gray-700">XRPL</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <a href="/" className="text-gray-600 hover:text-primary-600 transition-colors">
                  Home
                </a>
              </li>
              <li>
                <a href="/create" className="text-gray-600 hover:text-primary-600 transition-colors">
                  Create Request
                </a>
              </li>
              <li>
                <a href="/public" className="text-gray-600 hover:text-primary-600 transition-colors">
                  Public Requests
                </a>
              </li>
              <li>
                <a href="/my-requests" className="text-gray-600 hover:text-primary-600 transition-colors">
                  My Requests
                </a>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-4">Resources</h4>
            <ul className="space-y-2">
              <li>
                <a 
                  href="https://docs.flare.network/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-600 hover:text-primary-600 transition-colors"
                >
                  Flare Docs
                </a>
              </li>
              <li>
                <a 
                  href="https://xrpl.org/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-600 hover:text-primary-600 transition-colors"
                >
                  XRPL Docs
                </a>
              </li>
              <li>
                <a 
                  href="https://github.com/your-repo" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-600 hover:text-primary-600 transition-colors"
                >
                  GitHub
                </a>
              </li>
              <li>
                <span className="text-gray-600">
                  Hackathon Demo
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-gray-200 mt-8 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-sm text-gray-500 mb-4 md:mb-0">
              © {currentYear} Venmorph. Built for EasyA x Flare x XRPL Hackathon.
            </div>
            
            <div className="flex items-center space-x-6">
              <div className="text-xs text-gray-400">
                Made with ❤️ for Web3
              </div>
              
              {/* Network Status Indicator */}
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-gray-500">Live on Testnet</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;