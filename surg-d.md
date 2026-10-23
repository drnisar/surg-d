# Surgical D ward routine and task management

This is for managing the following aspects of surgical D unit

## Populate with doctors of the ward

We have the following categories of doctors

1. Professor
2. Associate Professor
3. Assistant Professor
4. Experiential Registrar (ER)
5. Trainee Registrar (TR)
6. Trainee Medical Officers (TMO)
7. House Officers (HO)
8. Nurses

## Roles

1. Admin as super admin for setups etc
2. Consultant for Professor, Associate Professor and Assistant Professor
3. Manager role for Experiential Registrar and Trainee Registrar
4. Doctor role for Trainee Medical Officers and House Officers
5. Nurse Role for Nurses

## Employees Record

Each employee is identified by the following minimum

1. Unique MR Number. Full is "K0360000001100", out of this string "K03" is the hospital identifier for Khyber Teaching Hospital, "6" is the employee type, next two zeroes are for family dependents. Last 4 digits are known as employee code. Before the last 4 digits, zeroes are incoroporated to make the whole number a 14 digit number. To summarize it is Hospital code (length 3) + employee type (1) + self (two zeroes) + employee code (length 8)
2. Full Name
3. Email id
4. Official email Id
5. Phone number "country code" + "phone number". Slash the first digit in the phone number if it is a zero.
6. Designation as mentioned above
7. Role according to the designation

## Form for employees data
1. New form entry
2. Edit already registered 

## Display the data of employees
1. in tabulated and sortable way
2. Assign role visible to 

## Duty Roster
1. On call consultant for a full day
2. For Doctors (TMOs and HOs), there are two routine shifts i.e. Morning (8 am to 8 pm) and Night (8 pm to next morning 8 am)
3. On each shift there is one or more TMOs and one or more HOs
4. Place of duty
    - Ward
    - OPD
    - Surgical Assessment Unit (SAU)
    - Operating Room (OR)
