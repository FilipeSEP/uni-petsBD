const express = require('express');
const cors = require('cors');
const db = require('./database');

const app = express();
const port = 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// ========== ROTAS DE PRODUTOS ==========

// Listar todos os produtos
app.get('/api/produtos', (req, res) => {
    const { categoria, destaque } = req.query;
    let sql = 'SELECT * FROM produtos WHERE 1=1';
    const params = [];
    
    if (categoria) {
        sql += ' AND categoria = ?';
        params.push(categoria);
    }
    
    if (destaque === '1') {
        sql += ' AND destaque = 1';
    }
    
    db.all(sql, params, (err, rows) => {
        if (err) {
            res.status(500).json({ erro: err.message });
            return;
        }
        res.json(rows);
    });
});

// Buscar produto por ID
app.get('/api/produtos/:id', (req, res) => {
    const { id } = req.params;
    db.get('SELECT * FROM produtos WHERE id = ?', [id], (err, row) => {
        if (err) {
            res.status(500).json({ erro: err.message });
            return;
        }
        if (!row) {
            res.status(404).json({ erro: 'Produto não encontrado' });
            return;
        }
        res.json(row);
    });
});

// ========== ROTAS DE USUÁRIOS ==========

// Criar usuário (cadastro)
app.post('/api/usuarios', (req, res) => {
    const { nome, email, senha } = req.body;
    
    if (!nome || !email || !senha) {
        res.status(400).json({ erro: 'Nome, email e senha são obrigatórios' });
        return;
    }
    
    db.run(
        'INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)',
        [nome, email, senha],
        function(err) {
            if (err) {
                if (err.message.includes('UNIQUE')) {
                    res.status(400).json({ erro: 'Email já cadastrado' });
                } else {
                    res.status(500).json({ erro: err.message });
                }
                return;
            }
            res.json({ id: this.lastID, nome, email });
        }
    );
});

// Login
app.post('/api/login', (req, res) => {
    const { email, senha } = req.body;
    
    db.get(
        'SELECT id, nome, email FROM usuarios WHERE email = ? AND senha = ?',
        [email, senha],
        (err, row) => {
            if (err) {
                res.status(500).json({ erro: err.message });
                return;
            }
            if (!row) {
                res.status(401).json({ erro: 'Email ou senha incorretos' });
                return;
            }
            res.json(row);
        }
    );
});

// ========== ROTAS DE PEDIDOS ==========

// Criar novo pedido
app.post('/api/pedidos', (req, res) => {
    const { usuario_id, itens, total, endereco } = req.body;
    
    if (!usuario_id || !itens || itens.length === 0) {
        res.status(400).json({ erro: 'Dados incompletos' });
        return;
    }
    
    // Inicia uma transação
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        // Insere o pedido
        db.run(
            'INSERT INTO pedidos (usuario_id, total, endereco) VALUES (?, ?, ?)',
            [usuario_id, total, endereco],
            function(err) {
                if (err) {
                    db.run('ROLLBACK');
                    res.status(500).json({ erro: err.message });
                    return;
                }
                
                const pedidoId = this.lastID;
                let itensInseridos = 0;
                
                // Insere cada item
                itens.forEach(item => {
                    db.run(
                        'INSERT INTO itens_pedido (pedido_id, produto_id, quantidade, preco_unitario) VALUES (?, ?, ?, ?)',
                        [pedidoId, item.produto_id, item.quantidade, item.preco],
                        (err) => {
                            if (err) {
                                db.run('ROLLBACK');
                                res.status(500).json({ erro: err.message });
                                return;
                            }
                            itensInseridos++;
                            
                            if (itensInseridos === itens.length) {
                                db.run('COMMIT');
                                res.json({ 
                                    pedido_id: pedidoId, 
                                    mensagem: 'Pedido criado com sucesso' 
                                });
                            }
                        }
                    );
                });
            }
        );
    });
});

// ========== ROTAS DE FRETE ==========

app.post('/api/calcular-frete', (req, res) => {
    const { cep, subtotal } = req.body;
    
    // Simulação de cálculo de frete
    const opcoes = [
        { nome: 'Entrega Econômica', preco: 15.90, dias: '7-10' },
        { nome: 'Entrega Padrão', preco: 24.90, dias: '3-5' },
        { nome: 'Entrega Expressa', preco: 39.90, dias: '1-2' }
    ];
    
    // Frete grátis para compras acima de R$ 200
    if (subtotal > 200) {
        opcoes.unshift({ nome: 'Entrega Grátis', preco: 0, dias: '5-7' });
    }
    
    res.json(opcoes);
});

// ========== INICIA O SERVIDOR ==========

app.listen(port, () => {
    console.log(`
    🚀 Servidor UNIPETS rodando!
    📡 http://localhost:${port}
    📦 Banco de dados: SQLite
    `);
});