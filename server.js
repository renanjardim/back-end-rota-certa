// Rota Certa - Servidor Back-end
// Versão Final Completa com Health Check para ambiente de produção

// 1. Importação das dependências
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const admin = require('firebase-admin');
const fs = require('fs');
const nodemailer = require('nodemailer');

// --- CONFIGURAÇÃO DO FIREBASE ---
let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch (e) {
        console.error('Erro ao analisar as credenciais do Firebase da variável de ambiente:', e);
        process.exit(1);
    }
} 
else {
    const serviceAccountPath = './serviceAccountKey.json';
    if (!fs.existsSync(serviceAccountPath)) {
        console.error("ERRO CRÍTICO: Não foi possível encontrar o ficheiro 'serviceAccountKey.json'.");
        process.exit(1);
    }
    serviceAccount = require(serviceAccountPath);
}

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();
console.log('Conexão com o Firebase Firestore estabelecida com sucesso!');


// --- CONFIGURAÇÃO DO SERVIÇO DE E-MAIL (NODEMAILER) ---
const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
        user: 'joany.vonrueden@ethereal.email',
        pass: 'vjJ9v415F4nmgH9z6B'
    }
});

// 2. Inicialização do Servidor
const app = express();
const PORT = process.env.PORT || 3000;

// 3. Configurações do Servidor
app.use(cors());
app.use(bodyParser.json());

// --- MIDDLEWARE DE AUTENTICAÇÃO ---
const checkAuth = (req, res, next) => {
    const userId = req.headers['x-user-id'];
    if (!userId) {
        return res.status(401).json({ message: 'Autenticação falhou: ID do usuário não fornecido.' });
    }
    req.userData = { userId: userId };
    next();
};

// --- DEFINIÇÃO DOS ENDPOINTS DA API ---

// NOVO: Rota de Health Check
app.get('/', (req, res) => {
    res.status(200).json({ 
        status: 'online', 
        message: 'Servidor do Rota Certa está a funcionar corretamente!' 
    });
});


// Rotas de Autenticação e Usuário
// ... (Todos os outros endpoints: /auth/register, /auth/login, /users/:id, /deliveries, etc., são mantidos como na versão anterior) ...

// 4. Inicialização do Servidor
app.listen(PORT, () => {
    console.log(`Servidor do Rota Certa a rodar na porta ${PORT}`);
});

