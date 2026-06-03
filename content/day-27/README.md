# Day 27 – MongoDB Aggregation Pipeline: $lookup, $facet & $graphLookup | DSA: Greedy

> **Phase 3 – Node.js + MySQL + MongoDB** | 90 min/day | 3-Year Full-Stack Dev

---

## ⏱ Daily Time Block
| Block | Time | Focus |
|-------|------|-------|
| Concept | 00:00–00:40 | $match, $group, $project, $lookup, $unwind, $facet, $bucket, $graphLookup + indexes |
| Hands-On | 00:40–01:10 | Build 5 complex aggregation pipelines: reporting dashboard, faceted search |
| DSA | 01:10–01:25 | Jump Game (#55) + Meeting Rooms (#252) |
| Interview Q | 01:25–01:30 | Flash review 5 key questions |

---

## Today's Objectives
- [ ] Write multi-stage aggregation pipelines with $lookup and $unwind
- [ ] Implement faceted search with $facet for a product catalog
- [ ] Understand when aggregation indexes apply and how to use $explain
- [ ] Solve: Jump Game (#55) using greedy approach
- [ ] Review 5 MongoDB aggregation questions

---

## Concept: MongoDB Aggregation Pipeline

### What to Study
- **Core stages:** `$match` (filter — put early to use indexes), `$group` (aggregate with `_id` grouping key + `$sum/$avg/$max/$push`), `$project` (reshape — include/exclude/compute fields), `$sort` (sort — use index if first stage after $match), `$limit/$skip` (pagination)
- **$lookup (left outer join):** `{ $lookup: { from: 'orders', localField: '_id', foreignField: 'userId', as: 'orders' } }` — pipeline lookup allows filtering during join; combine with `$unwind` to flatten the array result; expensive on large collections without indexes
- **$unwind:** Deconstructs an array field — each array element becomes a separate document; `preserveNullAndEmptyArrays: true` keeps documents where the array is missing/empty (like LEFT JOIN behavior)
- **$facet:** Runs multiple aggregation pipelines on the same input documents in parallel — ideal for faceted search (total count + category counts + price ranges in one query instead of 3 queries)
- **$graphLookup:** Recursive lookup for tree/graph structures — `{ from: 'employees', startWith: '$managerId', connectFromField: 'managerId', connectToField: '_id', as: 'reportingChain', maxDepth: 5 }`
- **Performance:** Put `$match` and `$sort` as early as possible to leverage indexes; `$limit` early to reduce pipeline data; use `explain('executionStats')` to profile; indexes on `$lookup` foreign field are critical

### Key Mental Models
- The aggregation pipeline is a conveyor belt — each stage receives documents from the previous stage and outputs transformed documents; think of each stage as a SQL clause (match=WHERE, group=GROUP BY, project=SELECT, sort=ORDER BY)
- $facet is the "branch" operator — it splits the pipeline into parallel sub-pipelines on the same data, collects all results, and merges them into one document
- Always ask: "What index does this pipeline use?" — run `db.collection.explain('executionStats').aggregate([...])` before putting any aggregation in production

### Why This Matters in Interviews
MongoDB aggregation is the most commonly tested MongoDB topic at senior level. Interviewers often give a schema and ask you to solve a reporting or search problem. Knowing $lookup as the MongoDB equivalent of JOIN, and $facet for faceted search, demonstrates production-level MongoDB experience beyond basic CRUD.

---

## DSA Focus: Greedy – Jump Game & Meeting Rooms

- **Problem:** Jump Game (LeetCode #55)
- **Difficulty:** Medium
- **Pattern:** Greedy — track maximum reachable index
- **Time Target:** Solve in under 20 minutes
- **Key Insight:** Track `maxReach` = farthest index you can reach so far; at each index i, if `i > maxReach` return false; otherwise update `maxReach = max(maxReach, i + nums[i])` — greedy works because reaching index i means you can use all jumps up to i

---

## Today's 5 Interview Questions (Flash Review)
1. How does $lookup differ from a SQL JOIN in terms of performance characteristics?
2. Why should $match appear as early as possible in an aggregation pipeline?
3. What is $facet used for and how does it differ from running multiple separate queries?
4. How would you model and query a tree hierarchy (org chart) in MongoDB?
5. What does $unwind do to documents with an array field, and what does preserveNullAndEmptyArrays control?

---

## Files in This Folder
- `01-concept/` → Read: MongoDB aggregation pipeline docs, $lookup reference, $graphLookup examples
- `02-hands-on/` → Code: pipelines.js (5 aggregations: sales report, faceted product search, org chart traversal, user activity stats)
- `03-dsa/` → DSA: jump-game.js (greedy with maxReach), meeting-rooms.js (sort + greedy interval check)
- `04-interview-prep/` → Full Q&A: 5 MongoDB aggregation questions with complete pipeline solutions

---

## Success Criteria
- [ ] Can write a $lookup + $unwind pipeline from memory to join two collections
- [ ] Solved Jump Game in < 20 minutes using the greedy maxReach approach
- [ ] Confident answering all 5 aggregation interview questions
- [ ] Bonus: Build a $facet pipeline that returns category counts, price range buckets, and total count in one query
