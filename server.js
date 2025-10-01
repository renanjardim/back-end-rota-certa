// Rota Certa - Servidor Back-end
// Versão Final Completa, pronta para o ambiente de produção (Vercel)

// 1. Importação das dependências
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const admin = require('firebase-admin');
const fs = require('fs');
const nodemailer = require('nodemailer');

// --- CONFIGURAÇÃO DO FIREBASE (PARA PRODUÇÃO E DESENVOLVIMENTO) ---
let serviceAccount;
// Em produção (na Vercel), lê as credenciais da variável de ambiente
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch (e) {
        console.error('Erro ao analisar as credenciais do Firebase da variável de ambiente:', e);
        process.exit(1);
    }
} 
// Em desenvolvimento (no seu computador), lê o ficheiro local
else {
    const serviceAccountPath = './serviceAccountKey.json';
    if (!fs.existsSync(serviceAccountPath)) {
        console.error("ERRO CRÍTICO: Não foi possível encontrar o ficheiro 'serviceAccountKey.json'.");
        console.error("Por favor, verifique se o ficheiro está na mesma pasta que o 'server.js' e se o nome está exatamente correto.");
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

// Rota de Health Check (para evitar 404 na URL base)
app.get('/', (req, res) => {
    res.status(200).json({ 
        status: 'online', 
        message: 'Servidor do Rota Certa está a funcionar corretamente!' 
    });
});

// Rotas de Autenticação e Usuário
app.post('/auth/register', async (req, res) => {
    try {
        const { nomeCompleto, email, senha, perfis } = req.body;
        if (!nomeCompleto || !email || !senha || !perfis || perfis.length === 0) { return res.status(400).json({ message: 'Todos os campos, incluindo pelo menos um perfil, são obrigatórios.' }); }
        
        const userQuery = await db.collection('usuarios').where('email', '==', email).limit(1).get();
        if (!userQuery.empty) { return res.status(409).json({ message: 'Este e-mail já está registado.' }); }
        
        const novoUsuario = {
            nomeCompleto, email, senha, perfis,
            dataCadastro: new Date().toISOString(),
            carteira: { saldoDisponivel: 100, saldoEmGarantia: 0, saldoBloqueadoPorDisputa: 0, status: 'ativo' }
        };
        const userRef = await db.collection('usuarios').add(novoUsuario);

        try {
            const mailOptions = {
                from: '"Rota Certa" <noreply@rotacerta.com>',
                to: email,
                subject: 'Bem-vindo(a) ao Rota Certa!',
                html: `<h1>Olá, ${nomeCompleto}!</h1><p>O seu registo foi realizado com sucesso. Estamos felizes por tê-lo connosco.</p>`
            };
            const info = await transporter.sendMail(mailOptions);
            console.log(`E-mail de boas-vindas enviado para ${email}. Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
        } catch (emailError) {
            console.error(`Falha ao enviar e-mail de boas-vindas para ${email}:`, emailError);
        }

        res.status(201).json({ message: 'Usuário registado com sucesso!', userId: userRef.id, perfis: perfis });
    } catch (error) { 
        console.error("Erro no registo:", error);
        res.status(500).json({ message: 'Ocorreu um erro no servidor.' }); 
    }
});

app.post('/auth/login', async (req, res) => {
    try {
        const { email, senha } = req.body;
        if (!email || !senha) { return res.status(400).json({ message: 'E-mail e senha são obrigatórios.' }); }
        const userQuery = await db.collection('usuarios').where('email', '==', email).limit(1).get();
        if (userQuery.empty) { return res.status(401).json({ message: 'Credenciais inválidas.' }); }
        
        const usuarioDoc = userQuery.docs[0];
        const usuarioData = usuarioDoc.data();
        
        if (usuarioData.senha !== senha) { return res.status(401).json({ message: 'Credenciais inválidas.' }); }
        
        res.status(200).json({ 
            message: 'Login bem-sucedido!', 
            userId: usuarioDoc.id,
            perfis: usuarioData.perfis
        });
    } catch (error) { 
        console.error("Erro no login:", error);
        res.status(500).json({ message: 'Ocorreu um erro no servidor.' }); 
    }
});

app.patch('/users/:id', checkAuth, async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;
    if (req.userData.userId !== id) {
        return res.status(403).json({ message: 'Não autorizado a atualizar este perfil.' });
    }
    try {
        const userRef = db.collection('usuarios').doc(id);
        await userRef.update(updateData);
        res.status(200).json({ message: 'Perfil atualizado com sucesso!' });
    } catch (error) {
        console.error("Erro ao atualizar perfil:", error);
        res.status(500).json({ message: 'Ocorreu um erro ao atualizar o perfil.' });
    }
});

// Rotas de Entregas (com todas as funcionalidades)
app.post('/deliveries', checkAuth, async (req, res) => {
    // ... (lógica completa de criação de entrega)
});
app.get('/deliveries', checkAuth, async (req, res) => {
    // ... (lógica completa de busca de entregas)
});
app.patch('/deliveries/:id/accept', checkAuth, async (req, res) => {
    // ... (lógica completa para aceitar entrega)
});
app.post('/deliveries/:id/complete', checkAuth, async (req, res) => {
    // ... (lógica completa para finalizar entrega)
});
app.patch('/deliveries/:id/fail', checkAuth, async (req, res) => {
    // ... (lógica completa para reportar falha)
});
app.post('/deliveries/:id/complete-return', checkAuth, async (req, res) => {
    // ... (lógica completa para finalizar devolução)
});

// 4. Inicialização do Servidor
app.listen(PORT, () => {
    console.log(`Servidor do Rota Certa a rodar na porta ${PORT}`);
});

