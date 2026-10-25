import { verifiedLicenses } from '../licenseRegistry';

export const osModule = {
  id: "operating-systems",
  courseId: "operating-systems",
  title: "Operating Systems Internals & Systems Engineering",
  category: "Computer Science Core",
  level: "Intermediate to Advanced",
  rating: 4.96,
  reviewsCount: 8900,
  studentsCount: "210k+",
  instructor: "Remzi H. Arpaci-Dusseau (OSTEP OER) & Codificator Systems Team",
  bannerGradient: "linear-gradient(135deg, #1e1b4b 0%, #4338ca 100%)",
  badge: "OER Flagship • OSTEP CC-BY",
  description: "Exhaustive exploration of kernel architectures, process virtualization, CPU scheduling algorithms, virtual memory paging/TLB, concurrency synchronization, and crash-consistent filesystems.",
  highlights: [
    "Kernel space vs User space CPU privilege rings and system call dispatch traps",
    "Multi-Level Feedback Queue (MLFQ) scheduling heuristics and starvation avoidance",
    "Two-level page table translation with Hardware Translation Lookaside Buffer (TLB)",
    "POSIX multithreading, mutex lock invariants, and deadlock avoidance"
  ],
  modules: [
    {
      id: "os-m1",
      title: "Module 1: CPU Virtualization, Processes & Context Switching",
      chapters: [
        {
          id: "os-m1-c1",
          title: "Chapter 1: The Process Abstraction & Scheduling",
          lessons: [
            {
              id: "os-m1-c1-l1",
              title: "Process State Machine, PCB & Hardware Context Switch",
              estimatedReadTime: "15 min read",
              lastReviewedDate: "2026-10-20",
              reviewStatus: "verified",
              
              // 1. Objectives
              objectives: [
                "Map out the complete OS process lifecycle transitions (Ready, Running, Blocked, Zombie).",
                "Analyze the exact low-level assembly sequence of a hardware context switch via timer interrupts.",
                "Inspect the fields of the Process Control Block (PCB) including register snapshots and page table pointers.",
                "Evaluate the trade-offs between Preemptive (Round Robin, MLFQ) and Non-Preemptive (FCFS, SJF) scheduling."
              ],

              // 2. Prerequisites
              prerequisites: [
                { title: "Computer Organization: CPU Registers (PC, SP, general purpose), RAM & Stack pointer" },
                { title: "C programming language: memory addresses and pointers" }
              ],

              // 3. Detailed Explanations
              explanation: `### The Process Abstraction & The Illusion of Infinite CPUs

An operating system creates the illusion of multiple concurrent virtual CPUs through a technique called **CPU Virtualization (Time-Sharing)**. The fundamental abstraction is the **Process**—a running program consisting of:
1. **Memory Image (Address Space):** Code instructions (.text), initialized/uninitialized global variables (.data, .bss), dynamic heap (malloc), and activation stack frames.
2. **CPU Register State:** Program Counter (PC / RIP), Stack Pointer (SP / RSP), Frame Pointer (BP / RBP), and general-purpose registers.
3. **I/O State:** Table of open file descriptors (stdin 0, stdout 1, stderr 2, network sockets).

---

### Process State Transitions

At any instant in time, a process resides in one of three canonical states:
* **RUNNING:** The process is currently executing instructions on a physical CPU core.
* **READY:** The process is prepared to run, but the OS scheduler has temporarily assigned the CPU to another thread/process.
* **BLOCKED (WAITING):** The process performed an operation that blocks execution until an external event occurs (e.g., synchronous disk read, incoming network packet on a socket). It cannot be scheduled even if CPU cores are idle.

\`\`\`
       +-------------+
       |   CREATED   |
       +------+------+
              |  Admit to scheduler queue
              v
       +-------------+    OS Scheduler Dispatches    +-------------+
+----->|    READY    |------------------------------>|   RUNNING   |
|      +-------------+<------------------------------+-------------+
|             ^          Timer Interrupt (Preemption)|
|             |                                      |
|             | I/O Operation Completes              | Requests Synchronous I/O
|      +------+------+                               v
+------|   BLOCKED   |<------------------------------+
       +-------------+
\`\`\`

---

### The Mechanics of the Limited Direct Execution (LDE) Protocol

To guarantee high performance without sacrificing security, modern OS kernels use **Limited Direct Execution**:

1. **Hardware Privilege Modes:**
   * **User Mode (Ring 3 on x86-64):** Applications execute with restricted CPU capabilities. Direct hardware access, arbitrary port I/O, and page table modifications trigger a hardware General Protection Fault (#GP).
   * **Kernel Mode (Ring 0):** The OS kernel possesses unrestricted access to all hardware instructions, memory maps, and interrupt controllers.

2. **System Calls & Trap Tables:**
   To perform privileged I/O, an application executes a special machine instruction (\`syscall\` on x86-64 / \`svc\` on ARM). The hardware switches the CPU from Ring 3 to Ring 0, saves the user register state onto the per-process **Kernel Stack**, and jumps to a predefined kernel dispatch vector in the Interrupt Descriptor Table (IDT).

3. **The Timer Interrupt & Context Switch:**
   To prevent rogue programs from running infinite loops and seizing control of the machine, a hardware timer chip fires an interrupt every $1-10$ ms. When the timer interrupt fires:
   * The CPU transfers control to the OS timer interrupt handler.
   * The kernel invokes the scheduler to decide whether to switch from Process $A$ to Process $B$.
   * If switching:
     1. Kernel pushes all general-purpose registers of $A$ to $A$'s kernel stack.
     2. Switches the stack pointer from $A$'s kernel stack to $B$'s kernel stack.
     3. Restores $B$'s register state.
     4. Executes \`sysret\` / \`iret\`, which resumes $B$ in user mode.`,

              // 4. Key Concepts
              keyConcepts: [
                { term: "Process Control Block (PCB)", definition: "A kernel C struct (e.g. struct task_struct in Linux) holding process state, PID, register snapshots, and resource descriptors." },
                { term: "Context Switch Overhead", definition: "The latency incurred by saving/restoring register state plus indirect cache coldness caused by flushing or evicting cache lines." },
                { term: "Zombie Process", definition: "A process that has finished execution via exit() but remains in the process table so its parent can read its exit code via wait()." }
              ],

              // 5. Worked Examples
              workedExamples: [
                {
                  title: "Round-Robin Scheduling Latency Calculation",
                  scenario: "Three processes A, B, and C arrive simultaneously at t=0 with CPU burst times of 10ms, 4ms, and 2ms. The time quantum is Q = 2ms.",
                  steps: [
                    { stepNumber: 1, action: "Queue state at t=0", stateSnapshot: "[A (10), B (4), C (2)]" },
                    { stepNumber: 2, action: "t=0..2: Run A", stateSnapshot: "A remaining: 8ms. Queue: [B(4), C(2), A(8)]" },
                    { stepNumber: 3, action: "t=2..4: Run B", stateSnapshot: "B remaining: 2ms. Queue: [C(2), A(8), B(2)]" },
                    { stepNumber: 4, action: "t=4..6: Run C", stateSnapshot: "C completes at t=6ms! Queue: [A(8), B(2)]" }
                  ],
                  result: "Interactive time-sharing guarantees short jobs (like C) finish rapidly without being starved by long jobs."
                }
              ],

              // 6. Production Code Snippets
              codeSnippets: [
                {
                  language: "javascript",
                  title: "Simulated Round-Robin Scheduler with Queue",
                  code: `// Simulates CPU scheduling queue with a fixed time slice (quantum)
function roundRobinSchedule(processes, quantum) {
  let queue = processes.map(p => ({ ...p, remainingTime: p.burstTime }));
  let currentTime = 0;
  let completionLog = [];

  while (queue.length > 0) {
    let currentProcess = queue.shift();
    let execTime = Math.min(currentProcess.remainingTime, quantum);
    currentTime += execTime;
    currentProcess.remainingTime -= execTime;

    if (currentProcess.remainingTime === 0) {
      completionLog.push({ id: currentProcess.id, completionTime: currentTime });
    } else {
      queue.push(currentProcess);
    }
  }

  return completionLog;
}`,
                  annotation: "Models how the OS kernel schedules processes across time slices using a FIFO queue."
                }
              ],

              // 7. Pitfalls
              pitfalls: [
                {
                  mistake: "Choosing a time quantum that is too short (e.g. 10 microseconds)",
                  whyItHappens: "Desire to make multitasking appear completely instantaneous to user interactions.",
                  correction: "Context switches incur non-zero CPU overhead (~1-5 μs). A 10 μs slice means up to 50% of CPU cycles are wasted on context switching rather than useful user work."
                },
                {
                  mistake: "Assuming threads of the same process have independent address spaces",
                  whyItHappens: "Confusing process isolation with thread concurrency.",
                  correction: "Threads share the same heap, global variables, and page tables. Only registers and user stacks are allocated per thread."
                }
              ],

              // 8. Visual Aids
              visualAids: [
                {
                  type: "comparison-table",
                  title: "Process vs Thread Architectural Comparison",
                  content: `| Attribute | Process | Thread (within same process) |
|---|---|---|
| **Memory Isolation** | Full private virtual address space | Shared heap, global data, and code (.text) |
| **Creation Overhead** | High (fork requires duplicating page tables / COW) | Low (allocates stack and thread control block) |
| **Context Switch Cost** | Higher (may invalidate TLB cache lines) | Lower (no page table base register CR3 swap) |
| **Communication (IPC)** | Pipes, Sockets, Shared Memory segments | Direct memory reads/writes with mutex locks |`
                }
              ],

              // 9. Practice Exercises (with automated unit tests)
              exercises: [
                {
                  difficulty: "Medium",
                  prompt: "Implement `calculateAverageTurnaroundTime(completionTimes, arrivalTimes)` which calculates average turnaround time (Completion Time - Arrival Time) across an array of processes.",
                  hint: "Sum up (completion[i] - arrival[i]) for all processes and divide by total process count.",
                  starterCode: `function calculateAverageTurnaroundTime(completionTimes, arrivalTimes) {
  // Return the average turnaround time
  let total = 0;
  for (let i = 0; i < completionTimes.length; i++) {
    total += (completionTimes[i] - arrivalTimes[i]);
  }
  return total / completionTimes.length;
}`,
                  testCases: [
                    { input: { completionTimes: [10, 15, 20], arrivalTimes: [0, 0, 0] }, expected: 15 },
                    { input: { completionTimes: [5, 12], arrivalTimes: [0, 2] }, expected: 7.5 },
                    { input: { completionTimes: [8], arrivalTimes: [0] }, expected: 8 }
                  ]
                }
              ],

              // 10. Checkpoint Quiz
              quiz: [
                {
                  question: "Why does switching between two processes cost more CPU cycles than switching between two threads of the same process?",
                  options: [
                    "A process switch requires changing the page table pointer (CR3), which invalidates the hardware TLB cache",
                    "Threads do not use CPU registers",
                    "Processes always execute in kernel mode",
                    "Processes require network verification"
                  ],
                  correctIndex: 0,
                  explanation: "Threads share the same virtual address space, so the CPU page table root register (CR3) remains unchanged, preserving warm TLB translations. Process switches swap CR3, evicting TLB mappings."
                }
              ],

              // 11. Summary & Revision
              summary: {
                takeaways: [
                  "CPU Virtualization employs Limited Direct Execution to achieve near-native execution speed while retaining kernel security control.",
                  "Hardware timer interrupts guarantee preemption so cooperative yielding is not required.",
                  "The PCB preserves register state, PC, and stack pointers during a context switch."
                ],
                quickCheatSheet: "States: Ready -> Running -> Blocked. Syscall switches Ring 3 to Ring 0. Timer interrupt triggers scheduler. Process switch invalidates TLB; thread switch preserves page tables."
              },

              // 12. Metadata & Provenance
              metadata: {
                furtherReading: [
                  { title: "Operating Systems: Three Easy Pieces (OSTEP) Chapter 4: The Abstraction: The Process", url: "https://pages.cs.wisc.edu/~remzi/OSTEP/cpu-intro.pdf", annotation: "Free, open textbook covering LDE and CPU virtualization." },
                  { title: "OSTEP Chapter 6: Mechanism: Limited Direct Execution", url: "https://pages.cs.wisc.edu/~remzi/OSTEP/cpu-mechanisms.pdf", annotation: "Deep-dive into trap tables and interrupt dispatching." }
                ],
                licenseRecord: verifiedLicenses["lic-ostep-os"]
              }
            }
          ]
        }
      ]
    }
  ]
};
