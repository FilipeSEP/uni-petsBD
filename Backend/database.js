const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Caminho do banco de dados
const dbPath = path.join(__dirname, 'unipets.db');

// Conecta ao banco (cria se não existir)
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Erro ao conectar ao banco:', err.message);
    } else {
        console.log('✅ Conectado ao SQLite');
    }
});

// Cria as tabelas
db.serialize(() => {
    // Tabela de usuários
    db.run(`
        CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            senha TEXT NOT NULL,
            data_cadastro DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Tabela de produtos
    db.run(`
        CREATE TABLE IF NOT EXISTS produtos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            descricao TEXT,
            preco REAL NOT NULL,
            imagem TEXT,
            categoria TEXT,
            estoque INTEGER DEFAULT 10,
            destaque INTEGER DEFAULT 0
        )
    `);

    // Tabela de pedidos
    db.run(`
        CREATE TABLE IF NOT EXISTS pedidos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario_id INTEGER,
            total REAL,
            status TEXT DEFAULT 'pendente',
            endereco TEXT,
            data_pedido DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        )
    `);

    // Tabela de itens do pedido
    db.run(`
        CREATE TABLE IF NOT EXISTS itens_pedido (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pedido_id INTEGER,
            produto_id INTEGER,
            quantidade INTEGER,
            preco_unitario REAL,
            FOREIGN KEY (pedido_id) REFERENCES pedidos(id),
            FOREIGN KEY (produto_id) REFERENCES produtos(id)
        )
    `);

    // Insere produtos de exemplo (se a tabela estiver vazia)
    db.get('SELECT COUNT(*) as total FROM produtos', [], (err, row) => {
        if (err) {
            console.error('Erro ao verificar produtos:', err);
            return;
        }
        
        if (row.total === 0) {
            const produtos = [
                ['Ração para Cães Adultos - 10kg', 'Ração premium para cães adultos', 149.99, 'caoadulto.png', 'caes', 20, 1],
                ['Ração para Cães Filhotes - 10kg', 'Ração especial para filhotes', 109.99, 'caofilhote.png', 'caes', 15, 1],
                ['Ração para Gatos Adultos - 10kg', 'Ração completa para gatos', 169.99, 'gatoadulto.png', 'gatos', 18, 1],
                ['Ração para Gatos Filhotes - 10kg', 'Ração para gatinhos em crescimento', 119.99, 'gatof.png', 'gatos', 12, 1],
                ['Cama cinza - TAM EGG', 'Cama super confortável', 329.99, 'EGG.jpg', 'acessorios', 8, 1],
                ['Cama Nuvem Brigadeiro - TAM M', 'Cama macia e fofinha', 129.99, 'camanuvem.jpg', 'acessorios', 10, 1],
                ['Kit guia e coleira vermelha', 'Kit completo para passeios', 66.99, 'guia.jpg', 'acessorios', 25, 0],
                ['Sanitário de luxo para Cães machos', 'Sanitário prático e higiênico', 209.99, 'sanitario.jpg', 'acessorios', 5, 0]
            ];

            const stmt = db.prepare(`
                INSERT INTO produtos (nome, descricao, preco, imagem, categoria, estoque, destaque) 
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);
            
            produtos.forEach(prod => {
                stmt.run(prod);
            });
            
            stmt.finalize();
            console.log('✅ Produtos de exemplo inseridos');
        }
    });
});

module.exports = db;