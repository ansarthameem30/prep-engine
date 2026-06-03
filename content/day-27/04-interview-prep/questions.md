# Day 27 — MongoDB Aggregation Pipeline: Interview Q&A

---

**Q1. Why would you use the aggregation pipeline instead of multiple `find()` calls in application code?**

`find()` can only filter and project — it cannot group, transform shapes, compute cross-document aggregations, or join collections. Processing the equivalent in application code means: fetching all documents to the application server, iterating in JS/Node, and doing all computation there. This wastes network bandwidth, uses application memory, and is significantly slower because you're transferring data the database could have filtered. The aggregation pipeline runs computation server-side, close to the data, using MongoDB's C++ layer. For analytics queries (sales totals, user stats, trend analysis), the pipeline can reduce a 10MB data transfer to a 1KB result. Use application-side processing only when computation requires capabilities MongoDB doesn't have (complex business logic, external API calls, etc.).

---

**Q2. Where should `$match` be placed in a pipeline and why?**

`$match` should be as early as possible — ideally the first stage. Two reasons: (1) **Index usage**: only a `$match` at the start of the pipeline can leverage collection indexes. A `$match` after `$group` cannot use the original indexes and must scan the in-memory result set. (2) **Document reduction**: every subsequent stage processes fewer documents, reducing CPU, memory, and inter-stage data transfer. A common mistake is `$project` before `$match` — this prevents index usage and forces a collection scan. The pattern `{ $match }, { $sort }, { $project }` is optimal because `$match` + `$sort` on indexed fields gets an index-backed sorted scan, and `$project` then reduces document size for the remaining stages.

---

**Q3. Explain the difference between `$project` and `$addFields`.**

`$project` fully controls the output document shape — you must explicitly include every field you want to keep. Fields not listed with `1` are excluded (except `_id` which requires explicit `0` to exclude). `$addFields` (alias: `$set`) is non-destructive — it adds or overwrites fields while keeping all existing fields intact. Use `$project` when you want to radically reshape a document (reduce to a few fields, rename fields, compute new ones). Use `$addFields` when you want to augment a document with computed fields while preserving the original structure. In pipelines that pass through to further stages, `$addFields` is safer because downstream stages won't fail from unexpectedly missing fields.

---

**Q4. What is `$unwind` and what bug can it introduce if you're not careful?**

`$unwind` deconstructs an array field, creating one document per array element. A document with a `tags: ['a', 'b', 'c']` field becomes three documents, each with a single string `tags` value. The subtle bug: if a document has a `null` or missing array field, `$unwind` by default **silently drops the document** from the pipeline. This means your aggregation results are missing data with no error or warning. Always use `{ $unwind: { path: '$field', preserveNullAndEmptyArrays: true } }` unless you explicitly want to exclude docs with empty arrays. After `$unwind`, a subsequent `$group` by the original document ID is the pattern for "per-array-element aggregation then re-group."

---

**Q5. How does `$lookup` work and what are its performance considerations?**

`$lookup` performs a left outer join. For each document in the current pipeline, it queries the `from` collection matching on `localField === foreignField`. Results are added as an array field. The join runs **for each document** in the pipeline — if you have 10,000 documents in stage 5 and do a `$lookup`, MongoDB executes 10,000 sub-queries against the joined collection. Index the `foreignField` — without it, each sub-query is a collection scan. Put `$match` before `$lookup` to minimize documents reaching the join stage. The pipeline variant of `$lookup` (using `let` + `pipeline`) is more powerful but also more expensive because the sub-pipeline runs per document. For complex analytics involving joins across large collections, consider denormalizing data instead — MongoDB's performance degrades significantly compared to relational databases for multi-collection joins.

---

**Q6. What is `$facet` and when would you use it?**

`$facet` runs multiple independent aggregation pipelines on the same input documents in a single pass, returning all results in one response object. Each sub-pipeline starts from the same input documents (the stage immediately before `$facet`). Classic use case: search results pages that need simultaneously — (a) paginated results, (b) total count for pagination, (c) faceted filter counts (how many results per category, price range), and (d) metadata like average price. Without `$facet`, this requires 4+ separate queries with 4x the network round-trips and 4x the collection reads. With `$facet`, it's a single query. The tradeoff: `$facet` can't use indexes independently in each sub-pipeline for stages after the split point. Also, `$facet` cannot be used in a pipeline that uses `$out` or `$merge`.

---

**Q7. What is `$graphLookup` and what problem does it solve?**

`$graphLookup` performs recursive lookups within a single collection, following references up to a specified depth. It solves the hierarchical data problem: "find all employees under manager X, at any depth" — with regular `$lookup`, you'd need to know the maximum depth and chain multiple lookups. `$graphLookup` handles arbitrary depths. It starts with the documents in `startWith`, then recursively follows `connectFromField` → `connectToField` links. Use cases: organizational hierarchies, product category trees, social network friend-of-friend queries, bill of materials, geographic region nesting. Performance note: `$graphLookup` requires the `connectToField` to be indexed for reasonable performance. Without an index, each recursive step is a collection scan. The `maxDepth` parameter is a safety valve against infinite recursion in cyclic graphs.

---

**Q8. How does MongoDB aggregation differ from SQL GROUP BY, and what is the equivalent of a SQL HAVING clause?**

In MongoDB aggregation, `$group` is the equivalent of SQL `GROUP BY`. The `_id` field in `$group` specifies the grouping key (equivalent to the GROUP BY columns). The accumulators (`$sum`, `$avg`, `$max`, etc.) are equivalent to aggregate functions. The key difference: MongoDB's `$group` is a pipeline stage — you apply it as one step in a sequence, and its output documents flow to the next stage. SQL `GROUP BY` + `HAVING` is a single declarative clause. The MongoDB equivalent of `HAVING` is a `$match` stage placed **after** the `$group` stage — `{ $group: {...} }, { $match: { totalRevenue: { $gt: 1000 } } }`. This works because `$match` filters the already-grouped documents. This `$match` cannot use the original collection indexes (it's filtering aggregated output), so it operates in memory on the grouped result set.
