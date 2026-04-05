require("dotenv").config();

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { MongoClient } = require("mongodb");

const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || "solo";
const LEADERBOARD_COLLECTION =
	process.env.MONGODB_LEADERBOARD_COLLECTION || "leaderboard";
const COMMUNITY_COLLECTION =
	process.env.MONGODB_COMMUNITY_COLLECTION || "community_posts";

const STOCK_COMMUNITY_IMAGES = [
	"https://images.pexels.com/photos/414029/pexels-photo-414029.jpeg?auto=compress&cs=tinysrgb&w=1200",
	"https://images.pexels.com/photos/2294361/pexels-photo-2294361.jpeg?auto=compress&cs=tinysrgb&w=1200",
];

const MOCK_LEADERBOARD = [
	{ id: "u1", name: "Riya", xp: 3480, streak: 28, pr: "Deadlift 120kg" },
	{ id: "u2", name: "Arjun", xp: 3320, streak: 21, pr: "Bench 95kg" },
	{ id: "u3", name: "Mira", xp: 3150, streak: 18, pr: "5k in 23:40" },
	{ id: "u4", name: "Noah", xp: 2900, streak: 17, pr: "Squat 110kg" },
	{ id: "u5", name: "Ava", xp: 2760, streak: 16, pr: "10 pull-ups" },
	{ id: "u6", name: "Leo", xp: 2510, streak: 13, pr: "Plank 4:30" },
	{ id: "u7", name: "Sia", xp: 2350, streak: 12, pr: "Hip thrust 100kg" },
	{ id: "u8", name: "Ethan", xp: 2210, streak: 11, pr: "Row 2k in 7:35" },
];

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 5 * 1024 * 1024 },
});

let client;
let db;
let leaderboardCollection;
let communityCollection;

function createMemoryCollection(initialDocs = []) {
	const docs = [...initialDocs.map((d) => ({ ...d }))];

	const clone = (obj) => JSON.parse(JSON.stringify(obj));
	const matchesFilter = (doc, filter = {}) =>
		Object.entries(filter).every(([key, value]) => doc[key] === value);

	return {
		async updateOne(filter, update, options = {}) {
			const index = docs.findIndex((doc) => matchesFilter(doc, filter));
			if (index >= 0) {
				docs[index] = {
					...docs[index],
					...(update?.$set || {}),
				};
				return { acknowledged: true, matchedCount: 1, modifiedCount: 1 };
			}

			if (options?.upsert) {
				docs.push({
					_id: `mem-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
					...filter,
					...(update?.$setOnInsert || {}),
					...(update?.$set || {}),
				});
				return { acknowledged: true, upsertedCount: 1 };
			}

			return { acknowledged: true, matchedCount: 0, modifiedCount: 0 };
		},
		async countDocuments() {
			return docs.length;
		},
		find(filter = {}) {
			let results = docs
				.filter((doc) => matchesFilter(doc, filter))
				.map((doc) => clone(doc));

			const chain = {
				sort(sortSpec = {}) {
					const [sortKey, sortDir] = Object.entries(sortSpec)[0] || [];
					if (sortKey) {
						results.sort((a, b) => {
							const av = a?.[sortKey];
							const bv = b?.[sortKey];
							if (sortDir < 0) {
								return av > bv ? -1 : av < bv ? 1 : 0;
							}
							return av > bv ? 1 : av < bv ? -1 : 0;
						});
					}
					return chain;
				},
				limit(max) {
					results = results.slice(0, max);
					return chain;
				},
				async toArray() {
					return results.map((doc) => clone(doc));
				},
			};

			return chain;
		},
		async insertOne(doc) {
			docs.push({
				_id: `mem-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
				...clone(doc),
			});
			return { acknowledged: true };
		},
	};
}

function withImageUri(doc) {
	if (doc?.image?.base64 && doc?.image?.mimeType) {
		return {
			...doc,
			imageUri: `data:${doc.image.mimeType};base64,${doc.image.base64}`,
		};
	}
	if (doc?.imageUrl) {
		return {
			...doc,
			imageUri: doc.imageUrl,
		};
	}
	return { ...doc, imageUri: null };
}

async function ensureStockImagesOnCommunityPosts() {
	const docs = await communityCollection
		.find({})
		.sort({ createdAt: -1 })
		.limit(30)
		.toArray();

	let applied = 0;
	for (const doc of docs) {
		if (applied >= 2) break;

		const hasUploadedImage = !!doc?.image?.base64;
		const hasImageUrl = !!doc?.imageUrl;
		if (hasUploadedImage || hasImageUrl) continue;

		const now = new Date().toISOString();
		await communityCollection.updateOne(
			{ _id: doc._id },
			{
				$set: {
					imageUrl: STOCK_COMMUNITY_IMAGES[applied],
					updatedAt: now,
				},
			},
		);
		applied += 1;
	}

	if (docs.length === 0 || applied < 2) {
		const now = new Date().toISOString();
		const missing = 2 - applied;
		for (let i = 0; i < missing; i += 1) {
			await communityCollection.insertOne({
				id: `stock-${Date.now()}-${i}`,
				type: i % 2 === 0 ? "blog" : "pr_goal",
				title: i % 2 === 0 ? "Form Check Friday" : "PR Goal: 100 Push-ups",
				caption:
					i % 2 === 0
						? "Shared a clean set today. Focused on depth and tempo."
						: "Week target posted. Building consistency one session at a time.",
				author: "SoloFit Team",
				likes: 0,
				createdAt: now,
				updatedAt: now,
				imageUrl:
					STOCK_COMMUNITY_IMAGES[(applied + i) % STOCK_COMMUNITY_IMAGES.length],
			});
		}
	}
}

app.get("/health", (_, res) => {
	res.json({ ok: true, service: "solofit-community-api" });
});

app.post("/leaderboard/seed", async (_, res) => {
	try {
		const now = new Date().toISOString();
		for (const row of MOCK_LEADERBOARD) {
			await leaderboardCollection.updateOne(
				{ id: row.id },
				{
					$set: { ...row, updatedAt: now },
					$setOnInsert: { createdAt: now },
				},
				{ upsert: true },
			);
		}

		const total = await leaderboardCollection.countDocuments({});
		res.json({ ok: true, total });
	} catch (error) {
		res.status(500).json({ ok: false, error: error.message });
	}
});

app.get("/leaderboard", async (_, res) => {
	try {
		const rows = await leaderboardCollection
			.find({})
			.sort({ xp: -1, streak: -1 })
			.toArray();
		res.json({ ok: true, rows });
	} catch (error) {
		res.status(500).json({ ok: false, error: error.message });
	}
});

app.get("/community/posts", async (_, res) => {
	try {
		const docs = await communityCollection
			.find({})
			.sort({ createdAt: -1 })
			.toArray();
		res.json({ ok: true, posts: docs.map((d) => withImageUri(d)) });
	} catch (error) {
		res.status(500).json({ ok: false, error: error.message });
	}
});

app.post("/community/posts", upload.single("image"), async (req, res) => {
	try {
		const { type, title, caption, author } = req.body;

		if (!title || !caption) {
			res
				.status(400)
				.json({ ok: false, error: "title and caption are required" });
			return;
		}

		const now = new Date().toISOString();
		const doc = {
			id: `p-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
			type: type || "blog",
			title: String(title).trim(),
			caption: String(caption).trim(),
			author: String(author || "Athlete").trim(),
			likes: 0,
			createdAt: now,
			updatedAt: now,
		};

		if (req.file) {
			doc.image = {
				mimeType: req.file.mimetype,
				base64: req.file.buffer.toString("base64"),
			};
		}

		await communityCollection.insertOne(doc);
		res.status(201).json({ ok: true, post: withImageUri(doc) });
	} catch (error) {
		res.status(500).json({ ok: false, error: error.message });
	}
});

async function start() {
	if (MONGODB_URI) {
		try {
			client = new MongoClient(MONGODB_URI);
			await client.connect();
			db = client.db(DB_NAME);
			leaderboardCollection = db.collection(LEADERBOARD_COLLECTION);
			communityCollection = db.collection(COMMUNITY_COLLECTION);
			console.log("Connected to MongoDB");
		} catch (error) {
			console.warn(
				"Mongo connection failed, using in-memory store:",
				error.message,
			);
		}
	} else {
		console.warn("MONGODB_URI not set, using in-memory store for development.");
	}

	if (!leaderboardCollection || !communityCollection) {
		leaderboardCollection = createMemoryCollection(MOCK_LEADERBOARD);
		communityCollection = createMemoryCollection([]);
	}

	await ensureStockImagesOnCommunityPosts();

	app.listen(PORT, "0.0.0.0", () => {
		console.log(`Mongo API running on http://localhost:${PORT}`);
		if (db) {
			console.log(
				`DB: ${DB_NAME}, collections: ${LEADERBOARD_COLLECTION}, ${COMMUNITY_COLLECTION}`,
			);
		} else {
			console.log("DB mode: in-memory fallback");
		}
	});
}

start().catch((error) => {
	console.error("Server failed to start:", error.message);
});
