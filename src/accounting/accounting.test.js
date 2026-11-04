'use strict';

const { Readable, Writable } = require('node:stream');
const {
  Account,
  formatBalance,
  parseAmount,
  parseChoice,
  run,
  MENU_LINES,
  MESSAGES,
} = require('./index');

async function runSession(lines) {
  const input = Readable.from([lines.map((line) => `${line}\n`).join('')]);
  let output = '';
  const sink = new Writable({
    write(chunk, _encoding, callback) {
      output += chunk;
      callback();
    },
  });
  await run(input, sink);
  return output;
}

const CURRENT_BALANCE_1000 = 'Current balance: 001000.00';

describe('helpers', () => {
  test('formatBalance renders six digits, two decimals, zero-padded', () => {
    expect(formatBalance(100000)).toBe('001000.00');
    expect(formatBalance(1)).toBe('000000.01');
    expect(formatBalance(99999999)).toBe('999999.99');
  });

  test('parseAmount truncates to two decimals and rejects invalid text', () => {
    expect(parseAmount('10.555')).toBe(1055);
    expect(parseAmount('5.')).toBe(500);
    expect(parseAmount('.5')).toBe(50);
    expect(parseAmount('000001')).toBe(100);
    expect(parseAmount('999999.99')).toBe(99999999);
    expect(parseAmount('1000000')).toBeNull();
    expect(parseAmount('-50')).toBeNull();
    expect(parseAmount('abc')).toBeNull();
    expect(parseAmount('')).toBeNull();
    expect(parseAmount('.')).toBeNull();
  });

  test('parseChoice accepts only 1 to 4', () => {
    expect(parseChoice('1')).toBe(1);
    expect(parseChoice(' 4 ')).toBe(4);
    expect(parseChoice('0')).toBeNull();
    expect(parseChoice('5')).toBeNull();
    expect(parseChoice('10')).toBeNull();
    expect(parseChoice('A')).toBeNull();
  });
});

describe('Account business rules', () => {
  test('starts at 1000.00', () => {
    expect(new Account().balanceCents).toBe(100000);
  });

  test('credit adds the amount and reports the new balance', () => {
    const account = new Account();
    expect(account.credit(10000)).toEqual({
      ok: true,
      message: 'Amount credited. New balance: 001100.00',
    });
  });

  test('credit above 999999.99 is rejected and balance is unchanged', () => {
    const account = new Account();
    expect(account.credit(99999900)).toEqual({ ok: false, message: MESSAGES.creditOverflow });
    expect(account.balanceCents).toBe(100000);
  });

  test('debit equal to balance leaves zero', () => {
    const account = new Account();
    expect(account.debit(100000)).toEqual({
      ok: true,
      message: 'Amount debited. New balance: 000000.00',
    });
    expect(account.balanceCents).toBe(0);
  });

  test('debit above balance is rejected and balance is unchanged', () => {
    const account = new Account();
    expect(account.debit(100001)).toEqual({ ok: false, message: MESSAGES.insufficientFunds });
    expect(account.balanceCents).toBe(100000);
  });
});

describe('Menu and session flow (test plan TC-01 to TC-26)', () => {
  test('TC-01: main menu is displayed on start', async () => {
    const output = await runSession(['4']);
    expect(output).toContain(`${MENU_LINES.join('\n')}\n`);
    expect(output).toContain('Enter your choice (1-4): ');
  });

  test('TC-02: view balance shows the initial balance', async () => {
    const output = await runSession(['1', '4']);
    expect(output).toContain(CURRENT_BALANCE_1000);
  });

  test('TC-03: exit ends the program with goodbye message', async () => {
    const output = await runSession(['4']);
    expect(output.endsWith('Exiting the program. Goodbye!\n')).toBe(true);
  });

  test('TC-04: credit a whole-number amount', async () => {
    const output = await runSession(['2', '100', '1', '4']);
    expect(output).toContain('Amount credited. New balance: 001100.00');
    expect(output).toContain('Current balance: 001100.00');
  });

  test('TC-05: credit an amount with cents', async () => {
    const output = await runSession(['2', '50.25', '1', '4']);
    expect(output).toContain('Amount credited. New balance: 001050.25');
  });

  test('TC-06: credit the smallest positive amount (0.01)', async () => {
    const output = await runSession(['2', '0.01', '1', '4']);
    expect(output).toContain('Amount credited. New balance: 001000.01');
  });

  test('TC-07: credit with zero amount leaves balance unchanged', async () => {
    const output = await runSession(['2', '0', '4']);
    expect(output).toContain('Amount credited. New balance: 001000.00');
  });

  test('TC-08: credit truncates extra decimals rather than rounding', async () => {
    const output = await runSession(['2', '10.555', '1', '4']);
    expect(output).toContain('Amount credited. New balance: 001010.55');
  });

  test('TC-09: credit exceeding maximum balance is rejected', async () => {
    const output = await runSession(['2', '999999.99', '1', '4']);
    expect(output).toContain(MESSAGES.creditOverflow);
    expect(output).not.toContain('New balance: 000999.90');
    expect(output).toContain(CURRENT_BALANCE_1000);
  });

  test('TC-10: credit amount larger than the field is rejected', async () => {
    const output = await runSession(['2', '1000000', '1', '4']);
    expect(output).toContain(MESSAGES.invalidAmount);
    expect(output).not.toContain('Amount credited');
    expect(output).toContain(CURRENT_BALANCE_1000);
  });

  test('TC-11: credit with negative amount is rejected', async () => {
    const output = await runSession(['2', '-50', '1', '4']);
    expect(output).toContain(MESSAGES.invalidAmount);
    expect(output).not.toContain('Amount credited');
    expect(output).toContain(CURRENT_BALANCE_1000);
  });

  test('TC-12: credit with non-numeric input is rejected', async () => {
    const output = await runSession(['2', 'abc', '1', '4']);
    expect(output).toContain(MESSAGES.invalidAmount);
    expect(output).not.toContain('Amount credited');
    expect(output).toContain(CURRENT_BALANCE_1000);
  });

  test('TC-13: debit a whole-number amount within balance', async () => {
    const output = await runSession(['3', '100', '1', '4']);
    expect(output).toContain('Amount debited. New balance: 000900.00');
  });

  test('TC-14: debit the exact full balance', async () => {
    const output = await runSession(['3', '1000', '1', '4']);
    expect(output).toContain('Amount debited. New balance: 000000.00');
    expect(output).toContain('Current balance: 000000.00');
  });

  test('TC-15: debit more than the balance is rejected', async () => {
    const output = await runSession(['3', '1000.01', '1', '4']);
    expect(output).toContain(MESSAGES.insufficientFunds);
    expect(output).toContain(CURRENT_BALANCE_1000);
  });

  test('TC-16: debit with zero amount leaves balance unchanged', async () => {
    const output = await runSession(['3', '0', '4']);
    expect(output).toContain('Amount debited. New balance: 001000.00');
  });

  test('TC-17: debit with negative amount is rejected', async () => {
    const output = await runSession(['3', '-50', '1', '4']);
    expect(output).toContain(MESSAGES.invalidAmount);
    expect(output).not.toContain('Amount debited');
    expect(output).toContain(CURRENT_BALANCE_1000);
  });

  test('TC-18: debit with non-numeric input is rejected', async () => {
    const output = await runSession(['3', 'abc', '1', '4']);
    expect(output).toContain(MESSAGES.invalidAmount);
    expect(output).not.toContain('Amount debited');
    expect(output).toContain(CURRENT_BALANCE_1000);
  });

  test('TC-19: credit then debit in one session', async () => {
    const output = await runSession(['2', '100', '3', '30', '1', '4']);
    expect(output).toContain('Amount credited. New balance: 001100.00');
    expect(output).toContain('Amount debited. New balance: 001070.00');
    expect(output).toContain('Current balance: 001070.00');
  });

  test('TC-20: debit to zero, then credit', async () => {
    const output = await runSession(['3', '1000', '2', '5', '1', '4']);
    expect(output).toContain('Amount debited. New balance: 000000.00');
    expect(output).toContain('Amount credited. New balance: 000005.00');
    expect(output).toContain('Current balance: 000005.00');
  });

  test('TC-21: debit from a zero balance is rejected', async () => {
    const output = await runSession(['3', '1000', '3', '1', '1', '4']);
    expect(output).toContain(MESSAGES.insufficientFunds);
    expect(output).toContain('Current balance: 000000.00');
  });

  test('TC-22: menu rejects choice 0', async () => {
    const output = await runSession(['0', '4']);
    expect(output).toContain(MESSAGES.invalidChoice);
  });

  test('TC-23: menu rejects choice 5', async () => {
    const output = await runSession(['5', '4']);
    expect(output).toContain(MESSAGES.invalidChoice);
  });

  test('TC-24: menu rejects non-numeric choice', async () => {
    const output = await runSession(['A', '4']);
    expect(output).toContain(MESSAGES.invalidChoice);
  });

  test('TC-25: menu rejects multi-digit choice 10 without running option 1', async () => {
    const output = await runSession(['10', '4']);
    expect(output).toContain(MESSAGES.invalidChoice);
    expect(output).not.toContain('Current balance');
  });

  test('TC-26: balance is not persisted between runs', async () => {
    await runSession(['2', '100', '4']);
    const output = await runSession(['1', '4']);
    expect(output).toContain(CURRENT_BALANCE_1000);
  });

  test('end of input exits gracefully with goodbye message', async () => {
    const output = await runSession(['1']);
    expect(output).toContain(CURRENT_BALANCE_1000);
    expect(output.endsWith('Exiting the program. Goodbye!\n')).toBe(true);
  });
});
