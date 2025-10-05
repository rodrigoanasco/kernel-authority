import JSZip from "jszip";
import parseEEGFile from "./parseEEGFile";

/**
 * Parse a .zip archive containing multiple EEG files.
 * Each file inside the zip is parsed individually using parseEEGFile().
 * The combined result returns all traces for a unified Plotly visualization.
 *
 * @param {File} file - The uploaded ZIP file
 * @returns {Promise<{traces: Array, meta: Array}>}
 */
export default async function parseEEGZip(file) {
  try {
    console.log("Loading ZIP file:", file.name);
    const zip = await JSZip.loadAsync(file);
    const traces = [];
    const meta = [];

    const entries = Object.entries(zip.files);

    if (entries.length === 0) {
      throw new Error("The ZIP archive is empty.");
    }

    // Loop through each file in the ZIP
    for (const [name, entry] of entries) {
      if (entry.dir) continue; // skip folders

      const lower = name.toLowerCase();

      // Filter for EEG-like files
      if (
        lower.endsWith(".rd.000") ||
        lower.endsWith(".edf") ||
        lower.endsWith(".csv") ||
        lower.endsWith(".dat")
      ) {
        console.log(`📂 Found EEG file inside ZIP: ${name}`);

        const blob = await entry.async("blob");
        const result = await parseEEGFile(blob);

        // Annotate traces with filename (for plot labels)
        const annotated = result.traces.map((trace) => ({
          ...trace,
          name: `${name} - ${trace.name}`,
        }));

        traces.push(...annotated);
        meta.push({
          name,
          nChannels: result.nChannels,
          samplingRate: result.samplingRate,
          dtype: result.dtype,
          offset: result.offset,
        });
      }
    }

    if (traces.length === 0) {
      throw new Error("No EEG files found in ZIP.");
    }

    console.log(`Parsed ${meta.length} EEG files from ZIP`);
    return { traces, meta };
  } catch (error) {
    console.error(" Error parsing ZIP:", error);
    throw error;
  }
}