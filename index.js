require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Mock In-Memory Database to hold our project list
let projects = [];

// Minimal Application Binary Interface (ABI) to parse contract events
const CONTRACT_ABI = [
    "event ProjectCreated(uint256 indexed id, address indexed creator, uint256 goal, uint256 deadline)",
    "event PledgeMade(uint256 indexed id, address indexed backer, uint256 amount)"
];

// Initialize the provider and contract variables
let provider;
let crowdfundContract;

async function initializeBlockchainConnection() {
    try {
        // Connect to local development network node
        provider = new ethers.JsonRpcProvider(process.env.RPC_URL, undefined, {
            staticNetwork: true // Forces ethers to stop aggressive background testing loops
        });

        // Test the network connection quietly
        await provider.getNetwork();
        console.log("🚀 Successfully connected to blockchain RPC network!");

        // Bind contract listener instances
        crowdfundContract = new ethers.Contract(
            process.env.CONTRACT_ADDRESS,
            CONTRACT_ABI,
            provider
        );

        // Listen for real-time creation actions
        crowdfundContract.on("ProjectCreated", (id, creator, goal, deadline) => {
            const projectId = Number(id);
            let project = projects.find(p => p.id === projectId);
            
            if (!project) {
                project = { id: projectId };
                projects.push(project);
            }
            
            project.creator = creator;
            project.goal = ethers.formatEther(goal);
            project.deadline = new Date(Number(deadline) * 1000);
            project.pledged = project.pledged || "0.0";
            
            console.log(`Synced Project #${projectId} directly from Blockchain.`);
        });

    } catch (error) {
        // Gracefully handle network down states during development
        console.log("⚠️ Blockchain node offline. Web3 background sync is waiting...");
    }
}

// Run connection protocol
initializeBlockchainConnection();

/**
 * Express API Routing Endpoints
 */

// Route 1: Base validation status route
app.get('/', (req, res) => {
    res.send("LaunchPad Backend Event Indexer Running.");
});

// Route 2: Fetch all indexed projects for the frontend dashboard layout
app.get('/api/projects', (req, res) => {
    res.json(projects);
});

// Fire up the local web app engine
app.listen(PORT, () => {
    console.log(`Backend server successfully initialized on port ${PORT}`);
});