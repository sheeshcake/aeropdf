/* eslint-disable @typescript-eslint/no-explicit-any */
import { json } from '@sveltejs/kit';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_KEY } from '$env/static/private';
import { db } from '$lib/db';

export async function POST({ request }) {
	try {
		const formData = await request.formData();
		const pdfFile = formData.get('base64');
		const question = formData.get('question');
		let fileDatas = [];

		if(!pdfFile) {
			// get saved pdf file
			const recentDocuments = await db.documents.orderBy('timestamp').reverse().limit(1).toArray();
			if(recentDocuments.length > 0) {
				for(const doc of recentDocuments) {
					fileDatas.push({
						inlineData: {
							data: doc.base64,
							mimeType: 'application/pdf'
						}
					});
				}
			}

		}

		if (!pdfFile || !question) {
			return json({ error: 'PDF file and question are required' }, { status: 400 });
		}

		const genAI = new GoogleGenerativeAI(GEMINI_KEY);
		const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
		let prompt = '';
		if(!pdfFile) {
			prompt = `					Analyze the PDF content and extract all the data that can be transformed into a structured CSV format based on these columns:
					- Status
					- Effective From
					- Group Account
					- Group Lane
					- Origin City
					- Origin Country
					- Destination Country
					- Zone
					- Weight Range From
					- Weight Range To
					- Bill Terms
					- Package Type
					- Service Name
					- Service Scope
					- Currency
					- Rate Per Kg/Lbs


					Apply the following transformations:
					1. Standardize all country names to their ISO 3166-1 alpha-2 code (e.g., "United States" to "US")
					2. Format all dates in ISO format (YYYY-MM-DD)
					3. Ensure all rates are numerical values with two decimal places
					4. Convert all city names to Title Case
					5. Standardize state/province codes to their official abbreviations
					6. Ensure weight ranges are numerical values
					7. Categorize services into "Express", "Standard", or "Economy" based on the Service Name
					9. Add a new column "Rate Per Kg/Lbs" by dividing Rate by the maximum Weight Range
					10. Group lanes into "Domestic", "Cross-Border", or "International" based on origin and destination countries


					
					Format your response as follows:
					
					EXTRACTION_MAPPING:
					[Explain how you mapped PDF content to each column and any transformations applied]

					CSV_DATA:
					[The full CSV data with header row and all extracted records]`;

		} else {
			prompt = `
			Based on the following PDF content, please answer this question:
			
			Question: ${question}
			
			Provide a clear, concise answer based only on the information in the document.
			If the answer cannot be determined from the document, state that clearly.
		  `;
		}


		const result = await model.generateContent([
			{
				inlineData: {
					data: pdfFile?.toString() || '',
					mimeType: 'application/pdf'
				}
			},
			prompt
		]);
		// const result = await model.generateContent([
		// 	...fileDatas,
		// 	prompt
		// ]);
		const response = await result.response;
		const answer = response.text();

		return json({
			answer
		});
	} catch (error: any) {
		console.error('Error processing question:', error);
		return json({ error: error.message }, { status: 500 });
	}
}
