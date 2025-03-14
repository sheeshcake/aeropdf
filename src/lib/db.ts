/* eslint-disable @typescript-eslint/no-explicit-any */
import Dexie from 'dexie';

interface Question {
    id?: number;
    question: string;
    answer: string;
    timestamp: string;
    filename: string | Blob;
}

// New interface for PDF documents
interface Document {
    id?: number;
    filename: string;
    base64: string;
    summary: string;
    chartData: any;
    csvData?: string;
    timestamp: string;
}

export class MyDatabase extends Dexie {
    questions!: Dexie.Table<Question>;
    documents!: Dexie.Table<Document>;

    constructor() {
        super('pdfAnalyzerDB');
        this.version(2).stores({
            questions: '++id, question, answer, timestamp, filename',
            documents: '++id, filename, timestamp'
        });
    }
}

export const db = new MyDatabase();

// Helper functions
export async function saveQuestion(question: string, answer: string, filename: string | Blob) {
    try {
        const id = await db.questions.add({
            question,
            answer,
            filename,
            timestamp: new Date().toISOString()
        });

        return id;
    } catch (error) {
        console.error('Error saving question to IndexedDB:', error);
        throw error;
    }
}

export async function getRecentQuestions(limit = 30) {
    try {
        return await db.questions.orderBy('timestamp').reverse().limit(limit).toArray();
    } catch (error) {
        console.error('Error retrieving questions from IndexedDB:', error);
        return [];
    }
}

export async function clearQuestionHistory() {
    try {
        await db.questions.clear();
        return true;
    } catch (error) {
        console.error('Error clearing question history:', error);
        return false;
    }
}

// New functions for document storage
export async function saveDocument(filename: string, base64: string, summary: string, chartData: any, csvData: string) {
    try {
        // Check if document with the same filename exists
        const existingDoc = await db.documents
            .where('filename')
            .equals(filename)
            .first();
        
        if (existingDoc) {
            // Update existing document
            await db.documents.update(existingDoc.id as number, {
                base64,
                summary,
                chartData,
                csvData,
                timestamp: new Date().toISOString()
            });
            return existingDoc.id;
        } else {
            // Create new document
            const id = await db.documents.add({
                filename,
                base64,
                summary,
                chartData,
                csvData,
                timestamp: new Date().toISOString()
            });
            return id;
        }
    } catch (error) {
        console.error('Error saving document to IndexedDB:', error);
        throw error;
    }
}

export async function getRecentDocuments(limit = 30) {
	try {
		return await db.documents.orderBy('timestamp').reverse().limit(limit).toArray();
	} catch (error) {
		console.error('Error retrieving documents from IndexedDB:', error);
		return [];
	}
}

export async function getDocument(id: string) {
    try {
        return await db.documents
            .where('id')
            .equals(id)
			.or('filename')
			.equals(id)
            .first();
    } catch (error) {
        console.error('Error retrieving document from IndexedDB:', error);
        return null;
    }
}

export async function clearDocuments() {
    try {
        await db.documents.clear();
        return true;
    } catch (error) {
        console.error('Error clearing documents:', error);
        return false;
    }
}