import * as functions from "firebase-functions";
import { adminDb } from "./firebaseAdmin";
import * as admin from "firebase-admin";
import fetch from "node-fetch";

// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript
//

const fetchResults: any = async (id: string) => {
	const api_key = process.env.BRIGHTDATA_API_KEY;

	const res = await fetch(`https://api.brightdata.com/dca/dataset?id=${id}`, {
		method: "GET",
		headers: {
			Authorization: `Bearer ${api_key}`,
		},
	});

	const data: any = await res.json();

	if (data.status === "building" || data.status === "collecting") {
		console.log("NOT COMPLETE YET, TRYING AGAIN...");
		return fetchResults(id);
	}

	return data;
};

export const onScraperComplete = functions.https.onRequest(
	async (request, response) => {
		const { success, id } = request.body;

		if (!success) {
			await adminDb.collection("searches").doc(id).set(
				{
					status: "error",
					updatedAt: admin.firestore.Timestamp.now(),
				},
				{ merge: true }
			);
		}

		const data = await fetchResults(id);

		await adminDb.collection("searches").doc(id).set(
			{
				status: "complete",
				updatedAt: admin.firestore.Timestamp.now(),
				results: data,
			},
			{ merge: true }
		);

		functions.logger.info("Hello logs!", { structuredData: true });
		response.send("Scraping Function Finished!");
	}
);

// https://c430-192-140-155-1.ngrok-free.app/scraper-21975/us-central1/onScraperComplete
