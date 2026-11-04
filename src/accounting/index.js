#!/usr/bin/env node
'use strict';

const readline = require('node:readline');

const INITIAL_BALANCE_CENTS = 100000;
const MAX_BALANCE_CENTS = 99999999;
const MAX_AMOUNT_WHOLE = 999999;

const MENU_LINES = [
  '--------------------------------',
  'Account Management System',
  '1. View Balance',
  '2. Credit Account',
  '3. Debit Account',
  '4. Exit',
  '--------------------------------',
];

const MESSAGES = {
  invalidChoice: 'Invalid choice, please select 1-4.',
  invalidAmount: 'Invalid amount. Enter a positive number with up to 6 digits before the decimal point.',
  creditOverflow: 'Amount exceeds the maximum balance of 999999.99. Credit rejected.',
  insufficientFunds: 'Insufficient funds for this debit.',
  goodbye: 'Exiting the program. Goodbye!',
};

function formatBalance(cents) {
  const whole = Math.floor(cents / 100);
  const fraction = cents % 100;
  return `${String(whole).padStart(6, '0')}.${String(fraction).padStart(2, '0')}`;
}

// Accepts digits with an optional decimal point. Extra decimal places are truncated, as in the COBOL PIC 9(6)V99 field.
function parseAmount(text) {
  const match = /^(\d*)(?:\.(\d*))?$/.exec(text.trim());
  if (!match) return null;
  const [, whole, fraction = ''] = match;
  if (whole === '' && fraction === '') return null;
  if (Number(whole || '0') > MAX_AMOUNT_WHOLE) return null;
  return Number(whole || '0') * 100 + Number(fraction.padEnd(2, '0').slice(0, 2));
}

function parseChoice(text) {
  const trimmed = text.trim();
  return ['1', '2', '3', '4'].includes(trimmed) ? Number(trimmed) : null;
}

class Account {
  constructor(balanceCents = INITIAL_BALANCE_CENTS) {
    this.balanceCents = balanceCents;
  }

  credit(amountCents) {
    const newBalance = this.balanceCents + amountCents;
    if (newBalance > MAX_BALANCE_CENTS) {
      return { ok: false, message: MESSAGES.creditOverflow };
    }
    this.balanceCents = newBalance;
    return { ok: true, message: `Amount credited. New balance: ${formatBalance(this.balanceCents)}` };
  }

  debit(amountCents) {
    if (this.balanceCents < amountCents) {
      return { ok: false, message: MESSAGES.insufficientFunds };
    }
    this.balanceCents -= amountCents;
    return { ok: true, message: `Amount debited. New balance: ${formatBalance(this.balanceCents)}` };
  }
}

async function run(input = process.stdin, output = process.stdout) {
  const rl = readline.createInterface({ input, terminal: false });
  const lines = rl[Symbol.asyncIterator]();
  const account = new Account();

  const readLine = async (prompt) => {
    output.write(prompt);
    const { value, done } = await lines.next();
    return done ? null : value;
  };

  const handleAmount = async (prompt, operation) => {
    const text = await readLine(`${prompt}\n`);
    if (text === null) return false;
    const amountCents = parseAmount(text);
    const result = amountCents === null
      ? { ok: false, message: MESSAGES.invalidAmount }
      : operation(amountCents);
    output.write(`${result.message}\n`);
    return true;
  };

  try {
    for (;;) {
      output.write(`${MENU_LINES.join('\n')}\n`);
      const choiceText = await readLine('Enter your choice (1-4): ');
      if (choiceText === null) break;

      const choice = parseChoice(choiceText);
      if (choice === 4) break;

      if (choice === 1) {
        output.write(`Current balance: ${formatBalance(account.balanceCents)}\n`);
      } else if (choice === 2) {
        if (!(await handleAmount('Enter credit amount: ', (cents) => account.credit(cents)))) break;
      } else if (choice === 3) {
        if (!(await handleAmount('Enter debit amount: ', (cents) => account.debit(cents)))) break;
      } else {
        output.write(`${MESSAGES.invalidChoice}\n`);
      }
    }
    output.write(`${MESSAGES.goodbye}\n`);
  } finally {
    rl.close();
  }
}

if (require.main === module) {
  run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = { Account, formatBalance, parseAmount, parseChoice, run, MENU_LINES, MESSAGES };
