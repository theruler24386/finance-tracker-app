const STORAGE_KEY = 'finance-tracker-state';

const defaultBudgets = {
  Food: 500,
  Housing: 1500,
  Transport: 220,
  Utilities: 300,
  Entertainment: 200,
  Health: 180,
  Shopping: 250,
};

const defaultTransactions = [
  { id: crypto.randomUUID(), type: 'income', category: 'Salary', amount: 4200, date: todayISO(-5), note: 'Monthly salary' },
  { id: crypto.randomUUID(), type: 'expense', category: 'Housing', amount: 1350, date: todayISO(-12), note: 'Rent payment' },
  { id: crypto.randomUUID(), type: 'expense', category: 'Food', amount: 140, date: todayISO(-4), note: 'Groceries' },
  { id: crypto.randomUUID(), type: 'expense', category: 'Transport', amount: 90, date: todayISO(-2), note: 'Fuel' },
  { id: crypto.randomUUID(), type: 'income', category: 'Freelance', amount: 640, date: todayISO(-1), note: 'Website design work' },
  { id: crypto.randomUUID(), type: 'expense', category: 'Entertainment', amount: 75, date: todayISO(-1), note: 'Streaming and cinema' },
];

const appState = loadState();

const form = document.getElementById('transaction-form');
const typeInput = document.getElementById('transaction-type');
const categoryInput = document.getElementById('transaction-category');
const amountInput = document.getElementById('transaction-amount');
const dateInput = document.getElementById('transaction-date');
const noteInput = document.getElementById('transaction-note');
const tableBody = document.getElementById('transaction-table-body');
const budgetList = document.getElementById('budget-list');
const resetBtn = document.getElementById('reset-data');

function todayISO(daysAgo = 0) {
  const d = new Date();
  d.setDate(d.getDate() + daysAgo);
  return d.toISOString().split('T')[0];
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return { transactions: defaultTransactions, budgets: defaultBudgets };
    }
  }

  return { transactions: defaultTransactions, budgets: defaultBudgets };
}

function persistState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

function getSummary() {
  const income = appState.transactions
    .filter((item) => item.type === 'income')
    .reduce((sum, item) => sum + Number(item.amount), 0);

  const expenses = appState.transactions
    .filter((item) => item.type === 'expense')
    .reduce((sum, item) => sum + Number(item.amount), 0);

  return { income, expenses, balance: income - expenses };
}

function renderSummary() {
  const summary = getSummary();

  document.getElementById('income-total').textContent = formatCurrency(summary.income);
  document.getElementById('expense-total').textContent = formatCurrency(summary.expenses);
  document.getElementById('net-balance').textContent = formatCurrency(summary.balance);
  document.getElementById('balance-display').textContent = formatCurrency(summary.balance);
}

function renderBudgets() {
  const expenseTotals = appState.transactions
    .filter((item) => item.type === 'expense')
    .reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + Number(item.amount);
      return acc;
    }, {});

  const entries = Object.entries(appState.budgets).map(([category, limit]) => {
    const spent = expenseTotals[category] || 0;
    const percent = Math.min((spent / limit) * 100, 100);
    return { category, limit, spent, percent };
  });

  budgetList.innerHTML = entries
    .map(({ category, limit, spent, percent }) => {
      const remaining = limit - spent;
      return `
        <div class="budget-item">
          <div class="budget-head">
            <span>${category}</span>
            <span>${formatCurrency(spent)} / ${formatCurrency(limit)}</span>
          </div>
          <div class="progress">
            <div class="progress-bar" style="width: ${percent}%"></div>
          </div>
          <div class="budget-head" style="margin-top:10px; margin-bottom:0; font-size:0.85rem; color:#64748b;">
            <span>${remaining >= 0 ? 'Remaining' : 'Over budget'}</span>
            <span>${formatCurrency(Math.abs(remaining))}</span>
          </div>
        </div>
      `;
    })
    .join('');
}

function renderTransactions() {
  const sorted = [...appState.transactions].sort((a, b) => new Date(b.date) - new Date(a.date));

  tableBody.innerHTML = sorted
    .map((item) => {
      const isIncome = item.type === 'income';
      const amountClass = isIncome ? 'amount-pos' : 'amount-neg';
      const amountValue = isIncome ? `+${formatCurrency(item.amount)}` : `-${formatCurrency(item.amount)}`;

      return `
        <tr>
          <td>${new Date(item.date).toLocaleDateString()}</td>
          <td><span class="badge ${item.type}">${item.type}</span></td>
          <td>${item.category}</td>
          <td>${item.note || '—'}</td>
          <td class="${amountClass}">${amountValue}</td>
          <td><button class="delete-btn" data-id="${item.id}">Delete</button></td>
        </tr>
      `;
    })
    .join('');
}

function render() {
  renderSummary();
  renderBudgets();
  renderTransactions();
}

form.addEventListener('submit', (event) => {
  event.preventDefault();

  const transaction = {
    id: crypto.randomUUID(),
    type: typeInput.value,
    category: categoryInput.value,
    amount: Number(amountInput.value),
    date: dateInput.value || todayISO(0),
    note: noteInput.value.trim(),
  };

  if (!transaction.amount || transaction.amount <= 0) {
    alert('Please enter a valid amount.');
    return;
  }

  appState.transactions.push(transaction);
  persistState();
  render();
  form.reset();
  dateInput.value = todayISO(0);
  categoryInput.value = 'Food';
  typeInput.value = 'expense';
});

tableBody.addEventListener('click', (event) => {
  const button = event.target.closest('.delete-btn');
  if (!button) return;

  const id = button.dataset.id;
  appState.transactions = appState.transactions.filter((item) => item.id !== id);
  persistState();
  render();
});

resetBtn.addEventListener('click', () => {
  appState.transactions = defaultTransactions.map((item) => ({ ...item, id: crypto.randomUUID() }));
  appState.budgets = { ...defaultBudgets };
  persistState();
  render();
});

window.addEventListener('DOMContentLoaded', () => {
  dateInput.value = todayISO(0);
  render();
});

// Make category options switch depending on transaction type so income categories reflect salary/freelance
[typeInput, categoryInput].forEach((element) => {
  element.addEventListener('change', () => {
    const isIncome = typeInput.value === 'income';
    const incomeOptions = ['Salary', 'Freelance', 'Bonus', 'Gift', 'Other'];
    const expenseOptions = ['Food', 'Housing', 'Transport', 'Utilities', 'Entertainment', 'Health', 'Shopping', 'Other'];

    const options = isIncome ? incomeOptions : expenseOptions;
    categoryInput.innerHTML = options.map((option) => `<option value="${option}">${option}</option>`).join('');
  });
});

// initialize option set on load
const initialType = typeInput.value;
categoryInput.innerHTML = (initialType === 'income' ? ['Salary', 'Freelance', 'Bonus', 'Gift', 'Other'] : ['Food', 'Housing', 'Transport', 'Utilities', 'Entertainment', 'Health', 'Shopping', 'Other'])
  .map((option) => `<option value="${option}">${option}</option>`)
  .join('');
