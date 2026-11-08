# Implementation status

This file records verified progress, not a completion claim. Existing worktree edits must be preserved. Commit/push are not required.

| Requirement | Implementation | Tests | UI verification |
|---|---|---|---|
| Remaining-time token completion | Resource/merchant/node support; exchange from coins; crop timers not covered | Resource pricing, exchange, reload and duplicate completion covered | Pending |
| Requirement navigation | Product source links; node prerequisite links to its structure/quest | Pending interaction coverage | Pending |
| Remove valley production | Map production objects, badges and hit targets removed; existing jobs are accessible through the workshop trader while preserving their saved state | Existing running job, full-board storage and repeat claim covered | Trader-to-job flow checked in browser |
| Seven functional sequential shops | Not done; only existing merchant moved to bottom row | Merchant job/payout migration covered | Full flow pending |
| Four-level limits and value-preserving migration | Not done | Pending | Pending |
| Resource reward flights | Delivery events and fly effects; hidden cells now derived from active effects to avoid stranded invisible items after queue eviction | Delivery persistence and duplicate claims covered | Pending latest changes |
| Small screens and overflow | Partial labels/symbols; 320×568 previously failed | Pending | Must fix and rerun |
| Worker purchase | Capacity and verification boundary implemented; real store unconfigured | Capacity/reload/areas covered | Pending |
| Five-merge | Existing engine retained; feedback corrected | Assembly, stats and output tested | Full current build pending |
| Lumi | Six portrait renders corrected from original source | Asset coverage | Contact sheet inspected |

## Required next implementation

1. Define all seven traders, sequential unlock state, recipes, and a distinct four-level trade currency with a real use.
2. Relocate valley outputs and pending jobs without removing access to quest ingredients.
3. Migrate non-resource items above level four with an explicit value-preserving, idempotent rule; update all content consumers before enabling the cap.
4. Complete navigation, all relevant timer interfaces and layout fixes.
5. Run full tests and real browser flows at 320×568, 390×844 and a wider viewport; check old saves, queue interruption, all trader unlocks, full storage, and console errors.

Do not describe the overall request as complete until every acceptance criterion has evidence.

## Latest verification (2026-11-08)

- Added a confirmation guard tying a hurry command to the original completion timestamp and workshop area. An outdated confirmation cannot charge a replacement job or a job on another board. Automated coverage added.
- `npm test`: 116 tests passed; `npm run typecheck` passed. Baseline lint: 0 errors, 29 warnings.
- The 320×568 web E2E run using installed Chrome still fails at the first-merge tutorial hint; the measured board cell is approximately 22 px. The test used the server already listening on port 8081; verify that server is serving the latest build before attributing the failure to the current source.
- Seven-trader migration, product-level conversion, valley removal, and comprehensive UI validation remain outstanding.

## Valley production relocation

The map no longer renders or opens production nodes. Their existing job state and timers remain available from the workshop trader, so reserved inputs and outputs survive without a destructive save conversion. Product source navigation and the ready-job tab indicator now point to the workshop. This is a compatibility bridge, not the requested seven-trader implementation; that larger task remains outstanding.
