const { MongoClient } = require("mongodb");

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || "solo";
const COLLECTION_NAME =
	process.env.MONGODB_LEADERBOARD_COLLECTION || "leaderboard";

const PLACEHOLDER_LEADERBOARD = [
	{ id: "u1", name: "Riya", xp: 3480, streak: 28, pr: "Deadlift 120kg" },
	{ id: "u2", name: "Arjun", xp: 3320, streak: 21, pr: "Bench 95kg" },
	{ id: "u3", name: "Mira", xp: 3150, streak: 18, pr: "5k in 23:40" },
	{ id: "u4", name: "Noah", xp: 2900, streak: 17, pr: "Squat 110kg" },
	{ id: "u5", name: "Ava", xp: 2760, streak: 16, pr: "10 pull-ups" },
	{ id: "u6", name: "Leo", xp: 2510, streak: 13, pr: "Plank 4:30" },
	{ id: "u7", name: "Sia", xp: 2350, streak: 12, pr: "Hip thrust 100kg" },
	{ id: "u8", name: "Ethan", xp: 2210, streak: 11, pr: "Row 2k in 7:35" },
];

async function seed() {
	if (!MONGODB_URI) {
		throw new Error("MONGODB_URI is required.");
	}

	const client = new MongoClient(MONGODB_URI);
	await client.connect();

	try {
		const db = client.db(DB_NAME);
		const collection = db.collection(COLLECTION_NAME);

		const now = new Date().toISOString();

		for (const row of PLACEHOLDER_LEADERBOARD) {
			await collection.updateOne(
				{ id: row.id },
				{
					$set: {
						...row,
						updatedAt: now,
					},
					$setOnInsert: {
						createdAt: now,
					},
				},
				{ upsert: true },
			);
		}

		const total = await collection.countDocuments({});
		console.log(
			`Seeded leaderboard data into ${DB_NAME}.${COLLECTION_NAME}. Total docs: ${total}`,
		);
	} finally {
		await client.close();
	}
}

seed().catch((err) => {
	console.error("Leaderboard seed failed:", err.message);
	process.exit(1);
});
