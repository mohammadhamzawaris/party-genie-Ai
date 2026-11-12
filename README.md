#  PartyGenie AI

PartyGenie AI is an AI-powered party planner that helps users generate a shopping list based on their budget and theme, and allows them to pay seamlessly using PayPal.

##  How it Works
1. User enters party details (e.g., 10 people, $150 budget, Neon theme).
2. **Gemini AI** analyzes the input and generates a structured shopping list with prices.
3. User can then click the **PayPal Checkout** button to complete the payment.

##  Tech Stack
* **Frontend:** HTML, CSS, JavaScript
* **Backend:** Node.js, Express.js
* **AI Model:** Google Gemini API (`@google/genai`)
* **Payment Gateway:** PayPal REST API (Sandbox)

##  How to Run Locally
1. Clone the repository.
2. Run `npm install` to install dependencies.
3. Create a `.env` file and add your `GEMINI_API_KEY`, `PAYPAL_CLIENT_ID`, and `PAYPAL_CLIENT_SECRET`.
4. Run `node server.js`.
5. Open `http://localhost:3000` in your browser.
