# Modernize the v4.0 monoalpha cipher scripts

## Context

`v4.0/` holds three Python scripts that implement the monoalphabetic substitution cipher
from the Arcaea 4.0 ARG: a `monoalpha.py` library plus two near-identical REPL wrappers,
`arc4encrypt.py` and `arc4decrypt.py`. They work for the happy path but carry four real
bugs, and three of the four fail *silently* — the code does nothing and reports success.
One of them (`set_table`) was known-broken and papered over with a comment in both callers:

```python
# MA.setTable(custom_table)
# Above method not functional currently
```

The goal is a single, correct, modern CLI that keeps the ARG's cipher data exactly as it
is but stops the code from guessing when it doesn't know an answer.

Decisions confirmed with the user:
- Full modernization (type hints, docstrings, PEP 8 naming, argparse, stdin/argv) — **no pytest suite**.
- **Merge** the two wrappers into one script; breaking the `arc4*.py` filenames is accepted.
- The 16 letters mapping to `'*'` mean *"substitution never discovered"*. Keep the table
  byte-for-byte; just stop `decrypt` from silently resolving `'*'` to `'Z'`.

## The four bugs

1. **`setTable` is a no-op.** `monoalpha_table = copy.deepcopy(table)` binds a *local*
   name; the module global is never touched. (`monoalpha.py:66-70`)
2. **`randomCipher` is a no-op.** Same local-rebinding bug, and it returns `None`, so the
   generated table is unreachable either way. Dead code. (`monoalpha.py:78-84`)
3. **`inverseTable(table)` ignores its parameter.** It accepts `table` but iterates
   `monoalpha_table.items()`. Passing any other table silently has no effect.
   (`monoalpha.py:72-76`)
4. **The inverse table is lossy, so `decrypt` is wrong.** It is built by plain assignment,
   so later keys overwrite earlier ones. Two collision groups exist:
   - 16 plaintext letters (`j k q z A B C E J K M N Q U X Z`) all map to `'*'`. Last one
     wins, so the inverse maps `'*' → 'Z'` — every undiscovered letter decrypts to a
     confident, wrong `Z`.
   - `'v' → 'X'` and `'V' → 'X'` collide. Last wins, so `'X' → 'V'`; decrypting `X` can
     never produce a lowercase `v`.

   Net effect: the inverse has 40 entries against the table's 56.

## Root-cause fix: retire the mutable global

Bugs 1–3 are all the same shape — a module-level global plus a broken setter. Rather than
patching each with `global`, thread the table through as an optional argument. This deletes
the broken concept instead of repairing it.

- `encrypt(message, table=CIPHER_TABLE)`
- `decrypt(ciphertext, table=CIPHER_TABLE)`
- `invert_table(table)` — actually uses its argument
- `random_table(pool=None)` — **returns** a new table (use `random.sample`, not in-place `shuffle`)
- `set_table` is **removed**. Callers pass `table=` instead, which is strictly better and
  always worked. The two `# Above method not functional currently` comments go with it.

## Changes

### `v4.0/monoalpha.py` — rewrite as library + CLI entry point

**Table.** Unchanged content. Renamed `monoalpha_table` → `CIPHER_TABLE` (PEP 8 constant)
with a module constant `UNSOLVED = "*"` and a comment explaining what `'*'` means.

**`invert_table`.** Skip `UNSOLVED` values entirely — `'*'` is a placeholder, not a real
ciphertext character, so it must not appear in the inverse. For genuine collisions keep the
**first** entry rather than the last.

> ⚠️ **Behavior change to confirm on sight:** `'X'` currently decrypts to uppercase `'V'`;
> first-wins makes it lowercase `'v'`. Lowercase is the far more likely plaintext, but this
> does alter ARG output — worth eyeballing against a known ciphertext.

Add `find_ambiguities(table) -> dict[str, list[str]]` returning ciphertext chars with more
than one plaintext source, so the `v`/`V` clash is discoverable instead of hidden. The CLI
prints it as a startup warning.

**`decrypt`.** Distinguish the two "I don't know" cases, which the old `'*' + char + '*'`
marker conflated (and which collided with a literal `*`):

| Input | Meaning | Output |
| --- | --- | --- |
| `*` | the ARG never revealed this letter | `[?]` |
| char not in inverse table | no mapping for this character | `[<char>]` — original preserved |

Markers exposed as parameters with those defaults.

**Return type.** `decrypt` returns a `NamedTuple` — `DecryptResult(text, digits)` — instead
of a bare 2-tuple, so callers stop indexing `result[0]` / `result[1]`. Still tuple-compatible.
`digits` carries the raw digit sequence; the CLI applies the `' '.join(...)` formatting, so
**visible output is unchanged**.

**Digit channel.** Behavior kept as-is (digits are pulled into a second channel and replaced
by a space in the text). It is the single most surprising thing in the file and is currently
undocumented — it gets a proper docstring explaining the ARG mechanic.

**Module docstring.** State plainly that `encrypt` and `decrypt` are *not* exact inverses,
and why: spaces pass through `encrypt` but `decrypt` produces them from digits; `'*'` letters
are lossy by construction. This is ARG content, not a code defect — document, don't "fix".

Plus: type hints and docstrings throughout, `snake_case` names, `raise TypeError(...)` with
an actual message, drop the now-unused `import copy`.

### `v4.0/monoalpha.py` — CLI

```
python monoalpha.py -d "ciphertext"      # decrypt an argument
python monoalpha.py -e "plaintext"       # encrypt
echo "..." | python monoalpha.py -d      # read stdin line by line
python monoalpha.py -d                   # interactive REPL when stdin is a TTY
```

- `argparse`, with `-e/--encrypt` and `-d/--decrypt` in a **required mutually exclusive
  group** — an explicit mode prevents a typo from silently encrypting when you meant decrypt.
- `--random-table [POOL]` generates a random table, giving the repaired `random_table` a
  reason to exist (it is currently unreachable dead code).
- Guarded by `if __name__ == "__main__":`.
- The REPL exits cleanly on Ctrl-C and Ctrl-D/EOF. The old `while(True)` had no exit path
  at all and dumped a `KeyboardInterrupt` / `EOFError` traceback.

### `v4.0/arc4encrypt.py`, `v4.0/arc4decrypt.py` — delete

Their entire body is a prompt loop plus one function call. Both also carry `import sys`
(unused) and `list(input(...))` (pointless — `encrypt`/`decrypt` iterate a string directly).

Side benefit: the `arc4` prefix reads as ARC4/RC4, a real stream cipher this has nothing to
do with. `monoalpha.py` says what it actually is.

### `.editorconfig` — add a Python section

The `[*]` block sets `indent_style = tab` and `insert_final_newline = false`, which fights
PEP 8 on every `.py` file (they are currently space-indented, so the editor and the files
already disagree). Append:

```ini
[*.py]
indent_style = space
indent_size = 4
insert_final_newline = true
```

Optional and outside `v4.0/`, but it stops the editor from re-breaking the files on save.

## Verification

No Python interpreter is installed on this machine — `python`/`python3` resolve to the
Windows Store stubs (`WindowsApps\python3.exe`, exit 49). **Install Python first, or tell me
and I'll hand you the commands to run yourself.** Until then, nothing below can be executed
and the rewrite is unverified.

Once Python is available, from `v4.0/`:

1. **Round-trip on solved letters** — every letter whose mapping is not `'*'`:
   `python monoalpha.py -e "hello world"` → `PDhhV feVhj`, then decrypt it back.
   Expect `hello[ ]world`-style marking on the space, per the documented asymmetry.
2. **Bug 4, group 1** — decrypt a ciphertext containing `*`. Must yield `[?]`,
   **not** `Z`. This is the headline fix.
3. **Bug 4, group 2** — decrypt `X`. Must yield `v` (was `V`); confirm against a real ARG
   ciphertext that lowercase is the right call.
4. **Bugs 1–3** — `decrypt(text, table=my_table)` visibly uses the passed table;
   `invert_table({'a': 'Z'})` returns `{'Z': 'a'}` and nothing else;
   `random_table()` returns a populated dict rather than `None`.
5. **CLI surfaces** — argv, piped stdin, and the REPL; Ctrl-C and Ctrl-D each exit with no
   traceback; `find_ambiguities` warns about `v`/`V` → `X` on startup.
6. **Regression guard** — run a known ARG ciphertext from `v4.0/Frags/` through decrypt and
   diff against the old scripts' output. Expect differences **only** at `*` and `X`.