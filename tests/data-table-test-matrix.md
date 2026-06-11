# Data Table QA Matrix

Scope: filtering, sorting, searching, and production-level table state behavior for the reservations data table.

Executable coverage is implemented in [`tests/data-table.logic.test.ts`](/Users/nast_brrr/Downloads/AuraStay_uk_localized/tests/data-table.logic.test.ts).

## Searching

| Test ID | Test name | Objective | Preconditions | Test steps | Test data | Expected result | Priority |
|---|---|---|---|---|---|---|---|
| SRCH-001 | Exact reservation number match | Verify exact-match search returns a single reservation | Reservations table is loaded | Enter the full reservation number in the global search field | `4821` | Only reservation `4821` is shown | Critical |
| SRCH-002 | Partial guest name match | Verify substring search returns all matching guests | Reservations table is loaded | Search by a partial guest token | `maria` | Reservations for `Anna Maria` and `Anna-Maria Hrytsenko` are shown | High |
| SRCH-003 | Case-insensitive search | Verify search ignores case | Reservations table is loaded | Search using uppercase characters | `OLENA` | Reservation for `Olena Shevchenko` is shown | High |
| SRCH-004 | Special characters search | Verify special characters are matched correctly | Reservations table is loaded | Search using punctuation and `+` characters | `o'connor+vip` | Reservation for `Iryna O'Connor` is shown | High |
| SRCH-005 | Search with extra spaces | Verify leading and trailing spaces are trimmed | Reservations table is loaded | Search with spaces before and after the query | `  anna maria  ` | Reservation for `Anna Maria` is shown | Medium |
| SRCH-006 | Empty search query | Verify blank input restores the full dataset | Reservations table is loaded | Clear the search field | Empty string or whitespace | All reservations are visible again | Medium |
| SRCH-007 | Nonexistent record | Verify the empty-state behavior for no matches | Reservations table is loaded | Search for a value that does not exist | `does-not-exist` | Table shows no results and the empty state is displayed | High |
| SRCH-008 | Search against large dataset | Verify search remains functional on high row counts | Dataset contains 250+ reservations | Search for a known guest token | `anna` | Matching reservations are returned without UI instability or incorrect filtering | High |

## Sorting

| Test ID | Test name | Objective | Preconditions | Test steps | Test data | Expected result | Priority |
|---|---|---|---|---|---|---|---|
| SORT-001 | Numeric ascending | Verify numeric sort from low to high | Reservations table is loaded | Sort `Сума` ascending | `total_amount` | Lowest amount appears first | Critical |
| SORT-002 | Numeric descending | Verify numeric sort from high to low | Reservations table is loaded | Sort `Сума` descending | `total_amount` | Highest amount appears first | Critical |
| SORT-003 | Date ascending | Verify earliest date appears first | Reservations table is loaded | Sort `Заїзд` ascending | `check_in_date` | Oldest check-in date appears first | High |
| SORT-004 | Date descending | Verify latest date appears first | Reservations table is loaded | Sort `Виїзд` descending | `check_out_date` | Latest check-out date appears first | High |
| SORT-005 | Text ascending | Verify text sort handles guest names correctly | Reservations table is loaded | Sort `Гість` ascending | `guest` | Empty guest value is ordered predictably and text rows are sorted alphabetically | High |
| SORT-006 | Duplicate numeric values | Verify duplicate values remain stable and grouped | Reservations table is loaded | Sort `Сума` ascending | `3600` repeated across multiple rows | Rows with identical values remain adjacent and do not disappear | Medium |
| SORT-007 | Empty guest values | Verify rows with empty derived text values are sortable | Reservations table contains a reservation without guest data | Sort `Гість` ascending | `null` guest object | Reservation with no guest data is still present and does not break sorting | Medium |
| SORT-008 | Multi-sort interaction | Verify sort state can be changed without losing data integrity | Multi-sort enabled | Apply one sort, then switch to another sort direction | `total_amount`, `check_in_date` | Table updates correctly with the final requested order | Medium |

## Filtering

| Test ID | Test name | Objective | Preconditions | Test steps | Test data | Expected result | Priority |
|---|---|---|---|---|---|---|---|
| FILT-001 | Single status filter | Verify a single checkbox filter works | Reservations table is loaded | Filter by one status | `confirmed` | Only confirmed reservations are shown | Critical |
| FILT-002 | Multiple status filters | Verify checkbox multi-select works | Reservations table is loaded | Select multiple statuses | `confirmed`, `checked_in` | Only reservations in either selected status are shown | Critical |
| FILT-003 | Room and status combination | Verify multiple filters intersect correctly | Reservations table is loaded | Apply status and room number filters together | `confirmed` + `room 201` | Only the reservation matching both filters is shown | High |
| FILT-004 | Custom date range | Verify manual date range filtering | Reservations table is loaded | Apply a from/to range on the check-in date | `2026-05-23` to `2026-05-24` | Only reservations inside the range are shown | High |
| FILT-005 | Today preset | Verify date preset filtering works with current date | System date is fixed for test execution | Apply the `today` date preset | `2026-05-23` | Reservations with check-in date on 2026-05-23 are shown | High |
| FILT-006 | Long-stay preset | Verify long-stay preset logic | Reservations table is loaded | Apply the `longStays` preset | `> 7 nights` | Only long-stay reservations are shown | High |
| FILT-007 | Filter reset | Verify clearing filters restores all data | At least one filter is active | Clear the active filter(s) | Any active filter state | Full dataset is restored | High |
| FILT-008 | Conflicting filters | Verify no results are returned when filters are incompatible | Reservations table is loaded | Apply mutually exclusive filters | `checked_out` + `overdueDepartures` | Empty state is shown | High |
| FILT-009 | Invalid numeric input | Verify invalid number input does not break the table | Reservations table is loaded | Enter a non-numeric comparison value | `abc` for amount equals | No rows match and no runtime error occurs | Medium |
| FILT-010 | Invalid date range | Verify an inverted range is handled safely | Reservations table is loaded | Set `from` later than `to` | `from 2026-05-26`, `to 2026-05-23` | No rows match and the filter is safely applied | Medium |
| FILT-011 | Empty checkbox selection | Verify an empty checkbox filter produces no matches | Reservations table is loaded | Clear all selected checkbox options while the filter remains active | `[]` | No rows are returned | Low |
| FILT-012 | Combined search and filters | Verify filters and global search intersect correctly | Reservations table is loaded | Apply a status filter and then search | `confirmed` + `anna` | Only rows matching both conditions are shown | High |

## Cross-Feature and Production Scenarios

| Test ID | Test name | Objective | Preconditions | Test steps | Test data | Expected result | Priority |
|---|---|---|---|---|---|---|---|
| PROD-001 | Simultaneous filters, search, and pagination | Verify table state remains consistent when multiple controls are used together | Reservations table has pagination enabled | Search, apply a filter, then navigate pages | `search=anna`, `status=confirmed`, page size `2` | Pagination reflects the filtered result set and does not drift into stale state | Critical |
| PROD-002 | Page reset after filtering | Verify changing filters resets the visible page | User is on a later page of the table | Apply a new filter while on page 2+ | `status=confirmed` | Table returns to the first page after filter change | High |
| PROD-003 | Refresh / reload state persistence | Verify URL state survives page refresh | URL already contains sort/filter/search state | Reload the page | Encoded search, filters, and sort params | Table restores the same state after refresh | Critical |
| PROD-004 | State persistence through deep link | Verify a shared URL reproduces the same table state | A valid table state is encoded in the URL | Open the deep-linked URL in a fresh session | `sort`, `search`, `filter_*` params | The table opens with identical state | Critical |
| PROD-005 | Clear all state | Verify the clear action removes all active table state | Search, filters, and sorting are active | Use the clear-all control | Any active table state | Search, filters, and sorting are removed; URL is normalized | High |
| PROD-006 | Malformed URL parameters | Verify malformed query values do not crash state parsing | URL contains malformed table params | Open the page with invalid encoded values | Broken JSON or malformed filter payloads | Table falls back safely without crashing | High |
| PROD-007 | API failure handling | Verify the page shows an error when reservations cannot be loaded | Backend request fails | Open the reservations page while the API returns an error | Supabase error / network failure | A user-facing error banner is shown instead of an empty or broken table | Critical |
| PROD-008 | Slow network behavior | Verify loading behavior remains stable under delay | Backend response is intentionally delayed | Open the page on a throttled network | Simulated slow API response | Loading state remains visible until data is ready; no duplicate rendering or broken controls | High |

## Notes

The executable Vitest suite currently covers client-side table logic, sorting, filtering, search behavior, URL state parsing/serialization, and large-dataset stability. The API failure and slow-network scenarios are listed as production acceptance cases because they depend on the data-fetching boundary in the page layer rather than the pure table engine itself.
