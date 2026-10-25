export const javaModule = {
  id: "java-programming",
  courseId: "java-programming",
  title: "Java Programming – Complete Course",
  category: "Computer Science Core",
  level: "Beginner to Advanced",
  rating: 4.94,
  reviewsCount: 8200,
  studentsCount: "240k+",
  instructor: "MRCET Department of Information Technology",
  bannerGradient: "linear-gradient(135deg, #b45309 0%, #f59e0b 100%)",
  badge: "University Curriculum • B.Tech IT",
  description: "Comprehensive Java programming covering OOP fundamentals, inheritance, polymorphism, interfaces, exception handling, multithreading, file I/O, collections, GUI with AWT/Swing, and JDBC. Based on B.Tech II Year curriculum.",
  highlights: [
    "OOP principles: classes, objects, encapsulation, constructors, static members",
    "Inheritance, method overriding, abstract classes, interfaces, and packages",
    "Exception handling with try-catch-finally and user-defined exceptions",
    "Multithreading: thread lifecycle, synchronization, inter-thread communication",
    "GUI programming with AWT/Swing and database connectivity with JDBC"
  ],
  modules: [
    {
      id: "java-m1",
      title: "Unit I: Java Basics, OOP & Classes",
      chapters: [
        {
          id: "java-m1-c1",
          title: "Chapter 1: Introduction to Java & Object-Oriented Programming",
          lessons: [
            {
              id: "java-m1-c1-l1",
              title: "History of Java, OOP Concepts, Data Types & Variables",
              estimatedReadTime: "20 min read",
              lastReviewedDate: "2026-10-20",
              reviewStatus: "verified",
              objectives: [
                "Understand the history, design goals, and evolution of Java.",
                "Differentiate Procedure-Oriented Programming (POP) from Object-Oriented Programming (OOP).",
                "Identify OOP characteristics: encapsulation, inheritance, polymorphism, abstraction.",
                "Use Java primitive data types, variables, constants, and type casting.",
                "Write simple standalone Java programs with main() method."
              ],
              prerequisites: [
                { title: "Basic programming concepts (variables, loops, functions)" },
                { title: "Understanding of C or any procedural language is helpful" }
              ],
              notes: `## Unit I: Java Programming Fundamentals

---

## Introduction to Java

Java is a **class-based, object-oriented programming language** designed to have as few implementation dependencies as possible. Java programs compile to bytecode that runs on the Java Virtual Machine (JVM), making it platform-independent.

**Key Design Goals:**
- **Simple** — Derived from C/C++ with unnecessary complexities removed
- **Object-Oriented** — Everything is organized around objects and classes
- **Platform Independent** — "Write Once, Run Anywhere" via JVM
- **Secure** — No explicit pointer manipulation; bytecode verification
- **Robust** — Strong type checking, exception handling, garbage collection
- **Multithreaded** — Built-in support for concurrent programming

---

## Two Programming Paradigms

### Procedure-Oriented Programming (POP)

In POP, the problem is solved as a **sequence of tasks (functions)**:

**Characteristics of POP:**
- Emphasis on *doing* actions (functions/procedures)
- Large programs divided into functions
- Most functions share global data
- Data moves openly between functions
- Top-down design approach
- Languages: C, FORTRAN, PASCAL, COBOL

**Drawback:** Does not model real-world problems well. In large programs, it's hard to track which function modifies which data, making maintenance difficult.

---

### Object-Oriented Programming (OOP)

OOP organizes a program around **objects** (data + operations):

**Characteristics of OOP:**
- Emphasis on *data* (objects)
- Programs divided into objects (classes)
- Data is hidden (encapsulated) inside objects
- Objects communicate through methods
- Supports reusability and modularity
- Bottom-up design approach
- Languages: Java, C++, Python, C#

---

## Core OOP Concepts

### 1. Encapsulation
Wrapping data (fields) and methods into a single unit (class). Data is accessed only through well-defined methods (getters/setters).

### 2. Inheritance
A class (subclass) acquires properties and behaviors of another class (superclass). Promotes **code reuse**.

### 3. Polymorphism
Same method name behaves differently based on the object type. Achieved through method overloading and overriding.

### 4. Abstraction
Hiding implementation details; exposing only what is necessary. Achieved using abstract classes and interfaces.

---

## Java Data Types

### Primitive Data Types

| Type | Size | Range | Default |
|---|---|---|---|
| \`byte\` | 1 byte | -128 to 127 | 0 |
| \`short\` | 2 bytes | -32,768 to 32,767 | 0 |
| \`int\` | 4 bytes | -2^31 to 2^31-1 | 0 |
| \`long\` | 8 bytes | -2^63 to 2^63-1 | 0L |
| \`float\` | 4 bytes | ±3.4e38 | 0.0f |
| \`double\` | 8 bytes | ±1.7e308 | 0.0 |
| \`char\` | 2 bytes | 0 to 65535 (Unicode) | '\\u0000' |
| \`boolean\` | 1 bit | true or false | false |

### Variable Declaration

\`\`\`java
int age = 20;
double salary = 55000.50;
char grade = 'A';
boolean isStudent = true;
final int MAX = 100;  // constant
\`\`\`

### Type Conversion and Casting

**Implicit (Widening):** smaller → larger type (automatic)
\`\`\`java
int i = 42;
long l = i;       // int → long (automatic)
double d = l;     // long → double (automatic)
\`\`\`

**Explicit (Narrowing):** larger → smaller type (manual cast required)
\`\`\`java
double d = 9.99;
int i = (int) d;  // 9 (truncates decimal)
\`\`\`

---

## Your First Java Program

\`\`\`java
// File: HelloWorld.java
public class HelloWorld {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
        System.out.println("Welcome to Java Programming");
    }
}
\`\`\`

**Compilation & Execution:**
\`\`\`bash
javac HelloWorld.java    # Compile → HelloWorld.class (bytecode)
java HelloWorld          # Run on JVM
\`\`\`

---

## Classes and Objects

A **class** is a blueprint (template). An **object** is an instance of a class.

\`\`\`java
class Student {
    // Fields (attributes)
    String name;
    int age;
    double marks;

    // Method (behavior)
    void display() {
        System.out.println("Name: " + name);
        System.out.println("Age: " + age);
        System.out.println("Marks: " + marks);
    }
}

public class Main {
    public static void main(String[] args) {
        Student s1 = new Student();   // Create object
        s1.name = "Arjun";
        s1.age = 20;
        s1.marks = 85.5;
        s1.display();
    }
}
\`\`\`

---

## Constructors

A **constructor** initializes an object when it is created. Same name as class, no return type.

\`\`\`java
class Student {
    String name;
    int age;

    // Default Constructor
    Student() {
        name = "Unknown";
        age = 0;
    }

    // Parameterized Constructor
    Student(String n, int a) {
        name = n;
        age = a;
    }

    // Copy Constructor
    Student(Student s) {
        name = s.name;
        age = s.age;
    }

    void display() {
        System.out.println(name + ", Age: " + age);
    }
}
\`\`\`

---

## Static Members

Static fields and methods belong to the **class**, not individual objects:

\`\`\`java
class Counter {
    static int count = 0;   // shared by all objects

    Counter() {
        count++;
    }

    static int getCount() {
        return count;
    }
}

// Usage:
Counter c1 = new Counter();
Counter c2 = new Counter();
System.out.println(Counter.getCount());  // 2
\`\`\``,
              codeExamples: [
                {
                  title: "Complete Class with Constructors & Methods",
                  language: "java",
                  code: `class BankAccount {
    private String owner;
    private double balance;
    private static int accountCount = 0;

    // Parameterized constructor
    BankAccount(String owner, double initialBalance) {
        this.owner = owner;
        this.balance = initialBalance;
        accountCount++;
    }

    void deposit(double amount) {
        if (amount > 0) {
            balance += amount;
            System.out.println("Deposited: " + amount);
        }
    }

    boolean withdraw(double amount) {
        if (amount > 0 && amount <= balance) {
            balance -= amount;
            System.out.println("Withdrawn: " + amount);
            return true;
        }
        System.out.println("Insufficient balance!");
        return false;
    }

    void display() {
        System.out.println("Owner: " + owner + " | Balance: " + balance);
    }

    static int getAccountCount() { return accountCount; }
}

public class Main {
    public static void main(String[] args) {
        BankAccount acc1 = new BankAccount("Arjun", 5000);
        BankAccount acc2 = new BankAccount("Priya", 10000);

        acc1.deposit(2000);
        acc1.withdraw(1000);
        acc1.display();

        System.out.println("Total accounts: " + BankAccount.getAccountCount());
    }
}`,
                  explanation: "A complete bank account class demonstrating encapsulation (private fields), parameterized constructor, methods, and static member for shared state."
                }
              ],
              assignment: {
                title: "Java OOP Basics",
                difficulty: "Easy",
                description: "Build Java classes demonstrating OOP fundamentals.",
                tasks: [
                  "Create a Circle class with radius field, constructor, and methods for area() and circumference().",
                  "Create a Student class with name, rollNo, marks. Add constructor, display(), and a static method totalStudents().",
                  "Demonstrate type casting: convert double to int and int to double with output.",
                  "Create a Temperature class that stores Celsius and provides methods toCelsius() and toFahrenheit()."
                ],
                starterCode: `class Circle {
    double radius;

    Circle(double r) {
        radius = r;
    }

    double area() {
        return Math.PI * radius * radius;
    }

    double circumference() {
        return 2 * Math.PI * radius;
    }

    void display() {
        System.out.printf("Radius: %.2f%n", radius);
        System.out.printf("Area: %.2f%n", area());
        System.out.printf("Circumference: %.2f%n", circumference());
    }
}

public class Main {
    public static void main(String[] args) {
        Circle c = new Circle(5.0);
        c.display();
    }
}`,
                expectedOutput: "Radius: 5.00\nArea: 78.54\nCircumference: 31.42"
              },
              quiz: [
                { question: "What is the size of int in Java?", options: ["2 bytes", "4 bytes", "8 bytes", "Platform dependent"], answer: 1, explanation: "In Java, int is always 4 bytes (32 bits) regardless of platform — this is unlike C/C++." },
                { question: "Which OOP principle wraps data and methods into a single unit?", options: ["Inheritance", "Polymorphism", "Encapsulation", "Abstraction"], answer: 2, explanation: "Encapsulation bundles data (fields) and methods that operate on that data into a class unit." },
                { question: "What is a constructor?", options: ["A method that returns an object", "A method with the same name as the class and no return type", "A static method for object creation", "A method called automatically at program end"], answer: 1, explanation: "A constructor has the same name as the class, no return type (not even void), and is called automatically when an object is created with new." },
                { question: "What keyword is used to access the current object in Java?", options: ["self", "current", "this", "me"], answer: 2, explanation: "The 'this' keyword refers to the current object instance. It's used to distinguish instance variables from local variables with the same name." }
              ]
            }
          ]
        }
      ]
    },
    {
      id: "java-m2",
      title: "Unit II: Inheritance, Polymorphism, Interfaces & Packages",
      chapters: [
        {
          id: "java-m2-c1",
          title: "Chapter 1: Inheritance & Polymorphism",
          lessons: [
            {
              id: "java-m2-c1-l1",
              title: "Inheritance Types, super Keyword, Method Overriding & Abstract Classes",
              estimatedReadTime: "22 min read",
              lastReviewedDate: "2026-10-20",
              reviewStatus: "verified",
              objectives: [
                "Implement single, multilevel, and hierarchical inheritance in Java.",
                "Use the super keyword to access parent class members and constructor.",
                "Differentiate method overloading from method overriding.",
                "Declare and use abstract classes and abstract methods.",
                "Prevent inheritance and overriding using the final keyword."
              ],
              prerequisites: [
                { title: "Unit I: Java Basics, Classes & Objects" }
              ],
              notes: `## Unit II: Inheritance & Polymorphism

---

## Inheritance

Inheritance is the mechanism where one class **acquires** the properties and behaviors of another class.

- **Superclass (Parent)** — the class being inherited from
- **Subclass (Child)** — the class that inherits
- Keyword: \`extends\`

\`\`\`java
class Animal {
    String name;
    void eat() { System.out.println(name + " eats food."); }
    void breathe() { System.out.println(name + " breathes."); }
}

class Dog extends Animal {
    void bark() { System.out.println(name + " barks: Woof!"); }
}

// Usage:
Dog d = new Dog();
d.name = "Rex";
d.eat();    // Inherited from Animal
d.breathe(); // Inherited from Animal
d.bark();   // Own method
\`\`\`

---

## Types of Inheritance in Java

| Type | Description |
|---|---|
| **Single** | One parent → one child |
| **Multilevel** | A → B → C (chain) |
| **Hierarchical** | One parent → multiple children |
| **Multiple** | NOT supported via classes; use interfaces |

\`\`\`java
// Multilevel Inheritance
class Vehicle { void move() { System.out.println("Vehicle moves"); } }
class Car extends Vehicle { void horn() { System.out.println("Car horns"); } }
class ElectricCar extends Car { void charge() { System.out.println("EV charges"); } }

// Hierarchical Inheritance
class Shape { double area() { return 0; } }
class Circle extends Shape { /* own area */ }
class Rectangle extends Shape { /* own area */ }
\`\`\`

---

## super Keyword

\`super\` refers to the **parent class**:

\`\`\`java
class Animal {
    String name;
    Animal(String name) { this.name = name; }
    void display() { System.out.println("Animal: " + name); }
}

class Dog extends Animal {
    String breed;

    Dog(String name, String breed) {
        super(name);         // Call parent constructor
        this.breed = breed;
    }

    void display() {
        super.display();     // Call parent method
        System.out.println("Breed: " + breed);
    }
}
\`\`\`

---

## Method Overloading vs Method Overriding

### Method Overloading (Compile-time Polymorphism)
Same method name, different parameters — in the **same class**:

\`\`\`java
class Calculator {
    int add(int a, int b) { return a + b; }
    double add(double a, double b) { return a + b; }
    int add(int a, int b, int c) { return a + b + c; }
}
\`\`\`

### Method Overriding (Runtime Polymorphism)
Subclass redefines a method from the parent class — **same signature**:

\`\`\`java
class Animal {
    void makeSound() { System.out.println("Some animal sound"); }
}

class Cat extends Animal {
    @Override
    void makeSound() { System.out.println("Meow!"); }
}

class Dog extends Animal {
    @Override
    void makeSound() { System.out.println("Woof!"); }
}

// Runtime polymorphism:
Animal a;
a = new Cat();
a.makeSound();  // Meow! (decided at runtime)
a = new Dog();
a.makeSound();  // Woof!
\`\`\`

---

## Abstract Classes

An **abstract class** cannot be instantiated; it provides a template:

\`\`\`java
abstract class Shape {
    String color;

    Shape(String color) { this.color = color; }

    abstract double area();      // Must be implemented by subclass
    abstract double perimeter();

    void display() {  // Concrete method
        System.out.println("Color: " + color);
        System.out.printf("Area: %.2f%n", area());
    }
}

class Circle extends Shape {
    double radius;

    Circle(String color, double radius) {
        super(color);
        this.radius = radius;
    }

    @Override
    double area() { return Math.PI * radius * radius; }

    @Override
    double perimeter() { return 2 * Math.PI * radius; }
}

class Rectangle extends Shape {
    double length, width;

    Rectangle(String color, double l, double w) {
        super(color);
        length = l;
        width = w;
    }

    @Override
    double area() { return length * width; }

    @Override
    double perimeter() { return 2 * (length + width); }
}
\`\`\`

---

## Interfaces

An **interface** defines a contract — what a class must do (not how):

\`\`\`java
interface Drawable {
    void draw();                     // abstract by default
    default void print() {           // default method (Java 8+)
        System.out.println("Printing shape");
    }
}

interface Resizable {
    void resize(double factor);
}

class Circle implements Drawable, Resizable {
    double radius;

    Circle(double r) { radius = r; }

    @Override
    public void draw() {
        System.out.println("Drawing circle with radius " + radius);
    }

    @Override
    public void resize(double factor) {
        radius *= factor;
    }
}
\`\`\`

**Key differences: Interface vs Abstract Class**

| Feature | Interface | Abstract Class |
|---|---|---|
| Instantiation | Cannot | Cannot |
| Multiple inheritance | Yes (implements many) | No (extends one) |
| Fields | public static final only | Can have all types |
| Methods | Abstract + default + static | Abstract + concrete |

---

## Packages

Packages organize related classes and avoid naming conflicts:

\`\`\`java
// File: com/company/math/Calculator.java
package com.company.math;

public class Calculator {
    public int add(int a, int b) { return a + b; }
}

// File: Main.java
import com.company.math.Calculator;

public class Main {
    public static void main(String[] args) {
        Calculator calc = new Calculator();
        System.out.println(calc.add(5, 3));  // 8
    }
}
\`\`\``,
              codeExamples: [
                {
                  title: "Polymorphism with Abstract Classes",
                  language: "java",
                  code: `abstract class Employee {
    String name;
    int id;

    Employee(String name, int id) {
        this.name = name;
        this.id = id;
    }

    abstract double calculateSalary();

    void display() {
        System.out.println("ID: " + id + " | Name: " + name +
            " | Salary: " + calculateSalary());
    }
}

class FullTimeEmployee extends Employee {
    double monthlySalary;

    FullTimeEmployee(String name, int id, double salary) {
        super(name, id);
        monthlySalary = salary;
    }

    @Override
    double calculateSalary() { return monthlySalary; }
}

class ContractEmployee extends Employee {
    double hourlyRate;
    int hoursWorked;

    ContractEmployee(String name, int id, double rate, int hours) {
        super(name, id);
        hourlyRate = rate;
        hoursWorked = hours;
    }

    @Override
    double calculateSalary() { return hourlyRate * hoursWorked; }
}

public class Main {
    public static void main(String[] args) {
        Employee[] staff = {
            new FullTimeEmployee("Arjun", 101, 50000),
            new ContractEmployee("Priya", 102, 500, 80),
            new FullTimeEmployee("Ravi", 103, 45000)
        };

        double total = 0;
        for (Employee e : staff) {
            e.display();
            total += e.calculateSalary();
        }
        System.out.println("Total Payroll: " + total);
    }
}`,
                  explanation: "Runtime polymorphism: Employee array holds different types. calculateSalary() dispatches to the correct subclass implementation at runtime."
                }
              ],
              assignment: {
                title: "Inheritance & Interfaces",
                difficulty: "Medium",
                description: "Build an object-oriented hierarchy using inheritance and interfaces.",
                tasks: [
                  "Create a Shape hierarchy (abstract class Shape → Circle, Rectangle, Triangle) with area() and perimeter() methods.",
                  "Create an interface Comparable with compare() method. Implement it in a Student class to compare by marks.",
                  "Demonstrate multilevel inheritance: Vehicle → Car → ElectricCar with appropriate fields and methods.",
                  "Create an interface Printable and implement it in multiple classes to demonstrate polymorphism."
                ],
                starterCode: `// Shape hierarchy
abstract class Shape {
    abstract double area();
    abstract double perimeter();
    
    void display() {
        System.out.printf("Area: %.2f, Perimeter: %.2f%n", area(), perimeter());
    }
}

class Triangle extends Shape {
    double a, b, c;
    
    Triangle(double a, double b, double c) {
        this.a = a; this.b = b; this.c = c;
    }
    
    @Override
    double perimeter() { return a + b + c; }
    
    @Override
    double area() {
        double s = perimeter() / 2;
        return Math.sqrt(s * (s-a) * (s-b) * (s-c)); // Heron's formula
    }
}`,
                expectedOutput: "Area: 6.00, Perimeter: 12.00 (for Triangle 3,4,5)"
              },
              quiz: [
                { question: "Which keyword is used to call a parent class constructor in Java?", options: ["parent()", "super()", "base()", "this()"], answer: 1, explanation: "super() calls the parent class constructor and must be the first statement in the child constructor." },
                { question: "Can Java classes implement multiple interfaces?", options: ["No", "Yes, using implements", "Yes, using extends", "Only abstract classes can"], answer: 1, explanation: "Java supports multiple interface implementation using 'implements Interface1, Interface2'. Multiple class inheritance is not supported." },
                { question: "What is method overriding?", options: ["Same name, different parameters in same class", "Same name and signature in parent and child class", "Creating multiple constructors", "Calling super class methods"], answer: 1, explanation: "Method overriding is redefining a parent class method in the child class with the same name, return type, and parameters." },
                { question: "Which modifier prevents a method from being overridden?", options: ["static", "private", "final", "abstract"], answer: 2, explanation: "The 'final' keyword on a method prevents subclasses from overriding it. 'final' on a class prevents inheritance entirely." }
              ]
            }
          ]
        }
      ]
    },
    {
      id: "java-m3",
      title: "Unit III: Exception Handling & Multithreading",
      chapters: [
        {
          id: "java-m3-c1",
          title: "Chapter 1: Exception Handling & Multithreading",
          lessons: [
            {
              id: "java-m3-c1-l1",
              title: "try-catch-finally, Custom Exceptions, Thread Lifecycle & Synchronization",
              estimatedReadTime: "24 min read",
              lastReviewedDate: "2026-10-20",
              reviewStatus: "verified",
              objectives: [
                "Explain the benefits and classification of exceptions in Java.",
                "Use try, catch, throw, throws, and finally effectively.",
                "Create user-defined exception classes.",
                "Understand thread lifecycle: new, runnable, blocked, waiting, terminated.",
                "Create threads using Thread class and Runnable interface.",
                "Implement thread synchronization to avoid race conditions."
              ],
              prerequisites: [
                { title: "Unit II: Inheritance, Interfaces, Packages" }
              ],
              notes: `## Unit III: Exception Handling & Multithreading

---

## Benefits of Exception Handling

Without exceptions, programs crash with cryptic messages. Exception handling:
- Keeps **normal code separate** from error-handling code
- **Propagates errors** up the call stack automatically
- Allows **recovery** from errors instead of crashing
- Provides **meaningful error messages**

---

## Exception Hierarchy

\`\`\`
Throwable
├── Error (JVM errors — don't catch these)
│   ├── OutOfMemoryError
│   └── StackOverflowError
└── Exception
    ├── Checked Exceptions (must handle)
    │   ├── IOException
    │   ├── FileNotFoundException
    │   └── SQLException
    └── Unchecked Exceptions (RuntimeException)
        ├── NullPointerException
        ├── ArrayIndexOutOfBoundsException
        ├── ArithmeticException
        └── NumberFormatException
\`\`\`

**Checked Exceptions** — Must be caught or declared with \`throws\`  
**Unchecked Exceptions** — Optional to handle (programming bugs)

---

## try-catch-finally

\`\`\`java
try {
    // Code that might throw exception
    int result = 10 / 0;
} catch (ArithmeticException e) {
    System.out.println("Error: " + e.getMessage());
} catch (Exception e) {
    System.out.println("General Error: " + e.getMessage());
} finally {
    System.out.println("This always runs.");
}
\`\`\`

### Multiple catch Blocks

\`\`\`java
try {
    int[] arr = new int[5];
    arr[10] = 50;                     // ArrayIndexOutOfBoundsException
    String s = null;
    s.length();                        // NullPointerException
} catch (ArrayIndexOutOfBoundsException e) {
    System.out.println("Array index error: " + e.getMessage());
} catch (NullPointerException e) {
    System.out.println("Null pointer: " + e.getMessage());
} finally {
    System.out.println("Cleanup done.");
}
\`\`\`

---

## throw and throws

**\`throw\`** — explicitly throw an exception:
\`\`\`java
void validateAge(int age) {
    if (age < 0) {
        throw new IllegalArgumentException("Age cannot be negative: " + age);
    }
}
\`\`\`

**\`throws\`** — declare that a method might throw checked exceptions:
\`\`\`java
import java.io.*;

void readFile(String filename) throws IOException, FileNotFoundException {
    FileReader fr = new FileReader(filename);
    BufferedReader br = new BufferedReader(fr);
    String line;
    while ((line = br.readLine()) != null) {
        System.out.println(line);
    }
    br.close();
}
\`\`\`

---

## User-Defined Exceptions

\`\`\`java
class InsufficientFundsException extends Exception {
    double amount;

    InsufficientFundsException(double amount) {
        super("Insufficient funds! Short by: " + amount);
        this.amount = amount;
    }
}

class BankAccount {
    double balance;

    BankAccount(double balance) { this.balance = balance; }

    void withdraw(double amount) throws InsufficientFundsException {
        if (amount > balance) {
            throw new InsufficientFundsException(amount - balance);
        }
        balance -= amount;
        System.out.println("Withdrawn: " + amount + " | Balance: " + balance);
    }
}
\`\`\`

---

## Multithreading

A **thread** is a lightweight subprocess — the smallest unit of processing.

### Thread Lifecycle

\`\`\`
New → Runnable → Running → Blocked/Waiting → Terminated
\`\`\`

1. **New** — Thread object created (\`new Thread()\`)
2. **Runnable** — After \`start()\` is called
3. **Running** — Thread scheduler picks it up
4. **Blocked/Waiting** — Waiting for I/O or another thread
5. **Terminated** — \`run()\` method completes

### Creating Threads — Method 1: Extend Thread

\`\`\`java
class MyThread extends Thread {
    String name;

    MyThread(String name) { this.name = name; }

    @Override
    public void run() {
        for (int i = 1; i <= 5; i++) {
            System.out.println(name + " - Count: " + i);
            try { Thread.sleep(100); } catch (InterruptedException e) {}
        }
    }
}

MyThread t1 = new MyThread("Thread-A");
MyThread t2 = new MyThread("Thread-B");
t1.start();
t2.start();
\`\`\`

### Creating Threads — Method 2: Implement Runnable

\`\`\`java
class PrintTask implements Runnable {
    String message;
    int count;

    PrintTask(String msg, int count) { message = msg; this.count = count; }

    @Override
    public void run() {
        for (int i = 0; i < count; i++) {
            System.out.println(message + ": " + i);
        }
    }
}

Thread t1 = new Thread(new PrintTask("Hello", 3));
Thread t2 = new Thread(new PrintTask("World", 3));
t1.start();
t2.start();
\`\`\`

---

## Synchronization

When multiple threads share resources, **race conditions** can occur. Use \`synchronized\` to prevent this:

\`\`\`java
class Counter {
    private int count = 0;

    synchronized void increment() {
        count++;    // Only one thread at a time
    }

    int getCount() { return count; }
}

class Worker extends Thread {
    Counter counter;
    Worker(Counter c) { counter = c; }

    @Override
    public void run() {
        for (int i = 0; i < 1000; i++) {
            counter.increment();
        }
    }
}

Counter c = new Counter();
Worker w1 = new Worker(c);
Worker w2 = new Worker(c);
w1.start(); w2.start();
w1.join(); w2.join();
System.out.println("Final count: " + c.getCount()); // 2000 (always)
\`\`\``,
              codeExamples: [
                {
                  title: "Custom Exception + Multithreaded Bank System",
                  language: "java",
                  code: `class InsufficientFundsException extends Exception {
    InsufficientFundsException(double shortBy) {
        super(String.format("Insufficient funds! Short by: %.2f", shortBy));
    }
}

class SynchronizedAccount {
    private String owner;
    private double balance;

    SynchronizedAccount(String owner, double balance) {
        this.owner = owner;
        this.balance = balance;
    }

    synchronized void deposit(double amount) {
        balance += amount;
        System.out.printf("[%s] Deposited %.2f | Balance: %.2f%n",
            owner, amount, balance);
    }

    synchronized void withdraw(double amount) throws InsufficientFundsException {
        if (amount > balance) {
            throw new InsufficientFundsException(amount - balance);
        }
        balance -= amount;
        System.out.printf("[%s] Withdrew %.2f | Balance: %.2f%n",
            owner, amount, balance);
    }
}

class TransactionTask implements Runnable {
    SynchronizedAccount account;
    String txnType;
    double amount;

    TransactionTask(SynchronizedAccount acc, String type, double amt) {
        account = acc; txnType = type; amount = amt;
    }

    @Override
    public void run() {
        try {
            if (txnType.equals("deposit")) account.deposit(amount);
            else account.withdraw(amount);
        } catch (InsufficientFundsException e) {
            System.out.println("Transaction failed: " + e.getMessage());
        }
    }
}

public class Main {
    public static void main(String[] args) throws InterruptedException {
        SynchronizedAccount acc = new SynchronizedAccount("Arjun", 1000);

        Thread t1 = new Thread(new TransactionTask(acc, "deposit", 500));
        Thread t2 = new Thread(new TransactionTask(acc, "withdraw", 200));
        Thread t3 = new Thread(new TransactionTask(acc, "withdraw", 2000));

        t1.start(); t2.start(); t3.start();
        t1.join(); t2.join(); t3.join();

        System.out.println("All transactions completed.");
    }
}`,
                  explanation: "Demonstrates custom exceptions + synchronized multithreading. The synchronized keyword ensures only one thread executes deposit/withdraw at a time, preventing race conditions."
                }
              ],
              assignment: {
                title: "Exception Handling & Threads",
                difficulty: "Hard",
                description: "Build robust multi-threaded programs with full exception handling.",
                tasks: [
                  "Create a custom `InvalidMarkException` and use it in a Student class that validates marks (0-100).",
                  "Write a multithreaded program with 3 threads: one prints even numbers, one prints odd numbers, one prints squares, all from 1-20.",
                  "Create a thread-safe Stack class using synchronization with push(), pop(), and peek() methods.",
                  "Demonstrate the producer-consumer problem using wait() and notify()."
                ],
                starterCode: `class InvalidMarkException extends Exception {
    InvalidMarkException(int mark) {
        super("Invalid mark: " + mark + ". Must be between 0 and 100.");
    }
}

class Student {
    String name;
    int marks;

    void setMarks(int m) throws InvalidMarkException {
        if (m < 0 || m > 100) throw new InvalidMarkException(m);
        marks = m;
    }
}

public class Main {
    public static void main(String[] args) {
        Student s = new Student();
        s.name = "Arjun";
        try {
            s.setMarks(105);  // Should throw
        } catch (InvalidMarkException e) {
            System.out.println("Error: " + e.getMessage());
        }
        try {
            s.setMarks(85);   // Should succeed
            System.out.println("Marks set: " + s.marks);
        } catch (InvalidMarkException e) {
            System.out.println("Error: " + e.getMessage());
        }
    }
}`,
                expectedOutput: "Error: Invalid mark: 105. Must be between 0 and 100.\nMarks set: 85"
              },
              quiz: [
                { question: "Which keyword is used to explicitly throw an exception?", options: ["throws", "throw", "raise", "exception"], answer: 1, explanation: "The 'throw' keyword is used to explicitly throw an exception object. 'throws' declares that a method may throw exceptions." },
                { question: "Which block always executes in a try-catch-finally structure?", options: ["try", "catch", "finally", "All three"], answer: 2, explanation: "The finally block always executes regardless of whether an exception was thrown or caught — except in System.exit() cases." },
                { question: "What interface does a class implement to create a thread using Runnable?", options: ["Thread", "Runnable", "Callable", "Executable"], answer: 1, explanation: "Implementing the Runnable interface and overriding run() is the preferred way to create threads — it allows extending other classes too." },
                { question: "What does synchronized do to a method?", options: ["Makes it run faster", "Only one thread can execute it at a time", "Makes it static", "Allows multiple threads to share results"], answer: 1, explanation: "synchronized ensures mutual exclusion — only one thread can execute the synchronized method/block at any given time." }
              ]
            }
          ]
        }
      ]
    }
  ]
};
