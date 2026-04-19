const axios = require('axios');

module.exports = async (req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    const { videoUrl } = req.body;
    
    // Validate URL
    if (!videoUrl || !videoUrl.includes('cartoonporn.com/videos/')) {
        return res.status(400).json({ error: 'Invalid cartoonporn.com video URL' });
    }
    
    try {
        // Fetch the video page
        const response = await axios.get(videoUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Referer': 'https://www.cartoonporn.com/'
            }
        });
        
        const html = response.data;
        
        // Method 1: Look for download link in the HTML
        let downloadUrl = null;
        
        // Search for the download button link
        const downloadMatch = html.match(/href="([^"]+\.mp4[^"]*)"[^>]*>Download MP4/i);
        if (downloadMatch && downloadMatch[1]) {
            downloadUrl = downloadMatch[1];
        }
        
        // Method 2: Look for video source URLs
        if (!downloadUrl) {
            const sourceMatch = html.match(/src=["']([^"']+\.mp4[^"']*)["']/i);
            if (sourceMatch && sourceMatch[1]) {
                downloadUrl = sourceMatch[1];
            }
        }
        
        // Method 3: Look for any MP4 URL in the page
        if (!downloadUrl) {
            const mp4Match = html.match(/(https?:\/\/[^\s"'<>]+\.mp4[^\s"'<>]*)/i);
            if (mp4Match && mp4Match[1]) {
                downloadUrl = mp4Match[1];
            }
        }
        
        // Method 4: Look for video element sources
        if (!downloadUrl) {
            const videoSourceMatch = html.match(/<source[^>]+src=["']([^"']+\.mp4[^"']*)["']/i);
            if (videoSourceMatch && videoSourceMatch[1]) {
                downloadUrl = videoSourceMatch[1];
            }
        }
        
        if (!downloadUrl) {
            // If still not found, try to find it in JavaScript variables
            const jsMatch = html.match(/video_url\s*:\s*["']([^"']+)["']/i);
            if (jsMatch && jsMatch[1]) {
                downloadUrl = jsMatch[1];
            }
        }
        
        if (!downloadUrl) {
            return res.status(404).json({ 
                error: 'Could not find download link. The video might be protected or the URL is invalid.' 
            });
        }
        
        // Convert relative URLs to absolute
        if (downloadUrl.startsWith('//')) {
            downloadUrl = 'https:' + downloadUrl;
        } else if (downloadUrl.startsWith('/')) {
            const urlObj = new URL(videoUrl);
            downloadUrl = `${urlObj.protocol}//${urlObj.host}${downloadUrl}`;
        }
        
        // Return success
        return res.status(200).json({ 
            success: true, 
            downloadUrl: downloadUrl,
            message: 'Video link ready!'
        });
        
    } catch (error) {
        console.error('Error:', error.message);
        return res.status(500).json({ 
            error: 'Failed to fetch video: ' + error.message 
        });
    }
};
