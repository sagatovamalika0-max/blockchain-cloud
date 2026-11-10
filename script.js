class Block {
    constructor(index, timestamp, data, previousHash = '') {
        this.index = index;
        this.timestamp = timestamp;
        this.data = data; 
        this.previousHash = previousHash;
        this.nonce = 0;
        this.hash = '';
    }

    async calculateHash() {
        const dataString = this.index + this.timestamp + JSON.stringify(this.data) + this.previousHash + this.nonce;
        const msgBuffer = new TextEncoder().encode(dataString);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
}

class Blockchain {
    constructor() {
        this.chain = [];
        this.init();
    }

    async init() {
        const genesisBlock = new Block(1, '2026-11-10 10:00:00', { sender: 'System', receiver: 'Genesis', amount: 0, status: 'Confirmed' }, '0');
        genesisBlock.hash = await genesisBlock.calculateHash();
        this.chain.push(genesisBlock);

        const initialTx = [
            { sender: 'Alice', receiver: 'Bob', amount: 2.5, status: 'Confirmed' },
            { sender: 'Bob', receiver: 'Charlie', amount: 1.2, status: 'Confirmed' },
            { sender: 'Charlie', receiver: 'David', amount: 0.5, status: 'Pending' },
            { sender: 'David', receiver: 'Alice', amount: 5.0, status: 'Rejected' }
        ];

        for (let i = 0; i < initialTx.length; i++) {
            await this.addBlock(initialTx[i]);
        }
        renderTable();
    }

    async addBlock(transactionData) {
        const previousBlock = this.chain[this.chain.length - 1];
        const newIndex = this.chain.length + 1;
        const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
        const newBlock = new Block(newIndex, timestamp, transactionData, previousBlock.hash);
        newBlock.hash = await newBlock.calculateHash();
        this.chain.push(newBlock);
    }

    async isChainValid() {
        for (let i = 1; i < this.chain.length; i++) {
            const currentBlock = this.chain[i];
            const previousBlock = this.chain[i - 1];

            const recalculatedHash = await currentBlock.calculateHash();
            if (currentBlock.hash !== recalculatedHash) {
                return { isValid: false, message: `Нарушение целостности в блоке №${currentBlock.index}: хеш не совпадает!` };
            }

            if (currentBlock.previousHash !== previousBlock.hash) {
                return { isValid: false, message: `Разрыв цепи между блоком №${previousBlock.index} и №${currentBlock.index}!` };
            }
        }
        return { isValid: true, message: 'Целостность блокчейна подтверждена. Все хеши валидны.' };
    }
}

const myBlockchain = new Blockchain();

async function renderTable() {
    const tbody = document.getElementById('blockchain-tbody');
    tbody.innerHTML = '';

    for (let block of myBlockchain.chain) {
        const tr = document.createElement('tr');
        
        let statusClass = 'pending';
        if (block.data.status === 'Confirmed') statusClass = 'confirmed';
        if (block.data.status === 'Rejected') statusClass = 'rejected';

        tr.innerHTML = `
            <td><strong>#${block.index}</strong></td>
            <td>${block.data.sender}</td>
            <td>${block.data.receiver}</td>
            <td>${block.data.amount}</td>
            <td><span class="badge ${statusClass}">${block.data.status}</span></td>
            <td class="hash">${block.previousHash.substring(0, 16)}...</td>
            <td class="hash">${block.hash.substring(0, 16)}...</td>
        `;
        tbody.appendChild(tr);
    }
}

document.getElementById('transaction-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const sender = document.getElementById('sender').value;
    const receiver = document.getElementById('receiver').value;
    const amount = parseFloat(document.getElementById('amount').value);
    
    const statuses = ['Confirmed', 'Pending', 'Rejected'];
    const status = statuses[Math.floor(Math.random() * statuses.length)];

    await myBlockchain.addBlock({ sender, receiver, amount, status });
    await renderTable();
    document.getElementById('transaction-form').reset();
});

document.getElementById('verify-btn').addEventListener('click', async () => {
    const statusDiv = document.getElementById('status-message');
    const result = await myBlockchain.isChainValid();
    statusDiv.textContent = result.message;
    statusDiv.className = result.status === false ? 'status-msg error' : 'status-msg success';
});

document.getElementById('tamper-btn').addEventListener('click', async () => {
    const statusDiv = document.getElementById('status-message');
    if (myBlockchain.chain.length > 1) {
        myBlockchain.chain[1].data.amount = 999.99;
        statusDiv.textContent = 'Внимание: Данные во втором блоке были изменены злоумышленником!';
        statusDiv.className = 'status-msg error';
        await renderTable();
    }
});