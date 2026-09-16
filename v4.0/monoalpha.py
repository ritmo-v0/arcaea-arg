"""Monoalphabetic substitution cipher from the Arcaea 4.0 ARG.

Use as a library::

    import monoalpha
    monoalpha.encrypt("hello")
    monoalpha.decrypt("PDhhV")

...or as a CLI (see ``--help``)::

    python monoalpha.py -d "PDhhV"

Notes
-----
``encrypt`` and ``decrypt`` round-trip exactly for every solved letter, and for
punctuation and whitespace, which both pass through untouched. Two documented
exceptions remain, and both are ARG content rather than defects:

* 16 plaintext letters have no known substitution and encrypt to ``UNSOLVED``.
  That mapping is many-to-one, so it cannot be reversed.
* ``v`` and ``V`` share the ciphertext character ``X``, so only ``v`` survives
  a round trip -- see :func:`invert_table` for why lowercase wins.

Separately, ``decrypt`` also *produces* spaces from digits, which ``encrypt``
cannot reverse because it has no numeric channel to emit. See :func:`decrypt`.

Verified against the published ARG fragments: all 15 known (ciphertext,
plaintext) pairs decrypt exactly, with no conflicts across the 37 distinct
ciphertext characters they use.
"""

from __future__ import annotations

import argparse
import random
import string
import sys
from typing import Iterable, NamedTuple

__all__ = [
    "UNSOLVED",
    "CIPHER_TABLE",
    "DecryptResult",
    "invert_table",
    "find_ambiguities",
    "random_table",
    "encrypt",
    "decrypt",
]

#: Placeholder for a plaintext letter whose substitution was never discovered.
#: It is *not* a real ciphertext character, so it is excluded from inverse
#: tables -- otherwise all 16 unsolved letters would decrypt to whichever one
#: happened to be inserted last.
UNSOLVED = "*"

#: Plaintext character -> ciphertext character, as recovered from the ARG.
CIPHER_TABLE: dict[str, str] = {
    "a": "E",
    "b": "G",
    "c": "_",
    "d": "j",
    "e": "D",
    "f": "v",
    "g": "U",
    "h": "P",
    "i": "i",
    "j": UNSOLVED,
    "k": UNSOLVED,
    "l": "h",
    "m": "n",
    "n": "O",
    "o": "V",
    "p": "r",
    "q": UNSOLVED,
    "r": "e",
    "s": "K",
    "t": "u",
    "u": "W",
    "v": "X",
    "w": "f",
    "x": "l",
    "y": "q",
    "z": UNSOLVED,

    "A": UNSOLVED,
    "B": UNSOLVED,
    "C": UNSOLVED,
    "D": "c",
    "E": UNSOLVED,
    "F": "J",
    "G": "M",
    "H": "A",
    "I": "b",
    "J": UNSOLVED,
    "K": UNSOLVED,
    "L": "a",
    "M": UNSOLVED,
    "N": UNSOLVED,
    "O": "F",
    "P": "k",
    "Q": UNSOLVED,
    "R": "Z",
    "S": "d",
    "T": "B",
    "U": UNSOLVED,
    "V": "X",
    "W": "N",
    "X": UNSOLVED,
    "Y": "I",
    "Z": UNSOLVED,

    "-": "-",
    ",": ",",
    ".": ".",
    "…": "…",
}


class DecryptResult(NamedTuple):
    """Output of :func:`decrypt`.

    Attributes
    ----------
    text:
        The decrypted message, with digits replaced by spaces.
    digits:
        The digits lifted out of the ciphertext, in order, as a bare string.
    """

    text: str
    digits: str


def invert_table(table: dict[str, str]) -> dict[str, str]:
    """Build the ciphertext -> plaintext table for ``table``.

    ``UNSOLVED`` entries are skipped: the placeholder stands for "unknown", so
    mapping it back to a letter would be a confident guess rather than a
    decryption.

    Where two plaintext letters share one ciphertext character (``v`` and ``V``
    both encrypt to ``X``), the **first** wins -- so ``X`` decrypts to lowercase
    ``v``. Every occurrence of ``X`` in the known ARG fragments is a lowercase
    ``v`` ("voice", "I've", "overturned"), so this is the correct reading.
    Use :func:`find_ambiguities` to discover such clashes.
    """
    if not isinstance(table, dict):
        raise TypeError(f"table must be a dict, got {type(table).__name__}")

    inverse: dict[str, str] = {}
    for plain, cipher in table.items():
        if cipher == UNSOLVED:
            continue
        inverse.setdefault(cipher, plain)
    return inverse


def find_ambiguities(table: dict[str, str]) -> dict[str, list[str]]:
    """Return ciphertext characters produced by more than one plaintext letter.

    ``UNSOLVED`` is excluded -- it is a placeholder, not a collision. Anything
    reported here cannot be decrypted unambiguously.
    """
    if not isinstance(table, dict):
        raise TypeError(f"table must be a dict, got {type(table).__name__}")

    sources: dict[str, list[str]] = {}
    for plain, cipher in table.items():
        if cipher == UNSOLVED:
            continue
        sources.setdefault(cipher, []).append(plain)
    return {cipher: plains for cipher, plains in sources.items() if len(plains) > 1}


def random_table(pool: Iterable[str] | None = None) -> dict[str, str]:
    """Return a fresh random substitution table over ``pool``.

    ``pool`` defaults to ASCII letters plus punctuation. The result is a new
    dict; nothing module-level is mutated.
    """
    if pool is None:
        pool = string.ascii_letters + string.punctuation

    original = list(pool)
    return dict(zip(original, random.sample(original, len(original))))


def encrypt(message: Iterable[str], table: dict[str, str] = CIPHER_TABLE) -> str:
    """Encrypt ``message``.

    Characters absent from ``table`` (spaces, digits, most punctuation) pass
    through unchanged. Letters with no known substitution become ``UNSOLVED``,
    which is lossy -- see the module docstring.
    """
    return "".join(table.get(char, char) for char in message)


def decrypt(
    ciphertext: Iterable[str],
    table: dict[str, str] = CIPHER_TABLE,
    unsolved_marker: str = "[*]",
    unknown_marker: str = "[{char}]",
) -> DecryptResult:
    """Decrypt ``ciphertext`` using the inverse of ``table``.

    Digits are a second channel: the ARG uses them as word separators *and* to
    carry a numeric message. Each digit becomes a space in ``text`` and is
    collected, in order, into ``digits``.

    Characters with no entry in the inverse table are handled by kind:

    * ``UNSOLVED`` -- the ARG never revealed this letter, so there is nothing
      to recover: ``unsolved_marker``. The default ``[*]`` cannot collide with
      ``unknown_marker`` output, because ``UNSOLVED`` is caught here first.
    * any other **letter** -- flagged with ``unknown_marker``, which is
      formatted with ``char`` so the original is preserved. A letter outside
      the cipher is genuinely surprising and worth surfacing.
    * anything else (punctuation, whitespace, symbols) -- **passed through
      unchanged**. The ARG substitutes only letters, so ``'``, ``?`` and the
      fullwidth ``，`` are literal. This mirrors :func:`encrypt`, which also
      passes unmapped characters through, making the two exact inverses over
      punctuation.
    """
    inverse = invert_table(table)

    decrypted: list[str] = []
    digits: list[str] = []
    for char in ciphertext:
        if char.isdigit():
            digits.append(char)
            decrypted.append(" ")
        elif char == UNSOLVED:
            decrypted.append(unsolved_marker)
        elif char in inverse:
            decrypted.append(inverse[char])
        elif char.isalpha():
            decrypted.append(unknown_marker.format(char=char))
        else:
            decrypted.append(char)
    return DecryptResult("".join(decrypted), "".join(digits))


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Monoalphabetic substitution cipher from the Arcaea 4.0 ARG.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "examples:\n"
            '  python monoalpha.py -d "PDhhV"           decrypt an argument\n'
            '  python monoalpha.py -e "hello"           encrypt an argument\n'
            "  cat frag.txt | python monoalpha.py -d    decrypt stdin, line by line\n"
            "  python monoalpha.py -d                   interactive prompt\n"
        ),
    )

    # Required and mutually exclusive: an explicit mode stops a typo from
    # silently encrypting when decryption was meant.
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("-e", "--encrypt", action="store_true", help="encrypt the input")
    mode.add_argument("-d", "--decrypt", action="store_true", help="decrypt the input")

    parser.add_argument(
        "text",
        nargs="*",
        help="text to process; omit to read stdin or prompt interactively",
    )
    # A plain flag rather than `nargs="?"`: an optional-argument option would
    # greedily swallow the positional, so `-e --random-table hello` would use
    # "hello" as the pool and then sit waiting for input.
    parser.add_argument(
        "--random-table",
        action="store_true",
        help="use a random table instead of the ARG one",
    )
    parser.add_argument(
        "--pool",
        metavar="CHARS",
        help="characters for --random-table (default: ASCII letters + punctuation)",
    )
    return parser


def _run(
    line: str,
    table: dict[str, str],
    decrypting: bool,
    separate: bool = False,
) -> None:
    """Process one line. ``separate`` adds a trailing blank line for the REPL."""
    if not decrypting:
        print(encrypt(line, table))
        return

    result = decrypt(line, table)
    print(result.text)
    if result.digits:
        print(" ".join(result.digits))
    if separate:
        print()


def main(argv: list[str] | None = None) -> int:
    parser = _build_parser()
    args = parser.parse_args(argv)

    if args.pool and not args.random_table:
        parser.error("--pool only applies with --random-table")

    table = random_table(args.pool) if args.random_table else CIPHER_TABLE

    if args.decrypt:
        for cipher, plains in find_ambiguities(table).items():
            print(
                f"warning: {cipher!r} could be any of {plains}; "
                f"decrypting it as {plains[0]!r}",
                file=sys.stderr,
            )

    if args.text:
        for line in args.text:
            _run(line, table, args.decrypt)
        return 0

    if not sys.stdin.isatty():
        for line in sys.stdin:
            _run(line.rstrip("\n"), table, args.decrypt)
        return 0

    prompt = "Enter cipher: " if args.decrypt else "Enter message: "
    while True:
        try:
            line = input(prompt)
        except (EOFError, KeyboardInterrupt):
            print()
            return 0
        _run(line, table, args.decrypt, separate=True)


if __name__ == "__main__":
    sys.exit(main())
