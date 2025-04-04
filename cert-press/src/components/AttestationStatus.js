import React from 'react';

const AttestationStatus = ({ attestationUid, txHash, error, isSubmitting }) => {
  if (!isSubmitting && !attestationUid && !txHash && !error) {
    return null;
  }

  return (
    <div className="attestation-info">
      <h3 className="attestation-title">
        <i className="fas fa-clipboard-check"></i> Attestation Status
      </h3>

      {isSubmitting && (
        <div style={{padding: "1rem", backgroundColor: "var(--primary-lighter)", borderRadius: "var(--radius)", marginBottom: "1rem"}}>
          <p style={{display: "flex", alignItems: "center", color: "var(--primary)"}}>
            <i className="fas fa-spinner fa-spin" style={{marginRight: "0.5rem"}}></i>
            Creating attestation on the blockchain...
          </p>
        </div>
      )}

      {error && (
        <div style={{padding: "1rem", backgroundColor: "rgba(239, 35, 60, 0.1)", borderRadius: "var(--radius)", marginBottom: "1rem"}}>
          <p style={{display: "flex", alignItems: "center", color: "var(--danger)"}}>
            <i className="fas fa-exclamation-triangle" style={{marginRight: "0.5rem"}}></i>
            Error: {error}
          </p>
        </div>
      )}

      {txHash && (
        <div className="meta-info" style={{marginBottom: "1rem"}}>
          <div className="meta-info-header">
            <h3 className="meta-info-title">
              <i className="fas fa-file-contract"></i> Transaction Details
            </h3>
          </div>
          <div className="meta-info-content">
            <div className="meta-info-item">
              <div className="meta-info-label">Transaction Hash</div>
              <div className="meta-info-value">
                <a 
                  href={`https://sepolia.etherscan.io/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{wordBreak: "break-all", color: "var(--primary)"}}
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
            <h3 className="meta-info-title">
              <i className="fas fa-check-circle" style={{color: "var(--secondary)"}}></i> Attestation Successful
            </h3>
          </div>
          <div className="meta-info-content">
            <div className="meta-info-item">
              <div className="meta-info-label">Attestation UID</div>
              <div className="meta-info-value">
                <a 
                  href={`https://sepolia.easscan.org/attestation/view/${attestationUid}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{wordBreak: "break-all", color: "var(--primary)"}}
                >
                  {attestationUid}
                </a>
              </div>
            </div>
            <div style={{marginTop: "1rem"}}>
              <p style={{fontSize: "0.875rem", color: "var(--text-secondary)"}}>
                Your attestation has been successfully created and recorded on the blockchain.
              </p>
              <div style={{marginTop: "1rem", textAlign: "center"}}>
                <a 
                  href={`https://sepolia.easscan.org/attestation/view/${attestationUid}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="button button-outline"
                >
                  <i className="fas fa-external-link-alt"></i> View Attestation
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
