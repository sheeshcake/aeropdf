/* eslint-disable @typescript-eslint/no-explicit-any */
import { json } from '@sveltejs/kit';
import axios from 'axios';
import { DEEPSEEK_KEY } from '$env/static/private';

export async function POST({ request }) {
	try {
		const formData = await request.formData();
		const pdfBase64 = formData.get('base64');
		const pdfFile = formData.get('pdf');
		const mode = formData.get('mode') || 'both'; // New parameter to determine processing mode: 'summary', 'csv', or 'both'

		if (!pdfFile || !(pdfFile instanceof File)) {
			return json({ error: 'No PDF file provided' }, { status: 400 });
		}

        const axios = require('axios');
        const url = 'https://api.deepseek.ai/v1/analyze/pdf';

		let result;
		const response: {
			summary?: string;
			chartData?: any;
			mappingExplanation?: string;
			csvData?: string;
		} = {};

		// Generate content based on mode
		if (mode === 'summary' || mode === 'both') {
			// Original prompt for summary and chart data
			const summaryPrompt = `
			Analyze the following PDF content and provide:
			
			1. A concise summary (max 300 words) of the key points.
			2. Extract 5 or more key metrics from the document that could be visualized in a chart.
			
			For the metrics, format your response as a JSON object with the following structure:
			{
				"title": "Title for the chart",
				"labels": ["Label1", "Label2", "Label3", "Label4", "Label5"],
				"values": [value1, value2, value3, value4, value5]
			}
			
			Make sure the values are numeric and represent important quantitative information from the document.
			If exact numbers aren't available, always provide reasonable estimates based on the text.
			
			Start your response with "SUMMARY:" followed by the summary text, then "CHART_DATA:" followed by the JSON object.
			`;

			result = await model.generateContent([
				{
					inlineData: {
						data: pdfBase64?.toString() || '',
						mimeType: 'application/pdf'
					}
				},
				summaryPrompt
			]);

			const summaryResponse = await result.response;
			const text = summaryResponse.text();

			// Parse the response
			const summaryMatch = text.match(/SUMMARY:([\s\S]*?)CHART_DATA:/);
			const chartDataMatch = text.match(/CHART_DATA:([\s\S]*)/);

			let summary = '';
			let chartData = null;

			if (summaryMatch && summaryMatch[1]) {
				summary = summaryMatch[1].trim();
			}

			if (chartDataMatch && chartDataMatch[1]) {
				try {
					// Find JSON object in the text
					let jsonStr = chartDataMatch[1].trim();

					// Remove code fence backticks and language identifier if present
					jsonStr = jsonStr.replace(/```json|```/g, '').trim();

					chartData = JSON.parse(jsonStr);
				} catch (error) {
					console.log(chartDataMatch[1].trim());
					console.error('Error parsing chart data:', error);
					// Fallback data if parsing fails
					chartData = {
						title: 'Document Metrics',
						labels: ['Metric 1', 'Metric 2', 'Metric 3', 'Metric 4', 'Metric 5'],
						values: [5, 10, 15, 20, 25]
					};
				}
			}

			response.summary = summary;
			response.chartData = chartData;
		}

		if (mode === 'csv' || mode === 'both') {
			// New prompt for CSV extraction
			// const csvPrompt = `
			// Analyze the following PDF content and extract all data that can be transformed into a structured CSV format with the following columns:

			// Status, Amendment Id, Effective From, Effective To, Group Account, Group Lane, Origin City, Origin State Prov, Origin Country, Destination City, Destination State Prov, Destination Country, Zone, Weight Range From, Weight Range To, Bill Terms, Package Type, Service Name, Service Code, Service Scope, Residential or Commercial Indicator, Consol Shipments, Tier, Miscellaneous Qualifier, Rate, Currency, Rate Basis

			// Your response should include:

			// 1. The extracted data formatted as a CSV string with the above columns. Use null or an empty string for any columns where data cannot be found.
			// 2. A brief explanation of how you mapped the PDF content to each column.
			// 3. Any assumptions or transformations you made to standardize the data.

			// Guidelines for extraction:
			// - For date fields (Effective From, Effective To): Standardize to YYYY-MM-DD format
			// - For location data: Separate into appropriate city, state/province, and country columns
			// - For Weight Range: Split into "From" and "To" numeric values
			// - For Rate: Extract numeric values only
			// - For Currency: Extract the currency code or symbol
			// - For other fields: Extract relevant text or numeric data

			// If you encounter tables or structured data in the PDF, prioritize extracting from these sources.

			// Format your response as follows:
			
			// EXTRACTION_MAPPING:
			// [Explain how you mapped PDF content to each column and any transformations applied]

			// CSV_DATA:
			// [The full CSV data with header row and all extracted records]
			// `;

			const csvPrompt = `
					Analyze the PDF content and extract all the data that can be transformed into a structured CSV format based on these columns:
					- Status
					- Amendment Id
					- Effective From
					- Effective To
					- Group Account
					- Group Lane
					- Origin City
					- Origin State Prov
					- Origin Country
					- Destination City
					- Destination State Prov
					- Destination Country
					- Zone
					- Weight Range From
					- Weight Range To
					- Bill Terms
					- Package Type
					- Service Name
					- Service Code
					- Service Scope
					- Residential or Commercial Indicator
					- Consol Shipments
					- Tier
					- Miscellaneous Qualifier
					- Rate
					- Currency
					- Rate Basis


					Apply the following transformations:
					1. Standardize all country names to their ISO 3166-1 alpha-2 code (e.g., "United States" to "US")
					2. Format all dates in ISO format (YYYY-MM-DD)
					3. Ensure all rates are numerical values with two decimal places
					4. Convert all city names to Title Case
					5. Standardize state/province codes to their official abbreviations
					6. Ensure weight ranges are numerical values
					7. Categorize services into "Express", "Standard", or "Economy" based on the Service Name
					8. Add a new column "Transit Days" calculated based on Service Type and Zone
					9. Add a new column "Rate Per Kg" by dividing Rate by the maximum Weight Range
					10. Group lanes into "Domestic", "Cross-Border", or "International" based on origin and destination countries


					Format your response as follows:
					
					EXTRACTION_MAPPING:
					[Explain how you mapped PDF content to each column and any transformations applied]

					CSV_DATA:
					[The full CSV data with header row and all extracted records]
					`;

			result = await model.generateContent([
				{
					inlineData: {
						data: pdfBase64?.toString() || '',
						mimeType: 'application/pdf'
					}
				},
				csvPrompt
			]);

			const csvResponse = await result.response;
			const csvText = csvResponse.text();

			// Parse the response
			const mappingMatch = csvText.match(/EXTRACTION_MAPPING:([\s\S]*?)CSV_DATA:/);
			const csvDataMatch = csvText.match(/CSV_DATA:([\s\S]*)/);

			let mappingExplanation = '';
			let csvData = '';

			if (mappingMatch && mappingMatch[1]) {
				mappingExplanation = mappingMatch[1].trim();
			}

			if (csvDataMatch && csvDataMatch[1]) {
				csvData = csvDataMatch[1].trim();
				csvData = csvData.replace(/```csv|```/g, '').trim();
			}

			response.mappingExplanation = mappingExplanation;
			response.csvData = csvData;
		}

		return json(response);
	} catch (error: any) {
		console.error('Error processing PDF:', error);
		return json({ error: error.message }, { status: 500 });
	}
}
