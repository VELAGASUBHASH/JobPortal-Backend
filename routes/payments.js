const express = require('express');
const { Web3 } = require('web3');
// const { Connection, PublicKey } = require('@solana/web3.js');
const Payment = require('../models/payment.js');
const Job = require('../models/job.js');
const auth = require('../middleware/auth.js');

const router = express.Router();

// Initialize blockchain connections
const web3 = new Web3(process.env.ETH_RPC_URL);
// const solanaConnection = new Connection(process.env.SOLANA_RPC_URL);

// Admin wallet addresses
const ADMIN_WALLETS = {
  ethereum: process.env.ADMIN_ETH_WALLET,
  polygon: process.env.ADMIN_POLYGON_WALLET,
  solana: process.env.ADMIN_SOLANA_WALLET
};

// Payment amounts (in smallest units)
const PAYMENT_AMOUNTS = {
  ethereum: '1000000000000000', // 0.001 ETH
  polygon: '1000000000000000', // 0.001 MATIC
  solana: '10000000' // 0.01 SOL
};

// Verify payment and activate job
router.post('/verify', auth, async (req, res) => {
  try {
    const { transactionHash, blockchain, jobId } = req.body;

    // Check if payment already exists
    const existingPayment = await Payment.findOne({ transactionHash });
    if (existingPayment) {
      return res.status(400).json({ message: 'Payment already processed' });
    }

    let isValid = false;
    let transactionDetails = {};

    // Verify transaction based on blockchain
    if (blockchain === 'ethereum' || blockchain === 'polygon') {
      const receipt = await web3.eth.getTransactionReceipt(transactionHash);
      if (receipt && receipt.status) {
        const transaction = await web3.eth.getTransaction(transactionHash);
        isValid = transaction.to.toLowerCase() === ADMIN_WALLETS[blockchain].toLowerCase() &&
                 transaction.value === PAYMENT_AMOUNTS[blockchain];
        
        transactionDetails = {
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed,
          from: transaction.from
        };
      }
    } else if (blockchain === 'solana') {
      const transaction = await solanaConnection.getTransaction(transactionHash);
      if (transaction && transaction.meta.err === null) {
        // Verify Solana transaction details
        const instruction = transaction.transaction.message.instructions[0];
        isValid = transaction.meta.postBalances[1] - transaction.meta.preBalances[1] === 
                 parseInt(PAYMENT_AMOUNTS.solana);
        
        transactionDetails = {
          blockNumber: transaction.slot,
          from: transaction.transaction.message.accountKeys[0].toString()
        };
      }
    }

    if (!isValid) {
      return res.status(400).json({ message: 'Invalid payment transaction' });
    }

    // Create payment record
    const payment = new Payment({
      user: req.user.userId,
      job: jobId,
      amount: PAYMENT_AMOUNTS[blockchain],
      currency: blockchain.toUpperCase(),
      blockchain,
      transactionHash,
      walletAddress: transactionDetails.from,
      status: 'confirmed',
      type: 'job_posting',
      blockNumber: transactionDetails.blockNumber,
      gasUsed: transactionDetails.gasUsed
    });

    await payment.save();

    // Activate the job
    if (jobId) {
      await Job.findByIdAndUpdate(jobId, {
        status: 'active',
        isPaid: true,
        paymentHash: transactionHash,
        blockchain
      });
    }

    res.json({
      message: 'Payment verified successfully',
      payment: payment._id
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Payment verification failed' });
  }
});

// Get payment status
router.get('/status/:transactionHash', auth, async (req, res) => {
  try {
    const payment = await Payment.findOne({
      transactionHash: req.params.transactionHash,
      user: req.user.userId
    });

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    res.json(payment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user payment history
router.get('/history', auth, async (req, res) => {
  try {
    const payments = await Payment.find({ user: req.user.userId })
      .populate('job', 'title company')
      .sort({ createdAt: -1 });

    res.json(payments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
