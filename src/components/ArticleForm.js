import React, { useState } from 'react';
import { walletConnectService } from '../services/walletConnectService';
import QRCodeModal from './QRCodeModal';

const ArticleForm = ({ onSubmit, isSubmitting }) => {
  const [formData, setFormData] = useState({
    authorName: '',
    articleTitle: '',
    articleHash: '',
    tags: ''
  });
  const [ethLink, setEthLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [walletConnectUri, setWalletConnectUri] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const loadMockData = () => {
    const mockHash = `0x${Math.random().toString(16).substring(2, 60)}`;
    const mockArticleContent = `# Importanța tehnologiei blockchain în jurnalism

Blockchain-ul reprezintă una dintre cele mai promițătoare tehnologii emergente din ultimul deceniu. Impactul său se extinde dincolo de sectorul financiar, ajungând să influențeze și industria media într-un mod semnificativ.

## Transparență și verificabilitate

Una dintre cele mai importante contribuții ale blockchain-ului în media este capacitatea de a verifica sursele și autenticitatea conținutului. În era știrilor false și a dezinformării, tehnologia blockchain oferă:

- Un mecanism transparent de verificare a originii articolelor
- Confirmarea autenticității conținutului multimedia
- Trasabilitatea modificărilor aduse conținutului inițial

Monetizare directă pentru creatori

Blockchain-ul permite, de asemenea, noi modele de monetizare pentru jurnaliști și creatori de conținut:

1. Micropagamenti pentru accesul la articole individuale
2. Tokenizarea conținutului prin NFT-uri
3. Modele de abonament descentralizate

> "Blockchain-ul nu doar transformă modul în care stocăm informațiile, ci și modul în care stabilim încrederea în aceste informații."

În concluzie, adopția tehnologiei blockchain în media are potențialul de a rezolva multe dintre problemele actuale ale industriei, de la criza de încredere până la modelele de monetizare durabile.

Avantaje pentru jurnalism

* Asigură integritatea conținutului
* Elimină intermediarii centralizați
* Oferă independență editorială
* Crește transparența procesului jurnalistic`;

    setFormData({
      authorName: 'Maria Popescu',
      articleTitle: 'Importanța tehnologiei blockchain în jurnalism',
      articleHash: mockHash,
      tags: 'blockchain, jurnalism, tehnologie, inovație'
    });

    const textareaElement = document.getElementById('articleBody');
    if (textareaElement) {
      textareaElement.value = mockArticleContent;
    }
  };

  const generateEthLink = async () => {
    try {
      const EAS_CONTRACT_ADDRESS = "0xC2679fBD37d54388Ce493F1DB75320D236e1815e";
      const encodedData = `ethereum:${EAS_CONTRACT_ADDRESS}/attestWithSig?uint256=${Date.now()}&address=${formData.authorName}&bytes=${formData.articleHash}&string=${encodeURIComponent(formData.articleTitle)}&string=${encodeURIComponent(formData.tags)}`;
      setEthLink(encodedData);
    } catch (error) {
      console.error("Eroare la generarea linkului:", error);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(ethLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const connectWithWalletConnect = async () => {
    try {
      await walletConnectService.init();
      walletConnectService.connect().then(({ address }) => {
        console.log("WalletConnect connected with address:", address);
        onSubmit(formData);
      }).catch(error => {
        console.error("WalletConnect connection error:", error);
      });

      const uri = walletConnectService.getWalletConnectUri();
      if (uri) {
        setWalletConnectUri(uri);
        setShowQRModal(true);
      } else {
        console.error("WalletConnect URI not available");
      }
    } catch (error) {
      console.error("Error initializing WalletConnect:", error);
    }
  };

  const closeQRModal = () => {
    setShowQRModal(false);
  };

  return (
    <div className="article-form">
      <div className="form-section-title">
        <i className="fas fa-edit"></i> Informații despre articol
      </div>
      
      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <div>
            <div className="form-group">
              <label htmlFor="articleTitle" className="form-label">Titlul articolului</label>
              <input
                type="text"
                className="form-input"
                id="articleTitle"
                name="articleTitle"
                value={formData.articleTitle}
                onChange={handleChange}
                placeholder="Introdu titlul articolului"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="articleBody" className="form-label">Conținutul articolului</label>
              <div className="markdown-editor">
                <div className="editor-toolbar">
                  <span>Conținutul va fi transformat în hash pentru atestare</span>
                </div>
                <textarea
                  className="form-input"
                  id="articleBody"
                  name="articleBody"
                  rows="10"
                  placeholder="Scrie sau lipește conținutul articolului aici..."
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      articleHash: `0x${Math.random().toString(16).substring(2, 10)}...`
                    });
                  }}
                  style={{
                    width: '100%', 
                    resize: 'vertical', 
                    minHeight: '200px',
                    fontFamily: 'Inter, sans-serif'
                  }}
                ></textarea>
              </div>
              <span className="form-input-note">
                Conținutul va fi transformat în hash și doar hash-ul va fi stocat în blockchain.
              </span>
            </div>

            <div className="form-group">
              <label htmlFor="tags" className="form-label">Etichete</label>
              <input
                type="text"
                className="form-input"
                id="tags"
                name="tags"
                value={formData.tags}
                onChange={handleChange}
                placeholder="Introduceți etichete separate prin virgulă (ex: știri, finanțe, tehnologie)"
                required
              />
              <span className="form-input-note">
                Adăugați etichete relevante pentru a categoriza articolul
              </span>
            </div>

            <div className="form-group">
              <label htmlFor="authorName" className="form-label">Nume autor</label>
              <input
                type="text"
                className="form-input"
                id="authorName"
                name="authorName"
                value={formData.authorName}
                onChange={handleChange}
                placeholder="Introduceți numele sau pseudonimul dvs."
                required
              />
            </div>
          </div>
          
          <div>
            <div className="meta-info">
              <div className="meta-info-header">
                <h3 className="meta-info-title">
                  <i className="fas fa-info-circle"></i> Previzualizare Atestare
                </h3>
              </div>
              <div className="meta-info-content">
                <div className="meta-info-item">
                  <div className="meta-info-label">Titlu</div>
                  <div className="meta-info-value">
                    {formData.articleTitle || "Nesetat"}
                  </div>
                </div>
                <div className="meta-info-item">
                  <div className="meta-info-label">Hash Conținut</div>
                  <div className="meta-info-value">
                    <code>{formData.articleHash || "Negenereat"}</code>
                  </div>
                </div>
                <div className="meta-info-item">
                  <div className="meta-info-label">Autor</div>
                  <div className="meta-info-value">
                    {formData.authorName || "Nesetat"}
                  </div>
                </div>
                <div className="meta-info-item">
                  <div className="meta-info-label">Etichete</div>
                  <div className="meta-info-value">
                    {formData.tags || "Niciuna adăugată"}
                  </div>
                </div>
              </div>
            </div>

            <div className="meta-info">
              <div className="meta-info-header">
                <h3 className="meta-info-title">
                  <i className="fas fa-question-circle"></i> Informații
                </h3>
              </div>
              <div className="meta-info-content">
                <p style={{marginBottom: "1rem", fontSize: "0.875rem", color: "var(--text-secondary)"}}>
                  Atestarea articolelor creează o înregistrare permanentă a conținutului dvs. în blockchain,
                  dovedind autenticitatea și momentul publicării.
                </p>
                <ul style={{paddingLeft: "1.5rem", fontSize: "0.875rem", color: "var(--text-secondary)"}}>
                  <li>Conținutul este transformat în hash pentru a crea o amprentă unică</li>
                  <li>Doar hash-ul este stocat în blockchain, nu conținutul propriu-zis</li>
                  <li>Aceasta creează o dovadă imposibil de falsificat a lucrării dumneavoastră</li>
                  <li>Puteți dovedi proprietatea cu portofelul dumneavoastră</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div style={{marginTop: "2rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem"}}>
          <div style={{display: "flex", gap: "1rem"}}>
            <button
              type="button"
              className="button button-outline"
              onClick={loadMockData}
            >
              <i className="fas fa-magic"></i> Încarcă Date Test
            </button>
            <button
              type="button"
              className="button button-outline"
              onClick={generateEthLink}
            >
              <i className="fas fa-link"></i> Generează Link
            </button>
          </div>
          
          <div style={{display: "flex", gap: "1rem"}}>
            <button
              type="button"
              className="button button-outline"
              onClick={connectWithWalletConnect}
              disabled={isSubmitting}
            >
              <i className="fas fa-qrcode"></i> Conectare Wallet Mobil
            </button>
            
            <button
              type="submit"
              className="button button-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i> Se procesează...
                </>
              ) : (
                <>
                  <i className="fas fa-certificate"></i> Creează Atestarea
                </>
              )}
            </button>
          </div>
        </div>
        
        {ethLink && (
          <div className="attestation-info" style={{marginTop: "1rem", marginBottom: "1.5rem"}}>
            <h3 className="attestation-title">
              <i className="fas fa-check-circle"></i> Link Ethereum Generat
            </h3>
            
            <div style={{display: "flex", gap: "0.75rem", marginTop: "1rem"}}>
              <input 
                type="text" 
                className="form-input" 
                value={ethLink} 
                readOnly 
                style={{flex: "1"}}
              />
              <button 
                type="button"
                className="button button-outline"
                onClick={copyToClipboard}
                style={{whiteSpace: "nowrap"}}
              >
                {copied ? <i className="fas fa-check"></i> : <i className="fas fa-copy"></i>}
                {copied ? ' Copiat!' : ' Copiază'}
              </button>
            </div>
            
            <div style={{textAlign: "center", marginTop: "1rem"}}>
              <a href={ethLink} className="button button-primary">
                <i className="fas fa-external-link-alt"></i> Deschide în Wallet
              </a>
              <p className="form-input-note" style={{marginTop: "1rem"}}>
                Acest link poate fi folosit pentru a semna tranzacția direct din wallet-ul mobil.
              </p>
            </div>
          </div>
        )}
      </form>
      
      <QRCodeModal 
        isOpen={showQRModal} 
        onClose={closeQRModal} 
        uri={walletConnectUri} 
        title="Conectează portofelul mobil"
      />
    </div>
  );
};

export default ArticleForm;
