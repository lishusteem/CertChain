import React from 'react';

const ConnectWallet = ({ connectWallet, walletAddress }) => {
  return (
    <div className="meta-info">
      <div className="meta-info-header">
        <h3 className="meta-info-title">
          <i className="fas fa-wallet"></i> Wallet Connection
        </h3>
      </div>
      <div className="meta-info-content">
        {!walletAddress ? (
          <div style={{textAlign: 'center', padding: '1.5rem 1rem'}}>
            <p style={{marginBottom: '1.5rem', color: 'var(--text-secondary)'}}>
             Conectează-ți portofelul pentru a crea atestări ale articolului pe blockchain. on the blockchain
            </p>
            <button 
              className="button button-primary" 
              onClick={connectWallet}
            >
              <i className="fas fa-wallet"></i>   Conectează portofelul
            </button>
          </div>
        ) : (
          <div className="meta-info-item" style={{marginBottom: '0'}}>
            <div className="meta-info-label">Adresă conectată</div>
            <div className="meta-info-value">
              <strong style={{fontFamily: 'monospace'}}>
                {`${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}`}
              </strong>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConnectWallet;
