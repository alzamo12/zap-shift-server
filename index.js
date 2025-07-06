const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require("dotenv").config()
const app = express();
const port = process.env.PORT || 5000;

app.use(cors())
app.use(express.json())



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.g8eto.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const db = client.db("zapShift");
        const parcelCollection = db.collection("parcels");

        app.post('/parcel', async (req, res, next) => {
            try {
                const parcelData = req.body;
                // console.log(parcelData)
                const {
                    type, title, weight,
                    senderName, senderContact, senderRegion, senderCenter, senderAddress, pickupInstruction,
                    receiverName, receiverContact, receiverRegion, receiverCenter, receiverAddress, deliveryInstruction
                } = parcelData;

                // --- Input validation ---
                if (!['document', 'non-document'].includes(type))
                    throw { statusCode: 400, message: 'Invalid parcel type' };
                if (!title) throw { statusCode: 400, message: 'Title is required' };
                if (type === 'non-document' && (typeof weight !== 'number' || weight <= 0))
                    throw { statusCode: 400, message: 'Weight must be a positive number for non-document parcels' };

                const required = {
                    senderName, senderContact, senderRegion, senderCenter, senderAddress, pickupInstruction,
                    receiverName, receiverContact, receiverRegion, receiverCenter, receiverAddress, deliveryInstruction
                };
                for (const [key, val] of Object.entries(required)) {
                    if (!val) throw { statusCode: 400, message: `${key} is required` };
                }

                // --- Insert into DB ---
                const result = await parcelCollection.insertOne(parcelData);
                if (!result.acknowledged) throw { statusCode: 500, message: 'Failed to create parcel' };

                res.status(201).json({
                    success: true,
                    data: { _id: result.insertedId, ...parcelData }
                });

            } catch (err) {
                next(err);
            }
        });

        // GET /parcels?email=sender@example.com
        // Retrieves parcels for a given sender email, sorted by creation_date descending
        app.get('/parcels', async (req, res, next) => {
            try {
                const { email } = req.query;
                const filter = email ? { created_by: email } : {};

                const parcels = await parcelCollection
                    .find(filter)
                    .sort({ creation_date: -1 })
                    .toArray();

                res.status(200).json({ success: true, count: parcels.length, data: parcels });
            } catch (err) {
                next(err);
            }
        });

        app.delete('/parcel/:id', async (req, res, next) => {
            try {
                const { id } = req.params;
                const result = await parcelCollection.deleteOne({ _id: new ObjectId(id) });
                if (result.deletedCount === 0) {
                    return res.status(404).json({ success: false, message: 'Parcel not found' });
                }
                res.send(result)
            } catch (err) {
                next(err);
            }
        });


        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);



app.get("/", async (req, res) => {
    res.send("zap shift parcel server is running")
})

app.listen(port, () => {
    console.log(` server is running on port: ${port}`)
})