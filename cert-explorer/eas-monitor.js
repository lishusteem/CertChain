// EAS Attestation Monitor for Sepolia
const { ethers } = require('ethers');
const { EAS, SchemaEncoder } = require('@ethereum-attestation-service/eas-sdk');
const express = require('express');
const cors = require('cors');

// Configuration
const SEPOLIA_RPC_URL = 'https://sepolia.infura.io/v3/6ddd199b633d4d88b51bb77d8be8c86b'; // Replace with your RPC provider
const EAS_CONTRACT_ADDRESS = '0xC2679fBD37d54388Ce493F1DB75320D236e1815e'; // Sepolia EAS contract address
const SCHEMA_UID = '0x940a0f0b3280c5b67e09aaab239f62e2eb9af35ae50dab4eb45fa552e8e8bf60'; // Your schema UID
const PORT = process.env.PORT || 3000; // Default to port 3000 if not specified in environment

// Initialize provider and EAS SDK
const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL); // Updated to ethers v6 syntax
const eas = new EAS(EAS_CONTRACT_ADDRESS);
eas.connect(provider);

// Database (in-memory for this example)
const attestations = [];

// Initialize Express app
const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from the current directory
app.use(express.static('.'));  // Serves files from the current directory

// Add a route specifically for the cert explorer
app.get('/explorer', (req, res) => {
  res.sendFile('index.html', { root: __dirname });  // Using index.html instead of cert-explorer.html
});

// Add this utility function to handle BigInt serialization
function serializeBigInt(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'bigint') {
    return obj.toString();
  }
  
  if (typeof obj === 'object') {
    if (Array.isArray(obj)) {
      return obj.map(serializeBigInt);
    }
    
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = serializeBigInt(value);
    }
    return result;
  }
  
  return obj;
}

// Add a route for the root path
app.get('/', (req, res) => {
  res.send(`
    <h1>EAS Attestation Monitor</h1>
    <p>API available at <a href="/api/attestations">/api/attestations</a></p>
    <p>You can filter by attester, recipient, fromTime, and toTime</p>
    <p>Example: <a href="/api/attestations?fromTime=${Math.floor(Date.now()/1000) - 86400}">/api/attestations?fromTime=[24h ago]</a></p>
  `);
});

// API endpoints
app.get('/api/attestations', (req, res) => {
  try {
    console.log('API request received:', req.query);
    
    // Convert query parameters to filters
    const filters = {};
    if (req.query.attester) filters.attester = req.query.attester;
    if (req.query.recipient) filters.recipient = req.query.recipient;
    if (req.query.fromTime) filters.fromTime = Number(req.query.fromTime);
    if (req.query.toTime) filters.toTime = Number(req.query.toTime);
    
    console.log('Filters applied:', filters);
    
    // Get filtered attestations
    const result = getAttestations(filters);
    console.log(`Found ${result.length} attestations matching filters`);
    
    // Extract tags from attestations for word cloud
    const tags = [];
    result.forEach(attestation => {
      if (!attestation.data) return;
      
      try {
        const schemaEncoder = new SchemaEncoder("string name,uint256 value");
        const decodedData = schemaEncoder.decodeData(attestation.data);
        // Safely check and handle the decoded data
        if (decodedData && Array.isArray(decodedData) && 
            decodedData[0] && typeof decodedData[0].value !== 'undefined') {
          const tagValue = decodedData[0].value.toString();
          tags.push(tagValue);
        }
      } catch (error) {
        console.log(`Error decoding attestation data: ${error.message}`);
        // Continue processing other attestations
      }
    });
    
    // Make sure we're only sending safe data in the response
    const safeResponse = {
      attestations: result.map(att => ({
        uid: att.uid,
        schema: att.schema,
        attester: att.attester,
        recipient: att.recipient, 
        time: att.time ? Number(att.time).toString() : null,
        revoked: !!att.revoked,
      })),
      tags
    };
    
    // Send the serialized response
    res.json(serializeBigInt(safeResponse));
  } catch (error) {
    console.error('API endpoint error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message || 'Unknown error'
    });
  }
});

// Function to fetch historical attestations
async function fetchHistoricalAttestations() {
  console.log('Fetching historical attestations...');
  
  // In a real implementation, you would use the EAS GraphQL API
  // For this simple example, we'll query events directly from the contract
  const easContract = new ethers.Contract(
    EAS_CONTRACT_ADDRESS,
    [
      'event Attested(address indexed recipient, address indexed attester, bytes32 indexed schema, bytes32 uid)',
    ],
    provider
  );

  const filter = easContract.filters.Attested(null, null, SCHEMA_UID);
  const events = await easContract.queryFilter(filter, -10000); // Last 10000 blocks

  for (const event of events) {
    const uid = event.args.uid;
    const attestation = await eas.getAttestation(uid);
    attestations.push(attestation);
    console.log('Found historical attestation:', attestation.uid);
  }

  console.log(`Loaded ${attestations.length} historical attestations`);
}

// Function to listen for new attestations
function listenForNewAttestations() {
  console.log('Starting to listen for new attestations...');
  
  const easContract = new ethers.Contract(
    EAS_CONTRACT_ADDRESS,
    [
      'event Attested(address indexed recipient, address indexed attester, bytes32 indexed schema, bytes32 uid)',
    ],
    provider
  );

  const filter = easContract.filters.Attested(null, null, SCHEMA_UID);
  
  easContract.on(filter, async (recipient, attester, schema, uid, event) => {
    console.log('New attestation detected!', uid);
    const attestation = await eas.getAttestation(uid);
    attestations.push(attestation);
    
    // Here you could also:
    // - Send a notification
    // - Update a UI
    // - Trigger other business logic
    
    console.log('Attestation details:', {
      recipient: attestation.recipient,
      attester: attestation.attester,
      time: new Date(Number(attestation.time) * 1000).toISOString(),
    });
    
    // Decode the attestation data if needed
    try {
      // You would need to know the schema structure for this
      // Note: This is a placeholder, you'll need to update the schema structure based on your actual schema
      const schemaEncoder = new SchemaEncoder("string name,uint256 value");
      const decodedData = schemaEncoder.decodeData(attestation.data);
      console.log('Decoded data:', decodedData);
    } catch (error) {
      console.log('Could not decode data, schema structure may be different');
    }
  });
}

// Simple API to query attestations
function getAttestations(filters = {}) {
  try {
    // Apply filters (simple example)
    return attestations.filter(att => {
      try {
        // Filter by attester
        if (filters.attester && att.attester.toLowerCase() !== filters.attester.toLowerCase()) {
          return false;
        }
        
        // Filter by recipient
        if (filters.recipient && att.recipient.toLowerCase() !== filters.recipient.toLowerCase()) {
          return false;
        }
        
        // Filter by time range - safely convert BigInt to Number if needed
        if (filters.fromTime) {
          const attTime = typeof att.time === 'bigint' ? Number(att.time) : Number(att.time);
          if (attTime < filters.fromTime) return false;
        }
        
        if (filters.toTime) {
          const attTime = typeof att.time === 'bigint' ? Number(att.time) : Number(att.time);
          if (attTime > filters.toTime) return false;
        }
        
        return true;
      } catch (err) {
        console.error('Error filtering attestation:', err, 'Attestation:', att);
        return false; // Skip problematic attestations
      }
    });
  } catch (error) {
    console.error('Error in getAttestations:', error);
    return []; // Return empty array on error
  }
}

// Main function
async function main() {
  try {
    // Load historical attestations
    await fetchHistoricalAttestations();
    
    // Start listening for new attestations
    listenForNewAttestations();
    
    // Start the API server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
    
    // Example of querying attestations (would be exposed via API/UI in a real app)
    setInterval(() => {
      console.log(`Currently tracking ${attestations.length} attestations for schema ${SCHEMA_UID}`);
      
      // Example filter: attestations from the last 24 hours
      const oneDayAgo = Math.floor(Date.now() / 1000) - 86400;
      const recentAttestations = getAttestations({ fromTime: oneDayAgo });
      console.log(`Found ${recentAttestations.length} attestations in the last 24 hours`);
    }, 60000); // Check every minute
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Export functions for potential API usage
module.exports = {
  fetchHistoricalAttestations,
  getAttestations,
  attestations
};

// Only run main if this script is executed directly (not imported)
if (require.main === module) {
  main();
}
