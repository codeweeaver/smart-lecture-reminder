export async function extractCourseCodesFromSlip(file) {
  try {
    const pdfjsLib = await import('pdfjs-dist')
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url,
    ).toString()

    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    let fullText = ''
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const content = await page.getTextContent()
      fullText += content.items.map(item => item.str).join(' ')
    }
    // Match NOUN course codes: "CIT 403", "GST 101", "BUS 302"
    const courseCodeRegex = /\b([A-Z]{2,4})\s*(\d{3})\b/g
    const matches = [...fullText.matchAll(courseCodeRegex)]
    return [...new Set(matches.map(m => `${m[1]} ${m[2]}`))]
  } catch (err) {
    console.error('PDF parse error:', err)
    return []
  }
}
