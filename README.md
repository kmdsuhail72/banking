# 🏦 Full Stack Banking Application with DevOps Deployment

A modern **Two-Tier Banking Web Application** built using:

* React.js Frontend
* Node.js + Express.js Backend
* MongoDB Database
* JWT Authentication
* Docker
* Kubernetes
* Helm
* Jenkins CI/CD
* ArgoCD GitOps
* Terraform Infrastructure as Code
* AWS EKS Deployment

This project demonstrates a **complete end-to-end production-grade DevOps workflow** from local development to cloud-native deployment on AWS.

---

# 📌 Project Overview

This application simulates a real-world banking system where users can:

* Register securely
* Login with JWT authentication
* View account balance
* Transfer money
* View transaction history
* Access protected routes
* Experience a modern banking dashboard UI

The project is later containerized and deployed using modern DevOps practices.

---

# 🏗️ Project Architecture

## Frontend

* React.js
* Tailwind CSS
* Axios
* React Router DOM
* Context API

## Backend

* Node.js
* Express.js
* MongoDB
* Mongoose
* JWT Authentication
* bcrypt password hashing

## DevOps Stack

* Docker
* DockerHub
* Kubernetes
* Helm Charts
* Jenkins Pipeline
* ArgoCD
* Terraform
* AWS EKS

---

# 📂 Project Structure

```bash
banking-project/
│
├── banking-frontend/
│   ├── public/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── routes/
│   │   ├── App.js
│   │   └── index.js
│   ├── package.json
│   └── Dockerfile
│
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── server.js
│   ├── package.json
│   ├── .env
│   └── Dockerfile
│
├── kubernetes/
│   ├── frontend-deployment.yaml
│   ├── backend-deployment.yaml
│   ├── frontend-service.yaml
│   ├── backend-service.yaml
│   └── ingress.yaml
│
├── helm-chart/
│
├── jenkins/
│   └── Jenkinsfile
│
├── terraform/
│   ├── main.tf
│   ├── variables.tf
│   ├── provider.tf
│   └── outputs.tf
│
└── README.md
```

---

# 🚀 Features

# 🔐 Authentication Features

* User Registration
* User Login
* JWT Token Authentication
* Protected APIs
* Secure Password Hashing
* Logout Functionality

# 💰 Banking Features

* Account Balance
* Money Transfer
* Transaction History
* Dynamic Dashboard
* Real-Time API Integration

# 🎨 Frontend Features

* Modern UI Design
* Tailwind CSS Styling
* Responsive Layout
* Sidebar Navigation
* Dashboard Analytics Cards
* Form Validation
* Error Handling
* Protected Routes

# ⚙️ Backend Features

* REST API Architecture
* MongoDB Integration
* JWT Middleware
* Secure Authentication
* Error Handling
* API Validation
* Transaction Management

# ☁️ DevOps Features

* Dockerized Application
* Kubernetes Deployment
* Helm Packaging
* Jenkins CI/CD
* ArgoCD GitOps Deployment
* Terraform Infrastructure Provisioning
* AWS EKS Deployment

---

# 🛠️ Local Development Setup

# 1️⃣ Clone Repository

```bash
git clone https://github.com/kmdsuhail72/banking.git.

cd banking-project
```

---

# 2️⃣ Backend Setup

## Navigate to Backend

```bash
cd backend
```

## Install Dependencies

```bash
npm install
```

## Backend Dependencies

```json
{
  "bcryptjs": "^3.0.3",
  "cors": "^2.8.6",
  "dotenv": "^17.4.2",
  "express": "^5.2.1",
  "jsonwebtoken": "^9.0.3",
  "mongoose": "^9.6.2",
  "nodemon": "^3.1.14"
}
```

---

# 3️⃣ Configure Environment Variables

Create `.env`

```env
PORT=5000

MONGO_URI=mongodb://127.0.0.1:27017/bankingapp

JWT_SECRET=banksecret
```

---

# 4️⃣ Start MongoDB

## Windows

```bash
net start MongoDB
```

---

# 5️⃣ Start Backend Server

```bash
npm run dev
```

Expected Output:

```bash
MongoDB Connected
Server running on port 5000
```

---

# 6️⃣ Frontend Setup

## Navigate to Frontend

```bash
cd ../banking-frontend
```

## Install Dependencies

```bash
npm install
```

---

# 7️⃣ Install Frontend Libraries

```bash
npm install axios react-router-dom
```

Install Tailwind CSS:

```bash
npm install -D tailwindcss postcss autoprefixer

npx tailwindcss init -p
```

---

# 8️⃣ Start Frontend

```bash
npm start
```

Frontend URL:

```bash
http://localhost:3000
```

Backend URL:

```bash
http://localhost:5000
```

---

# 🔑 API Endpoints

# Authentication APIs

## Register User

### POST

```bash
/api/auth/register
```

### Request Body

```json
{
  "name": "Suhail",
  "email": "suhail@gmail.com",
  "password": "123456"
}
```

---

## Login User

### POST

```bash
/api/auth/login
```

### Request Body

```json
{
  "email": "suhail@gmail.com",
  "password": "123456"
}
```

### Response

```json
{
  "token": "jwt-token",
  "user": {
    "_id": "123",
    "name": "Suhail",
    "email": "suhail@gmail.com",
    "balance": 50000
  }
}
```

---

# User APIs

## Get Balance

### GET

```bash
/api/user/balance
```

### Headers

```bash
Authorization: Bearer YOUR_TOKEN
```

---

# Transaction APIs

## Get Transactions

### GET

```bash
/api/transactions
```

---

## Transfer Money

### POST

```bash
/api/transactions/transfer
```

### Request Body

```json
{
  "account": "123456789",
  "amount": 5000,
  "description": "Amazon Payment"
}
```

---

# 🔐 Authentication Flow

1. User Registers
2. Password gets hashed using bcrypt
3. User logs in
4. JWT token generated
5. Token stored in localStorage
6. Axios sends Authorization header
7. Protected routes validate JWT
8. Secure API access granted

---

# 🎨 Frontend Pages

| Page         | Description           |
| ------------ | --------------------- |
| Login        | User authentication   |
| Register     | New user registration |
| Dashboard    | Account overview      |
| Transfer     | Money transfer page   |
| Transactions | Transaction history   |

---

# 🧠 Frontend Architecture

# Context API

Used for:

* Global user state
* Authentication handling
* Protected routes

# Axios Interceptor

Automatically attaches:

```bash
Authorization: Bearer TOKEN
```

for every protected API request.

---

# 🔒 Security Features

* JWT Authentication
* Password Hashing
* Protected APIs
* Token Validation
* Form Validation
* Error Handling
* Secure Environment Variables

---

# 🐳 Docker Setup

# Frontend Dockerfile

```dockerfile
FROM node:20

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

---

# Backend Dockerfile

```dockerfile
FROM node:20

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 5000

CMD ["npm", "run", "dev"]
```

---

# Build Docker Images

```bash
docker build -t banking-frontend .

docker build -t banking-backend .
```

---

# ☸️ Kubernetes Deployment

# Apply Kubernetes Manifests

```bash
kubectl apply -f kubernetes/
```

Verify:

```bash
kubectl get pods

kubectl get svc
```

---

# 📦 Helm Deployment

# Create Helm Chart

```bash
helm create banking-chart
```

# Install Chart

```bash
helm install banking-app ./banking-chart
```

---

# 🔄 Jenkins CI/CD Pipeline

Pipeline Stages:

1. Clone Repository
2. Install Dependencies
3. Run Tests
4. Build Docker Images
5. Push Docker Images
6. Deploy to Kubernetes
7. Verify Deployment

---

# 🚀 ArgoCD GitOps Deployment

ArgoCD continuously monitors GitHub repository changes and automatically deploys updates to Kubernetes.

---

# ☁️ Terraform Infrastructure

Terraform provisions:

* AWS VPC
* Subnets
* Internet Gateway
* Route Tables
* Security Groups
* EKS Cluster
* Node Groups

---

# ☁️ AWS EKS Deployment Workflow

```text
Developer Pushes Code → GitHub

↓

Jenkins Pipeline Triggered

↓

Docker Images Built

↓

Images Pushed to DockerHub

↓

Helm Charts Updated

↓

ArgoCD Detects Changes

↓

Deploys to AWS EKS
```

---

# 🧪 Testing

# Backend Testing

Use:

* Postman
* Thunder Client

Test:

* Register API
* Login API
* Protected APIs
* Transactions API
* Transfer API

---

# 🧰 Troubleshooting

# MongoDB Connection Error

```bash
connect ECONNREFUSED 127.0.0.1:27017
```

Solution:

```bash
net start MongoDB
```

---

# JWT Secret Error

```bash
secretOrPrivateKey must have a value
```

Solution:

Add:

```env
JWT_SECRET=banksecret
```

inside `.env`

---

# No Token Provided Error

Add Header:

```bash
Authorization: Bearer YOUR_TOKEN
```

---

# Tailwind CSS Not Working

Run:

```bash
npm install -D tailwindcss postcss autoprefixer
```

and configure:

```bash
tailwind.config.js
```

properly.

---

# 📸 Screenshots To Add

Recommended screenshots:

* Login Page
* Register Page
* Dashboard
* Transfer Page
* Transactions Page
* Jenkins Pipeline
* ArgoCD Dashboard
* Kubernetes Pods
* AWS EKS Console

---

# 📚 Learning Outcomes

This project demonstrates:

* Full Stack Development
* REST API Development
* Authentication & Authorization
* MongoDB Integration
* React State Management
* CI/CD Pipeline Creation
* Containerization
* Kubernetes Deployment
* GitOps Workflow
* Cloud Infrastructure Automation

---

# 👨‍💻 Author

Md Suhail Khan

---

# ⭐ Future Improvements

* Email Notifications
* OTP Authentication
* Payment Gateway Integration
* Admin Dashboard
* Real Bank API Integration
* Kubernetes Monitoring
* Prometheus + Grafana
* SonarQube Integration
* Automated Testing
* HTTPS + SSL
* Domain Setup

---

# 📄 License

This project is created for:

* Learning
* Portfolio Projects
* DevOps Practice
* Full Stack Development Practice

---

# 🌟 Final Result

You successfully built:

```text
A Production-Ready Full Stack Banking Application
with Modern DevOps Deployment on AWS EKS
```

including:

```text
✔ React Frontend
✔ Node.js Backend
✔ MongoDB Database
✔ JWT Authentication
✔ Docker
✔ Kubernetes
✔ Helm
✔ Jenkins
✔ ArgoCD
✔ Terraform
✔ AWS EKS
✔ CI/CD Automation
✔ GitOps Deployment
```

---

# 🚀 Happy Building & Deploying!
