/**
 * Servicii pentru codificarea datelor conform schemelor EAS
 */

/**
 * Codifică datele cu o adresă pentru un apel de funcție
 * @param {string} data - Datele de codificat 
 * @param {string} address - Adresa de adăugat
 * @returns {string} - Datele codificate
 */
export const encodeWithAddress = (data, address) => {
  // Aceasta este o implementare simplificată pentru demo
  // Într-o aplicație reală, s-ar folosi ethers.js sau web3.js pentru codificarea ABI
  
  if (!data || data === '0x') {
    return data;
  }
  
  // Simulăm o codificare simplă adăugând adresa la date
  return `${data}000000000000000000000000${address.replace('0x', '')}`;
};

/**
 * Adaugă adresa destinatar la schema EAS
 * @param {Object} schema - Schema de atestare
 * @param {string} address - Adresa destinatarului
 * @returns {Object} - Schema modificată
 */
export const addRecipientToSchema = (schema, address) => {
  // Aceasta este o implementare simplificată pentru demo
  // Într-o aplicație reală, s-ar folosi biblioteca EAS SDK
  
  return {
    ...schema,
    recipient: address
  };
};
