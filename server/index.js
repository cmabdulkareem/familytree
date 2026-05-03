import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import fetch from "node-fetch"; // for Node <18; remove if using Node 18+ with global fetch

const app = express();
app.use(
  cors({
    origin: [
      "https://familytree-nu-eight.vercel.app",
      "https://familytree.vercel.app",
      "http://localhost:5173",
      "http://127.0.0.1:5173"
    ],
    methods: ["GET", "POST"],
  })
);
app.use(express.json());

// MongoDB connection
await mongoose
  .connect("mongodb+srv://ftree:ftree@sample.kvxwkea.mongodb.net/familytree")
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Schema definitions
const memberSchema = new mongoose.Schema({
  name: String,
  spouses: [String],
  children: [Object], // allow nested structure
});

const treeSchema = new mongoose.Schema({
  father: String,
  mother: String,
  children: [memberSchema],
});

const FamilyTree = mongoose.model("FamilyTree", treeSchema);

// Helper: get or create tree
const getOrCreateTree = async () => {
  let doc = await FamilyTree.findOne();
  if (!doc) {
    doc = new FamilyTree({ father: "", mother: "", children: [] });
    await doc.save();
  }
  return doc;
};

// Routes
app.get("/family-tree", async (req, res) => {
  try {
    const doc = await getOrCreateTree();
    res.json(doc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch tree" });
  }
});

app.post("/update-family-tree", async (req, res) => {
  try {
    await FamilyTree.deleteMany({});
    const newTree = new FamilyTree(req.body);
    await newTree.save();
    res.json(newTree);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update tree" });
  }
});

// Self-ping function to prevent Render sleep
const selfPing = async () => {
  try {
    await fetch("https://familytree-lt3a.onrender.com/family-tree"); // replace with your Render URL
    console.log("Self-pinged server at", new Date().toLocaleTimeString());
  } catch (err) {
    console.error("Self-ping failed:", err.message);
  }
};

// Ping every 10 minutes
setInterval(selfPing, 10 * 60 * 1000);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  selfPing(); // optional initial ping on start
});
