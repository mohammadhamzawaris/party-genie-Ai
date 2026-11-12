7// 1. Import required packages
require('dotenv').config();
const express = require('express');
const { GoogleGenAI } = require('@google/genai');
const path = require('path');

// 2. Initialization
const app = express();
const PORT = process.env.port ||3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Gemini Setup
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY,apiversion: 'v1beta'});3

// ==========================================
// ROUTE 1: AI Shopping List Generator
// ==========================================
app.post('/api/generate-list', async (req, res) => {
    const { partyDetails } = req.body;

    if (!partyDetails) {
        return res.status(400).json({ error: "Party details are required." });
    }

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3.8-flash', 
            contents: `You are a professional party planner AI. Based on the user's details: "${partyDetails}". 
            Generate a shopping list. 
            Return ONLY a valid JSON array of objects. 
            Each object must have: "name" (string), "quantity" (number), and "price" (number). 
            The total price of all items MUST NOT exceed the user's budget (if mentioned).`,
            config: {
                responseMimeType: "application/json",
            }
        });

        let rawText = response.text.trim();

        // Remove markdown code blocks if Gemini adds them
        if (rawText.startsWith("```json")) {
            rawText = rawText.replace(/```json/, "").replace(/```/, "").trim();
        } else if (rawText.startsWith("```")) {
            rawText = rawText.replace(/```/, "").replace(/```/, "").trim();
        }

        const shoppingList = JSON.parse(rawText);

        // Validation
        if (!Array.isArray(shoppingList)) {
            throw new Error("Invalid response format from AI");
        }

        // Calculate total amount
        const totalAmount = shoppingList.reduce((sum, item) => {
            return sum + (Number(item.price) * (Number(item.quantity) || 1));
        }, 0);

        res.json({
            shoppingList,
            totalAmount: totalAmount.toFixed(2)
        });

    } catch (error) {
        console.error("Gemini Error:", error.message);
        res.status(500).json({ error: "Failed to generate AI shopping list. Please try again." });
    }
});

// ==========================================
// ROUTE 2: Create PayPal Order
// ==========================================
app.post('/api/paypal/create-order', async (req, res) => {
    const { amount } = req.body;

    if (!amount) {
        return res.status(400).json({ error: "Amount is required." });
    }

    try {
        // Step A: Get Access Token
        const auth = Buffer.from(
            `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
        ).toString('base64');

        const tokenResponse = await fetch('https://api-m.sandbox.paypal.com/v1/oauth2/token', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: 'grant_type=client_credentials',
        });

        const tokenData = await tokenResponse.json();

        if (!tokenData.access_token) {
            throw new Error("Failed to get PayPal access token");
        }

        const accessToken = tokenData.access_token;

        // Step B: Create Order
        const orderResponse = await fetch('https://api-m.sandbox.paypal.com/v2/checkout/orders', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                intent: 'CAPTURE',
                purchase_units: [{
                    amount: {
                        currency_code: 'USD',
                        value: amount.toString(),
                    },
                }],
            }),
        });

        const orderData = await orderResponse.json();

        if (!orderData.id) {
            throw new Error("Failed to create PayPal order");
        }

        res.json({ id: orderData.id });

    } catch (error) {
        console.error("PayPal Create Order Error:", error.message);
        res.status(500).json({ error: "Failed to create PayPal order." });
    }
});

// ==========================================
// ROUTE 3: Capture PayPal Payment
// ==========================================
app.post('/api/paypal/capture-order/:orderId', async (req, res) => {
    const { orderId } = req.params;

    try {
        const auth = Buffer.from(
            `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
        ).toString('base64');

        const tokenResponse = await fetch('https://api-m.sandbox.paypal.com/v1/oauth2/token', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: 'grant_type=client_credentials',
        });

        const tokenData = await tokenResponse.json();

        if (!tokenData.access_token) {
            throw new Error("Failed to get PayPal access token");
        }

        const accessToken = tokenData.access_token;

        // Capture Payment
        const captureResponse = await fetch(`https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderId}/capture`, {
            method: 'POST',
            headers: {
   =             'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            }
        });

        const captureData = await captureResponse.json();
        res.json(captureData);

    } catch (error) {
        console.error("PayPal Capture Order Error:", error.message);
        res.status(500).json({ error: "Failed to capture PayPal payment." });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running successfully on http://localhost:${PORT}`);
});
