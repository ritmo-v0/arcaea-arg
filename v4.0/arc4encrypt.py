import monoalpha as MA
import sys



# MA.setTable(custom_table)
# Above method not functional currently

# Unknown characters will be substituted with '*'
while(True):
    cipher = list(input("Enter cipher: "))

    # class 'tuple'
    result = MA.encrypt(cipher)
    print(result)
    print('\n')