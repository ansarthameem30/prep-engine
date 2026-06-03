# MongoDB Aggregation Pipeline

## Why Aggregation Exists

`find()` can filter and project documents, but it can't transform shapes, compute across documents, group, join collections, or produce analytical reports. The aggregation pipeline processes documents through a sequence of stages, each stage transforming the stream of documents it receives.

The mental model: documents flow through a Unix-like pipeline of stage operators. Each stage receives input documents and emits output documents.

```javascript
db.orders.aggregate([
  { $match: { status: 'completed' } },        // Stage 1: filter
  { $group: { _id: '$userId', total: { $sum: '$amount' } } }, // Stage 2: group
  { $sort: { total: -1 } },                   // Stage 3: sort
  { $limit: 10 }                              // Stage 4: top 10
])
```

---

## Stage: $match

The MongoDB equivalent of SQL `WHERE`. Reduces the document set early in the pipeline.

**Critical rule**: Place `$match` as early as possible. If it's the first stage AND the filter fields are indexed, MongoDB uses the index instead of doing a collection scan. A `$match` after a `$group` cannot use the original collection's indexes.

```javascript
{ $match: {
  status: 'published',
  createdAt: { $gte: new Date('2024-01-01') },
  tags: { $in: ['nodejs', 'mongodb'] }  // array field: matches if array contains any of these
}}
```

---

## Stage: $project

Reshape documents: include fields, exclude fields, compute new fields.

```javascript
{ $project: {
  _id: 0,                                    // exclude _id
  title: 1,                                  // include title
  authorName: '$author.name',                // rename nested field
  wordCount: { $size: { $split: ['$content', ' '] } },  // computed: word count
  isExpensive: { $gt: ['$price', 100] },     // computed boolean
  discountedPrice: {
    $cond: {
      if: { $gt: ['$stock', 100] },
      then: { $multiply: ['$price', 0.9] },  // 10% discount if stock > 100
      else: '$price'
    }
  }
}}
```

`$project` can also do arithmetic (`$add`, `$subtract`, `$multiply`, `$divide`), string operations (`$concat`, `$toLower`, `$substr`), and date operations (`$year`, `$month`, `$dateToString`).

---

## Stage: $group

The aggregation workhorse. Groups documents by `_id` expression and computes accumulators.

```javascript
{ $group: {
  _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
  totalRevenue: { $sum: '$amount' },
  avgOrderValue: { $avg: '$amount' },
  maxOrder:      { $max: '$amount' },
  minOrder:      { $min: '$amount' },
  orderCount:    { $sum: 1 },                         // count documents
  allStatuses:   { $push: '$status' },                // array of all values
  uniqueStatuses: { $addToSet: '$status' },            // deduplicated array
  firstOrder:    { $first: '$createdAt' },             // first value (respects $sort before $group)
  lastOrder:     { $last: '$createdAt' }
}}
```

`_id: null` groups ALL documents into one group (like `SELECT COUNT(*), AVG(price) FROM products`).

---

## Stage: $lookup (Joins)

Left outer join between collections. Documents that don't match get an empty array.

```javascript
// Simple lookup: join by field equality
{ $lookup: {
  from: 'users',
  localField: 'userId',      // field in current collection
  foreignField: '_id',        // field in 'users' collection
  as: 'userDetails'           // output array field name
}}
// Result: each document gets a 'userDetails' array (typically 1 element)

// Typically followed by $unwind to flatten the array:
{ $unwind: { path: '$userDetails', preserveNullAndEmptyArrays: true } }

// Pipeline lookup: more powerful — run a full pipeline on the joined collection
{ $lookup: {
  from: 'orders',
  let: { userId: '$_id' },    // variable for the pipeline
  pipeline: [
    { $match: { $expr: { $eq: ['$userId', '$$userId'] } } },
    { $match: { status: 'completed' } },  // additional filter on orders
    { $sort: { createdAt: -1 } },
    { $limit: 5 }                         // only get last 5 orders per user
  ],
  as: 'recentOrders'
}}
```

**$lookup performance note**: MongoDB doesn't have the query optimizer sophistication of a relational DB for joins. Avoid $lookup on very large collections without matching indexes on the `foreignField`. Put `$match` before `$lookup` to reduce the number of documents that need joining.

---

## Stage: $unwind

Deconstructs an array field — creates one document per array element.

```javascript
// Input: { _id: 1, tags: ['nodejs', 'api', 'rest'] }
{ $unwind: '$tags' }
// Output: 3 documents: {_id:1, tags:'nodejs'}, {_id:1, tags:'api'}, {_id:1, tags:'rest'}

// With options:
{ $unwind: {
  path: '$items',
  includeArrayIndex: 'itemIndex',       // add 0-based index field
  preserveNullAndEmptyArrays: true      // keep docs even if array is null/empty/missing
}}
```

Without `preserveNullAndEmptyArrays: true`, documents with missing or empty arrays are silently dropped from the pipeline — a common source of bugs.

---

## Stage: $facet

Run multiple aggregation pipelines in a single pass, returning results as separate fields. Ideal for search result pages with simultaneous totals, pagination, and faceted filters.

```javascript
{ $facet: {
  results: [
    { $sort: { score: -1 } },
    { $skip: 0 },
    { $limit: 20 },
    { $project: { title: 1, price: 1 } }
  ],
  totalCount: [
    { $count: 'count' }
  ],
  priceHistogram: [
    { $bucket: {
      groupBy: '$price',
      boundaries: [0, 50, 100, 200, 500, 1000],
      default: '1000+',
      output: { count: { $sum: 1 }, avgPrice: { $avg: '$price' } }
    }}
  ],
  categoryBreakdown: [
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]
}}
```

---

## Stage: $bucket and $bucketAuto

`$bucket`: Define exact boundaries for histogram bucketing.
`$bucketAuto`: MongoDB determines bucket boundaries automatically, distributing documents evenly.

---

## Stage: $graphLookup — Recursive Joins

For hierarchical data (org charts, social networks, category trees):

```javascript
{ $graphLookup: {
  from: 'employees',
  startWith: '$_id',
  connectFromField: '_id',
  connectToField: 'managerId',
  as: 'directAndIndirectReports',
  maxDepth: 5,                          // stop at 5 levels deep
  depthField: 'depth',                  // add depth field to results
  restrictSearchWithMatch: { active: true }  // only include active employees
}}
```

---

## Pipeline Optimization Rules

1. **$match + $sort before $group**: If you filter first, you group fewer documents. If you sort on an indexed field before grouping, the sort is free.
2. **$project after $match**: Reduce document size early to speed up subsequent stages.
3. **Index usage**: Only `$match` and `$sort` at the start of the pipeline can use indexes. Stages after `$group` or `$unwind` cannot use the original collection indexes.
4. **allowDiskUse: true**: By default, aggregation stages are limited to 100MB of RAM. For large aggregations (reporting, analytics), set `{ allowDiskUse: true }` to spill to disk.

```javascript
db.orders.aggregate(pipeline, { allowDiskUse: true })
```

---

## SQL Equivalents Comparison

| SQL | MongoDB Aggregation |
|-----|---------------------|
| WHERE | $match |
| SELECT col, expr AS alias | $project |
| GROUP BY | $group |
| HAVING | $match after $group |
| ORDER BY | $sort |
| LIMIT/OFFSET | $limit/$skip |
| JOIN | $lookup |
| UNION ALL (via flat) | $facet or multiple pipelines |
| Recursive CTE | $graphLookup |
| Running total | $setWindowFields (MongoDB 5+) |

---

## $setWindowFields (MongoDB 5.0+)

The MongoDB equivalent of SQL window functions:

```javascript
{ $setWindowFields: {
  partitionBy: '$department',
  sortBy: { salary: -1 },
  output: {
    rankInDept: { $rank: {} },
    runningTotal: { $sum: '$salary', window: { documents: ['unbounded', 'current'] } },
    movingAvg: { $avg: '$salary', window: { documents: [-2, 2] } }
  }
}}
```
