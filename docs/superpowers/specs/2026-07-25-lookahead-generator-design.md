# 3-Week Lookahead Generator: design

Date: 2026-07-25
Status: awaiting Dana's review
Author: drafted by Claude, decisions made by Dana

## Why this exists

An earlier attempt built six digital products for the CPM Toolkit storefront by
reimplementing Dana's deliverables from generic assumptions, without reading the
canonical specifications in `~/.claude/skills/`. An audit of all six against
their canonical specs returned CONTRADICTS on every one, with 34 explicit ban
violations and 74 divergences. Five of the six could not work as static
templates at any quality level, because the value of the canonical tools is
computation from a Primavera P6 XER and a blank spreadsheet cannot compute.

This design replaces that approach. It sells the computation, and it runs
Dana's existing tested code rather than an imitation of it.

Full audit: `Downloads\CPM Toolkit - Product Audit vs Canonical Skills - 2026-07-25.html`

## Decisions taken (by Dana, 2026-07-25)

| Question | Decision |
|---|---|
| What does the customer receive | A tool that processes their own XER, not a static file |
| Where does processing happen | Runs Dana's Python builders unchanged, no reimplementation |
| Which deliverable first | 3-Week Lookahead. One product at a time. |
| Payment model | One-time purchase, unlimited use |
| Packaging | Windows desktop application (Approach A) |

Health Review was considered first and rejected: selling a DCMA-14 assessment
cheaply anchors the price of CPP's forensic consulting, and CPP cannot invoice
yet (no registered entity, no HST, no bank, no E&O). The lookahead does not
cannibalize consulting work, because nobody hires a forensic scheduler to
produce a lookahead.

Desktop packaging was chosen over a hosted web tool because one-time payment
plus perpetual server hosting is structurally mismatched: the seller pays
hosting for years on a single payment. Desktop also keeps the buyer's schedule
on the buyer's machine, which preserves the privacy position already stated on
the site and keeps Dana out of custody of other companies' confidential
project data.

## Architecture

One Windows executable built with PyInstaller. No installer, no Python required
on the buyer's machine, no runtime dependencies.

Bundled unchanged from Dana's skills:

- `lookahead_builder.py` and `field_readiness.py` (`3-week-lookahead` skill)
- `xer_parser` (`xer-parser` skill)
- `xlsx_shell` (`_cpp_common`), for `blueprint_palette`, `base_fonts`,
  `SANS_NAME`, `MONO_NAME` only
- `openpyxl`

### The single most important architectural rule

The bundled copies must be byte-identical to the skill sources. A test hashes
both and fails the build on any difference. If the builder is improved in
`~/.claude/skills/`, the test fails until the app is rebuilt from it.

This guard exists because silent divergence from the canonical code is the
exact failure that produced the six rejected products.

### Packaging constraint that makes the rule achievable

`lookahead_builder.py` locates its siblings relative to its own file:

```python
_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
_XER_PARSER_SCRIPTS = os.path.normpath(os.path.join(
    _SCRIPT_DIR, '..', '..', 'xer-parser', 'scripts'))
_CPP_COMMON_SCRIPTS = os.path.normpath(os.path.join(
    _SCRIPT_DIR, '..', '..', '_cpp_common', 'scripts'))
```

It then guards each with `os.path.isdir()` before adding to `sys.path`.

Therefore the scripts must be shipped as PyInstaller **data files that preserve
the skills directory tree**, extracted to a real directory at runtime
(`sys._MEIPASS`), not frozen as ordinary modules:

```
<bundle>/skills/3-week-lookahead/scripts/lookahead_builder.py
<bundle>/skills/3-week-lookahead/scripts/field_readiness.py
<bundle>/skills/xer-parser/scripts/xer_parser.py
<bundle>/skills/_cpp_common/scripts/xlsx_shell.py
```

The GUI wrapper inserts `<bundle>/skills/3-week-lookahead/scripts` into
`sys.path` and imports normally. Because `__file__` then resolves to a real
path on disk with the expected `../../` neighbours, the builder's own path
logic works untouched.

If the scripts were frozen as modules instead, `__file__` would point inside
the archive, `os.path.isdir()` would return False, the imports would fail, and
the natural fix would be to edit the builder. That is precisely the divergence
this design exists to prevent, which is why the packaging method is a
requirement and not an implementation detail.

Layer 7 of the test plan (executable output must match source-Python output
byte for byte) is what proves this packaging actually worked.

### Branding

`lookahead_builder.py` writes its own title block and imports only the palette
and fonts from `xlsx_shell`. It never calls the CPP-branded title block helper,
so no "CRITICAL PATH PARTNERS" mark appears in the output. Nothing to strip.

One leak does exist and is handled in the interface: `build_lookahead()` and its
CLI both default `company='Matheson Constructors Limited'`. A customer's
deliverable must never carry that string.

### Licensing

None. Gumroad delivers the download only to purchasers, and that is the gate.
A phone-home activation check would add network failure modes, a privacy
question, and support burden, to defend against piracy that does not exist at
this volume. This is a deliberate YAGNI decision and can be revisited if piracy
becomes a real, observed problem.

## Interface

A single window. The form mirrors the required inputs in the canonical
`SKILL.md` and adds no field the specification does not have. Specifically it
adds no TRADE, WHO, CREW, or "done by who" column, and no editorial commentary
field, all of which the specification explicitly bans.

### Required, no default

- **XER file**: file picker.
- **Project title**: line 1 of the title band.
- **Company**: footer text. Blank by default. Generation is blocked while
  empty. This is the guard against the `Matheson Constructors Limited` default.

### Pre-filled from the XER, editable

- **Data date**: read from `PROJECT.last_recalc_date`, displayed `DD-MMM-YY`.
- **Window start Monday**: computed as the next Monday after the data date. The
  builder raises if the value is not a Monday, so the control permits only
  Mondays rather than surfacing that exception to the buyer.
- **Prepared date**: defaults to today.

### Optional, using the builder's own defaults

- **Subtitle**: line 2, may be blank.
- **Work days per week**: 5, 6, or 7. Default 5, per the specification's note
  that 5 suits commercial and institutional work and 6 is an explicit opt-in.
- **Section order**: `start` or `wbs`. Default `start`.
- **Prior week's workbook**: optional file picker. Supplying it enables the
  NEW THIS WEEK bullet.

### Multi-project XERs

If the file contains more than one project, the app calls `list_projects()` and
presents them with their incomplete counts for the buyer to choose. Single
project files skip this step and use the only project present.

### Output

A save dialog, then the four-tab workbook exactly as `build_lookahead()`
produces it: `3-Week Overview`, `Week 1`, `Week 2`, `Week 3`.

## Error handling

No Python traceback is ever shown, and no file is produced that looks correct
but is silently wrong. The second property matters more than the first.

| Condition | Behaviour |
|---|---|
| File is not a parseable XER | Plain message: not a Primavera P6 XER export |
| XER parses but contains no activities | Stated plainly as empty, not presented as a clean result |
| No activities fall in the chosen window | Warn before generating, show the schedule's actual date range |
| Window start is not a Monday | Prevented at the control, since the builder raises |
| Company field blank | Generation blocked |
| Output file locked open in Excel | Message to close it and retry |
| `date_warnings` returned by the parser | Surfaced before generating, never swallowed |
| Anything unanticipated | Caught at top level, shown with a copyable detail block |

The two dangerous cases are an empty XER and an empty window, because both can
otherwise produce plausible-looking output. An earlier build of the free web
tool rendered an empty file as a clean "No flags" result; that class of bug is
what these checks exist to prevent.

## Test plan

Nine layers. Nothing ships unless every layer is green. Layers 1, 2 and 7 are
the ones that would have caught the earlier failure.

1. **Canonical suite stays green.** All 44 existing tests
   (`test_lookahead_builder.py` 29, `test_lookahead_v2.py` 15) run before every
   build. Verified green on 2026-07-25 before this design was written. A
   failure means the change is wrong, not the test.
2. **Drift guard.** Hash bundled copies against the skill sources; any
   difference fails the build.
3. **Brand-leak guard.** Generate with a known company string, unzip the xlsx,
   grep every XML part for `Matheson`, `Barclay`, `Critical Path Partners`,
   `CPP`. Any hit fails.
4. **Determinism and golden file.** Extend the existing
   `test_deterministic_output` with a committed reference workbook, compared
   cell by cell including fills, fonts and number formats.
5. **Real-XER corpus.** Run against real files already on disk: CON-05 (440
   activities), the Ritz file (28 activities, 3 calendars including a 6-day and
   a 7-day), Clayton, Gaylea. Assert 4 tabs, 10 columns A-J, en-dash tab
   naming, critical rows flagged where TF is at or below zero, calendars
   decoded with correct holiday counts.
6. **Live Excel verification.** Open each generated workbook in real Excel via
   COM, force a full recalculation, scan every used cell with
   `WorksheetFunction.IsError`. Assert tab count and names, freeze panes at A7,
   landscape, Tabloid paper, fit-to-width. Note: the `IsError` result is
   sometimes COM-wrapped as a one-tuple, which is truthy in Python and produces
   false positives on plain text cells; unwrap before evaluating.
7. **Packaged-executable test.** Run the built `.exe` against a fixture and
   diff its output against the same build run from source Python. They must be
   identical. PyInstaller silently breaks imports and bundled data files, so
   testing the Python while shipping the executable tests the wrong artifact.
8. **Adversarial edge cases.** Empty file; header-only; no TASK table; an
   all-complete schedule; a multi-project XER; 5, 6 and 7-day calendars; a
   window entirely before and entirely after the schedule range; unicode in
   project names; a very large XER for runtime; output locked open in Excel;
   prior-week workbook both supplied and absent.
9. **Dana's acceptance.** Dana generates lookaheads from real projects with the
   app and compares them against what the skill produces directly. He is the
   specification; nothing is correct until he says the output is. Hard gate.

**Release check:** submit the built executable to VirusTotal before release.
PyInstaller binaries routinely trip antivirus heuristics, and discovering that
from a customer is worse than discovering it in advance.

## Explicitly out of scope

- The other five products. One at a time was Dana's instruction. The five
  existing drafts stay unpublished pending separate decisions.
- Any hosted or server-side processing.
- Accounts, login, subscription billing, or license activation.
- macOS or Linux builds. P6 users run Windows.
- Changes to `lookahead_builder.py` itself. If the builder needs improvement,
  that is separate work done in the skill with its tests, after which the app
  is rebuilt from it.

## Open items for Dana

1. **Price.** Not set. A one-time desktop tool used weekly is worth
   considerably more than the $4.99 the storefront currently lists, but no
   number has been researched or agreed.
2. **Product name.** "CPM Toolkit Lookahead Generator" is a placeholder.
3. **Support expectations.** A desktop app cannot be hotfixed remotely. How
   updates reach existing buyers is undecided.
