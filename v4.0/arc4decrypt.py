import monoalpha as MA
import sys



# MA.setTable(custom_table)
# Above method not functional currently

# Unknown characters will be substituted with '*'
while(True):
    cipher = list(input("Enter cipher: "))

    # class 'tuple'
    result = MA.decrypt(cipher)
    print(result[0])
    print(result[1])
    print('\n')