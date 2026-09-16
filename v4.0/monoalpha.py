from random import shuffle
import string
import copy

monoalpha_table = {
    'a': 'E',
    'b': 'G',
    'c': '_',
    'd': 'j',
    'e': 'D',
    'f': 'v',
    'g': 'U',
    'h': 'P',
    'i': 'i',
    'j': '*',
    'k': '*',
    'l': 'h',
    'm': 'n',
    'n': 'O',
    'o': 'V',
    'p': 'r',
    'q': '*',
    'r': 'e',
    's': 'K',
    't': 'u',
    'u': 'W',
    'v': 'X',
    'w': 'f',
    'x': 'l',
    'y': 'q',
    'z': '*',

    'A': '*',
    'B': '*',
    'C': '*',
    'D': 'c',
    'E': '*',
    'F': 'J',
    'G': 'M',
    'H': 'A',
    'I': 'b',
    'J': '*',
    'K': '*',
    'L': 'a',
    'M': '*',
    'N': '*',
    'O': 'F',
    'P': 'k',
    'Q': '*',
    'R': 'Z',
    'S': 'd',
    'T': 'B',
    'U': '*',
    'V': 'X',
    'W': 'N',
    'X': '*',
    'Y': 'I',
    'Z': '*',

    '-': '-',
    ',': ',',
    '.': '.',
    '…': '…',
}

def setTable(table):
    if isinstance(table, dict):
        monoalpha_table = copy.deepcopy(table)
    else:
        raise TypeError

def inverseTable(table):
    inverse_table = {}
    for key, value in monoalpha_table.items():
        inverse_table[value] = key
    return inverse_table

def randomCipher(pool = None):
    if pool is None:
        pool = string.ascii_letters + string.punctuation
    original_pool = list(pool)
    shuffled_pool = list(pool)
    shuffle(shuffled_pool)
    monoalpha_table = dict(zip(original_pool, shuffled_pool))

def encrypt(message):
    encrypted_message = []
    for letter in message:
        encrypted_message.append(monoalpha_table.get(letter, letter))
    return ''.join(encrypted_message)

def decrypt(encrypted_message):
    inverse_monoalpha_table = inverseTable(monoalpha_table)

    decrypted_message = []
    numbers = []
    for char in encrypted_message:
        if char.isdigit():
            numbers.append(char)
            decrypted_message.append(' ')
        else:
            decrypted_message.append(inverse_monoalpha_table.get(char, '*' + char + '*'))
    return ''.join(decrypted_message), ' '.join(numbers)