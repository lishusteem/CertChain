import React, { useState } from 'react';

function ArticleForm({ onSubmit, isSubmitting }) {
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
    <div className="card">
      <h2>Create Article Attestation</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="authorName">Author Name</label>
          <input
            type="text"
            id="authorName"
            name="authorName"
            value={formData.authorName}
            onChange={handleChange}
            required
            placeholder="Introdu numele"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="articleTitle">Article Title</label>
          <input
            type="text"
            id="articleTitle"
            name="articleTitle"
            value={formData.articleTitle}
            onChange={handleChange}
            required
            placeholder="Introdu titlul articolului"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="articleHash">Article Hash (IPFS CID or Content Hash)</label>
          <input
            type="text"
            id="articleHash"
            name="articleHash"
            value={formData.articleHash}
            onChange={handleChange}
            required
            placeholder="e.g., QmT5NvUtoM5nWFfrQdVrFtvGfKFmG7AHE8P34isapyhCxX"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="tags">Tags (comma separated)</label>
          <input
            type="text"
            id="tags"
            name="tags"
            value={formData.tags}
            onChange={handleChange}
            placeholder="e.g., ethereum, defi, nft, research"
          />
        </div>
        
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              Creating Attestation
              <div className="loading"></div>
            </>
          ) : (
            'Create Attestation'
          )}
        </button>
      </form>
    </div>
  );
}

export default ArticleForm;