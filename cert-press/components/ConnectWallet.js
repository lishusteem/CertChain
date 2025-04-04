import React from 'react';

const ConnectWallet = ({ connectWallet, walletAddress }) => {
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
            <button 
              className="button button-primary" 
              onClick={connectWallet}
              style={{ padding: '0.9rem 2rem', fontSize: '1.05rem' }}
            >
              <i className="fas fa-wallet"></i> Conectează Portofel
            </button>
          </div>
        ) : (
          <div className="meta-info-item" style={{marginBottom: '0', padding: '0.5rem 0'}}>
            <div className="meta-info-label" style={{ width: '180px', fontSize: '1rem' }}>Adresă Conectată</div>
            <div className="meta-info-value" style={{ fontSize: '1rem' }}>
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
