const axios = require('axios');

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(200).json({ error: 'Use POST method' });
    }
    
    const { videoUrl } = req.body;
    
    if (!videoUrl) {
        return res.status(200).json({ error: 'No URL provided' });
    }
    
    try {
        // Fetch the video page
        const response = await axios.get(videoUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            },
            timeout: 15000
        });
        
        const html = response.data;
        let downloadUrl = null;
        
        // Find the download link
        const patterns = [
            /href="([^"]+\.mp4[^"]*)"[^>]*>Download MP4/i,
            /src="([^"]+\.mp4[^"]*)"/i,
            /(https?:\/\/[^\s"'<>]+\.mp4[^\s"'<>]*)/i,
            /video_url["']?\s*:\s*["']([^"']+)["']/i,
            /file["']?\s*:\s*["']([^"']+\.mp4)["']/i
        ];
        
        for (const pattern of patterns) {
            const match = html.match(pattern);
            if (match && match[1]) {
                downloadUrl = match[1];
                break;
            }
        }
        
        if (!downloadUrl) {
            return res.status(200).json({ 
                error: 'No download link found. The video might be protected.' 
            });
        }
        
        // Fix relative URLs
        if (downloadUrl.startsWith('//')) {
            downloadUrl = 'https:' + downloadUrl;
        } else if (downloadUrl.startsWith('/')) {
            const baseUrl = new URL(videoUrl);
            downloadUrl = baseUrl.origin + downloadUrl;
        }
        
        return res.status(200).json({ 
            success: true, 
            url: downloadUrl 
        });
        
    } catch (error) {
        return res.status(200).json({ 
            error: 'Failed to fetch: ' + error.message 
        });
    }
};
