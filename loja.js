// ========== CONFIGURAÇÃO ==========
// Altere esta URL para o endereço do seu backend
// Se estiver rodando localmente: http://localhost:3000/api
// Se for no servidor do colega: http://IP_DO_COLEGA:3000/api
const API_URL = 'http://localhost:3000/api';

// Estado global
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
let selectedShipping = null;
let checkoutData = {
    address: null,
    shipping: null,
    payment: null
};

// ========== ELEMENTOS DO DOM ==========
const cartIcon = document.getElementById('cart-icon');
const cartCounter = document.getElementById('cart-counter');
let cartModal, loginModal, registerModal;

// ========== INICIALIZAÇÃO ==========
document.addEventListener('DOMContentLoaded', async () => {
    initializeModals();
    await carregarProdutos();
    updateCartCounter();
    updateUserInterface();
    setupEventListeners();
    setupCheckoutButton();
});

// ========== MODAIS ==========
function initializeModals() {
    // Modal do Carrinho
    cartModal = document.getElementById('cart-modal');
    if (!cartModal) {
        cartModal = document.createElement('div');
        cartModal.id = 'cart-modal';
        cartModal.className = 'modal cart-modal';
        cartModal.innerHTML = `
            <div class="modal-content">
                <span class="close-cart">&times;</span>
                <h2>Seu Carrinho</h2>
                <div id="cart-items"></div>
                <div class="cart-total">
                    <strong>Total:</strong> R$ <span id="cart-total">0,00</span>
                </div>
                <button id="checkout-btn" class="btn-primary">Finalizar Compra</button>
            </div>
        `;
        document.body.appendChild(cartModal);
    }

    // Modal de Login
    loginModal = document.getElementById('login-modal');
    if (!loginModal) {
        loginModal = document.createElement('div');
        loginModal.id = 'login-modal';
        loginModal.className = 'modal';
        loginModal.innerHTML = `
            <div class="modal-content">
                <span class="close">&times;</span>
                <h2>Login</h2>
                <form id="login-form">
                    <div class="form-group">
                        <label>Email:</label>
                        <input type="email" id="login-email" required>
                    </div>
                    <div class="form-group">
                        <label>Senha:</label>
                        <input type="password" id="login-password" required>
                    </div>
                    <button type="submit" class="btn-primary">Entrar</button>
                </form>
                <p style="text-align: center; margin-top: 15px;">
                    Não tem conta? <a href="#" id="show-register-link">Cadastre-se</a>
                </p>
            </div>
        `;
        document.body.appendChild(loginModal);
    }

    // Modal de Cadastro
    registerModal = document.getElementById('register-modal');
    if (!registerModal) {
        registerModal = document.createElement('div');
        registerModal.id = 'register-modal';
        registerModal.className = 'modal';
        registerModal.innerHTML = `
            <div class="modal-content">
                <span class="close">&times;</span>
                <h2>Criar Conta</h2>
                <form id="register-form">
                    <div class="form-group">
                        <label>Nome:</label>
                        <input type="text" id="reg-name" required>
                    </div>
                    <div class="form-group">
                        <label>Email:</label>
                        <input type="email" id="reg-email" required>
                    </div>
                    <div class="form-group">
                        <label>Senha:</label>
                        <input type="password" id="reg-password" required>
                    </div>
                    <button type="submit" class="btn-primary">Cadastrar</button>
                </form>
            </div>
        `;
        document.body.appendChild(registerModal);
    }
}

// ========== FUNÇÕES DA API ==========

// Carregar produtos do backend
async function carregarProdutos() {
    try {
        const container = document.querySelector('.box-container');
        if (container) {
            container.innerHTML = '<div class="loading">Carregando produtos...</div>';
        }
        
        const resposta = await fetch(`${API_URL}/produtos`);
        
        if (!resposta.ok) {
            throw new Error('Erro ao carregar produtos');
        }
        
        const produtos = await resposta.json();
        
        // Renderiza os produtos
        if (container) {
            if (produtos.length === 0) {
                container.innerHTML = '<div class="loading">Nenhum produto encontrado</div>';
            } else {
                container.innerHTML = produtos.map(produto => `
                    <article class="box" data-product-id="${produto.id}">
                        <img width="250" src="https://filipesep.github.io/loja-pet/img/${produto.imagem || 'placeholder.jpg'}" 
                             alt="${produto.nome}"
                             onerror="this.src='https://via.placeholder.com/250x200/ff6b6b/ffffff?text=UNIPETS'">
                        <h3>${produto.nome}</h3>
                        <div class="price">R$ ${produto.preco.toFixed(2)}</div>
                        <button class="btn add-to-cart" 
                                data-product-id="${produto.id}"
                                data-product="${produto.nome}" 
                                data-price="${produto.preco}">
                            Adicionar ao Carrinho
                        </button>
                    </article>
                `).join('');
            }
        }
        
        atribuirEventosProdutos();
        return produtos;
        
    } catch (erro) {
        console.error('Erro ao carregar produtos:', erro);
        const container = document.querySelector('.box-container');
        if (container) {
            container.innerHTML = '<div class="loading">Erro ao carregar produtos. Verifique se o servidor está rodando.</div>';
        }
        return [];
    }
}

// Login
async function fazerLogin(email, senha) {
    try {
        const resposta = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, senha })
        });
        
        if (!resposta.ok) {
            const erro = await resposta.json();
            alert(erro.erro || 'Erro no login');
            return false;
        }
        
        const usuario = await resposta.json();
        currentUser = usuario;
        localStorage.setItem('currentUser', JSON.stringify(usuario));
        updateUserInterface();
        hideLoginModal();
        showNotification(`Bem-vindo, ${usuario.nome}!`);
        return true;
        
    } catch (erro) {
        console.error('Erro no login:', erro);
        alert('Erro de conexão com o servidor');
        return false;
    }
}

// Cadastro
async function cadastrarUsuario(nome, email, senha) {
    try {
        const resposta = await fetch(`${API_URL}/usuarios`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, email, senha })
        });
        
        if (!resposta.ok) {
            const erro = await resposta.json();
            alert(erro.erro || 'Erro no cadastro');
            return false;
        }
        
        const usuario = await resposta.json();
        alert('Cadastro realizado com sucesso! Faça login.');
        hideRegisterModal();
        showLoginModal();
        return true;
        
    } catch (erro) {
        console.error('Erro no cadastro:', erro);
        alert('Erro de conexão com o servidor');
        return false;
    }
}

// Calcular frete
async function calcularFreteAPI(cep, subtotal) {
    try {
        const resposta = await fetch(`${API_URL}/calcular-frete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cep, subtotal })
        });
        
        const opcoes = await resposta.json();
        return opcoes;
        
    } catch (erro) {
        console.error('Erro ao calcular frete:', erro);
        return [
            { nome: 'Entrega Econômica', preco: 15.90, dias: '7-10' },
            { nome: 'Entrega Padrão', preco: 24.90, dias: '3-5' },
            { nome: 'Entrega Expressa', preco: 39.90, dias: '1-2' }
        ];
    }
}

// Finalizar pedido
async function finalizarPedidoAPI(itens, total, endereco) {
    if (!currentUser) {
        alert('Faça login para finalizar a compra');
        return false;
    }
    
    try {
        const resposta = await fetch(`${API_URL}/pedidos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                usuario_id: currentUser.id,
                itens: itens,
                total: total,
                endereco: endereco
            })
        });
        
        if (!resposta.ok) {
            const erro = await resposta.json();
            alert(erro.erro || 'Erro ao finalizar pedido');
            return false;
        }
        
        const resultado = await resposta.json();
        return resultado;
        
    } catch (erro) {
        console.error('Erro ao finalizar pedido:', erro);
        alert('Erro de conexão com o servidor');
        return false;
    }
}

// ========== SISTEMA DE CARRINHO ==========

function addToCart(productId, productName, productPrice) {
    const existingItem = cart.find(item => item.id === productId);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: productId,
            name: productName,
            price: productPrice,
            quantity: 1
        });
    }
    
    updateCartCounter();
    saveCart();
    showNotification(`${productName} adicionado ao carrinho!`);
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    updateCartCounter();
    updateCartModal();
    saveCart();
}

function updateQuantity(productId, change) {
    const item = cart.find(item => item.id === productId);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            removeFromCart(productId);
        } else {
            updateCartCounter();
            updateCartModal();
            saveCart();
        }
    }
}

function updateCartCounter() {
    if (cartCounter) {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        cartCounter.textContent = totalItems;
    }
}

function updateCartModal() {
    const cartItemsDiv = document.getElementById('cart-items');
    const cartTotalSpan = document.getElementById('cart-total');
    
    if (!cartItemsDiv) return;
    
    if (cart.length === 0) {
        cartItemsDiv.innerHTML = '<p style="text-align: center;">Seu carrinho está vazio</p>';
        if (cartTotalSpan) cartTotalSpan.textContent = '0,00';
        return;
    }
    
    let total = 0;
    cartItemsDiv.innerHTML = cart.map(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        
        return `
            <div class="cart-item">
                <div class="cart-item-info">
                    <h4>${item.name}</h4>
                    <p>R$ ${item.price.toFixed(2)}</p>
                </div>
                <div class="cart-item-actions">
                    <button class="quantity-btn" onclick="updateQuantity('${item.id}', -1)">-</button>
                    <span>${item.quantity}</span>
                    <button class="quantity-btn" onclick="updateQuantity('${item.id}', 1)">+</button>
                    <button onclick="removeFromCart('${item.id}')" style="background: none; border: none; cursor: pointer; color: red;">🗑️</button>
                </div>
            </div>
        `;
    }).join('');
    
    if (cartTotalSpan) cartTotalSpan.textContent = total.toFixed(2);
}

function toggleCart() {
    if (!cartModal) return;
    
    if (cartModal.style.display === 'block') {
        cartModal.style.display = 'none';
    } else {
        updateCartModal();
        cartModal.style.display = 'block';
    }
}

function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
}

// ========== CHECKOUT ==========

function finalizarCompra() {
    if (cart.length === 0) {
        alert('Seu carrinho está vazio!');
        return;
    }
    
    if (!currentUser) {
        alert('Por favor, faça login para finalizar a compra!');
        toggleCart();
        showLoginModal();
        return;
    }
    
    toggleCart();
    setTimeout(() => {
        showCheckoutModal();
    }, 300);
}

function showCheckoutModal() {
    const checkoutModal = document.getElementById('checkout-modal');
    if (checkoutModal) {
        checkoutModal.style.display = 'block';
        resetCheckout();
    }
}

function closeCheckout() {
    const checkoutModal = document.getElementById('checkout-modal');
    if (checkoutModal) {
        checkoutModal.style.display = 'none';
    }
}

function resetCheckout() {
    checkoutData = { address: null, shipping: null, payment: null };
    selectedShipping = null;
    goToStep(1);
    updateOrderSummary();
}

function goToStep(stepNumber) {
    document.querySelectorAll('.checkout-step').forEach(step => {
        step.style.display = 'none';
    });
    
    document.querySelectorAll('.step').forEach(step => {
        step.classList.remove('active');
    });
    
    const currentStep = document.getElementById(`step-${stepNumber}`);
    const currentStepIndicator = document.querySelector(`[data-step="${stepNumber}"]`);
    
    if (currentStep) currentStep.style.display = 'block';
    if (currentStepIndicator) currentStepIndicator.classList.add('active');
}

function nextStep(next) {
    if (next === 2) {
        if (!validateAddress()) {
            alert('Por favor, preencha todos os campos obrigatórios do endereço.');
            return;
        }
        saveAddress();
        calculateShipping();
    }
    
    if (next === 3) {
        if (!selectedShipping) {
            alert('Por favor, selecione uma opção de frete.');
            return;
        }
        checkoutData.shipping = selectedShipping;
        updateOrderSummary();
    }
    
    goToStep(next);
}

function prevStep(prev) {
    goToStep(prev);
}

function validateAddress() {
    const requiredFields = ['cep', 'logradouro', 'numero', 'bairro', 'cidade', 'estado'];
    for (let field of requiredFields) {
        const element = document.getElementById(field);
        if (!element || !element.value.trim()) {
            return false;
        }
    }
    return true;
}

function saveAddress() {
    checkoutData.address = {
        cep: document.getElementById('cep').value,
        logradouro: document.getElementById('logradouro').value,
        numero: document.getElementById('numero').value,
        complemento: document.getElementById('complemento').value,
        bairro: document.getElementById('bairro').value,
        cidade: document.getElementById('cidade').value,
        estado: document.getElementById('estado').value
    };
}

async function calculateShipping() {
    const shippingOptions = document.getElementById('shipping-options');
    if (!shippingOptions) return;

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const cep = document.getElementById('cep').value;
    
    const opcoes = await calcularFreteAPI(cep, subtotal);

    shippingOptions.innerHTML = opcoes.map((option, index) => `
        <div class="shipping-option ${index === 1 ? 'selected' : ''}" onclick="selectShipping(${index})">
            <input type="radio" name="shipping" ${index === 1 ? 'checked' : ''} value="${index}">
            <div class="shipping-info">
                <div>
                    <strong>${option.nome}</strong>
                    <div class="shipping-time">Entrega em ${option.dias} dias úteis</div>
                </div>
                <div class="shipping-price">
                    ${option.preco === 0 ? 'GRÁTIS' : `R$ ${option.preco.toFixed(2)}`}
                </div>
            </div>
        </div>
    `).join('');

    selectedShipping = opcoes[1];
}

function selectShipping(index) {
    const options = document.querySelectorAll('.shipping-option');
    const shippingOptions = document.getElementById('shipping-options');
    
    if (!shippingOptions) return;
    
    const opcoesElements = shippingOptions.querySelectorAll('.shipping-option');
    const opcoes = [];
    
    opcoesElements.forEach(opt => {
        const nome = opt.querySelector('strong')?.innerText || '';
        const precoTexto = opt.querySelector('.shipping-price')?.innerText || 'R$ 0,00';
        let preco = 0;
        if (precoTexto !== 'GRÁTIS') {
            preco = parseFloat(precoTexto.replace('R$ ', '').replace(',', '.'));
        }
        const dias = opt.querySelector('.shipping-time')?.innerText.match(/\d+/)?.[0] || '5';
        opcoes.push({ nome, preco, dias });
    });
    
    selectedShipping = opcoes[index];
    
    options.forEach((option, i) => {
        if (i === index) {
            option.classList.add('selected');
            option.querySelector('input').checked = true;
        } else {
            option.classList.remove('selected');
        }
    });
}

function updateOrderSummary() {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shipping = selectedShipping ? selectedShipping.preco : 0;
    const total = subtotal + shipping;

    const summarySubtotal = document.getElementById('summary-subtotal');
    const summaryFrete = document.getElementById('summary-frete');
    const summaryTotal = document.getElementById('summary-total');

    if (summarySubtotal) summarySubtotal.textContent = `R$ ${subtotal.toFixed(2)}`;
    if (summaryFrete) summaryFrete.textContent = `R$ ${shipping.toFixed(2)}`;
    if (summaryTotal) summaryTotal.textContent = `R$ ${total.toFixed(2)}`;
}

async function finalizeOrder() {
    const paymentMethod = document.querySelector('input[name="payment"]:checked');
    if (!paymentMethod) {
        alert('Por favor, selecione um método de pagamento.');
        return;
    }

    checkoutData.payment = paymentMethod.value;
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0) + 
                  (selectedShipping ? selectedShipping.preco : 0);
    
    const enderecoCompleto = `${checkoutData.address.logradouro}, ${checkoutData.address.numero} - ${checkoutData.address.bairro}, ${checkoutData.address.cidade}/${checkoutData.address.estado} - CEP: ${checkoutData.address.cep}`;
    
    const itens = cart.map(item => ({
        produto_id: parseInt(item.id),
        quantidade: item.quantity,
        preco: item.price
    }));
    
    const resultado = await finalizarPedidoAPI(itens, total, enderecoCompleto);
    
    if (resultado) {
        const orderNumber = '#' + resultado.pedido_id;
        document.getElementById('order-number').textContent = orderNumber;
        document.getElementById('delivery-estimate').textContent = `${selectedShipping.dias} dias úteis`;
        document.getElementById('order-total').textContent = `R$ ${total.toFixed(2)}`;
        
        goToStep(4);
        
        cart = [];
        updateCartCounter();
        saveCart();
    }
}

// ========== INTERFACE DO USUÁRIO ==========

function updateUserInterface() {
    const userName = document.getElementById('user-name');
    const userAvatar = document.getElementById('user-avatar');
    const userGreeting = document.getElementById('user-greeting');
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const myOrdersBtn = document.getElementById('my-orders-btn');
    const myAddressesBtn = document.getElementById('my-addresses-btn');
    const cadastroBtn = document.getElementById('cadastro-btn');
    
    if (currentUser) {
        if (userName) userName.textContent = currentUser.nome;
        if (userAvatar) userAvatar.textContent = currentUser.nome.charAt(0).toUpperCase();
        if (userGreeting) userGreeting.textContent = `Olá, ${currentUser.nome}!`;
        if (loginBtn) loginBtn.style.display = 'none';
        if (cadastroBtn) cadastroBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'block';
        if (myOrdersBtn) myOrdersBtn.style.display = 'block';
        if (myAddressesBtn) myAddressesBtn.style.display = 'block';
    } else {
        if (userName) userName.textContent = 'Visitante';
        if (userAvatar) userAvatar.textContent = 'V';
        if (userGreeting) userGreeting.textContent = 'Olá, Visitante!';
        if (loginBtn) loginBtn.style.display = 'block';
        if (cadastroBtn) cadastroBtn.style.display = 'block';
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (myOrdersBtn) myOrdersBtn.style.display = 'none';
        if (myAddressesBtn) myAddressesBtn.style.display = 'none';
    }
}

function showLoginModal() {
    if (loginModal) loginModal.style.display = 'block';
    hideUserDropdown();
}

function hideLoginModal() {
    if (loginModal) loginModal.style.display = 'none';
}

function showRegisterModal() {
    if (registerModal) registerModal.style.display = 'block';
    hideUserDropdown();
}

function hideRegisterModal() {
    if (registerModal) registerModal.style.display = 'none';
}

function toggleUserDropdown() {
    const dropdown = document.getElementById('user-dropdown');
    if (dropdown) {
        dropdown.classList.toggle('show');
    }
}

function hideUserDropdown() {
    const dropdown = document.getElementById('user-dropdown');
    if (dropdown) {
        dropdown.classList.remove('show');
    }
}

// ========== EVENTOS ==========

function setupEventListeners() {
    // Carrinho
    if (cartIcon) {
        cartIcon.addEventListener('click', toggleCart);
    }
    
    const closeCartBtn = document.querySelector('.close-cart');
    if (closeCartBtn) {
        closeCartBtn.addEventListener('click', toggleCart);
    }
    
    const checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', finalizarCompra);
    }
    
    // User Menu
    const userIcon = document.getElementById('user-icon');
    if (userIcon) {
        userIcon.addEventListener('click', toggleUserDropdown);
    }
    
    // Login
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
        loginBtn.addEventListener('click', showLoginModal);
    }
    
    const cadastroBtn = document.getElementById('cadastro-btn');
    if (cadastroBtn) {
        cadastroBtn.addEventListener('click', showRegisterModal);
    }
    
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            currentUser = null;
            localStorage.removeItem('currentUser');
            updateUserInterface();
            showNotification('Logout realizado com sucesso!');
        });
    }
    
    // Fechar modais
    const closeBtns = document.querySelectorAll('.modal .close');
    closeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (loginModal) loginModal.style.display = 'none';
            if (registerModal) registerModal.style.display = 'none';
            const checkoutModal = document.getElementById('checkout-modal');
            if (checkoutModal) checkoutModal.style.display = 'none';
        });
    });
    
    // Formulário de Login
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const senha = document.getElementById('login-password').value;
            await fazerLogin(email, senha);
            loginForm.reset();
        });
    }
    
    // Formulário de Cadastro
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nome = document.getElementById('reg-name').value;
            const email = document.getElementById('reg-email').value;
            const senha = document.getElementById('reg-password').value;
            await cadastrarUsuario(nome, email, senha);
            registerForm.reset();
        });
    }
    
    // Link para cadastro no modal de login
    const showRegisterLink = document.getElementById('show-register-link');
    if (showRegisterLink) {
        showRegisterLink.addEventListener('click', (e) => {
            e.preventDefault();
            hideLoginModal();
            showRegisterModal();
        });
    }
    
    // Busca
    const searchBtn = document.getElementById('search-btn');
    const searchInput = document.getElementById('search-input');
    if (searchBtn && searchInput) {
        searchBtn.addEventListener('click', () => {
            if (searchInput.style.display === 'none') {
                searchInput.style.display = 'block';
                searchInput.focus();
            } else {
                searchInput.style.display = 'none';
                searchInput.value = '';
                carregarProdutos();
            }
        });
        
        searchInput.addEventListener('keyup', async (e) => {
            const termo = e.target.value.toLowerCase();
            if (termo === '') {
                carregarProdutos();
                return;
            }
            
            const produtos = await fetch(`${API_URL}/produtos`).then(res => res.json());
            const filtrados = produtos.filter(p => p.nome.toLowerCase().includes(termo));
            
            const container = document.querySelector('.box-container');
            if (container) {
                if (filtrados.length === 0) {
                    container.innerHTML = '<div class="loading">Nenhum produto encontrado</div>';
                } else {
                    container.innerHTML = filtrados.map(produto => `
                        <article class="box" data-product-id="${produto.id}">
                            <img width="250" src="https://filipesep.github.io/loja-pet/img/${produto.imagem || 'placeholder.jpg'}" 
                                 alt="${produto.nome}"
                                 onerror="this.src='https://via.placeholder.com/250x200/ff6b6b/ffffff?text=UNIPETS'">
                            <h3>${produto.nome}</h3>
                            <div class="price">R$ ${produto.preco.toFixed(2)}</div>
                            <button class="btn add-to-cart" 
                                    data-product-id="${produto.id}"
                                    data-product="${produto.nome}" 
                                    data-price="${produto.preco}">
                                Adicionar ao Carrinho
                            </button>
                        </article>
                    `).join('');
                }
            }
            
            atribuirEventosProdutos();
        });
    }
    
    // Fechar modais ao clicar fora
    window.addEventListener('click', (event) => {
        if (loginModal && event.target === loginModal) hideLoginModal();
        if (registerModal && event.target === registerModal) hideRegisterModal();
        if (cartModal && event.target === cartModal) toggleCart();
        
        const checkoutModal = document.getElementById('checkout-modal');
        if (checkoutModal && event.target === checkoutModal) closeCheckout();
        
        const dropdown = document.getElementById('user-dropdown');
        if (dropdown && dropdown.classList.contains('show') && !event.target.closest('.user-menu')) {
            hideUserDropdown();
        }
    });
    
    // CEP auto-complete
    setupCEPAutoComplete();
    
    // Anos do cartão
    const cardYear = document.getElementById('card-year');
    if (cardYear) {
        const currentYear = new Date().getFullYear();
        for (let i = 0; i < 10; i++) {
            const year = currentYear + i;
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            cardYear.appendChild(option);
        }
    }
}

function setupCheckoutButton() {
    const checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', finalizarCompra);
    }
}

function atribuirEventosProdutos() {
    const botoes = document.querySelectorAll('.add-to-cart');
    botoes.forEach(botao => {
        botao.removeEventListener('click', addToCartHandler);
        botao.addEventListener('click', addToCartHandler);
    });
}

function addToCartHandler(event) {
    const button = event.currentTarget;
    const productId = button.dataset.productId;
    const productName = button.dataset.product;
    const productPrice = parseFloat(button.dataset.price);
    addToCart(productId, productName, productPrice);
}

function setupCEPAutoComplete() {
    const cepInput = document.getElementById('cep');
    if (cepInput) {
        cepInput.addEventListener('blur', async () => {
            let cep = cepInput.value.replace(/\D/g, '');
            if (cep.length === 8) {
                try {
                    const resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                    const dados = await resposta.json();
                    if (!dados.erro) {
                        document.getElementById('logradouro').value = dados.logradouro || '';
                        document.getElementById('bairro').value = dados.bairro || '';
                        document.getElementById('cidade').value = dados.localidade || '';
                        document.getElementById('estado').value = dados.uf || '';
                    }
                } catch (erro) {
                    console.error('Erro ao buscar CEP:', erro);
                }
            }
        });
        
        cepInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 5) {
                value = value.substring(0, 5) + '-' + value.substring(5, 8);
            }
            e.target.value = value;
        });
    }
}

// ========== UTILITÁRIOS ==========

function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #28a745;
        color: white;
        padding: 15px 20px;
        border-radius: 5px;
        z-index: 10000;
        animation: slideIn 0.3s ease;
        font-size: 1.4rem;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 3000);
}

// Adicionar animação
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
`;
document.head.appendChild(style);

console.log('✅ UNIPETS - Sistema carregado com sucesso!');