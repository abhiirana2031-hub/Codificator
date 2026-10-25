import { verifiedLicenses } from '../licenseRegistry';

export const systemDesignModule = {
  id: "software-eng",
  courseId: "software-eng",
  title: "Software Engineering & System Architecture",
  category: "Engineering & Tools",
  level: "Intermediate to Advanced",
  rating: 4.98,
  reviewsCount: 22100,
  studentsCount: "580k+",
  instructor: "Donne Martin & Codificator Principal Systems Architects",
  bannerGradient: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)",
  badge: "CC-BY-4.0 Flagship",
  description: "Comprehensive software engineering and high-scale distributed systems architecture adapted from The System Design Primer: Scalability trade-offs, Load Balancers, Caching hierarchies, Database Sharding, Asynchronism, and Resilient Microservices.",
  highlights: [
    "Vertical vs Horizontal scaling trade-offs, Amdahl's Law, and Single Points of Failure (SPOF)",
    "Load balancing layer algorithms: Round Robin, Weighted Least Connections, IP Hash, Layer 4 vs Layer 7",
    "Distributed caching strategies: Cache-Aside, Read-Through, Write-Through, Write-Behind, and LRU/LFU eviction",
    "Database scaling: Read replicas, master-slave replication, consistent hashing, and horizontal partitioning (sharding)"
  ],
  modules: [
    {
      id: "sys-m1",
      title: "Module 1: High-Scale Distributed System Architecture",
      chapters: [
        {
          id: "sys-m1-c1",
          title: "Chapter 1: Scalability, Caching Patterns & Consistent Hashing",
          lessons: [
            {
              id: "sys-m1-c1-l1",
              title: "Scalability Fundamentals, Caching Topologies & Consistent Hashing",
              estimatedReadTime: "19 min read",
              lastReviewedDate: "2026-10-20",
              reviewStatus: "verified",

              // 1. Learning Objectives
              objectives: [
                "Contrast vertical scaling (scale-up) vs horizontal scaling (scale-out) with hardware cost curves and architectural limitations.",
                "Compare Layer 4 (Transport) and Layer 7 (Application) load balancing mechanisms and session persistence techniques.",
                "Implement distributed caching patterns (Cache-Aside, Write-Back) and analyze cache invalidation challenges.",
                "Formulate Consistent Hashing with virtual nodes to minimize key remapping when scaling cache clusters."
              ],

              // 2. Prerequisites
              prerequisites: [
                { title: "Computer Networks: OSI stack, TCP/IP, HTTP headers" },
                { title: "Basic database operations (SQL queries, primary keys, indexing)" }
              ],

              // 3. Detailed Original Explanations
              explanation: `### Scalability Foundations: Scale Up vs Scale Out

Building software systems that handle millions of concurrent users requires moving beyond single-machine constraints.

#### 1. Vertical Scaling (Scale Up)
- **Concept**: Upgrading CPU, RAM, NVMe storage on a single machine.
- **Advantages**: Simple architecture, zero network serialization latency between processes, no distributed transaction consensus needed.
- **Drawbacks**: Hard hardware physical ceiling (motherboards cap out at certain sockets/RAM channels), exponential cost increases at high tiers, and creates a critical **Single Point of Failure (SPOF)**.

#### 2. Horizontal Scaling (Scale Out)
- **Concept**: Adding multiple standard commercial server nodes behind a load balancer.
- **Advantages**: Linear cost growth, dynamic elastic scaling (auto-scaling groups), fault tolerance (if 1 node crashes out of 10, the remaining 9 absorb traffic).
- **Drawbacks**: Requires **stateless** application tier, complex distributed data consistency (CAP theorem), and network latency overhead.

---

### Load Balancing: Layer 4 vs Layer 7

A **Load Balancer (LB)** distributes incoming network traffic across a backend farm of healthy server instances.

\`\`\`
                     +-------------------+
                     |  DNS / Anycast IP |
                     +---------+---------+
                               |
                               v
                     +-------------------+
                     |   Load Balancer   | (e.g. NGINX / HAProxy / AWS ALB)
                     +--+------+------+--+
                        |      |      |
           +------------+      |      +------------+
           |                   |                   |
           v                   v                   v
     [App Server 1]      [App Server 2]      [App Server 3]
     (Stateless Node)    (Stateless Node)    (Stateless Node)
\`\`\`

- **Layer 4 Load Balancing (Transport Layer)**:
  - Inspects only IP addresses and TCP/UDP ports.
  - Forwarding happens at the packet level without decrypting TLS or inspecting HTTP headers/cookies.
  - Ultra-high throughput and minimal CPU overhead.
- **Layer 7 Load Balancing (Application Layer)**:
  - Terminates TLS/HTTPS, inspects HTTP method, path, headers, cookies, and JSON payloads.
  - Enables intelligent content-based routing (e.g., \`/api/orders\` routed to Order Microservice; \`/static/*\` routed to CDN).
  - Can apply rate-limiting, WAF rules, and cookie-based sticky sessions.

---

### Distributed Caching Patterns

Accessing data from RAM (e.g., Redis/Memcached) takes $\\approx 100\\text{ ns}$, whereas reading from SSD or performing an indexed SQL query takes $\\approx 1\\text{ ms} - 10\\text{ ms}$ ($10,000\\times$ slower).

#### 1. Cache-Aside (Lazy Loading)
1. Application reads from cache.
2. If **Cache Hit**, return cached data.
3. If **Cache Miss**, query database, write retrieved data to cache with a TTL (Time To Live), and return data.
- *Pros*: Cache only contains requested data; node failure does not crash the system.
- *Cons*: Cache miss penalty on first request; potential stale data if DB is updated directly without invalidation.

#### 2. Write-Through
Application writes data to the cache, and the cache synchronously writes to the database.
- *Pros*: High data consistency, fast reads.
- *Cons*: Write latency penalty because two writes must complete.

#### 3. Write-Behind (Write-Back)
Application writes to cache immediately; the cache asynchronously batches writes to the database.
- *Pros*: Extremely high write throughput.
- *Cons*: Risk of permanent data loss if the cache node crashes before flushing to persistent disk.

---

### Consistent Hashing

In a simple modulo hashing scheme with $N$ servers:
$$\\text{server} = \\text{hash}(key) \\pmod N$$
If a server crashes or is added, $N$ changes to $N-1$ or $N+1$, causing **almost 100% of keys to remap** to different servers. This creates a catastrophic **cache stampede**, overwhelming the database.

**Consistent Hashing** maps both servers and keys onto a circular ring ($0$ to $2^{32}-1$). A key is assigned to the first server whose position on the ring is greater than or equal to the key's position (moving clockwise).
- When a server is added or removed, **only $K/N$ keys** on average need to be remapped!
- **Virtual Nodes**: Multiple ring positions assigned per physical server to ensure uniform key distribution and prevent hotspot imbalances.`,

              // 4. Definitions and Key Concepts
              keyConcepts: [
                {
                  term: "Cache Stampede (Thundering Herd)",
                  definition: "A situation where a high-traffic cache key expires, causing massive concurrent requests to hit the underlying database simultaneously."
                },
                {
                  term: "Consistent Hashing",
                  definition: "A distributed hashing technique where the addition or removal of a slot/node only requires remapping K/N keys on average, avoiding full cluster rebalancing."
                },
                {
                  term: "CAP Theorem",
                  definition: "States that in any distributed data store, you can only guarantee two out of three: Consistency, Availability, and Partition Tolerance."
                },
                {
                  term: "Single Point of Failure (SPOF)",
                  definition: "A component of a software system whose failure will cause the entire system to stop functioning."
                }
              ],

              // 5. Step-by-Step Worked Examples
              workedExamples: [
                {
                  title: "Consistent Hash Ring Key Lookup Walkthrough",
                  scenario: "Map 3 servers (Node A at 100, Node B at 500, Node C at 900) on a 0-999 ring, and determine which server stores keys with hash values 150, 600, and 950.",
                  steps: [
                    {
                      stepNumber: 1,
                      action: "Evaluate Key 150",
                      stateSnapshot: "Hash is 150. Moving clockwise on ring: 150 < 500 (Node B). Key 150 maps to Node B."
                    },
                    {
                      stepNumber: 2,
                      action: "Evaluate Key 600",
                      stateSnapshot: "Hash is 600. Moving clockwise: 600 < 900 (Node C). Key 600 maps to Node C."
                    },
                    {
                      stepNumber: 3,
                      action: "Evaluate Key 950",
                      stateSnapshot: "Hash is 950. 950 > 900. Reaching the end of the 999 ring, wrap around clockwise to 0 -> first node is Node A (100). Key 950 maps to Node A."
                    },
                    {
                      stepNumber: 4,
                      action: "Node B Failure Simulation",
                      stateSnapshot: "If Node B fails, only keys between 101 and 500 migrate to Node C. Node A and keys between 501-999 remain completely unaffected!"
                    }
                  ],
                  result: "Key 150 -> Node B; Key 600 -> Node C; Key 950 -> Node A. Minimal key remapping preserved during failure."
                }
              ],

              // 6. Production Code Snippets
              codeSnippets: [
                {
                  language: "javascript",
                  title: "Consistent Hash Ring with Virtual Nodes Implementation",
                  code: `class ConsistentHashRing {
  constructor(replicaCount = 3) {
    this.replicaCount = replicaCount;
    this.ring = new Map(); // sorted hash positions -> server
    this.sortedKeys = [];
  }

  _hash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  addServer(server) {
    for (let i = 0; i < this.replicaCount; i++) {
      const virtualNodeKey = \`\${server}#vn\${i}\`;
      const hash = this._hash(virtualNodeKey);
      this.ring.set(hash, server);
      this.sortedKeys.push(hash);
    }
    this.sortedKeys.sort((a, b) => a - b);
  }

  getServer(key) {
    if (this.sortedKeys.length === 0) return null;
    const hash = this._hash(key);
    // Find first server clockwise
    for (const pos of this.sortedKeys) {
      if (hash <= pos) return this.ring.get(pos);
    }
    // Wrap around to first node
    return this.ring.get(this.sortedKeys[0]);
  }
}`,
                  annotation: "Virtual nodes prevent data skew on the ring by placing multiple randomized points per physical machine."
                }
              ],

              // 7. Common Mistakes and Corrections
              pitfalls: [
                {
                  mistake: "Treating the cache as the authoritative database without persistent durable storage.",
                  whyItHappens: "Relying on in-memory systems for core transactional records can lead to catastrophic data loss if cluster memory is flushed.",
                  correction: "Use persistent relational (PostgreSQL) or document (MongoDB) databases as the source of truth, treating cache as transient accelerators."
                },
                {
                  mistake: "Not setting TTLs (Time to Live) on cache keys.",
                  whyItHappens: "Without TTLs, outdated or abandoned keys sit in RAM forever, triggering memory exhaustion and eviction errors.",
                  correction: "Always configure sensible TTLs and pair them with explicit event-driven invalidations."
                }
              ],

              // 8. Diagrams and Structured Reference Tables
              visualAids: [
                {
                  type: "comparison-table",
                  title: "Caching Topologies Comparison",
                  content: `| Strategy | Read Latency | Write Latency | Data Freshness | Failure Impact |
|---|---|---|---|---|
| **Cache-Aside** | Fast on hit, slow on miss | Fast (writes to DB) | Eventual / TTL | Low (DB handles miss) |
| **Write-Through** | Fast | Slower (writes to both) | Strong | Medium |
| **Write-Behind** | Fast | Ultra-fast (writes to RAM) | Immediate in cache | High (data loss if crash) |
| **Read-Through** | Fast | Unaffected | Strong | High (cache must manage DB) |`
                }
              ],

              // 9. Practice Exercises (With Automated Unit Test Runner)
              exercises: [
                {
                  difficulty: "Medium",
                  prompt: "Implement an LRU (Least Recently Used) Cache with get(key) and put(key, value, capacity). Reading or writing an item moves it to the most-recently-used position. When exceeding capacity, evict the least recently used item.",
                  hint: "A JavaScript Map preserves insertion order. Deleting and re-setting a key moves it to the end of the Map iteration order.",
                  starterCode: `function createLRUCache(capacity) {
  const cache = new Map();

  return {
    get(key) {
      if (!cache.has(key)) return -1;
      const val = cache.get(key);
      cache.delete(key);
      cache.set(key, val); // Move to most recently used
      return val;
    },

    put(key, value) {
      if (cache.has(key)) {
        cache.delete(key);
      } else if (cache.size >= capacity) {
        // Evict first element (least recently used)
        const firstKey = cache.keys().next().value;
        cache.delete(firstKey);
      }
      cache.set(key, value);
    }
  };
}`,
                  testCases: [
                    {
                      input: { ops: ["put(1,1)", "put(2,2)", "get(1)", "put(3,3)", "get(2)"] },
                      expected: { "get(1)": 1, "get(2)": -1 } // 2 was evicted when 3 was added
                    }
                  ]
                }
              ],

              // 10. Concept Checkpoint Quiz
              quiz: [
                {
                  question: "In Consistent Hashing, how many keys need to be remapped on average when a new server node is added to a cluster of N nodes?",
                  options: [
                    "All keys (100%)",
                    "K / N keys (where K is total keys and N is total servers)",
                    "None (0 keys)",
                    "N / K keys"
                  ],
                  correctIndex: 1,
                  explanation: "Consistent Hashing guarantees that only K/N keys need to be relocated when adding or removing a node, avoiding the total cluster rehash penalty of traditional modulo hashing."
                }
              ],

              // 11. Chapter Summary & Revision Notes
              summary: {
                takeaways: [
                  "Horizontal scaling provides fault tolerance and linear capacity expansion by distributing requests across stateless application nodes.",
                  "Layer 7 load balancers inspect application data to enable smart routing, while Layer 4 balancers maximize raw packet forwarding speed.",
                  "Consistent Hashing minimizes remapping during cluster resizing, shielding underlying databases from thundering herd stampedes."
                ],
                quickCheatSheet: "Cache-Aside: Read from cache, on miss load from DB and store. Consistent Hashing: K/N keys move on node add/remove. CAP: Can only pick 2 (CP or AP)."
              },

              // 12. Further Reading & Licensing Provenance
              metadata: {
                furtherReading: [
                  {
                    title: "The System Design Primer by Donne Martin",
                    url: "https://github.com/donnemartin/system-design-primer",
                    annotation: "The industry standard open-source guide to distributed systems design and interview prep."
                  },
                  {
                    title: "Consistent Hashing and Random Trees (Karger et al., MIT)",
                    url: "https://www.cs.princeton.edu/courses/archive/fall09/cos518/papers/chash.pdf",
                    annotation: "Original research paper introducing consistent hashing to eliminate web hotspots."
                  }
                ],
                licenseRecord: verifiedLicenses["lic-donnemartin-system-design"]
              }
            }
          ]
        }
      ]
    }
  ]
};
