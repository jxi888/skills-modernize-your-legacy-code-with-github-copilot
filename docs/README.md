# School Accounting System: Code Overview

## Purpose

The COBOL programs implement a small, interactive account-balance manager. In a school's accounting context, it can be viewed as a demonstration of the basic balance operations that might sit inside a larger finance system. The current program manages only one generic account; it does not identify a student, department, fund, or school year.

## Source Files

### `src/cobol/main.cob` - user menu and program flow

`MainProgram` is the command-line entry point. Its `MAIN-LOGIC` loop displays the account menu, reads a one-digit choice, and calls `Operations` with an operation code:

- `1` sends `TOTAL ` to display the current balance.
- `2` sends `CREDIT` to add funds.
- `3` sends `DEBIT ` to subtract funds.
- `4` exits the loop and stops the program.
- Other choices display an invalid-choice message and return to the menu.

### `src/cobol/operations.cob` - account operations and business rules

`Operations` receives a six-character operation code and implements the selected action:

- `TOTAL ` asks `DataProgram` to read the stored balance, then displays it.
- `CREDIT` prompts for an amount, reads the current balance, adds the amount, writes the new balance, and confirms it.
- `DEBIT ` prompts for an amount and reads the current balance. It subtracts and saves the amount only when the balance is at least that large; otherwise it reports insufficient funds and leaves the balance unchanged.

The balance and entered amount use `PIC 9(6)V99`, representing up to six whole-number digits and two implied decimal places. The displayed value is numeric COBOL output; no currency symbol or school-specific formatting is added.

### `src/cobol/data.cob` - balance storage interface

`DataProgram` provides a minimal read/write interface to `STORAGE-BALANCE`, initialized to `1000.00`:

- `READ` copies the stored balance into the caller-provided `BALANCE` field.
- `WRITE` copies the caller-provided value into `STORAGE-BALANCE`.

The data is held in working storage, not a file or database. It is therefore not durable across program runs, and the single balance is shared by all operations in one run.

## Business Requirements Implemented

1. Start with a balance of `1000.00`.
2. Let the operator view the current balance.
3. Let the operator credit an entered amount and update the balance.
4. Let the operator debit an entered amount only if sufficient funds are available.
5. Keep the menu available until the operator chooses to exit.

## Scope and Limitations

This is a minimal balance-management example, not a complete school accounting system. It currently has no student or payer records, tuition/fee categories, invoices, payment methods, receipts, transaction ledger, audit trail, reporting, authorization, or persistent storage. The code also does not validate that entered amounts are positive or handle malformed input, and it does not define policies for refunds, overdrafts, or rounding beyond the two-decimal numeric fields. Those requirements would need to be established before using the program for real school financial records.

## Data Flow Sequence Diagram

`DataProgram` holds the balance in memory, initially `1000.00`. COBOL passes the balance by reference: `READ` fills the caller's balance field, and `WRITE` copies that field into storage. The operation codes below omit trailing padding spaces for readability.

```mermaid
sequenceDiagram
	actor User
	participant Main as MainProgram
	participant Ops as Operations
	participant Data as DataProgram (in-memory balance)

	loop Until the user chooses 4 (Exit)
		Main->>User: Display menu and prompt for choice
		User->>Main: Enter choice
		alt 1 - View balance
			Main->>Ops: TOTAL
			Ops->>Data: READ, FINAL-BALANCE
			Data->>Data: Copy STORAGE-BALANCE to BALANCE
			Data-->>Ops: FINAL-BALANCE contains stored balance
			Ops->>User: Display current balance
			Ops-->>Main: Return
		else 2 - Credit account
			Main->>Ops: CREDIT
			Ops->>User: Prompt for credit amount
			User->>Ops: Enter AMOUNT
			Ops->>Data: READ, FINAL-BALANCE
			Data-->>Ops: FINAL-BALANCE contains stored balance
			Ops->>Ops: Add AMOUNT to FINAL-BALANCE
			Ops->>Data: WRITE, FINAL-BALANCE
			Data->>Data: Copy BALANCE to STORAGE-BALANCE
			Data-->>Ops: Return
			Ops->>User: Display credit confirmation and new balance
			Ops-->>Main: Return
		else 3 - Debit account
			Main->>Ops: DEBIT
			Ops->>User: Prompt for debit amount
			User->>Ops: Enter AMOUNT
			Ops->>Data: READ, FINAL-BALANCE
			Data-->>Ops: FINAL-BALANCE contains stored balance
			alt FINAL-BALANCE >= AMOUNT
				Ops->>Ops: Subtract AMOUNT from FINAL-BALANCE
				Ops->>Data: WRITE, FINAL-BALANCE
				Data->>Data: Copy BALANCE to STORAGE-BALANCE
				Data-->>Ops: Return
				Ops->>User: Display debit confirmation and new balance
			else Insufficient funds
				Ops->>User: Display insufficient funds message
				Note over Ops,Data: No WRITE; stored balance stays unchanged
			end
			Ops-->>Main: Return
		else 4 - Exit
			Main->>Main: Set CONTINUE-FLAG to NO
		else Invalid choice
			Main->>User: Display invalid choice message
		end
	end
	Main->>User: Display goodbye message
	Note over Main,Data: Program stops; balance is not persisted
```