import { verifiedLicenses } from '../licenseRegistry';

export const networksModule = {
  id: "computer-networks",
  courseId: "computer-networks",
  title: "Computer Networks & Internet Protocols Architecture",
  category: "Computer Science Core",
  level: "Beginner to Advanced",
  rating: 4.94,
  reviewsCount: 7600,
  studentsCount: "175k+",
  instructor: "IETF RFC Open Standards & Codificator Networking Team",
  bannerGradient: "linear-gradient(135deg, #0f172a 0%, #0369a1 100%)",
  badge: "OER Flagship • IETF Open RFC",
  description: "Comprehensive study of layered network protocols: OSI vs TCP/IP models, socket programming, reliable transport (TCP 3-way handshake, sliding window, congestion control), IP routing, and TLS 1.3 cryptographic security.",
  highlights: [
    "Wire-level packet byte analysis of TCP headers, SYN/ACK sequences, and FIN teardowns",
    "Sliding window flow control and congestion avoidance (AIMD, Slow Start, CUBIC)",
    "DNS resolution recursion and root server anycast architecture",
    "TLS 1.3 1-RTT cryptographic handshake and Diffie-Hellman ephemeral key exchange"
  ],
  modules: [
    {
      id: "net-m1",
      title: "Module 1: The Transport Layer & Reliable Data Transfer",
      chapters: [
        {
          id: "net-m1-c1",
          title: "Chapter 1: TCP Handshake, Flow Control & Reliability",
          lessons: [
            {
              id: "net-m1-c1-l1",
              title: "The TCP 3-Way Handshake, Sequence Numbers & State Machine",
              estimatedReadTime: "14 min read",
              lastReviewedDate: "2026-10-20",
              reviewStatus: "verified",
              
              // 1. Objectives
              objectives: [
                "Trace the step-by-step sequence of the TCP 3-way handshake (SYN, SYN-ACK, ACK).",
                "Explain why two-way handshakes are insufficient to prevent delayed duplicate packet confusion.",
                "Calculate sequence and acknowledgment number increments based on packet payload byte counts.",
                "Analyze the purpose of the TIME_WAIT state in the 4-step connection termination sequence."
              ],

              // 2. Prerequisites
              prerequisites: [
                { title: "Binary representation & bitwise flags (SYN, ACK, FIN, RST)" },
                { title: "IP addressing: Source IP, Destination IP, Port numbers" }
              ],

              // 3. Detailed Explanations
              explanation: `### Why Reliability Over an Unreliable Substrate?

The Internet Protocol (IP) provides **Best-Effort Delivery**. Packets can be silently dropped due to router buffer exhaustion, corrupted by electromagnetic interference, duplicated by link-layer retries, or arrive completely out of order across diverse routing paths.

The **Transmission Control Protocol (TCP)**, specified in IETF RFC 793, sits directly on top of IP to convert this unreliable, packet-oriented channel into a **reliable, ordered, full-duplex byte stream**.

---

### The Three-Way Handshake Protocol

Before any application payload data can be exchanged between a Client and a Server, both operating systems must synchronize their Initial Sequence Numbers (ISN):

\`\`\`
   CLIENT                                                    SERVER
[CLOSED]                                                    [LISTEN]
   |                                                           |
   | -------- STEP 1: SYN (seq = client_ISN) ----------------> |  [SYN_RCVD]
   |                                                           |
   | <------- STEP 2: SYN + ACK (seq = server_ISN, ---------- |
   |                           ack = client_ISN + 1)           |
[ESTABLISHED]                                                  |
   |                                                           |
   | -------- STEP 3: ACK (seq = client_ISN + 1, ------------> | [ESTABLISHED]
   |                       ack = server_ISN + 1)               |
   v                                                           v
               === FULL-DUPLEX DATA STREAM READY ===
\`\`\`

#### Step-by-Step Breakdown:
1. **Step 1: Client sends SYN (Synchronize)**
   * The client OS randomly generates an Initial Sequence Number (\`client_ISN\`) and transmits a segment with the \`SYN\` control bit set to 1.
   * Consumes 1 sequence number space, even though payload data length is 0.
   * Client state transitions from \`CLOSED\` to \`SYN_SENT\`.

2. **Step 2: Server sends SYN-ACK**
   * Upon receiving the SYN packet, the server allocates kernel TCB (Transmission Control Block) buffers.
   * Generates its own independent \`server_ISN\`.
   * Sets \`SYN = 1\` and \`ACK = 1\`, acknowledging the client's ISN by setting \`ack_num = client_ISN + 1\`.
   * Server state transitions from \`LISTEN\` to \`SYN_RECEIVED\`.

3. **Step 3: Client sends ACK**
   * The client verifies that the acknowledgment matches \`client_ISN + 1\`.
   * Transmits an acknowledgment segment with \`ack_num = server_ISN + 1\`.
   * *Critical Optimization:* In standard TCP, this third packet may also carry the first byte of actual application data (e.g., HTTP GET request).
   * Both endpoints are now in the \`ESTABLISHED\` state.

---

### Why Not a Two-Way Handshake?

Suppose the connection could be established in just two steps:
1. Client sends SYN.
2. Server replies with ACK and immediately transitions to ESTABLISHED.

**Failure Scenario (The Delayed Duplicate Problem):**
* Imagine a client sends a SYN packet, but it gets delayed in congested transit.
* The client times out, terminates the session, and sends a new request.
* Minutes later, the delayed old SYN finally reaches the server.
* Under a two-way handshake, the server would open a new half-open connection and begin allocating buffers for a client that has long since closed!
* With the **3-way handshake**, the server waits for the client's final ACK. When the client receives an unexpected SYN-ACK for an expired session, it immediately replies with a \`RST\` (Reset) packet, preventing memory exhaustion attacks on the server.`,

              // 4. Key Concepts
              keyConcepts: [
                { term: "Initial Sequence Number (ISN)", definition: "A pseudo-random 32-bit counter generated per connection to prevent cross-connection collision and replay attacks." },
                { term: "TCB (Transmission Control Block)", definition: "Kernel memory structure storing TCP socket state, send/receive ring buffers, MSS, and window scales." },
                { term: "TIME_WAIT State", definition: "A 2*MSL (Maximum Segment Lifetime, typically 60-120s) hold state preventing lingering packets from corrupting subsequent connections on the same port." }
              ],

              // 5. Worked Examples
              workedExamples: [
                {
                  title: "Tracking Sequence & ACK Numbers During an HTTP Request",
                  scenario: "Client ISN = 1000, Server ISN = 5000. Client sends a 300-byte HTTP GET payload after connection establishment.",
                  steps: [
                    { stepNumber: 1, action: "Handshake SYN", stateSnapshot: "Client -> Server: SYN=1, seq=1000" },
                    { stepNumber: 2, action: "Handshake SYN-ACK", stateSnapshot: "Server -> Client: SYN=1, ACK=1, seq=5000, ack=1001" },
                    { stepNumber: 3, action: "Handshake Final ACK", stateSnapshot: "Client -> Server: ACK=1, seq=1001, ack=5001" },
                    { stepNumber: 4, action: "Client Sends 300-byte HTTP GET", stateSnapshot: "Client -> Server: seq=1001, length=300, ack=5001" },
                    { stepNumber: 5, action: "Server Acknowledges Payload", stateSnapshot: "Server -> Client: ACK=1, seq=5001, ack=1301 (1001 + 300)" }
                  ],
                  result: "The acknowledgment number always reflects the NEXT expected incoming byte (1301)."
                }
              ],

              // 6. Production Code Snippets
              codeSnippets: [
                {
                  language: "javascript",
                  title: "Simulated TCP Next Acknowledgment Calculator",
                  code: `// Computes next expected TCP acknowledgment number based on incoming packet
function calculateNextAck(seqNumber, payloadBytes, isSynOrFin) {
  let consumedSequenceSpace = payloadBytes;
  // SYN and FIN flags each consume 1 sequence number space
  if (isSynOrFin) {
    consumedSequenceSpace += 1;
  }
  return seqNumber + consumedSequenceSpace;
}`,
                  annotation: "Demonstrates that TCP ACK numbers equal received Sequence Number + payload byte length + 1 (if SYN or FIN is present)."
                }
              ],

              // 7. Pitfalls
              pitfalls: [
                {
                  mistake: "Assuming sequence numbers increment by 1 for every packet sent",
                  whyItHappens: "Confusing packet counts with byte stream tracking.",
                  correction: "TCP is a byte-stream protocol: sequence numbers increment by the exact number of bytes in the payload. Only SYN and FIN consume 1 phantom byte."
                },
                {
                  mistake: "Prematurely closing sockets without entering TIME_WAIT",
                  whyItHappens: "Attempting to immediately reuse port numbers in high-throughput network services.",
                  correction: "Skipping TIME_WAIT risks delayed duplicate packets from the previous socket resurrection being injected into a fresh session."
                }
              ],

              // 8. Visual Aids
              visualAids: [
                {
                  type: "comparison-table",
                  title: "TCP vs UDP Architectural Matrix",
                  content: `| Feature | TCP (RFC 793) | UDP (RFC 768) |
|---|---|---|
| **Connection Model** | Connection-oriented (Handshake required) | Connectionless (Fire-and-forget datagrams) |
| **Delivery Guarantee** | 100% Reliable (Retransmits dropped packets) | Unreliable (Dropped packets are lost) |
| **Ordering** | In-order delivery via sequence numbers | Out-of-order arrival possible |
| **Flow & Congestion Control** | Sliding window + AIMD congestion control | None (Application must rate-limit itself) |
| **Header Overhead** | 20 to 60 bytes | 8 bytes |
| **Common Use Cases** | HTTP/HTTPS, SSH, Database queries, Git | DNS queries, Video streaming, WebRTC, VoIP |`
                }
              ],

              // 9. Practice Exercises (with automated unit tests)
              exercises: [
                {
                  difficulty: "Easy",
                  prompt: "Implement `computeAck(currentSeq, byteLength, hasSynOrFin)` that returns the acknowledgment number a receiver should send back after receiving a packet with the given sequence number, payload length, and SYN/FIN flag.",
                  hint: "Add byteLength to currentSeq, and add 1 if hasSynOrFin is true.",
                  starterCode: `function computeAck(currentSeq, byteLength, hasSynOrFin) {
  // Return the calculated ACK number
  return currentSeq + byteLength + (hasSynOrFin ? 1 : 0);
}`,
                  testCases: [
                    { input: { currentSeq: 100, byteLength: 0, hasSynOrFin: true }, expected: 101 },
                    { input: { currentSeq: 101, byteLength: 500, hasSynOrFin: false }, expected: 601 },
                    { input: { currentSeq: 601, byteLength: 200, hasSynOrFin: false }, expected: 801 },
                    { input: { currentSeq: 801, byteLength: 0, hasSynOrFin: true }, expected: 802 }
                  ]
                }
              ],

              // 10. Checkpoint Quiz
              quiz: [
                {
                  question: "Why does the SYN packet consume 1 sequence number space even though it contains 0 bytes of user data?",
                  options: [
                    "So that the other side can reliably acknowledge that the SYN itself was received",
                    "To satisfy 64-bit memory alignment requirements",
                    "Because of encryption padding",
                    "To encode the source port number"
                  ],
                  correctIndex: 0,
                  explanation: "If SYN consumed 0 sequence numbers, its acknowledgment number would be identical to an ACK for an empty packet, creating ambiguity in whether the connection request was acknowledged."
                }
              ],

              // 11. Summary & Revision
              summary: {
                takeaways: [
                  "The TCP 3-way handshake synchronizes Initial Sequence Numbers and guarantees both sides are ready for bidirectional data transfer.",
                  "A 3-way handshake prevents phantom half-open connections caused by delayed duplicate packets.",
                  "Sequence numbers measure cumulative bytes transmitted, not packet counts."
                ],
                quickCheatSheet: "Handshake: SYN(x) -> SYN-ACK(y, ack=x+1) -> ACK(ack=y+1). Teardown: FIN -> ACK -> FIN -> ACK -> TIME_WAIT (2*MSL)."
              },

              // 12. Metadata & Provenance
              metadata: {
                furtherReading: [
                  { title: "IETF RFC 793: Transmission Control Protocol Specification", url: "https://www.rfc-editor.org/rfc/rfc793", annotation: "The original canonical specification for TCP reliability." },
                  { title: "IETF RFC 8446: The Transport Layer Security (TLS) Protocol Version 1.3", url: "https://www.rfc-editor.org/rfc/rfc8446", annotation: "Modern 1-RTT encrypted internet communications." }
                ],
                licenseRecord: verifiedLicenses["lic-ietf-rfc-standards"]
              }
            }
          ]
        }
      ]
    }
  ]
};
