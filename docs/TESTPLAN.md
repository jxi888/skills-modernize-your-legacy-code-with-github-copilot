# Test Plan: COBOL Account Management System

This test plan covers the business logic of the COBOL application in `src/cobol/` (`main.cob`, `operations.cob`, `data.cob`). It is intended for validation with business stakeholders and as the basis for future Node.js unit and integration tests.

## Business Rules Under Test

- A single account balance is held in memory. It starts at **1000.00** on every program start.
- Balance and amounts are unsigned decimals with up to 6 integer digits and 2 decimal places (`PIC 9(6)V99`, maximum 999999.99).
- **View Balance** displays the current balance.
- **Credit** adds an amount to the balance.
- **Debit** subtracts an amount only if the balance is greater than or equal to the amount. Otherwise it is rejected with "Insufficient funds for this debit." and the balance is unchanged.
- The menu accepts choices 1 to 4. Any other choice shows "Invalid choice, please select 1-4." and the menu is shown again.
- **Exit** (4) ends the program with "Exiting the program. Goodbye!".

## Test Execution Notes

- Build: `cobc -x src/cobol/main.cob src/cobol/operations.cob src/cobol/data.cob -o accountsystem`
- Run: `./accountsystem`. Inputs are entered at each prompt, one per line.
- Actual Results below were captured by running the compiled application with the listed inputs.
- Status is **Pass** when the actual result matches the expected business rule. It is **Fail** when it does not. Cases marked Fail are defects or gaps that stakeholders must confirm.

## Test Cases

| Test Case ID | Test Case Description | Pre-conditions | Test Steps | Expected Result | Actual Result | Status (Pass/Fail) | Comments |
|---|---|---|---|---|---|---|---|
| TC-01 | Main menu is displayed on start | Application compiled; no prior run state | 1) Run `./accountsystem` | Menu shows title "Account Management System", options 1-4, and prompt "Enter your choice (1-4):" | Menu displayed as expected | Pass | |
| TC-02 | View balance shows the initial balance | Fresh start | 1) Enter `1`<br>2) Enter `4` | "Current balance: 001000.00" | "Current balance: 001000.00" | Pass | |
| TC-03 | Exit ends the program | Fresh start | 1) Enter `4` | "Exiting the program. Goodbye!" and the program ends with exit code 0 | Same as expected, exit code 0 | Pass | |
| TC-04 | Credit a whole-number amount | Fresh start | 1) Enter `2`<br>2) Enter `100`<br>3) Enter `1`<br>4) Enter `4` | "Amount credited. New balance: 001100.00"; then "Current balance: 001100.00" | Same as expected | Pass | |
| TC-05 | Credit an amount with cents | Fresh start | 1) Enter `2`<br>2) Enter `50.25`<br>3) Enter `1`<br>4) Enter `4` | "New balance: 001050.25" | Same as expected | Pass | |
| TC-06 | Credit the smallest positive amount (0.01) | Fresh start | 1) Enter `2`<br>2) Enter `0.01`<br>3) Enter `1`<br>4) Enter `4` | "New balance: 001000.01" | Same as expected | Pass | |
| TC-07 | Credit with zero amount | Fresh start | 1) Enter `2`<br>2) Enter `0`<br>3) Enter `4` | Balance unchanged at 001000.00 | "New balance: 001000.00" | Pass | Zero-amount credits are accepted. Stakeholders should confirm whether they should be rejected instead. |
| TC-08 | Credit with more than 2 decimal places | Fresh start | 1) Enter `2`<br>2) Enter `10.555`<br>3) Enter `1`<br>4) Enter `4` | Extra digit truncated, not rounded: "New balance: 001010.55" | "New balance: 001010.55" | Pass | Stakeholders should confirm truncation (not rounding) is the intended policy. |
| TC-09 | Credit that would exceed the maximum balance (999999.99) | Fresh start | 1) Enter `2`<br>2) Enter `999999.99`<br>3) Enter `1`<br>4) Enter `4` | Credit rejected with an error message; balance unchanged at 001000.00 | "New balance: 000999.90" | Fail | **Defect.** The balance overflows silently and is corrupted. No overflow check exists (`ADD` has no `ON SIZE ERROR`). |
| TC-10 | Credit amount larger than the field allows (1000000) | Fresh start | 1) Enter `2`<br>2) Enter `1000000`<br>3) Enter `1`<br>4) Enter `4` | Input rejected with an error message; balance unchanged at 001000.00 | "Amount credited. New balance: 001000.00" (amount silently truncated to 0.00) | Fail | **Defect.** Out-of-range input is silently truncated to 0 and reported as a successful credit. |
| TC-11 | Credit with a negative amount (-50) | Fresh start | 1) Enter `2`<br>2) Enter `-50`<br>3) Enter `1`<br>4) Enter `4` | Input rejected with an error message; balance unchanged at 001000.00 | "New balance: 001050.00" (sign dropped; treated as credit of 50) | Fail | **Defect.** The field is unsigned, so the minus sign is silently discarded. |
| TC-12 | Credit with non-numeric input (abc) | Fresh start | 1) Enter `2`<br>2) Enter `abc`<br>3) Enter `1`<br>4) Enter `4` | Input rejected with an error message; balance unchanged at 001000.00 | "Amount credited. New balance: 001000.00" (input read as 0) | Fail | **Defect.** Non-numeric input is accepted as zero and reported as a successful credit. |
| TC-13 | Debit a whole-number amount within balance | Fresh start | 1) Enter `3`<br>2) Enter `100`<br>3) Enter `1`<br>4) Enter `4` | "Amount debited. New balance: 000900.00" | Same as expected | Pass | |
| TC-14 | Debit the exact full balance | Fresh start | 1) Enter `3`<br>2) Enter `1000`<br>3) Enter `1`<br>4) Enter `4` | "Amount debited. New balance: 000000.00" | Same as expected | Pass | Debit equal to balance is allowed (`>=` rule). |
| TC-15 | Debit more than the balance | Fresh start | 1) Enter `3`<br>2) Enter `1000.01`<br>3) Enter `1`<br>4) Enter `4` | "Insufficient funds for this debit."; balance unchanged at 001000.00 | Same as expected | Pass | |
| TC-16 | Debit with zero amount | Fresh start | 1) Enter `3`<br>2) Enter `0`<br>3) Enter `1`<br>4) Enter `4` | "Amount debited. New balance: 001000.00" (balance unchanged) | Same as expected | Pass | Zero-amount debits are accepted. Stakeholders should confirm. |
| TC-17 | Debit with a negative amount (-50) | Fresh start | 1) Enter `3`<br>2) Enter `-50`<br>3) Enter `1`<br>4) Enter `4` | Input rejected with an error message; balance unchanged at 001000.00 | "New balance: 000950.00" (sign dropped; treated as debit of 50) | Fail | **Defect.** Same root cause as TC-11. A negative debit increases funds by hiding the sign. |
| TC-18 | Debit with non-numeric input (abc) | Fresh start | 1) Enter `3`<br>2) Enter `abc`<br>3) Enter `1`<br>4) Enter `4` | Input rejected with an error message; balance unchanged at 001000.00 | "Amount debited. New balance: 001000.00" (input read as 0) | Fail | **Defect.** Same root cause as TC-12. |
| TC-19 | Credit then debit in one session | Fresh start | 1) Enter `2`<br>2) Enter `100`<br>3) Enter `3`<br>4) Enter `30`<br>5) Enter `1`<br>6) Enter `4` | Credit gives 001100.00; debit gives "New balance: 001070.00"; view shows 001070.00 | Same as expected | Pass | |
| TC-20 | Debit to zero, then credit | Fresh start | 1) Enter `3`<br>2) Enter `1000`<br>3) Enter `2`<br>4) Enter `5`<br>5) Enter `1`<br>6) Enter `4` | Debit gives 000000.00; credit gives 000005.00; view shows 000005.00 | Same as expected | Pass | |
| TC-21 | Debit from a zero balance | Fresh start | 1) Enter `3`<br>2) Enter `1000`<br>3) Enter `3`<br>4) Enter `1`<br>5) Enter `1`<br>6) Enter `4` | Second debit gives "Insufficient funds for this debit."; balance 000000.00 | Same as expected | Pass | |
| TC-22 | Menu rejects choice 0 | Fresh start | 1) Enter `0`<br>2) Enter `4` | "Invalid choice, please select 1-4."; menu shown again; then exits | Same as expected | Pass | |
| TC-23 | Menu rejects choice 5 | Fresh start | 1) Enter `5`<br>2) Enter `4` | "Invalid choice, please select 1-4."; menu shown again | Same as expected | Pass | |
| TC-24 | Menu rejects non-numeric choice (A) | Fresh start | 1) Enter `A`<br>2) Enter `4` | "Invalid choice, please select 1-4." | Same as expected | Pass | |
| TC-25 | Menu rejects multi-digit choice (10) | Fresh start | 1) Enter `10`<br>2) Enter `4` | "Invalid choice, please select 1-4." | Runs View Balance ("Current balance: 001000.00"); the first digit `1` is read and the rest is ignored | Fail | **Defect.** Only the first digit of the choice is read. Typing `10` runs option 1. |
| TC-26 | Balance is not persisted between runs | Run 1 credits 100 and exits. Run 2 starts fresh. | 1) Run 1: Enter `2`, `100`, `4`<br>2) Run 2: Enter `1`, `4` | Run 2 shows "Current balance: 001000.00" (balance resets; no storage exists) | "Current balance: 001000.00" | Pass | Documents current design. Stakeholders should confirm whether persistence is required in the Node.js version. |

## Summary of Defects for Stakeholder Decision

| Area | Cases | Issue | Suggested Expected Behavior (to confirm) |
|---|---|---|---|
| Overflow | TC-09 | Balance silently corrupted above 999999.99 | Reject the credit with an error; no change |
| Input range | TC-10 | Oversized amount silently truncated to 0 | Reject with an error |
| Negative amounts | TC-11, TC-17 | Minus sign dropped; credit and debit both reverse direction | Reject negative amounts with an error |
| Non-numeric amounts | TC-12, TC-18 | Non-numeric text treated as 0 and reported as success | Reject with an error |
| Menu choice | TC-25 | `10` runs option 1 | Reject with "Invalid choice" |
| Zero amounts | TC-07, TC-16 | Zero credits and debits accepted | Confirm whether to allow |
| Rounding | TC-08 | Extra decimals truncated, not rounded | Confirm truncation policy |
| Persistence | TC-26 | Balance resets on each start | Confirm whether persistence is needed |
