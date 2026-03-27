# ShopEase 🛒
A full-stack e-commerce web application built with Node.js, Express, MySQL, and vanilla HTML/CSS/JavaScript.
---

## 🖥️ Live Demo
> Deploy link here (add after deploying on Railway.app).
---

## ✨ Features

### Customer
- Register and login securely
- Browse products with search and category filters
- Add products to cart / Buy Now (skip cart)
- Update quantity or remove items from cart
- Place orders and view order history
- Pay online via Razorpay (test mode)

### Admin
- All customer features
- Add new products to inventory
- Delete products from inventory
- View all orders and update order status

---

## 🛠️ Tech Stack 

|      Layer     |               Technology               |
|----------------|----------------------------------------|
|     Backend    |           Node.js, Express.js          |
|    Database    |                  MySQL                 |
| Authentication |      JWT (JSON Web Tokens), bcrypt     |
|    Payments    |                 Razorpay               |
|    Frontend    |     HTML, CSS, JavaScript (Vanilla)    |

---

## 📁 Project Structure

```
ecommerce-backend/
├── server.js              # Entry point
├── db.js                  # MySQL connection
├── .env                   # Environment variables (not pushed to GitHub)
├── database.sql           # Database schema + sample data
├── middleware/
│   └── auth.js            # JWT authentication & admin authorization
└── routes/
    ├── auth.js            # Register, Login
    ├── categories.js      # Product categories & subcategories
    ├── products.js        # Product management
    ├── cart.js            # Shopping cart
    ├── orders.js          # Order placement & history
    └── payments.js        # Razorpay payment integration

ecommerce-frontend/
├── login.html             # Login page
├── register.html          # Register page
├── products.html          # Product listing + admin controls
├── cart.html              # Shopping cart
└── orders.html            # Order history + payments
```

---

## ⚙️ Setup & Installation

### Prerequisites
- Node.js (v16 or above)
- MySQL
- Razorpay account (test mode)

### 1. Clone the repository
```bash
git clone https://github.com/dhruv-rathi-tech/ecommerce_web.git
cd ecommerce_web
```

### 2. Install dependencies
```bash
cd ecommerce-backend
npm install
```

### 3. Set up the database
- Open MySQL Workbench
- Run `database.sql` to create all tables and insert sample data

### 4. Configure environment variables
Create a `.env` file in the `ecommerce-backend` folder:

### 5. Start the backend server
```bash
npm run dev
```

Server runs at `http://localhost:3000`

### 6. Open the frontend
Open `login.html` directly in your browser.

---

## 🔑 Default Admin Account
```
Email    : admin@shop.com
Password : password
```

---

## 📡 API Endpoints

### Auth
| Method |     Endpoint    |          Description         |
|--------|-----------------|------------------------------|
|  POST  |  /auth/register |      Create new account      |
|  POST  |   /auth/login   |    Login, returns JWT token  |
|  GET   |    /auth/me     |  Get logged-in user profile  |

### Products
|  Method |          Endpoint         |           Description         |
|---------|---------------------------|-------------------------------|
|   GET   |         /products         |       Get all products        |
|   GET   |   /products?search=phone  |       Search products         |
|   GET   |    /products?category=3   |       Filter by category      |
|   GET   |       /products/:id       |       Get single product      |
|   POST  |         /products         |    Add product (admin only)   | 
|   PUT   |       /products/:id       |  Update product (admin only)  |
|  DELETE |       /products/:id       |  Delete product (admin only)  |

### Cart
| Method |     Endpoint     |      Description     |
|--------|------------------|----------------------|
|   GET  |       /cart      |       View cart      |
|  POST  |     /cart/add    |    Add item to cart  |
|   PUT  |   /cart/update   | Update item quantity |
| DELETE | /cart/remove/:id |      Remove item     |
| DELETE |    /cart/clear   |   Clear entire cart  |

### Orders
| Method |       Endpoint     |             Description          |
|--------|--------------------|----------------------------------|
|  POST  |  /orders/checkout  |       Place order from cart      |
|  POST  |   /orders/buy-now  |    Buy single product directly   |
|  GET   |     /orders/my     |           Get my orders          |
|  GET   |     /orders/:id    |          Get single order        |    
|  PUT   | /orders/:id/status | Update order status (admin only) |

### Payments
| Method |     Endpoint     |           Description           |
|--------|------------------|---------------------------------|
|  POST  | /payments/create |     Create Razorpay payment     |
|  POST  | /payments/verify | Verify payment after completion |

---

## 🔒 Authentication

- Passwords are hashed using **bcrypt** before storing in the database
- On login, a **JWT token** is returned and stored in localStorage
- Protected routes require the token in the `Authorization` header:
  ```
  Authorization: Bearer <token>
  ```
- Admin-only routes additionally check if `user.role === 'admin'`

---

## 💳 Test Payments

Use these fake card details in the Razorpay popup:

```
Card Number : 5267 3181 8797 5449
Expiry      : 12/26
CVV         : 123
OTP         : 1234
```

---

## 🚀 Deployment
This project can be deployed for free using:
- **Backend + Database** → [Railway.app](https://railway.app)
- **Frontend** → [Netlify](https://netlify.com) or [Vercel](https://vercel.com)

---

## 👤 Author

**Dhruv Rathi**
- GitHub: [@dhruv-rathi-tech](https://github.com/dhruv-rathi-tech)
- LinkedIn: [your-linkedin](https://www.linkedin.com/in/dhruv-rathi-31dr)

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
