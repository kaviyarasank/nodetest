const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");
const Joi = require("joi");
const cors = require("cors");

const app = express();
const port = 4000;

app.use(express.json());
app.use(cors());

const url = "mongodb://127.0.0.1:27017/?directConnection=true&serverSelectionTimeoutMS=2000&appName=mongosh+2.4.2";

const client = new MongoClient(url);

async function connectDB() {
    try {
        await client.connect();
        console.log("Connected to MongoDB");
        return client.db("admin");
    } catch (error) {
        console.error("MongoDB Connection Error:", error);
    }
}


const userSchema = Joi.object({
    name: Joi.string()
        .min(3)
        .max(50)
        .required()
        .messages({
            "string.empty": "Name is required",
            "string.min": "Name should be at least 3 characters",
            "string.max": "Name should not exceed 50 characters"
        }),

    address: Joi.string()
        .required()
        .messages({
            "string.empty": "Address is required"
        })
});

// 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
app.post("/create-payment-intent", async (req, res) => {
    const stripe = require('stripe')('');
    try{
        const paymentIntent = await stripe.paymentIntents.create({
            amount: req.body.amount,
            currency: req.body.currency,
            automatic_payment_methods: {
                enabled: true,
            },
        });
        console.log("paymentIntent",paymentIntent);
        res.send({
            clientSecret: paymentIntent.client_secret,
        });
    }
    catch (error) {
        res.status(500).send(error?.raw?.message || error);

    }
});


app.post("/createdbusers", async (req, res) => {
    try {
        const db = await connectDB();
        await db.createCollection("customers");
        console.log("Collection created!");
        res.send("Collection created!");
    } catch (error) {
        console.error("Error creating collection:", error);
        res.status(500).send("Error creating collection");
    }
});


app.get("/users", async (req, res) => {
    try {
        const db = await connectDB();
        const result = await db.collection("users").find().toArray();
        res.status(200).json(result);
    } catch (error) {
        console.error("Error getting document:", error);
        res.status(500).send(error);
    }
});

app.post("/users", async (req, res) => {
    try {
        // Validate request body
        const { error } = userSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }

        const db = await connectDB();
        const result = await db.collection("users").insertOne(req.body);
        res.status(200).json({ message: "Document inserted", id: result.insertedId });
    } catch (error) {
        console.error("Error inserting document:", error);
        res.status(500).send("Error inserting document");
    }
});

app.put("/users/:id", async (req, res) => {
    try {
        const db = await connectDB();
        const result = await db.collection("users").findOneAndUpdate({ _id: new ObjectId(req.params.id) }, { $set: req.body }, { returnDocument: "after" });
        res.status(200).json({ message: "Document updated", id: result.insertedId });
    } catch (error) {
        res.status(500).send("Error updating document");
    }
});

app.delete("/users/:id", async (req, res) => {
    try {
        console.log("Deleting user with ID:", req.params.id);

        const db = await connectDB();
        const result = await db.collection("users").deleteOne({ _id: new ObjectId(req.params.id) });

        if (result.deletedCount === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
        console.error("Error deleting user:", error);
        res.status(500).send("Error deleting user");
    }
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}!`);
});
