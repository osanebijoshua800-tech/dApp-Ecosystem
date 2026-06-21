import express from 'express';
import cors from 'cors';
import { ethers } from 'ethers';
import fs from 'fs';

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Connect to local Hardhat node
const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');

// Load the Contract ABI
const contractJson = JSON.parse(fs.readFileSync('./MiniCrowdfund.json', 'utf8'));
const contractABI = contractJson.abi;

// ⚠️ PASTE YOUR DEPLOYED CONTRACT ADDRESS HERE
const CONTRACT_ADDRESS = " 0x5FbDB2315678afecb367f032d93F642f64180aa3";

// Signer 0 (Creator) and Signer 1 (Contributor/Funder)
const getContractWithSigner = async (accountIndex = 0) => {
    const signer = await provider.getSigner(accountIndex);
    return new ethers.Contract(CONTRACT_ADDRESS, contractABI, signer);
};

// Route 1: Check Status
app.get('/api/status', async (req, res) => {
    try {
        const blockNumber = await provider.getBlockNumber();
        res.json({ status: "online", currentBlock: blockNumber });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
});

// Route 2: Create Campaign (Write)
app.post('/api/campaigns', async (req, res) => {
    const { title, targetAmountInEth, durationInSeconds } = req.body;
    try {
        const contract = await getContractWithSigner(0); // Account 0 creates
        const targetInWei = ethers.parseEther(targetAmountInEth.toString());
        const tx = await contract.createCampaign(title, targetInWei, durationInSeconds);
        const receipt = await tx.wait();
        res.json({ success: true, transactionHash: receipt.hash });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Route 3: Fetch All Campaigns (Read)
app.get('/api/campaigns', async (req, res) => {
    try {
        const contract = await getContractWithSigner(0);
        const count = await contract.campaignCount();
        let campaigns = [];
        
        // Loop through the blockchain mapping to grab all active campaigns
        for(let i = 1; i <= Number(count); i++) {
            const camp = await contract.campaigns(i);
            campaigns.push({
                id: i,
                title: camp.title,
                target: ethers.formatEther(camp.target),
                amountRaised: ethers.formatEther(camp.amountRaised),
                deadline: Number(camp.deadline),
                claimed: camp.claimed
            });
        }
        res.json({ success: true, campaigns });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Route 4: Donate to Campaign (Write)
app.post('/api/donate', async (req, res) => {
    const { campaignId, amountInEth } = req.body;
    try {
        const contract = await getContractWithSigner(1); // Account 1 donates (so you aren't donating to yourself)
        const amountInWei = ethers.parseEther(amountInEth.toString());
        const tx = await contract.donate(campaignId, { value: amountInWei });
        const receipt = await tx.wait();
        res.json({ success: true, transactionHash: receipt.hash });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Momentum API Bridge running on http://localhost:${PORT}`);
});