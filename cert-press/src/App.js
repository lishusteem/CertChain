import React, { useState, useEffect } from 'react';
import { BrowserProvider } from 'ethers';
import { EAS, SchemaEncoder, NO_EXPIRATION } from '@ethereum-attestation-service/eas-sdk';
import './App.css';
import ConnectWallet from './components/ConnectWallet';
import ArticleForm from './components/ArticleForm';
import AttestationStatus from './components/AttestationStatus';

// Sepolia testnet EAS contract address
const EAS_CONTRACT_ADDRESS = "0xC2679fBD37d54388Ce493F1DB75320D236e1815e";

// The schema UID you want to use
const SCHEMA_UID = "0x940a0f0b3280c5b67e09aaab239f62e2eb9af35ae50dab4eb45fa552e8e8bf60";

// The schema we're using (must match the registered schema)
const SCHEMA_STRING = "address authorAddress,string authorName,string articleTitle,string articleHash,uint256 timestamp,string[] tags";

function App() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [walletAddress, setWalletAddress] = useState("");
  const [easInstance, setEasInstance] = useState(null);
  const [attestationUid, setAttestationUid] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState("");

  // Initialize EAS
  useEffect(() => {
    const initializeEAS = async () => {
      if (signer) {
        try {
          const eas = new EAS(EAS_CONTRACT_ADDRESS);
          await eas.connect(signer);
          setEasInstance(eas);
        } catch (err) {
          console.error("Error initializing EAS:", err);
          setError(`Error initializing EAS: ${err.message}`);
        }
      }
    };

    initializeEAS();
  }, [signer]);

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        // Request account access
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        
        const provider = new BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        
        setProvider(provider);
        setSigner(signer);
        setWalletAddress(address);
      } catch (error) {
        console.error("Error connecting to wallet:", error);
        setError(`Eroare la conectarea portofelului: ${error.message}`);
      }
    } else {
      setError("MetaMask nu este instalat. Te rugăm să instalezi pentru a utiliza această aplicație.");
    }
  };

  const submitAttestation = async (formData) => {
    if (!easInstance || !signer) {
      setError("Portofel neconectat sau EAS neinițializat");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setTxHash("");
    setAttestationUid("");

    try {
      const schemaEncoder = new SchemaEncoder(SCHEMA_STRING);
      
      // Convert tags array to the format expected by EAS
      const tagsArray = formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag !== "");
      
      const encodedData = schemaEncoder.encodeData([
        { name: "authorAddress", value: walletAddress, type: "address" },
        { name: "authorName", value: formData.authorName, type: "string" },
        { name: "articleTitle", value: formData.articleTitle, type: "string" },
        { name: "articleHash", value: formData.articleHash, type: "string" },
        { name: "timestamp", value: Math.floor(Date.now() / 1000).toString(), type: "uint256" },
        { name: "tags", value: tagsArray, type: "string[]" }
      ]);

      // Prepare transaction
      const tx = await easInstance.attest({
        schema: SCHEMA_UID,
        data: {
          recipient: "0x0000000000000000000000000000000000000000", // Zero address as the recipient
          expirationTime: NO_EXPIRATION,
          revocable: false,
          data: encodedData,
        },
      });

      // Set the transaction hash
      setTxHash(tx.data.hash);
      
      // Wait for the transaction to be confirmed
      const newAttestationUID = await tx.wait();
      
      // Update the attestation UID in state
      setAttestationUid(newAttestationUID);
      console.log("Atestare realizată cu succes, UID:", newAttestationUID);
    } catch (err) {
      console.error("Eroare la crearea atestării:", err);
      setError(`Eroare la crearea atestării: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="App">
      <header className="header">
        <div className="container">
          <nav className="navbar">
            <a href="/" className="logo" style={{ fontSize: '1.7rem' }}>
              <i className="fas fa-certificate"></i> CertChain
            </a>
            <div className="nav-links" style={{ gap: '2.5rem' }}>
              <a href="/" className="nav-link active">Acasă</a>
              <a href="/attestations" className="nav-link">Atestări</a>
              <a href="/about" className="nav-link">Despre</a>
            </div>
          </nav>
        </div>
      </header>

      <div className="main-content">
        <div className="container">
          <div className="App-header" style={{ padding: '4rem', marginBottom: '4rem' }}>
            <h1 style={{ fontSize: '3rem', marginBottom: '1.5rem' }}>
              <i className="fas fa-file-signature"></i> Atestare Articol
            </h1>
            <p style={{ fontSize: '1.5rem' }}>Creează atestări pentru articole folosind CertPress</p>
          </div>
          
          <main className="App-main">
            <ConnectWallet 
              connectWallet={connectWallet} 
              walletAddress={walletAddress} 
            />
            
            {walletAddress && (
              <ArticleForm 
                onSubmit={submitAttestation} 
                isSubmitting={isSubmitting}
              />
            )}
            
            <AttestationStatus 
              attestationUid={attestationUid}
              txHash={txHash}
              error={error}
              isSubmitting={isSubmitting}
            />
          </main>
        </div>
      </div>
      
      <footer className="App-footer" style={{ padding: '4rem 0' }}>
        <div className="container">
          <p style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Folosind EAS pe rețeaua de testare Sepolia</p>
          <p style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Contract: <code>{EAS_CONTRACT_ADDRESS}</code></p>
          <p style={{ fontSize: '1rem' }}>Schemă: <code>{SCHEMA_UID.substring(0, 10)}...{SCHEMA_UID.substring(SCHEMA_UID.length - 8)}</code></p>
        </div>
      </footer>
    </div>
  );
}

export default App;