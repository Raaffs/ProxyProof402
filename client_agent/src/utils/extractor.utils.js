function extractGeminiMetrics(proof) {
  try {
    const rawData = proof.extractedParameterValues?.data || proof.claimData?.parameters || '';
    const jsonStart = rawData.indexOf('{');

    if (jsonStart !== -1) {
      const jsonBody = JSON.parse(rawData.slice(jsonStart));
      return {
        text: jsonBody.candidates?.[0]?.content?.parts?.[0]?.text || 'N/A',
        totalTokenCount: jsonBody.usageMetadata?.totalTokenCount ?? 'N/A',
      };
    }
  } catch (err) {
    console.error('Extraction error:', err);
  }
  return { text: 'N/A', totalTokenCount: 'N/A' };
}

module.exports = { extractGeminiMetrics };