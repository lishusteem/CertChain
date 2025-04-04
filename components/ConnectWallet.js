import React, { useState } from 'react';
import { walletConnectService } from '../services/walletConnectService';
import QRCodeModal from './QRCodeModal';

const ConnectWallet = ({ connectWallet, disconnectWallet, walletAddress, isWalletConnectActive }) => {
  const [showQRModal, setShowQRModal] = useState(false);
  const [walletConnectUri, setWalletConnectUri] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  
  // Function to initiate WalletConnect
  const startWalletConnect = async () => {
    try {
      setIsConnecting(true);
      
      // Initialize WalletConnect
      await walletConnectService.init();
      
      // Get the URI for QR code generation (this will be set by the display_uri event)
      setTimeout(() => {
        const uri = walletConnectService.getWalletConnectUri();
        if (uri) {
          setWalletConnectUri(uri);
          setShowQRModal(true);
        } else {
          console.error("WalletConnect URI not available");
        }
      }, 1000);
      
      // Start connection process - this will trigger the QR code generation
      connectWallet(true).catch(error => {
        console.error("WalletConnect connection error:", error);
      }).finally(() => {
        setIsConnecting(false);
      });
    } catch (error) {
      console.error("Error starting WalletConnect:", error);
      setIsConnecting(false);
    }
  };
  
  // Close QR modal
  const closeQRModal = () => {
    setShowQRModal(false);
  };
  
  // Connect with browser wallet
  const connectBrowserWallet = async () => {
    try {
      setIsConnecting(true);
      await connectWallet(false);
    } catch (error) {
      console.error("Error connecting browser wallet:", error);
    } finally {
      setIsConnecting(false);
    }
  };
  
  return (
    <div className="meta-info" style={{ marginBottom: '2.5rem' }}>
      <div className="meta-info-header">
        <h3 className="meta-info-title" style={{ fontSize: '1.15rem' }}>
          <i className="fas fa-wallet"></i> Conexiune Portofel
        </h3>
      </div>
      <div className="meta-info-content">
        {!walletAddress ? (
          <div style={{textAlign: 'center', padding: '2rem 1.5rem'}}>
            <p style={{marginBottom: '2rem', color: 'var(--text-secondary)', fontSize: '1.05rem'}}>
              Conectează-ți portofelul pentru a crea atestări pentru articole în blockchain
            </p>
            <div style={{display: 'flex', gap: '1rem', justifyContent: 'center'}}>
              <button 
                className="button button-primary" 
                onClick={connectBrowserWallet}
                disabled={isConnecting}
                style={{ padding: '0.9rem 1.75rem', fontSize: '1.05rem' }}
              >
                {isConnecting ? (
                  <><i className="fas fa-spinner fa-spin"></i> Se conectează...</>
                ) : (
                  <><i className="fas fa-desktop"></i> Browser Wallet</>
                )}
              </button>
              
              <button 
                className="button button-outline" 
                onClick={startWalletConnect}
                disabled={isConnecting}
                style={{ padding: '0.9rem 1.75rem', fontSize: '1.05rem' }}
              >
                {isConnecting ? (
                  <><i className="fas fa-spinner fa-spin"></i> Se pregătește...</>
                ) : (
                  <><i className="fas fa-mobile-alt"></i> WalletConnect</>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div style={{padding: '0.5rem 0'}}>
            <div className="meta-info-item" style={{marginBottom: '0.75rem', padding: '0.5rem 0'}}>
              <div className="meta-info-label" style={{ width: '180px', fontSize: '1rem' }}>Adresă Conectată</div>
              <div className="meta-info-value" style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <strong style={{fontFamily: 'monospace'}}>
                  {`${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}`}
                </strong>
                {isWalletConnectActive && (
                  <span style={{color: 'var(--primary)', fontSize: '0.9rem'}}>
                    <i className="fas fa-mobile-alt" style={{marginRight: '0.5rem'}}></i>
                    WalletConnect
                  </span>
                )}
              </div>
            </div>
            
            <button
              className="button button-outline"
              onClick={disconnectWallet}
              style={{ width: '100%', padding: '0.75rem', fontSize: '0.95rem' }}
            >