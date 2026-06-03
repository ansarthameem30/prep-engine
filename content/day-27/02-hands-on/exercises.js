/**
 * Day 27 — MongoDB Aggregation Pipeline
 * Hands-on Exercises
 *
 * These exercises show the aggregation pipeline syntax and logic.
 * Run against a real MongoDB instance: mongosh or mongoose.
 * Mock data + pipeline logic is demonstrated inline.
 */

// ─────────────────────────────────────────────
// Sample Data Schema
// ─────────────────────────────────────────────

const sampleOrders = [
  { _id: 1, userId: 'u1', status: 'completed', createdAt: new Date('2024-01-05'),
    items: [{ productId: 'p1', name: 'Laptop', qty: 1, price: 1299 }, { productId: 'p2', name: 'Mouse', qty: 2, price: 29 }] },
  { _id: 2, userId: 'u2', status: 'completed', createdAt: new Date('2024-01-12'),
    items: [{ productId: 'p1', name: 'Laptop', qty: 1, price: 1299 }, { productId: 'p3', name: 'Keyboard', qty: 1, price: 89 }] },
  { _id: 3, userId: 'u1', status: 'completed', createdAt: new Date('2024-02-01'),
    items: [{ productId: 'p2', name: 'Mouse', qty: 3, price: 29 }] },
  { _id: 4, userId: 'u3', status: 'cancelled', createdAt: new Date('2024-02-14'),
    items: [{ productId: 'p4', name: 'Monitor', qty: 1, price: 499 }] },
  { _id: 5, userId: 'u2', status: 'completed', createdAt: new Date('2024-03-08'),
    items: [{ productId: 'p4', name: 'Monitor', qty: 2, price: 499 }, { productId: 'p2', name: 'Mouse', qty: 1, price: 29 }] },
];

const sampleUsers = [
  { _id: 'u1', name: 'Alice', department: 'Engineering' },
  { _id: 'u2', name: 'Bob', department: 'Sales' },
  { _id: 'u3', name: 'Carol', department: 'Marketing' },
];

const sampleEmployees = [
  { _id: 'e1', name: 'CEO Alice', managerId: null, salary: 250000 },
  { _id: 'e2', name: 'VP Bob', managerId: 'e1', salary: 180000 },
  { _id: 'e3', name: 'Sr Carol', managerId: 'e2', salary: 115000 },
  { _id: 'e4', name: 'Dev Dave', managerId: 'e2', salary: 95000 },
  { _id: 'e5', name: 'VP Eve', managerId: 'e1', salary: 170000 },
  { _id: 'e6', name: 'Mkt Frank', managerId: 'e5', salary: 88000 },
];

// ─────────────────────────────────────────────
// Pipeline executor (simulates MongoDB aggregation in JS)
// ─────────────────────────────────────────────

function runPipeline(collection, pipeline) {
  let docs = JSON.parse(JSON.stringify(collection)); // deep copy

  for (const stage of pipeline) {
    const [operator, spec] = Object.entries(stage)[0];

    switch (operator) {
      case '$match':
        docs = docs.filter(doc => matchesFilter(doc, spec));
        break;
      case '$unwind':
        const field = typeof spec === 'string' ? spec.replace('$', '') : spec.path.replace('$', '');
        const preserve = spec.preserveNullAndEmptyArrays;
        const newDocs = [];
        for (const doc of docs) {
          const arr = doc[field];
          if (!arr || (Array.isArray(arr) && arr.length === 0)) {
            if (preserve) newDocs.push({ ...doc, [field]: null });
          } else if (Array.isArray(arr)) {
            arr.forEach((item, idx) => newDocs.push({ ...doc, [field]: item }));
          } else {
            newDocs.push(doc);
          }
        }
        docs = newDocs;
        break;
      case '$group':
        docs = groupDocs(docs, spec);
        break;
      case '$sort':
        docs = docs.sort((a, b) => {
          for (const [key, dir] of Object.entries(spec)) {
            const av = getNestedVal(a, key), bv = getNestedVal(b, key);
            if (av !== bv) return dir * (av < bv ? -1 : 1);
          }
          return 0;
        });
        break;
      case '$limit':
        docs = docs.slice(0, spec);
        break;
      case '$skip':
        docs = docs.slice(spec);
        break;
      case '$project':
        docs = docs.map(doc => projectDoc(doc, spec));
        break;
      case '$count':
        docs = [{ [spec]: docs.length }];
        break;
    }
  }
  return docs;
}

function getNestedVal(obj, path) {
  return path.split('.').reduce((o, k) => o?.[k], obj);
}

function matchesFilter(doc, filter) {
  for (const [key, val] of Object.entries(filter)) {
    const docVal = getNestedVal(doc, key);
    if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
      if (val.$gte !== undefined && !(docVal >= val.$gte)) return false;
      if (val.$lte !== undefined && !(docVal <= val.$lte)) return false;
      if (val.$gt !== undefined && !(docVal > val.$gt)) return false;
      if (val.$in !== undefined && !val.$in.includes(docVal)) return false;
    } else {
      if (docVal !== val) return false;
    }
  }
  return true;
}

function groupDocs(docs, spec) {
  const groups = new Map();
  for (const doc of docs) {
    const key = JSON.stringify(
      typeof spec._id === 'string' ? getNestedVal(doc, spec._id.replace('$', ''))
      : spec._id === null ? null
      : spec._id
    );
    if (!groups.has(key)) {
      const init = { _id: typeof spec._id === 'string' ? getNestedVal(doc, spec._id.replace('$','')) : spec._id };
      for (const [field, acc] of Object.entries(spec)) {
        if (field === '_id') continue;
        if (acc.$sum !== undefined) init[field] = 0;
        else if (acc.$avg !== undefined) { init[field] = 0; init[`_cnt_${field}`] = 0; }
        else if (acc.$push !== undefined) init[field] = [];
        else if (acc.$addToSet !== undefined) init[field] = new Set();
        else if (acc.$max !== undefined) init[field] = -Infinity;
        else if (acc.$min !== undefined) init[field] = Infinity;
      }
      groups.set(key, init);
    }
    const g = groups.get(key);
    for (const [field, acc] of Object.entries(spec)) {
      if (field === '_id') continue;
      const srcVal = typeof acc.$sum === 'string' ? getNestedVal(doc, acc.$sum.replace('$',''))
                   : typeof acc.$avg === 'string' ? getNestedVal(doc, acc.$avg.replace('$',''))
                   : typeof acc.$push === 'string' ? getNestedVal(doc, acc.$push.replace('$',''))
                   : typeof acc.$addToSet === 'string' ? getNestedVal(doc, acc.$addToSet.replace('$',''))
                   : typeof acc.$max === 'string' ? getNestedVal(doc, acc.$max.replace('$',''))
                   : typeof acc.$min === 'string' ? getNestedVal(doc, acc.$min.replace('$',''))
                   : 1;
      if (acc.$sum !== undefined) g[field] += (srcVal || 0);
      if (acc.$avg !== undefined) { g[field] += srcVal; g[`_cnt_${field}`]++; }
      if (acc.$push !== undefined) g[field].push(srcVal);
      if (acc.$addToSet !== undefined) g[field].add(srcVal);
      if (acc.$max !== undefined && srcVal > g[field]) g[field] = srcVal;
      if (acc.$min !== undefined && srcVal < g[field]) g[field] = srcVal;
    }
  }
  return Array.from(groups.values()).map(g => {
    for (const [field, acc] of Object.entries(spec)) {
      if (acc?.$avg !== undefined) { g[field] = g[field] / g[`_cnt_${field}`]; delete g[`_cnt_${field}`]; }
      if (acc?.$addToSet !== undefined) g[field] = [...g[field]];
    }
    return g;
  });
}

function projectDoc(doc, spec) {
  const result = {};
  for (const [key, val] of Object.entries(spec)) {
    if (val === 1) result[key] = getNestedVal(doc, key);
    else if (val === 0) { /* exclude */ }
    else if (typeof val === 'string' && val.startsWith('$')) result[key] = getNestedVal(doc, val.slice(1));
  }
  return result;
}


// ─────────────────────────────────────────────
// Exercise 1: Top 5 products by total revenue
// ─────────────────────────────────────────────

function exercise1_topProductsByRevenue() {
  console.log('=== Exercise 1: Top 5 Products by Revenue ===');

  // In MongoDB:
  // db.orders.aggregate([
  //   { $match: { status: 'completed' } },
  //   { $unwind: '$items' },
  //   { $group: { _id: '$items.productId', name: { $first: '$items.name' },
  //              totalRevenue: { $sum: { $multiply: ['$items.price', '$items.qty'] } },
  //              totalUnitsSold: { $sum: '$items.qty' } } },
  //   { $sort: { totalRevenue: -1 } },
  //   { $limit: 5 }
  // ])

  // Simulated execution:
  const completedOrders = sampleOrders.filter(o => o.status === 'completed');
  const productStats = {};

  for (const order of completedOrders) {
    for (const item of order.items) {
      if (!productStats[item.productId]) {
        productStats[item.productId] = { id: item.productId, name: item.name, revenue: 0, units: 0 };
      }
      productStats[item.productId].revenue += item.price * item.qty;
      productStats[item.productId].units += item.qty;
    }
  }

  const top5 = Object.values(productStats)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  console.log('Top products by revenue:');
  top5.forEach((p, i) => console.log(`  ${i + 1}. ${p.name}: $${p.revenue} (${p.units} units sold)`));
}

exercise1_topProductsByRevenue();


// ─────────────────────────────────────────────
// Exercise 2: $facet — paginated results + total count + price histogram
// ─────────────────────────────────────────────

function exercise2_facetQuery() {
  console.log('\n=== Exercise 2: $facet — Multi-result in one pass ===');

  // MongoDB pipeline:
  const pipeline = `
  db.products.aggregate([
    { $match: { status: 'active', category: { $in: ['laptops', 'phones'] } } },
    { $facet: {
      // Facet 1: paginated product list
      results: [
        { $sort: { price: 1 } },
        { $skip: 0 },
        { $limit: 10 },
        { $project: { name: 1, price: 1, category: 1 } }
      ],
      // Facet 2: total count (for pagination UI)
      totalCount: [
        { $count: 'count' }
      ],
      // Facet 3: price distribution histogram
      priceHistogram: [
        { $bucket: {
          groupBy: '$price',
          boundaries: [0, 500, 1000, 1500, 2000],
          default: '2000+',
          output: { count: { $sum: 1 }, avgPrice: { $avg: '$price' } }
        }}
      ],
      // Facet 4: count per category
      categoryBreakdown: [
        { $group: { _id: '$category', count: { $sum: 1 } } }
      ]
    }}
  ])
  `;

  console.log('MongoDB $facet pipeline (runs all sub-pipelines in ONE collection scan):');
  console.log(pipeline.trim());
  console.log('\nKey benefit: One network round-trip, one collection scan for 4 different aggregations');
  console.log('Alternative without $facet: 4 separate queries = 4x the I/O and 4x the round-trips');
}

exercise2_facetQuery();


// ─────────────────────────────────────────────
// Exercise 3: $lookup — join users and orders
// ─────────────────────────────────────────────

function exercise3_lookup() {
  console.log('\n=== Exercise 3: $lookup Join ===');

  // MongoDB pipeline:
  // db.users.aggregate([
  //   { $lookup: {
  //       from: 'orders',
  //       localField: '_id',
  //       foreignField: 'userId',
  //       as: 'orders'
  //   }},
  //   { $addFields: {
  //       orderCount: { $size: '$orders' },
  //       totalSpent: { $sum: '$orders.totalAmount' }
  //   }},
  //   { $project: { password: 0, orders: 0 } }
  // ])

  // Simulate the join:
  const usersWithOrders = sampleUsers.map(user => {
    const userOrders = sampleOrders.filter(o => o.userId === user._id && o.status === 'completed');
    const totalSpent = userOrders.reduce((sum, o) =>
      sum + o.items.reduce((s, i) => s + i.price * i.qty, 0), 0
    );
    return { ...user, orderCount: userOrders.length, totalSpent };
  });

  console.log('Users with order aggregates (via $lookup + $addFields):');
  usersWithOrders.forEach(u =>
    console.log(`  ${u.name}: ${u.orderCount} orders, $${u.totalSpent} total spent`)
  );

  console.log('\nPipeline lookup (more powerful — with sub-pipeline):');
  console.log(`
  db.users.aggregate([
    { $lookup: {
        from: 'orders',
        let: { uid: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$userId', '$$uid'] }, status: 'completed' } },
          { $sort: { createdAt: -1 } },
          { $limit: 5 }
        ],
        as: 'recentOrders'
    }}
  ])
  `);
}

exercise3_lookup();


// ─────────────────────────────────────────────
// Exercise 4: $graphLookup — org chart
// ─────────────────────────────────────────────

function exercise4_graphLookup() {
  console.log('\n=== Exercise 4: $graphLookup Org Chart ===');

  // MongoDB $graphLookup:
  // db.employees.aggregate([
  //   { $match: { managerId: null } },  // start from root
  //   { $graphLookup: {
  //       from: 'employees',
  //       startWith: '$_id',
  //       connectFromField: '_id',
  //       connectToField: 'managerId',
  //       as: 'allReports',
  //       maxDepth: 10,
  //       depthField: 'depth'
  //   }}
  // ])

  // Simulate recursive traversal:
  function getReports(employeeId, depth = 0) {
    const reports = sampleEmployees.filter(e => e.managerId === employeeId);
    return reports.flatMap(emp => [
      { ...emp, depth },
      ...getReports(emp._id, depth + 1)
    ]);
  }

  const root = sampleEmployees.find(e => e.managerId === null);
  const orgChart = [{ ...root, depth: 0 }, ...getReports(root._id, 1)];

  console.log('Org chart from graphLookup simulation:');
  orgChart.forEach(e =>
    console.log(`${'  '.repeat(e.depth)}${e.depth === 0 ? '●' : '└─'} ${e.name} ($${e.salary.toLocaleString()})`)
  );
}

exercise4_graphLookup();


// ─────────────────────────────────────────────
// Exercise 5: Monthly sales report with running total
// ─────────────────────────────────────────────

function exercise5_monthlySalesReport() {
  console.log('\n=== Exercise 5: Monthly Sales + Running Total ===');

  // MongoDB 5+ uses $setWindowFields for running totals:
  const windowPipeline = `
  db.orders.aggregate([
    { $match: { status: 'completed' } },
    { $unwind: '$items' },
    { $group: {
        _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
        monthlyRevenue: { $sum: { $multiply: ['$items.price', '$items.qty'] } },
        orderCount: { $sum: 1 }
    }},
    { $sort: { '_id.year': 1, '_id.month': 1 } },
    { $setWindowFields: {
        sortBy: { '_id.year': 1, '_id.month': 1 },
        output: {
          runningTotal: { $sum: '$monthlyRevenue', window: { documents: ['unbounded', 'current'] } },
          prevMonthRevenue: { $shift: { output: '$monthlyRevenue', by: -1 } }
        }
    }},
    { $addFields: {
        growthPct: {
          $cond: {
            if: { $gt: ['$prevMonthRevenue', 0] },
            then: { $multiply: [{ $divide: [{ $subtract: ['$monthlyRevenue', '$prevMonthRevenue'] }, '$prevMonthRevenue'] }, 100] },
            else: null
          }
        }
    }}
  ])
  `;

  // Simulate the aggregation:
  const monthlyStats = {};
  for (const order of sampleOrders.filter(o => o.status === 'completed')) {
    const month = `${order.createdAt.getFullYear()}-${String(order.createdAt.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyStats[month]) monthlyStats[month] = { month, revenue: 0, orders: 0 };
    monthlyStats[month].revenue += order.items.reduce((s, i) => s + i.price * i.qty, 0);
    monthlyStats[month].orders++;
  }

  let runningTotal = 0;
  let prevRevenue = null;
  const report = Object.entries(monthlyStats)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, stats]) => {
      runningTotal += stats.revenue;
      const growth = prevRevenue ? ((stats.revenue - prevRevenue) / prevRevenue * 100).toFixed(1) : 'N/A';
      const row = { month, revenue: stats.revenue, runningTotal, orders: stats.orders, growthPct: growth };
      prevRevenue = stats.revenue;
      return row;
    });

  console.log('Month      | Revenue  | Running Total | Orders | Growth');
  console.log('-'.repeat(60));
  report.forEach(r =>
    console.log(`${r.month}   | $${String(r.revenue).padStart(7)} | $${String(r.runningTotal).padStart(12)} | ${r.orders}      | ${r.growthPct}%`)
  );

  console.log('\n$setWindowFields pipeline (MongoDB 5+):');
  console.log(windowPipeline.trim().slice(0, 200) + '...');
}

exercise5_monthlySalesReport();
