import React from 'react';

const AttestationStatus = ({ attestationUid, txHash, error, isSubmitting }) => {
  if (!isSubmitting && !attestationUid && !txHash && !error) {
    return null;
  }

  return (
    <div className="attestation-info" style={{ padding: '2rem', marginBottom: '2.5rem' }}>
      <h3 className="attestation-title" style={{ fontSize: '1.3rem', marginBottom: '1.5rem' }}>
        <i className="fas fa-clipboard-check"></i> Stare Atestare
      </h3>

      {isSubmitting && (
        <div style={{padding: "1.5rem", backgroundColor: "var(--primary-lighter)", borderRadius: "var(--radius)", marginBottom: "1.5rem"}}>
          <p style={{display: "flex", alignItems: "center", color: "var(--primary)", fontSize: '1.05rem'}}>
            <i className="fas fa-spinner fa-spin" style={{marginRight: "0.75rem"}}></i>
            Se creează atestarea în blockchain...
          </p>
        </div>
      )}

      {error && (
        <div style={{padding: "1.5rem", backgroundColor: "rgba(239, 35, 60, 0.1)", borderRadius: "var(--radius)", marginBottom: "1.5rem"}}>
          <p style={{display: "flex", alignItems: "center", color: "var(--danger)", fontSize: '1.05rem'}}>
            <i className="fas fa-exclamation-triangle" style={{marginRight: "0.75rem"}}></i>
            Eroare: {error}
          </p>
        </div>
      )}

      {txHash && (
        <div className="meta-info" style={{marginBottom: "1.5rem"}}>
          <div className="meta-info-header">
            <h3 className="meta-info-title" style={{ fontSize: '1.15rem' }}>
              <i className="fas fa-file-contract"></i> Detalii Tranzacție
            </h3>
          </div>
          <div className="meta-info-content" style={{ padding: '1.25rem' }}>
            <div className="meta-info-item">
              <div className="meta-info-label" style={{ width: '180px' }}>Hash Tranzacție</div>
              <div className="meta-info-value">
                <a 
                  href={`https://sepolia.etherscan.io/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{wordBreak: "break-all", color: "var(--primary)", fontSize: '0.95rem'}}
                >
                  {txHash}
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {attestationUid && (
        <div className="meta-info">
          <div className="meta-info-header">
            <h3 className="meta-info-title" style={{ fontSize: '1.15rem' }}>
              <i className="fas fa-check-circle" style={{color: "var(--secondary)"}}></i> Atestare Realizată cu Succes
            </h3>
          </div>
          <div className="meta-info-content" style={{ padding: '1.25rem' }}>
            <div className="meta-info-item">
              <div className="meta-info-label" style={{ width: '180px' }}>UID Atestare</div>
              <div className="meta-info-value">
                <a 
                  href={`https://sepolia.easscan.org/attestation/view/${attestationUid}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{wordBreak: "break-all", color: "var(--primary)", fontSize: '0.95rem'}}
                >
                  {attestationUid}
                </a>
              </div>
            </div>
            <div style={{marginTop: "1.5rem"}}>
              <p style={{fontSize: "0.95rem", color: "var(--text-secondary)"}}>
                Atestarea dumneavoastră a fost creată cu succes și înregistrată în blockchain.
              </p>
              <div style={{marginTop: "1.5rem", textAlign: "center"}}>
                <a 
                  href={`https://sepolia.easscan.org/attestation/view/${attestationUid}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="button button-outline"
                  style={{ padding: '0.9rem 2rem', fontSize: '1.05rem' }}
                >
                  <i className="fas fa-external-link-alt"></i> Vizualizează Atestarea
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttestationStatus;
