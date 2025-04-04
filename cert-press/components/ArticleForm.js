import React, { useState } from 'react';

const ArticleForm = ({ onSubmit, isSubmitting }) => {
  const [formData, setFormData] = useState({
    authorName: '',
    articleTitle: '',
    articleHash: '',
    tags: ''
  });

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

  return (
    <div className="article-form" style={{ padding: '3rem' }}>
      <div className="form-section-title" style={{ fontSize: '1.5rem', marginBottom: '2rem' }}>
        <i className="fas fa-edit"></i> Informații Articol
      </div>
      
      <form onSubmit={handleSubmit}>
        <div className="form-grid" style={{ gap: '4rem', gridTemplateColumns: '2.5fr 1fr' }}>
          <div>
            <div className="form-group">
              <label htmlFor="articleTitle" className="form-label" style={{ fontSize: '1.1rem' }}>Titlu Articol</label>
              <input
                type="text"
                className="form-input"
                id="articleTitle"
                name="articleTitle"
                value={formData.articleTitle}
                onChange={handleChange}
                placeholder="Introduceți titlul articolului"
                required
                style={{ padding: '0.9rem 1.2rem', fontSize: '1rem' }}
              />
            </div>

            <div className="form-group">
              <label htmlFor="articleBody" className="form-label" style={{ fontSize: '1.1rem' }}>Conținut Articol</label>
              <div className="markdown-editor" style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                <div className="editor-toolbar" style={{ padding: '1rem', backgroundColor: 'var(--background-alt)' }}>
                  <span>Conținutul va fi transformat în hash pentru atestare</span>
                </div>
                <textarea
                  className="form-input"
                  id="articleBody"
                  name="articleBody"
                  rows="12"
                  placeholder="Scrieți sau lipiți conținutul articolului aici..."
                  onChange={(e) => {
                    // În aplicația reală, am calcula hash-ul aici
                    setFormData({
                      ...formData,
                      articleHash: `0x${Math.random().toString(16).substring(2, 10)}...`
                    });
                  }}
                  style={{
                    width: '100%', 
                    resize: 'vertical', 
                    minHeight: '250px',
                    fontFamily: 'Inter, sans-serif',
                    padding: '1.2rem',
                    fontSize: '1rem',
                    lineHeight: '1.7',
                    border: 'none',
                    borderRadius: '0'
                  }}
                ></textarea>
              </div>
              <span className="form-input-note" style={{ marginTop: '0.75rem', fontSize: '0.85rem' }}>
                Conținutul va fi transformat în hash și doar hash-ul va fi stocat în blockchain.
              </span>
            </div>

            <div className="form-group">
              <label htmlFor="tags" className="form-label" style={{ fontSize: '1.1rem' }}>Etichete</label>
              <input
                type="text"
                className="form-input"
                id="tags"
                name="tags"
                value={formData.tags}
                onChange={handleChange}
                placeholder="Introduceți etichete separate prin virgulă (ex: știri, finanțe, tehnologie)"
                required
                style={{ padding: '0.9rem 1.2rem', fontSize: '1rem' }}
              />
              <span className="form-input-note" style={{ marginTop: '0.75rem', fontSize: '0.85rem' }}>
                Adăugați etichete relevante pentru a categoriza articolul
              </span>
            </div>

            <div className="form-group">
              <label htmlFor="authorName" className="form-label" style={{ fontSize: '1.1rem' }}>Nume Autor</label>
              <input
                type="text"
                className="form-input"
                id="authorName"
                name="authorName"
                value={formData.authorName}
                onChange={handleChange}
                placeholder="Introduceți numele dvs. sau un pseudonim"
                required
                style={{ padding: '0.9rem 1.2rem', fontSize: '1rem' }}
              />
            </div>
          </div>
          
          <div>
            <div className="meta-info">
              <div className="meta-info-header">
                <h3 className="meta-info-title" style={{ fontSize: '1.15rem' }}>
                  <i className="fas fa-info-circle"></i> Previzualizare Atestare
                </h3>
              </div>
              <div className="meta-info-content" style={{ padding: '1.25rem' }}>
                <div className="meta-info-item">
                  <div className="meta-info-label" style={{ width: '140px' }}>Titlu</div>
                  <div className="meta-info-value">
                    {formData.articleTitle || "Nesetat"}
                  </div>
                </div>
                <div className="meta-info-item">
                  <div className="meta-info-label" style={{ width: '140px' }}>Hash Conținut</div>
                  <div className="meta-info-value">
                    <code>{formData.articleHash || "Negenereat"}</code>
                  </div>
                </div>
                <div className="meta-info-item">
                  <div className="meta-info-label" style={{ width: '140px' }}>Autor</div>
                  <div className="meta-info-value">
                    {formData.authorName || "Nesetat"}
                  </div>
                </div>
                <div className="meta-info-item">
                  <div className="meta-info-label" style={{ width: '140px' }}>Etichete</div>
                  <div className="meta-info-value">
                    {formData.tags || "Nicio etichetă"}
                  </div>
                </div>
              </div>
            </div>

            <div className="meta-info" style={{ marginTop: '2rem' }}>
              <div className="meta-info-header">
                <h3 className="meta-info-title" style={{ fontSize: '1.15rem' }}>
                  <i className="fas fa-question-circle"></i> Informații
                </h3>
              </div>
              <div className="meta-info-content" style={{ padding: '1.25rem' }}>
                <p style={{marginBottom: "1.25rem", fontSize: "0.95rem", color: "var(--text-secondary)"}}>
                  Atestarea articolului creează o înregistrare permanentă a conținutului dvs. în blockchain, 
                  dovedind autenticitatea și marcajul temporal.
                </p>
                <ul style={{paddingLeft: "1.75rem", fontSize: "0.95rem", color: "var(--text-secondary)"}}>
                  <li style={{ marginBottom: '0.5rem' }}>Conținutul este transformat în hash pentru a crea o amprentă unică</li>
                  <li style={{ marginBottom: '0.5rem' }}>Hash-ul este stocat în blockchain, nu conținutul efectiv</li>
                  <li style={{ marginBottom: '0.5rem' }}>Acest lucru creează o dovadă imposibil de falsificat a lucrării dvs.</li>
                  <li>Puteți dovedi proprietatea cu portofelul dvs.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div style={{marginTop: "3rem", display: "flex", justifyContent: "flex-end"}}>
          <button
            type="submit"
            className="button button-primary"
            disabled={isSubmitting}
            style={{ padding: '0.9rem 2rem', fontSize: '1.05rem' }}
          >
            {isSubmitting ? (
              <>
                <i className="fas fa-spinner fa-spin"></i> Se procesează...
              </>
            ) : (
              <>
                <i className="fas fa-certificate"></i> Creează Atestare
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ArticleForm;
