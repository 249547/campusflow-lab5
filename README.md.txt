# CampusFlow – Lab 5: Advanced JavaScript

**Name:** Muhammad Raziullah
**Roll No:** 249547
**Course:** Air University, Islamabad

## Requirements
- Node.js 18 or later (no external packages needed)

## How to run
| Task | Topic | Command |
|------|-------|---------|
| 1 | Admission decision and data sanitization | `node task1.js` |
| 2 | Academic performance engine | `node task2.js` |
| 3 | Safe student profile update | `node task3.js` |
| 4 | User hierarchy and dynamic `this` | `node task4.js` |
| 5 | Modular transcript processing | `cd task5 && node main.js` |
| 6 | Callback-based registration | `node task6.js` |
| 7 | Promise-based registration | `node task7.js` |
| 8 | Async/await API aggregator | `node task8.js` |

## Design notes
- Task 1: an applicant is SELECTED if eligible with merit >= 80 and fee paid; WAITING if eligible but merit is 70-79.99 or fee unpaid.
- Source data is never mutated; sort() is always applied to a copy.
- No closures are used as a solution technique.