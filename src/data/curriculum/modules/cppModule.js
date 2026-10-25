// C and C++ Systems Programming Curriculum Module
// Based on "C++ Tutorial - Complete Reference" (DS286 Lab Courseware)

export const cppModule = {
  id: "c-and-cpp",
  courseId: "c-and-cpp",
  title: "C and C++ Programming – Complete Course",
  category: "Computer Science Core",
  level: "Beginner to Advanced",
  rating: 4.95,
  reviewsCount: 11200,
  studentsCount: "290k+",
  instructor: "Department of Computational & Data Sciences (DS286)",
  bannerGradient: "linear-gradient(135deg, #1e3a8a 0%, #0284c7 100%)",
  badge: "Systems Programming • Complete Reference",
  description: "Exhaustive C++ curriculum based on the DS286 C++ courseware. Covers basic syntax, data types, storage classes, pointers, memory model, references, structs, OOP (classes, constructors, friend functions, inheritance, polymorphism, operator overloading), file streams, templates, and exception handling.",
  highlights: [
    "From hardware fundamentals to modern Object-Oriented design in C++",
    "Detailed pointer mechanics: address arithmetic, double pointers, dynamic heap allocation",
    "OOP mastery: encapsulation, copy constructors, destructors, friend functions, and 'this' pointer",
    "Runtime polymorphism: virtual functions, pure virtual functions, and abstract interfaces",
    "Operator overloading: arithmetic, unary, stream insertion (<<) and extraction (>>)",
    "Advanced systems features: fstream file I/O, template metaprogramming, and C++ exceptions"
  ],
  modules: [
    {
      id: "cpp-m1",
      title: "Module 1: C++ Basics, Environment, Variables & Operators",
      chapters: [
        {
          id: "cpp-m1-c1",
          title: "Chapter 1: Overview, Syntax, Data Types & Storage Classes",
          lessons: [
            {
              id: "cpp-m1-c1-l1",
              title: "C++ Overview, Compilation Pipeline, Identifiers & Primitive Data Types",
              estimatedReadTime: "20 min read",
              lastReviewedDate: "2026-10-20",
              reviewStatus: "verified",
              objectives: [
                "Understand C++ evolution from C and the ANSI standard.",
                "Trace the GNU g++ compile and execution cycle (preprocessing, compiling, assembling, linking).",
                "Define primitive built-in types: bool, char, int, float, double, void, wchar_t.",
                "Apply type modifiers: signed, unsigned, short, long.",
                "Declare custom aliases with typedef and enumerated types with enum."
              ],
              prerequisites: [
                { title: "Basic understanding of computer programming" }
              ],
              notes: `## C++ Overview & Compilation Pipeline

C++ is a **statically typed, compiled, general-purpose, case-sensitive, free-form programming language** that supports procedural, object-oriented, and generic programming.

Developed by Bjarne Stroustrup in 1979 at Bell Labs, C++ was originally named "C with Classes" and later renamed C++ in 1983 (++ is the C increment operator).

---

## 1. The Compilation Pipeline

To run a C++ program on Linux or Windows via GCC/g++:
1. **Preprocessor (\`cpp\`)**: Expands directives (\`#include\`, \`#define\`), strips comments.
2. **Compiler (\`g++\`)**: Translates preprocessed source code into assembly language.
3. **Assembler (\`as\`)**: Converts assembly code into binary machine object code (\`.o\` / \`.obj\`).
4. **Linker (\`ld\`)**: Resolves library symbols (such as standard I/O) and produces the final executable.

\`\`\`bash
# Compile and link in one step:
g++ -Wall -O2 main.cpp -o main

# Run the executable:
./main
\`\`\`

---

## 2. Basic Program Structure

\`\`\`cpp
#include <iostream>

// using namespace directive exposes std symbols to global scope
using namespace std;

// main() is where program execution begins
int main() {
    cout << "Hello, Codificator World!" << endl; // Prints to stdout
    return 0; // Exit status 0 indicates success
}
\`\`\`

---

## 3. Primitive Built-In Data Types

| Type | Keyword | Typical Size | Typical Value Range |
|---|---|---|---|
| Boolean | \`bool\` | 1 byte | \`true\` or \`false\` |
| Character | \`char\` | 1 byte | -128 to 127 or 0 to 255 |
| Integer | \`int\` | 4 bytes | -2,147,483,648 to 2,147,483,647 |
| Single Float | \`float\` | 4 bytes | 7 decimal digits precision |
| Double Float | \`double\` | 8 bytes | 15 decimal digits precision |
| Valueless | \`void\` | 0 bytes | Absence of type |
| Wide Character | \`wchar_t\` | 2 or 4 bytes | 1 wide character |

---

## 4. Type Modifiers & \`typedef\`

C++ allows modifiers before primitive types: \`signed\`, \`unsigned\`, \`short\`, \`long\`.

\`\`\`cpp
typedef unsigned long int ulong; // Create type alias
ulong bigNumber = 4294967295UL;

enum Color { RED, GREEN, BLUE }; // Enumerated type
Color c = GREEN; // c has integer value 1
\`\`\``,
              quiz: [
                {
                  question: "What is the return type of the main() function in standard C++?",
                  options: ["void", "int", "char", "bool"],
                  correctIndex: 1,
                  explanation: "Standard ANSI C++ requires main() to return an integer (int) exit code."
                }
              ]
            },
            {
              id: "cpp-m1-c1-l2",
              title: "Storage Classes: auto, register, static, extern & mutable",
              estimatedReadTime: "18 min read",
              lastReviewedDate: "2026-10-20",
              reviewStatus: "verified",
              objectives: [
                "Understand the scope, visibility, and lifetime of variables.",
                "Contrast automatic stack variables with static variables.",
                "Use the 'static' keyword to preserve variable state across function invocations.",
                "Use the 'extern' keyword to share global symbols across translation units.",
                "Apply the 'mutable' specifier to allow modifying const class members."
              ],
              prerequisites: [
                { title: "Lesson 1: C++ Overview, Syntax & Primitive Types" }
              ],
              notes: `## Storage Classes in C++

A storage class defines the **scope (visibility)** and **lifetime (longevity)** of variables and/or functions within a C++ program.

---

## 1. Storage Class Specifiers

1. **\`auto\`**: The default storage class for local variables. Stored on the function call stack; created when entering the block and destroyed upon exiting.
2. **\`register\`**: Hints to the compiler to store the variable in a CPU register for high-speed access instead of RAM. (Address-of operator \`&\` cannot be applied in C).
3. **\`static\`**:
   - Instructs the compiler to keep a local variable in existence during the entire lifetime of the program.
   - Preserves its value between successive function calls!
   - Stored in the \`.data\` or \`.bss\` segment.
4. **\`extern\`**:
   - Gives a reference to a global variable defined in another file (different translation unit).
5. **\`mutable\`**:
   - Applies only to class objects. Allows a member of an object to override \`const\`-ness. A mutable member can be modified by a \`const\` member function.

---

## 2. Example: \`static\` Local Variable

\`\`\`cpp
#include <iostream>
using namespace std;

void counterFunction() {
    // static variable initialized only once when program loads
    static int count = 0;
    count++;
    cout << "Counter: " << count << endl;
}

int main() {
    counterFunction(); // Prints: Counter: 1
    counterFunction(); // Prints: Counter: 2
    counterFunction(); // Prints: Counter: 3
    return 0;
}
\`\`\``,
              quiz: [
                {
                  question: "Where are static local variables stored in memory?",
                  options: ["On the call stack", "In CPU registers", "In the data segment (.data/.bss)", "On the dynamic heap"],
                  correctIndex: 2,
                  explanation: "Static variables persist for the lifetime of the program and are allocated in the data segment, not on the call stack."
                }
              ]
            }
          ]
        }
      ]
    },
    {
      id: "cpp-m2",
      title: "Module 2: Pointers, References & Dynamic Memory",
      chapters: [
        {
          id: "cpp-m2-c1",
          title: "Chapter 2: Pointer Arithmetic, References & Dynamic Allocation",
          lessons: [
            {
              id: "cpp-m2-c1-l1",
              title: "Pointers, Address Arithmetic, Pointer-to-Pointer & Arrays",
              estimatedReadTime: "25 min read",
              lastReviewedDate: "2026-10-20",
              reviewStatus: "verified",
              objectives: [
                "Understand pointers as variables storing physical memory addresses.",
                "Use the address-of operator (&) and dereference operator (*).",
                "Perform pointer arithmetic scaled by sizeof(dataType).",
                "Manipulate arrays through pointer arithmetic (array decay).",
                "Understand pointers to pointers (double pointers: int**)."
              ],
              prerequisites: [
                { title: "Module 1: Variables, Memory & Storage Classes" }
              ],
              notes: `## C++ Pointers

A **pointer** is a variable whose value is the memory address of another variable.

---

## 1. Declaration and Dereferencing

\`\`\`cpp
int var = 20;   // Actual variable declaration
int* ptr = &var; // Store address of var in pointer variable ptr

cout << "Value of var: " << var << endl;       // 20
cout << "Address of var: " << &var << endl;     // e.g., 0x7ffd5e
cout << "Address in ptr: " << ptr << endl;     // 0x7ffd5e
cout << "Value via dereference *ptr: " << *ptr << endl; // 20
\`\`\`

---

## 2. Pointer Arithmetic

Pointers can be incremented (\`++\`), decremented (\`--\`), or added to an integer (\`ptr + n\`).
The step size is determined by the size of the data type:
$$\\text{New Address} = \\text{Current Address} + n \\times \\text{sizeof}(\\text{Type})$$

\`\`\`cpp
int arr[5] = {10, 20, 30, 40, 50};
int* p = arr; // arr decays to pointer to first element

for (int i = 0; i < 5; i++) {
    cout << "*(p + " << i << ") = " << *(p + i) << endl;
}
\`\`\`

---

## 3. Pointer to Pointer (Double Pointer)

A pointer to a pointer is a variable that stores the address of another pointer variable:

\`\`\`cpp
int val = 3000;
int* ptr1 = &val;
int** ptr2 = &ptr1;

cout << "Value: " << val << endl;         // 3000
cout << "*ptr1: " << *ptr1 << endl;       // 3000
cout << "**ptr2: " << **ptr2 << endl;     // 3000
\`\`\``,
              quiz: [
                {
                  question: "If pointer p of type int* has address 1000 and sizeof(int) is 4 bytes, what address does (p + 3) evaluate to?",
                  options: ["1003", "1004", "1012", "1016"],
                  correctIndex: 2,
                  explanation: "Pointer addition is scaled by sizeof(type): 1000 + 3 * 4 = 1012."
                }
              ]
            },
            {
              id: "cpp-m2-c1-l2",
              title: "References vs Pointers & Dynamic Memory with new and delete",
              estimatedReadTime: "22 min read",
              lastReviewedDate: "2026-10-20",
              reviewStatus: "verified",
              objectives: [
                "Contrast C++ References with Pointers (syntax, nullability, re-assignment).",
                "Pass parameters by reference to avoid copying overhead.",
                "Allocate and free heap memory with new and delete.",
                "Avoid common pitfalls: memory leaks, dangling pointers, and double-free errors."
              ],
              prerequisites: [
                { title: "Lesson 1: Pointers and Pointer Arithmetic" }
              ],
              notes: `## References vs Pointers & Dynamic Memory

### 1. References in C++
A **reference** is an alias for an already existing variable:
\`\`\`cpp
int i = 17;
int& r = i; // r is a reference to i
r = 20;     // Modifies i directly!
\`\`\`

**Differences between References and Pointers:**
- A reference **cannot be NULL**; it must be bound to valid storage when declared.
- Once initialized to an object, a reference **cannot be rebound** to refer to another object.
- Syntax does not require the dereference operator \`*\`.

---

## 2. Dynamic Memory Management: \`new\` and \`delete\`

In C++, memory in heap is allocated with \`new\` and released with \`delete\`:

\`\`\`cpp
#include <iostream>
using namespace std;

int main() {
    // 1. Allocate single integer
    int* pInt = new int(42);
    cout << "Value: " << *pInt << endl;
    delete pInt; // Free memory
    pInt = nullptr;

    // 2. Allocate dynamic array
    int size = 5;
    double* pArray = new double[size];
    for (int i = 0; i < size; i++) {
        pArray[i] = i * 1.5;
    }

    // Must use delete[] for arrays!
    delete[] pArray;
    pArray = nullptr;

    return 0;
}
\`\`\``,
              quiz: [
                {
                  question: "Which operator must be used to deallocate memory allocated with 'new int[50]'?",
                  options: ["delete", "delete[]", "free()", "release()"],
                  correctIndex: 1,
                  explanation: "Arrays allocated with new[] must strictly be released with delete[] to invoke destructors and return array memory."
                }
              ]
            }
          ]
        }
      ]
    },
    {
      id: "cpp-m3",
      title: "Module 3: Object-Oriented C++ Programming",
      chapters: [
        {
          id: "cpp-m3-c1",
          title: "Chapter 3: Classes, Encapsulation, Constructors & this Pointer",
          lessons: [
            {
              id: "cpp-m3-c1-l1",
              title: "Classes, Objects, Access Specifiers, Constructors & Destructors",
              estimatedReadTime: "28 min read",
              lastReviewedDate: "2026-10-20",
              reviewStatus: "verified",
              objectives: [
                "Define C++ classes with public, private, and protected access specifiers.",
                "Implement member functions inside and outside class definition using scope resolution operator (::).",
                "Construct default, parameterized, and copy constructors.",
                "Implement destructors for deterministic resource cleanup.",
                "Understand the 'this' pointer as an implicit parameter pointing to the invoking object."
              ],
              prerequisites: [
                { title: "Module 2: References and Dynamic Memory Allocation" }
              ],
              notes: `## Classes & Objects in C++

A **class** in C++ is a user-defined blueprint that binds data attributes and member functions together. An **object** is an instance of a class.

---

## 1. Access Specifiers

- **\`public\`**: Members are accessible from anywhere outside the class.
- **\`private\`**: Members can only be accessed by member functions and friend functions of the class (default access).
- **\`protected\`**: Members can be accessed in the class itself and in derived (child) classes.

---

## 2. Complete Class Implementation

\`\`\`cpp
#include <iostream>
using namespace std;

class Box {
private:
    double length;
    double breadth;
    double height;

public:
    // Default constructor
    Box() : length(1.0), breadth(1.0), height(1.0) {
        cout << "Box default created\n";
    }

    // Parameterized constructor using initialization list
    Box(double l, double b, double h) : length(l), breadth(b), height(h) {
        cout << "Box parameterized created\n";
    }

    // Copy constructor
    Box(const Box& other) {
        length = other.length;
        breadth = other.breadth;
        height = other.height;
        cout << "Box copied\n";
    }

    // Destructor
    ~Box() {
        cout << "Box destroyed\n";
    }

    // Member function using this pointer
    double getVolume() {
        return this->length * this->breadth * this->height;
    }
};

int main() {
    Box b1(2.0, 3.0, 4.0);
    cout << "Volume: " << b1.getVolume() << endl; // 24
    return 0;
}
\`\`\``,
              quiz: [
                {
                  question: "What is the default access specifier for members of a class in C++?",
                  options: ["public", "protected", "private", "internal"],
                  correctIndex: 2,
                  explanation: "In C++, all members declared in a class default to private access unless specified otherwise (unlike structs where default is public)."
                }
              ]
            },
            {
              id: "cpp-m3-c1-l2",
              title: "Friend Functions, Friend Classes & Static Members",
              estimatedReadTime: "22 min read",
              lastReviewedDate: "2026-10-20",
              reviewStatus: "verified",
              objectives: [
                "Define friend functions to grant external functions access to private members.",
                "Define friend classes.",
                "Declare static member variables shared across all instances of a class.",
                "Implement static member functions that operate without an implicit 'this' pointer."
              ],
              prerequisites: [
                { title: "Lesson 1: Classes, Access Specifiers & Constructors" }
              ],
              notes: `## Friend Functions & Static Members

### 1. Friend Function
A **friend function** of a class is defined outside that class's scope, yet it has the right to access all private and protected members of the class.

\`\`\`cpp
#include <iostream>
using namespace std;

class Distance {
private:
    int meters;

public:
    Distance() : meters(0) {}

    // Declare friend function
    friend void addValue(Distance& d, int val);
};

// Definition of friend function (does not use Distance:: scope resolution)
void addValue(Distance& d, int val) {
    d.meters += val; // Access private member directly!
    cout << "New distance: " << d.meters << " meters\n";
}

int main() {
    Distance d;
    addValue(d, 50);
    return 0;
}
\`\`\`

---

## 2. Static Members

- **Static Variable**: Only one copy exists for the entire class, shared by all instances. Must be defined outside the class in global scope.
- **Static Member Function**: Can be called without creating an object using \`ClassName::functionName()\`. Cannot access non-static data members because it has no \`this\` pointer!`,
              quiz: [
                {
                  question: "Why cannot a static member function access regular instance member variables in C++?",
                  options: [
                    "Because it runs in kernel space",
                    "Because it has no implicit 'this' pointer to a specific object",
                    "Because static functions cannot take arguments",
                    "Because it is marked const"
                  ],
                  correctIndex: 1,
                  explanation: "Static member functions belong to the class, not to any object instance, and therefore do not receive an implicit this pointer."
                }
              ]
            }
          ]
        },
        {
          id: "cpp-m3-c2",
          title: "Chapter 4: Inheritance, Polymorphism & Operator Overloading",
          lessons: [
            {
              id: "cpp-m3-c2-l1",
              title: "Inheritance Types & Base/Derived Class Initialization",
              estimatedReadTime: "24 min read",
              lastReviewedDate: "2026-10-20",
              reviewStatus: "verified",
              objectives: [
                "Understand code reuse through single, multiple, hierarchical, and multilevel inheritance.",
                "Understand public, protected, and private inheritance modes.",
                "Invoke base class constructors from derived class constructor initialization lists.",
                "Resolve diamond problem ambiguity using virtual base classes."
              ],
              prerequisites: [
                { title: "Chapter 3: Classes & Constructors" }
              ],
              notes: `## Inheritance in C++

Inheritance allows a new class (**derived class**) to inherit properties and behaviors from an existing class (**base class**).

---

## 1. Syntax & Access Modes

\`\`\`cpp
class Derived : access-mode Base {
    // class body
};
\`\`\`

| Base Access | Public Inheritance | Protected Inheritance | Private Inheritance |
|---|---|---|---|
| **public** | public | protected | private |
| **protected** | protected | protected | private |
| **private** | Not accessible | Not accessible | Not accessible |

---

## 2. Base Class Constructor Calling

Base class constructor executes **before** derived class constructor:

\`\`\`cpp
#include <iostream>
using namespace std;

class Shape {
protected:
    int width, height;

public:
    Shape(int w, int h) : width(w), height(h) {}
};

class Rectangle : public Shape {
public:
    // Call base constructor in member initializer list
    Rectangle(int w, int h) : Shape(w, h) {}

    int getArea() {
        return width * height;
    }
};

int main() {
    Rectangle rect(5, 7);
    cout << "Area: " << rect.getArea() << endl; // 35
    return 0;
}
\`\`\``,
              quiz: [
                {
                  question: "In what order are constructors executed when an object of a derived class is created?",
                  options: [
                    "Derived class constructor first, then Base class constructor",
                    "Base class constructor first, then Derived class constructor",
                    "Only Derived class constructor executes",
                    "Execution order is undefined"
                  ],
                  correctIndex: 1,
                  explanation: "The Base class constructor always executes first to initialize inherited members before the Derived class constructor runs."
                }
              ]
            },
            {
              id: "cpp-m3-c2-l2",
              title: "Polymorphism, Virtual Functions, Abstract Classes & Operator Overloading",
              estimatedReadTime: "28 min read",
              lastReviewedDate: "2026-10-20",
              reviewStatus: "verified",
              objectives: [
                "Differentiate compile-time polymorphism (overloading) from runtime polymorphism (virtual functions).",
                "Understand the virtual table (vtable) and virtual pointer (vptr) mechanism.",
                "Declare pure virtual functions (virtual void func() = 0) and abstract base classes.",
                "Overload unary and binary operators (+, ==, <<) in C++."
              ],
              prerequisites: [
                { title: "Lesson 1: Inheritance and Base Class Initialization" }
              ],
              notes: `## Polymorphism & Operator Overloading

Polymorphism means "many forms".

---

## 1. Runtime Polymorphism via \`virtual\` Functions

By declaring a member function as \`virtual\` in the base class, C++ uses dynamic binding to resolve function calls at runtime based on the actual object type rather than the pointer type:

\`\`\`cpp
#include <iostream>
using namespace std;

class Shape {
public:
    // Pure virtual function makes Shape an Abstract Class
    virtual void draw() = 0;
    virtual ~Shape() {} // Virtual destructor is crucial!
};

class Circle : public Shape {
public:
    void draw() override {
        cout << "Drawing Circle\n";
    }
};

class Square : public Shape {
public:
    void draw() override {
        cout << "Drawing Square\n";
    }
};

int main() {
    Shape* s1 = new Circle();
    Shape* s2 = new Square();

    s1->draw(); // Prints: Drawing Circle
    s2->draw(); // Prints: Drawing Square

    delete s1;
    delete s2;
    return 0;
}
\`\`\`

---

## 2. Operator Overloading

C++ allows redefining how operators work with user-defined types:

\`\`\`cpp
class Complex {
private:
    double real, imag;

public:
    Complex(double r = 0, double i = 0) : real(r), imag(i) {}

    // Overload binary '+' operator
    Complex operator+(const Complex& other) const {
        return Complex(real + other.real, imag + other.imag);
    }

    void display() const {
        cout << real << " + " << imag << "i" << endl;
    }
};
\`\`\``,
              quiz: [
                {
                  question: "What makes a C++ class an abstract base class?",
                  options: [
                    "Having private constructors",
                    "Containing at least one pure virtual function (= 0)",
                    "Having only static members",
                    "Inheriting from multiple base classes"
                  ],
                  correctIndex: 1,
                  explanation: "A class containing at least one pure virtual function (e.g. virtual void f() = 0) is an abstract class and cannot be instantiated."
                }
              ]
            }
          ]
        }
      ]
    },
    {
      id: "cpp-m4",
      title: "Module 4: Advanced C++ — Streams, Templates & Exceptions",
      chapters: [
        {
          id: "cpp-m4-c1",
          title: "Chapter 5: File I/O, Templates & Exception Handling",
          lessons: [
            {
              id: "cpp-m4-c1-l1",
              title: "File Streams (fstream, ifstream, ofstream) & Binary I/O",
              estimatedReadTime: "22 min read",
              lastReviewedDate: "2026-10-20",
              reviewStatus: "verified",
              objectives: [
                "Understand the C++ I/O stream hierarchy (iostream, fstream).",
                "Open files in different modes: ios::in, ios::out, ios::app, ios::binary.",
                "Perform formatted reading and writing to disk files.",
                "Check stream state flags: eof(), fail(), good(), is_open()."
              ],
              prerequisites: [
                { title: "Module 1: Basic I/O with cin and cout" }
              ],
              notes: `## File Streams in C++

The \`<fstream>\` header defines three primary classes:
- **\`ofstream\`**: Represents output file stream (writing to files).
- **\`ifstream\`**: Represents input file stream (reading from files).
- **\`fstream\`**: General file stream (reading and writing).

---

## 1. Writing and Reading Text Files

\`\`\`cpp
#include <iostream>
#include <fstream>
#include <string>
using namespace std;

int main() {
    // 1. Open for writing (creates or truncates file)
    ofstream outFile("example.txt", ios::out);
    if (outFile.is_open()) {
        outFile << "Codificator C++ Tutorial" << endl;
        outFile << "Line 2: High Performance Systems\n";
        outFile.close();
    }

    // 2. Open for reading
    ifstream inFile("example.txt", ios::in);
    string line;
    if (inFile.is_open()) {
        while (getline(inFile, line)) {
            cout << "Read line: " << line << endl;
        }
        inFile.close();
    }

    return 0;
}
\`\`\``,
              quiz: [
                {
                  question: "Which file mode flag opens a file for writing and appends all output to the end without truncating?",
                  options: ["ios::trunc", "ios::app", "ios::in", "ios::ate"],
                  correctIndex: 1,
                  explanation: "ios::app (append mode) preserves existing file contents and appends all new data to the end."
                }
              ]
            },
            {
              id: "cpp-m4-c1-l2",
              title: "Generic Programming: Templates & Exception Handling",
              estimatedReadTime: "25 min read",
              lastReviewedDate: "2026-10-20",
              reviewStatus: "verified",
              objectives: [
                "Implement Function Templates for generic algorithms.",
                "Implement Class Templates (generic containers like stacks and vectors).",
                "Structure robust exception handling with try, catch, and throw.",
                "Inherit from std::exception to create custom exception types."
              ],
              prerequisites: [
                { title: "Chapter 3: Classes and OOP Fundamentals" }
              ],
              notes: `## Templates & Exception Handling

### 1. Function and Class Templates
Templates allow writing generic code independent of data types:

\`\`\`cpp
#include <iostream>
using namespace std;

// Function template
template <typename T>
T findMax(T a, T b) {
    return (a > b) ? a : b;
}

// Class template
template <typename T>
class SafeArray {
    T arr[10];
public:
    void set(int idx, T val) { arr[idx] = val; }
    T get(int idx) { return arr[idx]; }
};

int main() {
    cout << findMax<int>(10, 20) << endl;       // 20
    cout << findMax<double>(3.14, 2.71) << endl; // 3.14
    return 0;
}
\`\`\`

---

## 2. Exception Handling: \`try\`, \`catch\`, \`throw\`

\`\`\`cpp
#include <iostream>
#include <stdexcept>
using namespace std;

double divide(double a, double b) {
    if (b == 0.0) {
        throw runtime_error("Division by zero error!");
    }
    return a / b;
}

int main() {
    try {
        double result = divide(10.0, 0.0);
        cout << "Result: " << result << endl;
    } catch (const exception& e) {
        cerr << "Caught exception: " << e.what() << endl;
    }
    return 0;
}
\`\`\``,
              quiz: [
                {
                  question: "What keyword is used in C++ to transfer control out of a block when an anomalous runtime event occurs?",
                  options: ["catch", "try", "throw", "raise"],
                  correctIndex: 2,
                  explanation: "The throw keyword throws an exception that transfers execution to the nearest matching catch block."
                }
              ]
            }
          ]
        }
      ]
    }
  ]
};
