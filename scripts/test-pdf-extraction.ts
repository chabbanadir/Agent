import { PDFParse } from "pdf-parse";
import { readFileSync } from "fs";

/**
 * Simple test for PDFParse v2.4.5
 * Usage: npx tsx scripts/test-pdf-extraction.ts <path-to-pdf>
 */
async function test() {
    const filePath = process.argv[2];
    if (!filePath) {
        console.error("Please provide a path to a PDF file.");
        process.exit(1);
    }

    try {
        const buffer = readFileSync(filePath);
        console.log(`Testing with file: ${filePath} (${buffer.length} bytes)`);

        const parser = new PDFParse({ data: new Uint8Array(buffer) });
        const result = await parser.getText();
        await parser.destroy();

        console.log("--- Extraction Success ---");
        console.log(`Extracted Length: ${result.text.length}`);
        console.log("--- Preview (First 500 characters) ---");
        console.log(result.text.substring(0, 500));
        console.log("--- End of Preview ---");

        if (result.text.includes("stream") || result.text.includes("TJ") || result.text.includes("Tj")) {
            console.warn("WARNING: Detected possible PDF operators in extracted text!");
        } else {
            console.log("SUCCESS: No common PDF operators detected in text.");
        }

    } catch (error) {
        console.error("Extraction Failed:", error);
    }
}

test();
