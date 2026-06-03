# Day 31 – System Design Foundations: Scalability, Load Balancing & CAP Theorem | DSA: Backtracking

> **Phase 4 – System Design + AWS + CI/CD + GitHub** | 90 min/day | 3-Year Full-Stack Dev

---

## ⏱ Daily Time Block
| Block | Time | Focus |
|-------|------|-------|
| Concept | 00:00–00:40 | Scalability, load balancing strategies, CAP theorem, PACELC, eventual consistency |
| Hands-On | 00:40–01:10 | Draw and narrate a scalable architecture for a given system from first principles |
| DSA | 01:10–01:25 | N-Queens (#51) + Word Search (#79) |
| Interview Q | 01:25–01:30 | Flash review 5 key questions |

---

## Today's Objectives
- [ ] Explain vertical vs horizontal scaling trade-offs with concrete limits
- [ ] Compare L4 vs L7 load balancing and 4 load balancing algorithms
- [ ] Give real database examples for each corner of the CAP theorem
- [ ] Solve: N-Queens (#51) using backtracking with constraint propagation
- [ ] Review 5 system design fundamentals questions

---

## Concept: System Design Foundations

### What to Study
- **Scalability:** Vertical scaling (bigger machine — single point of failure, has physical ceiling, simpler) vs Horizontal scaling (more machines — requires stateless services, needs load balancer, enables unlimited scale); stateless services scale horizontally easily; stateful services (sessions, WebSockets) need sticky sessions or external state store (Redis)
- **Load balancing algorithms:** Round Robin (equal distribution, ignores server load); Least Connections (send to server with fewest active connections — better for varying request durations); IP Hash / Consistent Hashing (same client always hits same server — enables session affinity without sticky sessions); Weighted Round Robin (capacity-aware)
- **L4 vs L7:** L4 (transport layer — routes by IP/TCP without reading request body, faster, used for TCP/UDP); L7 (application layer — reads HTTP headers/URL/cookies, enables path-based routing, A/B testing, SSL termination, more CPU-intensive — AWS ALB is L7, NLB is L4)
- **CAP theorem:** You can only guarantee 2 of 3 in a distributed system — Consistency (every read gets the most recent write), Availability (every request gets a response), Partition Tolerance (system works despite network splits); Partition Tolerance is mandatory in real distributed systems — so choice is C vs A: MySQL/PostgreSQL = CP (refuse requests to preserve consistency), Cassandra/DynamoDB = AP (serve potentially stale data), Redis = CP (by default)
- **PACELC:** Extends CAP — even without partitions, distributed systems trade Latency vs Consistency for replication (PACELC = if P: A vs C; Else: L vs C); Cassandra = PA/EL (available under partition, low latency otherwise)
- **Eventual consistency patterns:** Read-your-writes consistency (user always reads their own writes — route to same replica); monotonic reads (don't read older data after newer — sticky session to replica); causal consistency (respects happened-before)

### Key Mental Models
- CAP is often misunderstood — think of it as "when the network fails, do you return an error or serve potentially stale data?" — most web apps choose availability (AP) over consistency (CP)
- Load balancing is not just about distributing traffic — it's about health checking, connection draining, and enabling zero-downtime deploys
- Horizontal scaling is the goal, but it requires architecting for statelessness from day one — retrofitting statelessness is painful

### Why This Matters in Interviews
System design is tested in every senior interview. CAP theorem, load balancing strategies, and horizontal vs vertical scaling are baseline vocabulary — if you can't explain these clearly in under 2 minutes each, you'll lose points immediately. Interviewers test whether you can reason about trade-offs, not just recite definitions.

---

## DSA Focus: Backtracking – N-Queens & Word Search

- **Problem:** N-Queens (LeetCode #51)
- **Difficulty:** Hard
- **Pattern:** Backtracking with column/diagonal constraint sets
- **Time Target:** Solve in under 20 minutes
- **Key Insight:** Track occupied columns, left diagonals (row-col), and right diagonals (row+col) in sets; at each row, try each column — if none of the three sets contain the position, it's safe to place; backtrack by removing from sets after recursion

---

## Today's 5 Interview Questions (Flash Review)
1. What is the practical difference between L4 and L7 load balancers — when would you choose each?
2. Explain the CAP theorem with one concrete database example for each of CP, AP, and CA?
3. Why is "CA" essentially impossible in a real distributed system?
4. How does consistent hashing solve the problem of adding/removing servers in a load balancer?
5. What does "eventual consistency" mean in practice, and what guarantees does it NOT provide?

---

## Files in This Folder
- `01-concept/` → Read: CAP theorem explained, Martin Kleppmann's DDIA Chapter 8 notes, AWS load balancer comparison docs
- `02-hands-on/` → Code: architecture-diagram.md (draw scalable system for 10K → 1M users with load balancer, cache, DB replicas)
- `03-dsa/` → DSA: n-queens.js (backtracking with set-based constraint tracking), word-search.js (DFS + backtracking on grid)
- `04-interview-prep/` → Full Q&A: 5 system design fundamentals questions with detailed answers and diagrams

---

## Success Criteria
- [ ] Can explain CAP theorem with real examples and explain why partition tolerance is non-optional
- [ ] Solved N-Queens in < 20 minutes using constraint set backtracking
- [ ] Confident answering all 5 fundamentals interview questions
- [ ] Bonus: Explain the PACELC theorem and how it extends CAP — with a real example from Cassandra
