const express = require("express");
require("dotenv").config();
const cors = require("cors");
const app = express();
const NodeCache = require("node-cache");
const compression = require("compression");
const { MongoClient, ServerApiVersion } = require("mongodb");
const port = process.env.PORT || 3000;

const cache = new NodeCache({ stdTTL: 600 }); // Cache for 10 minutes

app.use(express.json());
app.use(compression()); // Compress responses
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
// mongodb connection
const uri = process.env.MONGODB_URL || "mongodb://localhost:27017/e-commerce-analytics";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const db = await client.db("aggregation-framework");


    // Creating Indexes for faster queries (Important)
    await db.collection("orders").createIndex({ orderDate: -1 });
    await db.collection("products").createIndex({ stock: 1 });
    await db.collection("users").createIndex({ lastLogin: -1 });
    await db.collection("products").createIndex({ "category": 1 });
    await db.collection("orders").createIndex({ "userId": 1 });
    await db.collection("products").createIndex({ "stock": 1 });
    await db.collection("users").createIndex({ email: 1 }, { unique: true });

    // Dashboard Analytics Endpoint
    app.get("/api/dashboard/analytics", async (req, res) => {
      try {

        const cachedAnalytics = cache.get("dashboardAnalytics");
        if (cachedAnalytics) {
          return res.json(cachedAnalytics);
        }

        const [
          activeUsers,
          totalProducts,
          totalRevenueData,
          monthlySalesData,
          inventoryMetrics,
          customerSegmentation
        ] = await Promise.all([
          // Active Users
          db.collection("users").countDocuments(),

          // Total Products
          db.collection("products").countDocuments(),

          // Total Revenue
          db.collection("orders").aggregate([
            {
              $group: {
                _id: null,
                totalRevenue: { $sum: "$totalAmount" },
                totalOrders: { $sum: 1 }
              }
            }
          ]).toArray(),

          // Monthly Sales Data
          db.collection("orders").aggregate([
            {
              $group: {
                _id: {
                  year: { $year: "$orderDate" },
                  month: { $month: "$orderDate" }
                },
                revenue: { $sum: "$totalAmount" },
                orders: { $sum: 1 }
              }
            },
            {
              $project: {
                _id: 0,
                year: "$_id.year",
                month: "$_id.month",
                revenue: 1,
                orders: 1
              }
            },
            { $sort: { year: 1, month: 1 } }
          ]).toArray(),

          // Inventory Metrics
          db.collection("products").aggregate([
            {
              $group: {
                _id: null,
                totalStock: { $sum: "$stock" },
                averageStock: { $avg: "$stock" },
                lowStock: {
                  $sum: { $cond: [{ $lt: ["$stock", 10] }, 1, 0] }
                },
                outOfStock: {
                  $sum: { $cond: [{ $eq: ["$stock", 0] }, 1, 0] }
                }
              }
            }
          ]).toArray(),

          // Customer Segmentation
          db.collection("orders").aggregate([
            {
              $group: {
                _id: "$userId",
                totalSpent: { $sum: "$totalAmount" },
                orderCount: { $sum: 1 },
                averageOrderValue: { $avg: "$totalAmount" },
                lastPurchaseDate: { $max: "$orderDate" }
              }
            },
            {
              $addFields: {
                daysSinceLastPurchase: {
                  $divide: [
                    { $subtract: [new Date(), "$lastPurchaseDate"] },
                    1000 * 60 * 60 * 24
                  ]
                }
              }
            },
            {
              $addFields: {
                segment: {
                  $switch: {
                    branches: [
                      {
                        case: {
                          $and: [
                            { $gte: ["$totalSpent", 1000] },
                            { $lt: ["$daysSinceLastPurchase", 7] }
                          ]
                        },
                        then: "VIP"
                      },
                      {
                        case: { $lt: ["$daysSinceLastPurchase", 7] },
                        then: "Active"
                      },
                      {
                        case: { $lt: ["$daysSinceLastPurchase", 30] },
                        then: "Regular"
                      }
                    ],
                    default: "At Risk"
                  }
                }
              }
            }
          ]).toArray()
        ]);

        // console.log("Query results:", {
        //   activeUsers,
        //   totalProducts,
        //   totalRevenueData,
        //   monthlySalesCount: monthlySalesData.length,
        //   customerSegmentationCount: customerSegmentation.length
        // });

        const totalOrders = totalRevenueData[0]?.totalOrders || 0;
        const totalRevenue = totalRevenueData[0]?.totalRevenue || 0;

        const analyticsData = {
          activeUsers,
          totalProducts,
          totalRevenue,
          monthlySalesData,
          inventoryMetrics: inventoryMetrics[0],
          customerAnalytics: {
            totalCustomers: customerSegmentation.length,
            averageLifetimeValue: customerSegmentation.reduce((acc, curr) => acc + curr.totalSpent, 0) / customerSegmentation.length || 0,
            customerSegments: customerSegmentation
          },
          kpis: {
            averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
            conversionRate: activeUsers > 0 ? ((totalOrders / activeUsers) * 100).toFixed(2) : "0.00",
            stockTurnoverRate: inventoryMetrics[0]?.totalStock > 0 ? totalRevenue / inventoryMetrics[0].totalStock : 0
          }
        };

        cache.set("dashboardAnalytics", analyticsData, 600);
        res.json(analyticsData);
      } catch (error) {
        console.error("Error fetching analytics:", error);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
      }
    });

    // Test endpoint
    app.get("/", (req, res) => {
      res.send("E-commerce Analytics API is running!");
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
